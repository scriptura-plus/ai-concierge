import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CuratedInsightRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  mode: 'insights' | 'word' | 'tension' | 'why_this_phrase'
  title: string
  text: string
  angle_note: string | null
  status: 'draft' | 'saved' | 'hidden'
  unfold_count: number
  promoted_from_unfold: boolean
  created_at: string
  updated_at: string
}

type FilterMode = 'saved' | 'hidden' | 'all'

type PageProps = {
  searchParams?: Promise<{
    filter?: string
  }>
}

function normalizeFilter(value: string | undefined): FilterMode {
  if (value === 'hidden') return 'hidden'
  if (value === 'all') return 'all'
  return 'saved'
}

function formatMode(mode: CuratedInsightRow['mode']) {
  if (mode === 'why_this_phrase') return 'Why This Phrase'
  if (mode === 'word') return 'Word'
  if (mode === 'tension') return 'Tension'
  return 'Insights'
}

function statusClasses(status: CuratedInsightRow['status']) {
  if (status === 'saved') {
    return 'border-emerald-400 bg-emerald-100 text-emerald-900'
  }

  if (status === 'draft') {
    return 'border-amber-400 bg-amber-100 text-amber-900'
  }

  return 'border-stone-400 bg-stone-200 text-stone-700'
}

function filterClasses(isActive: boolean) {
  return isActive
    ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-[0_8px_18px_rgba(28,25,23,0.16)]'
    : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
}

function truncate(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function loadCuratedInsights(): Promise<CuratedInsightRow[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('curated_insights')
    .select(
      'id, verse_ref, book, chapter, verse, mode, title, text, angle_note, status, unfold_count, promoted_from_unfold, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Failed to load curated insights: ${error.message}`)
  }

  return (data ?? []) as CuratedInsightRow[]
}

export default async function ModeratorInsightsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const filter = normalizeFilter(resolvedSearchParams?.filter)

  let insights: CuratedInsightRow[] = []
  let loadError = ''

  try {
    insights = await loadCuratedInsights()
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Failed to load curated insights.'
  }

  const savedItems = insights.filter((item) => item.status === 'saved')
  const hiddenItems = insights.filter((item) => item.status === 'hidden')

  const visibleItems =
    filter === 'hidden' ? hiddenItems : filter === 'all' ? insights : savedItems

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Moderator
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Curated Insights
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Reading-layer cards that are already saved into the main insight library.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Unfold inbox
            </Link>

            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="mb-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Total cards
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{insights.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Saved
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{savedItems.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Hidden
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{hiddenItems.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                From unfold
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {insights.filter((item) => item.promoted_from_unfold).length}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/moderator/insights?filter=saved"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'saved'
            )}`}
          >
            Saved
          </Link>

          <Link
            href="/moderator/insights?filter=hidden"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'hidden'
            )}`}
          >
            Hidden
          </Link>

          <Link
            href="/moderator/insights?filter=all"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'all'
            )}`}
          >
            All
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 text-red-700">
            {loadError}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-[28px] border border-stone-300/70 bg-[#fffaf1] px-5 py-6 text-stone-600">
            {filter === 'hidden'
              ? 'No hidden curated insights.'
              : filter === 'all'
                ? 'No curated insights yet.'
                : 'No saved curated insights.'}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={`/moderator/insights/${item.id}`}
                className="block rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)] active:scale-[0.998]"
              >
                <article className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                    >
                      {item.status}
                    </span>

                    <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                      {formatMode(item.mode)}
                    </span>

                    {item.promoted_from_unfold ? (
                      <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                        From unfold
                      </span>
                    ) : null}

                    <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Reference
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{item.verse_ref}</h2>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Title
                    </p>
                    <p className="mt-1 text-lg font-medium leading-7 text-stone-900">
                      {item.title}
                    </p>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Card text
                    </p>
                    <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                      {truncate(item.text, 320)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-stone-500">ID: {item.id}</p>
                    <span className="text-sm font-medium text-stone-700">Open →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
