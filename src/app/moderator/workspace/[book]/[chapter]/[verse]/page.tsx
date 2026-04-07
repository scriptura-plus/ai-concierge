import Link from 'next/link'
import { runModel } from '@/lib/ai/run-model'
import { getVerseText } from '@/lib/bible/getVerseText'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import WorkspaceClient from './WorkspaceClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
}

type SavedInsightRow = {
  id: string
  title_ru: string | null
  text_ru: string | null
  title_en: string | null
  text_en: string | null
  created_at: string
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

function truncate(text: string, max = 240) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

function looksRussian(text: string) {
  const sample = text.slice(0, 400)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
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

async function loadSavedInsights(book: string, chapter: number, verse: number) {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('curated_insights')
    .select('id, title_ru, text_ru, title_en, text_en, created_at')
    .eq('book', book.toLowerCase())
    .eq('chapter', chapter)
    .eq('verse', verse)
    .eq('status', 'saved')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load saved insights: ${error.message}`)
  }

  return (data ?? []) as SavedInsightRow[]
}

async function loadPendingUnfoldCount(book: string, chapter: number, verse: number) {
  const supabase = getSupabaseServerClient()

  const { count, error } = await supabase
    .from('unfold_events')
    .select('*', { count: 'exact', head: true })
    .eq('book', book.toLowerCase())
    .eq('chapter', chapter)
    .eq('verse', verse)
    .eq('review_status', 'new')

  if (error) {
    throw new Error(`Failed to load pending unfold count: ${error.message}`)
  }

  return count ?? 0
}

export default async function ModeratorVerseWorkspacePage({ params }: PageProps) {
  const resolved = await params

  const book = resolved.book
  const chapter = Number(resolved.chapter)
  const verse = Number(resolved.verse)

  const reference = formatReference(book, resolved.chapter, resolved.verse)
  const insightsLibraryHref = `/moderator/insights?filter=saved&book=${book}&chapter=${resolved.chapter}&verse=${resolved.verse}`

  let verseText = ''
  let verseError = ''
  let savedInsights: SavedInsightRow[] = []
  let savedError = ''
  let pendingUnfoldCount = 0
  let unfoldError = ''

  try {
    const rawVerseText = (await getVerseText(book, chapter, verse)) ?? ''
    verseText = await ensureRussianVerseText(reference, rawVerseText)

    if (!verseText) {
      verseError = 'Не удалось загрузить текст стиха.'
    }
  } catch {
    verseError = 'Не удалось загрузить текст стиха.'
  }

  try {
    savedInsights = await loadSavedInsights(book, chapter, verse)
  } catch (error) {
    savedError =
      error instanceof Error ? error.message : 'Не удалось загрузить сохранённые карточки.'
  }

  try {
    pendingUnfoldCount = await loadPendingUnfoldCount(book, chapter, verse)
  } catch (error) {
    unfoldError =
      error instanceof Error ? error.message : 'Не удалось загрузить количество unfold.'
  }

  const savedCards = savedInsights.map((item) => ({
    id: item.id,
    title: item.title_ru?.trim() || item.title_en?.trim() || 'Без заголовка',
    text: item.text_ru?.trim() || item.text_en?.trim() || '',
    createdAt: item.created_at,
  }))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Verse Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              {reference}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Это отдельная рабочая среда по стиху. Здесь собираются saved cards, статистика по
              текущему стиху и два направления работы: точная огранка мысли и направленный поиск
              новых карточек.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/moderator"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Назад
            </Link>

            <Link
              href={`/bible/${book}/${resolved.chapter}/${resolved.verse}`}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Открыть reading screen
            </Link>
          </div>
        </div>

        <section className="mb-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Стих
            </p>

            {verseError ? (
              <p className="mt-3 text-sm text-red-700">{verseError}</p>
            ) : (
              <p className="mt-3 text-[1.05rem] leading-8 text-stone-800 italic">{verseText}</p>
            )}
          </div>
        </section>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-stone-300/70 bg-[#fffaf1] px-5 py-5 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Сохранённых карточек
            </p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">{savedInsights.length}</p>
          </div>

          <div className="rounded-[24px] border border-stone-300/70 bg-[#fffaf1] px-5 py-5 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Unfold ждут обзора
            </p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">{pendingUnfoldCount}</p>
            {unfoldError ? <p className="mt-2 text-sm text-red-700">{unfoldError}</p> : null}
          </div>

          <div className="rounded-[24px] border border-stone-300/70 bg-[#fffaf1] px-5 py-5 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Следующий шаг
            </p>
            <p className="mt-2 text-base leading-7 text-stone-800">
              Поле 1 уже включено. Теперь можно вставлять 1–2 предложения, получать 3 варианта и
              сохранять любой из них как карточку.
            </p>
          </div>
        </div>

        <section className="mb-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Сохранённые карточки
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  Что уже есть по этому стиху
                </h2>
              </div>

              <Link
                href={insightsLibraryHref}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                Открыть всю библиотеку
              </Link>
            </div>

            {savedError ? (
              <p className="text-sm text-red-700">{savedError}</p>
            ) : savedInsights.length === 0 ? (
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
                По этому стиху пока нет сохранённых карточек. Следующий этап — чтобы сразу под этим
                блоком можно было генерировать новые кандидаты и сохранять лучшие.
              </div>
            ) : (
              <div className="space-y-4">
                {savedInsights.map((item) => {
                  const title = item.title_ru?.trim() || item.title_en?.trim() || 'Без заголовка'
                  const text = item.text_ru?.trim() || item.text_en?.trim() || ''

                  return (
                    <article
                      key={item.id}
                      className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg font-semibold leading-7 text-stone-900">{title}</p>
                        <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="mt-3 text-[0.97rem] leading-7 text-stone-800">
                        {truncate(text, 320)}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <WorkspaceClient
          reference={reference}
          verseText={verseText}
          savedCards={savedCards}
          book={book}
          chapter={chapter}
          verse={verse}
        />

        <section className="mt-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Линзы
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Инструменты поиска
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Линзы здесь должны стать частью moderator workspace, а не просто пользовательской
              вкладкой. Они нужны как отдельные способы добычи кандидатов по стиху.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {['Слово', 'Напряжение', 'Почему именно эта фраза'].map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 opacity-60"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
