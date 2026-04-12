import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type CandidateRow = {
  verse_ref: string
  book: string
  chapter: number
  verse: number
  candidate_status: string
  source_type: string
  updated_at: string
}

type SavedRow = {
  book: string
  chapter: number
  verse: number
  status: string
}

type VerseQueueItem = {
  reference: string
  href: string
  curatedCount: number
  candidateCount: number
  newCount: number
  updatedLabel: string
  sources: string[]
}

function statCard(label: string, value: number) {
  return (
    <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
    </div>
  )
}

function slugifyBook(book: string) {
  return book.trim().toLowerCase().replace(/\s+/g, '-')
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
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

async function loadCandidates(): Promise<CandidateRow[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('generated_candidates')
    .select('verse_ref, book, chapter, verse, candidate_status, source_type, updated_at')
    .neq('candidate_status', 'trashed')
    .order('updated_at', { ascending: false })
    .limit(1000)

  if (error) {
    throw new Error(`Failed to load generated candidates: ${error.message}`)
  }

  return (data ?? []) as CandidateRow[]
}

async function loadSavedInsights(): Promise<SavedRow[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('curated_insights')
    .select('book, chapter, verse, status')
    .eq('status', 'saved')
    .limit(5000)

  if (error) {
    throw new Error(`Failed to load curated insights: ${error.message}`)
  }

  return (data ?? []) as SavedRow[]
}

export default async function ModeratorIndexPage() {
  noStore()

  let candidateRows: CandidateRow[] = []
  let savedRows: SavedRow[] = []
  let loadError = ''

  try {
    const [candidates, saved] = await Promise.all([loadCandidates(), loadSavedInsights()])
    candidateRows = candidates
    savedRows = saved
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'Не удалось загрузить moderation dashboard.'
  }

  const savedCountMap = new Map<string, number>()

  for (const row of savedRows) {
    const key = `${row.book.toLowerCase()}|${row.chapter}|${row.verse}`
    savedCountMap.set(key, (savedCountMap.get(key) ?? 0) + 1)
  }

  const verseMap = new Map<
    string,
    {
      reference: string
      book: string
      chapter: number
      verse: number
      candidateCount: number
      newCount: number
      latestUpdatedAt: string
      sources: Set<string>
    }
  >()

  for (const row of candidateRows) {
    const key = `${row.book.toLowerCase()}|${row.chapter}|${row.verse}`

    const existing = verseMap.get(key)
    if (existing) {
      existing.candidateCount += 1
      if (row.candidate_status === 'new') {
        existing.newCount += 1
      }
      if (new Date(row.updated_at).getTime() > new Date(existing.latestUpdatedAt).getTime()) {
        existing.latestUpdatedAt = row.updated_at
      }
      existing.sources.add(row.source_type)
      continue
    }

    verseMap.set(key, {
      reference: row.verse_ref,
      book: row.book,
      chapter: row.chapter,
      verse: row.verse,
      candidateCount: 1,
      newCount: row.candidate_status === 'new' ? 1 : 0,
      latestUpdatedAt: row.updated_at,
      sources: new Set([row.source_type]),
    })
  }

  const queue: VerseQueueItem[] = Array.from(verseMap.values())
    .map((item) => {
      const savedKey = `${item.book.toLowerCase()}|${item.chapter}|${item.verse}`
      const curatedCount = savedCountMap.get(savedKey) ?? 0
      const bookSlug = slugifyBook(item.book)

      return {
        reference: item.reference,
        href: `/moderator/review/${bookSlug}/${item.chapter}/${item.verse}`,
        curatedCount,
        candidateCount: item.candidateCount,
        newCount: item.newCount,
        updatedLabel: formatDate(item.latestUpdatedAt),
        sources: Array.from(item.sources),
      }
    })
    .sort((a, b) => {
      if (b.newCount !== a.newCount) return b.newCount - a.newCount
      if (a.curatedCount !== b.curatedCount) return a.curatedCount - b.curatedCount
      return b.candidateCount - a.candidateCount
    })

  const summary = {
    newCandidates: candidateRows.filter((row) => row.candidate_status === 'new').length,
    versesInQueue: queue.length,
    withSaved: Array.from(savedCountMap.values()).filter((count) => count > 0).length,
    needAttention: queue.filter((item) => item.newCount > 0 || item.curatedCount < 12).length,
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F5EF_0%,#F3F0E8_46%,#F6F3EC_100%)] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Moderator
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            Кандидаты
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Система подготовила новые карточки для обзора. Открой стих, посмотри лучшие
            предложения, сохрани сильное, убери мусор или доработай почти удачные варианты.
          </p>
        </div>

        <section className="mb-8">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            {statCard('Новые кандидаты', summary.newCandidates)}
            {statCard('Стихи в очереди', summary.versesInQueue)}
            {statCard('Со saved карточками', summary.withSaved)}
            {statCard('Требуют внимания', summary.needAttention)}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                Очередь стихов
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Здесь собраны стихи, по которым система уже накопила кандидатов для обзора.
              </p>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-6 text-red-700 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              {loadError}
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-[28px] border border-stone-300/70 bg-[#fffaf1] px-5 py-6 text-stone-600 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              Пока нет кандидатов в очереди. Когда система начнёт складывать новые карточки в pool,
              они появятся здесь.
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <article
                  key={item.href}
                  className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]"
                >
                  <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Стих
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                          {item.reference}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={item.href}
                          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                        >
                          Открыть review
                        </Link>

                        <button
                          type="button"
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                        >
                          +3
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Curated
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.curatedCount}/12
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Candidates
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.candidateCount}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          New
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.newCount}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Updated
                        </p>
                        <p className="mt-2 text-base font-medium text-stone-900">
                          {item.updatedLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Sources
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.sources.length > 0 ? (
                          item.sources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700"
                            >
                              {sourceLabel(source)}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-stone-600">Источники пока не указаны</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
