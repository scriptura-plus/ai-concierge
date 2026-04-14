import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getVerseText } from '@/lib/bible/getVerseText'
import { runModel } from '@/lib/ai/run-model'
import WorkspaceClient from '@/app/moderator/workspace/[book]/[chapter]/[verse]/WorkspaceClient'
import ActionSubmitButton from './ActionSubmitButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
  searchParams?: Promise<{
    prefill?: string
    source?: string
    id?: string
    flash?: string
    message?: string
  }>
}

type CandidateRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  candidate_status: string
  source_type: string
  title_ru: string
  text_ru: string
  angle_note: string | null
  review_note: string | null
  updated_at: string
  created_at: string
}

type SavedRow = {
  id: string
  title_ru: string | null
  text_ru: string | null
  title_en: string | null
  text_en: string | null
  created_at: string
  bucket: 'featured' | 'reserve'
  display_order: number
}

type PrefillPayload = {
  id: string
  title: string
  text: string
}

type RepairSourceType = 'candidate' | 'featured_insight' | 'reserve_insight' | ''

function normalizeBookForDb(bookSlug: string) {
  return bookSlug.replace(/-/g, ' ').trim().toLowerCase()
}

function formatBookLabel(bookSlug: string) {
  return bookSlug
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function formatReference(book: string, chapter: string, verse: string) {
  return `${formatBookLabel(book)} ${chapter}:${verse}`
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function sourceLabel(source: string) {
  if (source === 'user_request') return 'user'
  if (source === 'background_fill') return 'background'
  if (source === 'repair') return 'repair'
  if (source === 'unfold_derived') return 'unfold'
  if (source === 'manual_workspace') return 'manual'
  return source
}

function statusLabel(status: string) {
  if (status === 'featured') return 'featured'
  if (status === 'extended') return 'extended'
  if (status === 'reserve') return 'reserve'
  if (status === 'needs_repair') return 'needs repair'
  return 'new'
}

function statusClasses(status: string) {
  if (status === 'featured') {
    return 'border-emerald-400 bg-emerald-100 text-emerald-900'
  }

  if (status === 'extended') {
    return 'border-sky-400 bg-sky-100 text-sky-900'
  }

  if (status === 'reserve') {
    return 'border-stone-400 bg-stone-200 text-stone-700'
  }

  if (status === 'needs_repair') {
    return 'border-amber-400 bg-amber-100 text-amber-900'
  }

  return 'border-amber-400 bg-amber-100 text-amber-900'
}

function looksRussian(text: string) {
  const sample = text.slice(0, 400)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
}

function decodeFlashValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

async function ensureRussianVerseText(reference: string, verseText: string): Promise<string> {
  const clean = verseText.trim()

  if (!clean) return ''
  if (looksRussian(clean)) return clean

  const prompt = `
Translate the following Bible verse into Russian.

REFERENCE:
${reference}

VERSE TEXT:
${clean}

RULES:
- Return only the translated verse text
- No explanation
- No quotation marks
- No JSON
- No markdown
- Natural, clear Russian
`.trim()

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 300,
  })

  if (!result.ok) {
    return clean
  }

  const translated = result.rawText.trim()
  return translated || clean
}

async function loadCandidates(book: string, chapter: number, verse: number) {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('generated_candidates')
    .select(
      'id, verse_ref, book, chapter, verse, candidate_status, source_type, title_ru, text_ru, angle_note, review_note, updated_at, created_at'
    )
    .eq('book', book)
    .eq('chapter', chapter)
    .eq('verse', verse)
    .neq('candidate_status', 'trashed')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load generated candidates: ${error.message}`)
  }

  return (data ?? []) as CandidateRow[]
}

async function loadSavedInsights(book: string, chapter: number, verse: number) {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('curated_insights')
    .select('id, title_ru, text_ru, title_en, text_en, created_at, bucket, display_order')
    .eq('book', book)
    .eq('chapter', chapter)
    .eq('verse', verse)
    .eq('status', 'saved')
    .order('bucket', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load curated insights: ${error.message}`)
  }

  return (data ?? []) as SavedRow[]
}

async function loadPrefillCandidate(candidateId: string): Promise<PrefillPayload | null> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('generated_candidates')
    .select('id, title_ru, text_ru')
    .eq('id', candidateId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load prefill candidate: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    title: String(data.title_ru ?? '').trim() || 'Без заголовка',
    text: String(data.text_ru ?? '').trim(),
  }
}

async function loadPrefillInsight(insightId: string): Promise<PrefillPayload | null> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('curated_insights')
    .select('id, title_ru, text_ru, title_en, text_en')
    .eq('id', insightId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load prefill insight: ${error.message}`)
  }

  if (!data) return null

  const title =
    String(data.title_ru ?? '').trim() ||
    String(data.title_en ?? '').trim() ||
    'Без заголовка'

  const text =
    String(data.text_ru ?? '').trim() ||
    String(data.text_en ?? '').trim()

  return {
    id: data.id,
    title,
    text,
  }
}

export default async function ModeratorVerseReviewPage({
  params,
  searchParams,
}: PageProps) {
  noStore()

  const resolved = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const dbBook = normalizeBookForDb(resolved.book)
  const chapter = Number(resolved.chapter)
  const verse = Number(resolved.verse)

  const reference = formatReference(resolved.book, resolved.chapter, resolved.verse)
  const reviewHref = `/moderator/review/${resolved.book}/${resolved.chapter}/${resolved.verse}`

  let verseText = ''
  let verseError = ''
  let candidates: CandidateRow[] = []
  let saved: SavedRow[] = []
  let loadError = ''

  try {
    const [rawVerse, candidateRows, savedRows] = await Promise.all([
      getVerseText(resolved.book, chapter, verse),
      loadCandidates(dbBook, chapter, verse),
      loadSavedInsights(dbBook, chapter, verse),
    ])

    verseText = await ensureRussianVerseText(reference, rawVerse ?? '')
    candidates = candidateRows
    saved = savedRows
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'Не удалось загрузить review-экран по стиху.'
  }

  if (!verseText && !loadError) {
    verseError = 'Не удалось загрузить текст стиха.'
  }

  const featuredSaved = saved.filter((item) => item.bucket === 'featured')
  const reserveSaved = saved.filter((item) => item.bucket === 'reserve')

  const newCandidates = candidates.filter((item) => item.candidate_status === 'new')
  const extendedCandidates = candidates.filter((item) =>
    ['extended', 'reserve', 'needs_repair'].includes(item.candidate_status)
  )

  const totalCardsCount = featuredSaved.length + newCandidates.length + reserveSaved.length

  const savedCards = featuredSaved.map((item) => ({
    id: item.id,
    title: item.title_ru?.trim() || item.title_en?.trim() || 'Без заголовка',
    text: item.text_ru?.trim() || item.text_en?.trim() || '',
    createdAt: item.created_at,
  }))

  const prefillMode = resolvedSearchParams?.prefill === '1'

  const prefillSourceRaw =
    typeof resolvedSearchParams?.source === 'string'
      ? resolvedSearchParams.source.trim()
      : ''

  const prefillSource: RepairSourceType =
    prefillSourceRaw === 'candidate' ||
    prefillSourceRaw === 'featured_insight' ||
    prefillSourceRaw === 'reserve_insight'
      ? prefillSourceRaw
      : ''

  const prefillId =
    typeof resolvedSearchParams?.id === 'string'
      ? resolvedSearchParams.id.trim()
      : ''

  const flashType = decodeFlashValue(String(resolvedSearchParams?.flash ?? ''))
  const flashMessage = decodeFlashValue(String(resolvedSearchParams?.message ?? ''))

  let initialExactInput = ''
  let initialDirectionInput = ''
  let initialCandidateId = ''
  let prefillMessage = ''
  let repairSourceType: RepairSourceType = ''
  let repairSourceId = ''

  if (prefillMode && prefillId) {
    try {
      if (prefillSource === 'candidate') {
        const candidate = await loadPrefillCandidate(prefillId)
        if (candidate) {
          initialExactInput = candidate.text
          initialCandidateId = candidate.id
          prefillMessage = `Кандидат загружен в мастерскую: ${candidate.title}`
          repairSourceType = 'candidate'
          repairSourceId = candidate.id
        }
      }

      if (prefillSource === 'featured_insight') {
        const insight = await loadPrefillInsight(prefillId)
        if (insight) {
          initialExactInput = insight.text
          initialCandidateId = insight.id
          prefillMessage = `Активная карточка загружена в мастерскую для новой редакции: ${insight.title}`
          repairSourceType = 'featured_insight'
          repairSourceId = insight.id
        }
      }

      if (prefillSource === 'reserve_insight') {
        const insight = await loadPrefillInsight(prefillId)
        if (insight) {
          initialExactInput = insight.text
          initialCandidateId = insight.id
          prefillMessage = `Карточка из запаса загружена в мастерскую для новой редакции: ${insight.title}`
          repairSourceType = 'reserve_insight'
          repairSourceId = insight.id
        }
      }
    } catch {
      // keep empty if prefill load fails
    }
  }

  const flashClassName =
    flashType === 'error'
      ? 'border-red-300/70 bg-red-50 text-red-800'
      : 'border-emerald-300/70 bg-emerald-50 text-emerald-900'

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F5EF_0%,#F3F0E8_46%,#F6F3EC_100%)] text-stone-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Review
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              {reference}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Один рабочий экран по стиху: здесь ты читаешь сохранённые карточки, сортируешь их,
              просматриваешь новые предложения и при необходимости сразу дорабатываешь мысль ниже на
              этой же странице.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/moderator"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Назад
            </Link>
          </div>
        </div>

        {flashMessage ? (
          <section
            className={`mb-5 rounded-[24px] border px-5 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)] ${flashClassName}`}
          >
            <p className="text-sm leading-6">{flashMessage}</p>
          </section>
        ) : null}

        <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Стих
            </p>

            {loadError ? (
              <p className="mt-3 text-sm text-red-700">{loadError}</p>
            ) : verseError ? (
              <p className="mt-3 text-sm text-red-700">{verseError}</p>
            ) : (
              <p className="mt-3 text-[1.05rem] leading-8 text-stone-800 italic">{verseText}</p>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Активные
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{featuredSaved.length}/12</p>
            </div>

            <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                К рассмотрению
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{newCandidates.length}</p>
            </div>

            <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                В запасе
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{reserveSaved.length}</p>
            </div>

            <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Всего по стиху
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{totalCardsCount}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Уже утверждено
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  Active / Saved
                </h2>
              </div>
            </div>

            {featuredSaved.length === 0 ? (
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
                По этому стиху пока нет активных карточек.
              </div>
            ) : (
              <div className="space-y-4">
                {featuredSaved.map((item, index) => {
                  const title = item.title_ru?.trim() || item.title_en?.trim() || 'Без заголовка'
                  const text = item.text_ru?.trim() || item.text_en?.trim() || ''
                  const repairHref =
                    `${reviewHref}?prefill=1&source=featured_insight&id=${encodeURIComponent(item.id)}#workshop`

                  return (
                    <article
                      key={item.id}
                      className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold leading-tight text-stone-900">
                          {title}
                        </h3>
                        <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <form action={`/api/moderator/insights/${item.id}/move-up`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Выше"
                            pendingLabel="Поднимаем..."
                            disabled={index === 0}
                          />
                        </form>

                        <form action={`/api/moderator/insights/${item.id}/move-down`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Ниже"
                            pendingLabel="Опускаем..."
                            disabled={index === featuredSaved.length - 1}
                          />
                        </form>

                        <form action={`/api/moderator/insights/${item.id}/send-to-reserve`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton idleLabel="В запас" pendingLabel="Переносим..." />
                        </form>

                        <Link
                          href={repairHref}
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                        >
                          Доработать
                        </Link>
                      </div>

                      <div className="mt-4 whitespace-pre-wrap text-[0.97rem] leading-7 text-stone-800">
                        {text}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Новые предложения
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  New Suggestions
                </h2>
              </div>
            </div>

            {newCandidates.length === 0 ? (
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
                Сейчас нет новых кандидатов. Можно сразу работать ниже в мастерской.
              </div>
            ) : (
              <div className="space-y-4">
                {newCandidates.map((item) => {
                  const repairHref =
                    `${reviewHref}?prefill=1&source=candidate&id=${encodeURIComponent(item.id)}#workshop`

                  return (
                    <article
                      key={item.id}
                      className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.candidate_status)}`}
                        >
                          {statusLabel(item.candidate_status)}
                        </span>

                        <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700">
                          {sourceLabel(item.source_type)}
                        </span>

                        <span className="text-xs text-stone-500">{formatDate(item.updated_at)}</span>
                      </div>

                      <h3 className="mt-3 text-xl font-semibold leading-tight text-stone-900">
                        {item.title_ru}
                      </h3>

                      <div className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-8 text-stone-800">
                        {item.text_ru}
                      </div>

                      {item.angle_note ? (
                        <div className="mt-4 rounded-[16px] border border-stone-300/50 bg-[#fdf9f1] px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                            Angle note
                          </p>
                          <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                            {item.angle_note}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <form action={`/api/moderator/candidates/${item.id}/promote`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Сохранить"
                            pendingLabel="Сохраняем..."
                            variant="primary"
                          />
                        </form>

                        <form action={`/api/moderator/candidates/${item.id}/reject`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Отклонить"
                            pendingLabel="Отклоняем..."
                            variant="danger"
                          />
                        </form>

                        <Link
                          href={repairHref}
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                        >
                          Доработать
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Запас
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  Extended / Reserve
                </h2>
              </div>
            </div>

            {reserveSaved.length === 0 ? (
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
                Пока нет карточек в запасе по этому стиху.
              </div>
            ) : (
              <div className="space-y-4">
                {reserveSaved.map((item) => {
                  const title = item.title_ru?.trim() || item.title_en?.trim() || 'Без заголовка'
                  const text = item.text_ru?.trim() || item.text_en?.trim() || ''
                  const repairHref =
                    `${reviewHref}?prefill=1&source=reserve_insight&id=${encodeURIComponent(item.id)}#workshop`

                  return (
                    <article
                      key={item.id}
                      className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold leading-tight text-stone-900">
                          {title}
                        </h3>
                        <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <form action={`/api/moderator/insights/${item.id}/return-to-featured`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Вернуть в активные"
                            pendingLabel="Возвращаем..."
                          />
                        </form>

                        <form action={`/api/moderator/insights/${item.id}/remove-from-reserve`} method="POST">
                          <input type="hidden" name="returnTo" value={reviewHref} />
                          <ActionSubmitButton
                            idleLabel="Убрать из запаса"
                            pendingLabel="Убираем..."
                            variant="danger"
                          />
                        </form>

                        <Link
                          href={repairHref}
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                        >
                          Доработать
                        </Link>
                      </div>

                      <div className="mt-4 whitespace-pre-wrap text-[0.97rem] leading-7 text-stone-800">
                        {text}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section id="workshop" className="scroll-mt-6">
          {prefillMessage ? (
            <section className="mb-5 rounded-[24px] border border-amber-300/70 bg-amber-50 px-5 py-4 text-stone-800 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              <p className="text-sm leading-6">{prefillMessage}</p>
            </section>
          ) : null}

          <WorkspaceClient
            reference={reference}
            verseText={verseText}
            savedCards={savedCards}
            book={resolved.book}
            chapter={chapter}
            verse={verse}
            initialExactInput={initialExactInput}
            initialDirectionInput={initialDirectionInput}
            prefillMode={prefillMode}
            initialCandidateId={initialCandidateId}
            repairSourceType={repairSourceType}
            repairSourceId={repairSourceId}
          />
        </section>
      </div>
    </main>
  )
}
