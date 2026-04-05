import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CuratedInsightDetailRow = {
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

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatMode(mode: CuratedInsightDetailRow['mode']) {
  if (mode === 'why_this_phrase') return 'Why This Phrase'
  if (mode === 'word') return 'Word'
  if (mode === 'tension') return 'Tension'
  return 'Insights'
}

function statusClasses(status: CuratedInsightDetailRow['status']) {
  if (status === 'saved') {
    return 'border-emerald-400 bg-emerald-100 text-emerald-900'
  }

  if (status === 'draft') {
    return 'border-amber-400 bg-amber-100 text-amber-900'
  }

  return 'border-stone-400 bg-stone-200 text-stone-700'
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

async function loadInsightById(id: string): Promise<CuratedInsightDetailRow | null> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('curated_insights')
    .select(
      'id, verse_ref, book, chapter, verse, mode, title, text, angle_note, status, unfold_count, promoted_from_unfold, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load curated insight: ${error.message}`)
  }

  return (data ?? null) as CuratedInsightDetailRow | null
}

export default async function ModeratorInsightDetailPage({ params }: PageProps) {
  const { id } = await params

  let item: CuratedInsightDetailRow | null = null

  try {
    item = await loadInsightById(id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load curated insight.'

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Moderator
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                Curated Insight Review
              </h1>
            </div>

            <Link
              href="/moderator/insights"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Back to insights
            </Link>
          </div>

          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 text-red-700">
            {message}
          </div>
        </div>
      </main>
    )
  }

  if (!item) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Moderator
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Curated Insight Review
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Saved reading-layer card inside the curated insight library.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/moderator/insights"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Back to insights
            </Link>

            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusClasses(item.status)}`}
          >
            Current status: {item.status}
          </div>

          <form action={`/api/moderator/insights/${item.id}/delete`} method="POST">
            <input type="hidden" name="returnTo" value="/moderator/insights" />
            <button
              type="submit"
              className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Delete this insight
            </button>
          </form>
        </div>

        <div className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
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

              <span className="text-xs text-stone-500">
                Created: {formatDate(item.created_at)}
              </span>

              <span className="text-xs text-stone-500">
                Updated: {formatDate(item.updated_at)}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Reference
                </p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{item.verse_ref}</p>
              </div>

              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Metrics
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">ID: {item.id}</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Unfold count: {item.unfold_count}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Title
              </p>
              <p className="mt-2 text-2xl font-semibold leading-8 text-stone-900">
                {item.title}
              </p>
            </div>

            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Card text
              </p>
              <div className="mt-2 whitespace-pre-wrap text-[1rem] leading-8 text-stone-800">
                {item.text}
              </div>
            </div>

            {item.angle_note ? (
              <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Angle note
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[0.97rem] leading-7 text-stone-800">
                  {item.angle_note}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
