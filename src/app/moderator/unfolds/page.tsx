import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type UnfoldRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  source_mode: 'insights' | 'word' | 'tension' | 'why_this_phrase'
  source_title: string
  source_text: string
  unfold_text: string
  review_status: 'new' | 'reviewed' | 'promoted' | 'hidden'
  created_at: string
}

function formatMode(mode: UnfoldRow['source_mode']) {
  if (mode === 'why_this_phrase') return 'Why This Phrase'
  if (mode === 'word') return 'Word'
  if (mode === 'tension') return 'Tension'
  return 'Insights'
}

function formatStatus(status: UnfoldRow['review_status']) {
  if (status === 'new') return 'New'
  if (status === 'reviewed') return 'Reviewed'
  if (status === 'promoted') return 'Promoted'
  return 'Hidden'
}

function statusClasses(status: UnfoldRow['review_status']) {
  if (status === 'new') {
    return 'border-amber-300 bg-amber-50 text-amber-800'
  }

  if (status === 'promoted') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  }

  if (status === 'reviewed') {
    return 'border-stone-300 bg-stone-100 text-stone-700'
  }

  return 'border-stone-300 bg-stone-50 text-stone-500'
}

function truncate(text: string, max = 180) {
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

async function loadUnfolds(): Promise<UnfoldRow[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('unfold_events')
    .select(
      'id, verse_ref, book, chapter, verse, source_mode, source_title, source_text, unfold_text, review_status, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to load unfold events: ${error.message}`)
  }

  return (data ?? []) as UnfoldRow[]
}

export default async function ModeratorUnfoldsPage() {
  let unfolds: UnfoldRow[] = []
  let loadError = ''

  try {
    unfolds = await loadUnfolds()
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Failed to load unfold events.'
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Moderator
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Unfold Inbox
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Incoming unfold events saved from the reading experience.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Home
          </Link>
        </div>

        <div className="mb-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Total items
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{unfolds.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                New
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {unfolds.filter((item) => item.review_status === 'new').length}
              </p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Promoted
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">
                {unfolds.filter((item) => item.review_status === 'promoted').length}
              </p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 text-red-700">
            {loadError}
          </div>
        ) : unfolds.length === 0 ? (
          <div className="rounded-[28px] border border-stone-300/70 bg-[#fffaf1] px-5 py-6 text-stone-600">
            No unfold events yet.
          </div>
        ) : (
          <div className="space-y-4">
            {unfolds.map((item) => (
              <Link
                key={item.id}
                href={`/moderator/unfolds/${item.id}`}
                className="block rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)]"
              >
                <article className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.review_status)}`}
                    >
                      {formatStatus(item.review_status)}
                    </span>

                    <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                      {formatMode(item.source_mode)}
                    </span>

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
                      Source title
                    </p>
                    <p className="mt-1 text-lg font-medium leading-7 text-stone-900">
                      {item.source_title}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Source text
                      </p>
                      <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                        {truncate(item.source_text, 260)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Unfold preview
                      </p>
                      <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                        {truncate(item.unfold_text, 260)}
                      </p>
                    </div>
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
