import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import ModeratorInboxAutoRefresh from './ModeratorInboxAutoRefresh'
import ModeratorInboxRefreshButton from './ModeratorInboxRefreshButton'

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

type VerseQueueItem = {
  reference: string
  href: string
  newCount: number
  updatedLabel: string
  updatedAt: string
  sources: string[]
}

function slugifyBook(book: string) {
  return book.trim().toLowerCase().replace(/\s+/g, '-')
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'America/New_York',
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
    .eq('candidate_status', 'new')
    .order('updated_at', { ascending: false })
    .limit(1000)

  if (error) {
    throw new Error(`Failed to load generated candidates: ${error.message}`)
  }

  return (data ?? []) as CandidateRow[]
}

export default async function ModeratorIndexPage() {
  noStore()

  let candidateRows: CandidateRow[] = []
  let loadError = ''

  try {
    candidateRows = await loadCandidates()
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'Не удалось загрузить очередь модератора.'
  }

  const verseMap = new Map<
    string,
    {
      reference: string
      book: string
      chapter: number
      verse: number
      newCount: number
      latestUpdatedAt: string
      sources: Set<string>
    }
  >()

  for (const row of candidateRows) {
    const key = `${row.book.toLowerCase()}|${row.chapter}|${row.verse}`

    const existing = verseMap.get(key)
    if (existing) {
      existing.newCount += 1
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
      newCount: 1,
      latestUpdatedAt: row.updated_at,
      sources: new Set([row.source_type]),
    })
  }

  const queue: VerseQueueItem[] = Array.from(verseMap.values())
    .map((item) => {
      const bookSlug = slugifyBook(item.book)

      return {
        reference: item.reference,
        href: `/moderator/review/${bookSlug}/${item.chapter}/${item.verse}`,
        newCount: item.newCount,
        updatedLabel: formatDate(item.latestUpdatedAt),
        updatedAt: item.latestUpdatedAt,
        sources: Array.from(item.sources),
      }
    })
    .sort((a, b) => {
      if (b.newCount !== a.newCount) return b.newCount - a.newCount
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#f5f0fb_48%,#f8f4fc_100%)] text-stone-900">
      <ModeratorInboxAutoRefresh />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">
              Moderator
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              Очередь модератора
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Здесь показаны стихи, по которым уже есть новые карточки на разбор. Открой review,
              сохрани сильное, отклони слабое или доработай почти удачные варианты.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Для отдельной работы с длинными статьями и извлечения кандидатов из Unfold используй
              вспомогательный режим ниже.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/moderator/open"
              className="rounded-full border border-violet-300 bg-[linear-gradient(180deg,#7c3aed_0%,#6d28d9_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(109,40,217,0.22)] transition hover:brightness-[1.03]"
            >
              Открыть стих вручную
            </Link>

            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Работа с Unfold
            </Link>

            <ModeratorInboxRefreshButton />

            <Link
              href="/"
              className="rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Главная
            </Link>
          </div>
        </div>

        <section className="mb-6">
          <div className="rounded-[28px] border border-violet-200/80 bg-[linear-gradient(180deg,#f5efff_0%,#efe5fb_100%)] px-5 py-5 shadow-[0_10px_24px_rgba(91,33,182,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
              В очереди сейчас
            </p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">{queue.length}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Стихи отсортированы по количеству новых карточек, затем по свежести обновления.
            </p>
          </div>
        </section>

        <section>
          {loadError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-6 text-red-700 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              {loadError}
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-[28px] border border-violet-200/80 bg-white/80 px-5 py-6 text-stone-600 shadow-[0_8px_20px_rgba(91,33,182,0.06)]">
              Сейчас в очереди нет новых карточек. Когда система сгенерирует новые предложения,
              они появятся здесь.
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <article
                  key={item.href}
                  className="rounded-[28px] border border-violet-200/70 bg-[linear-gradient(180deg,#f5efff_0%,#efe5fb_100%)] p-5 shadow-[0_16px_34px_rgba(91,33,182,0.10)]"
                >
                  <div className="rounded-[22px] border border-violet-300/20 bg-[radial-gradient(circle_at_top,#fbf8ff_0%,#f3ebfd_55%,#ecdefa_100%)] px-5 py-5 shadow-inner">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
                          Стих
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                          {item.reference}
                        </h2>
                      </div>

                      <Link
                        href={item.href}
                        className="rounded-full bg-[linear-gradient(180deg,#7c3aed_0%,#6d28d9_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(109,40,217,0.20)] transition hover:brightness-[1.03]"
                      >
                        Открыть review
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-violet-200/70 bg-white/80 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">
                          К рассмотрению
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">{item.newCount}</p>
                      </div>

                      <div className="rounded-[18px] border border-violet-200/70 bg-white/80 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">
                          Обновлено
                        </p>
                        <p className="mt-2 text-base font-medium text-stone-900">
                          {item.updatedLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">
                        Источники
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.sources.length > 0 ? (
                          item.sources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-medium text-violet-800"
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
