import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type UnfoldDetailRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  source_mode: 'insights' | 'word' | 'tension' | 'why_this_phrase'
  source_title: string
  source_text: string
  source_angle_note: string | null
  unfold_title: string | null
  unfold_text: string
  review_status: 'new' | 'reviewed' | 'promoted' | 'hidden'
  created_at: string
  updated_at: string
  source_insight_id: string | null
  promoted_insight_id: string | null
}

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatMode(mode: UnfoldDetailRow['source_mode']) {
  if (mode === 'why_this_phrase') return 'Why This Phrase'
  if (mode === 'word') return 'Word'
  if (mode === 'tension') return 'Tension'
  return 'Insights'
}

function formatStatus(status: UnfoldDetailRow['review_status']) {
  if (status === 'new') return 'New'
  if (status === 'reviewed') return 'Reviewed'
  if (status === 'promoted') return 'Promoted'
  return 'Hidden'
}

function statusClasses(status: UnfoldDetailRow['review_status']) {
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

async function loadUnfoldById(id: string): Promise<UnfoldDetailRow | null> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('unfold_events')
    .select(
      `
        id,
        verse_ref,
        book,
        chapter,
        verse,
        source_mode,
        source_title,
        source_text,
        source_angle_note,
        unfold_title,
        unfold_text,
        review_status,
        created_at,
        updated_at,
        source_insight_id,
        promoted_insight_id
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load unfold event: ${error.message}`)
  }

  return (data ?? null) as UnfoldDetailRow | null
}

export default async function ModeratorUnfoldDetailPage({ params }: PageProps) {
  const { id } = await params

  let item: UnfoldDetailRow | null = null

  try {
    item = await loadUnfoldById(id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load unfold event.'

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Moderator
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                Unfold Review
              </h1>
            </div>

            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Back to inbox
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
              Unfold Review
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Single unfold event view for review and future promotion workflow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Back to inbox
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
          {item.review_status === 'new' ? (
            <form action={`/api/moderator/unfolds/${item.id}/review`} method="POST">
              <input
                type="hidden"
                name="returnTo"
                value={`/moderator/unfolds/${item.id}`}
              />
              <button
                type="submit"
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                Mark as reviewed
              </button>
            </form>
          ) : (
            <div className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-600">
              Status already: {formatStatus(item.review_status)}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.review_status)}`}
              >
                {formatStatus(item.review_status)}
              </span>

              <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                {formatMode(item.source_mode)}
              </span>

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
                  IDs
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Event ID: {item.id}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Source insight ID: {item.source_insight_id ?? 'NULL'}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Promoted insight ID: {item.promoted_insight_id ?? 'NULL'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Source title
              </p>
              <p className="mt-2 text-xl font-semibold leading-8 text-stone-900">
                {item.source_title}
              </p>
            </div>

            {item.source_angle_note ? (
              <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Source angle note
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {item.source_angle_note}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Source text
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[0.97rem] leading-8 text-stone-800">
                  {item.source_text}
                </div>
              </div>

              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Unfold title
                </p>
                <p className="mt-2 text-xl font-semibold leading-8 text-stone-900">
                  {item.unfold_title ?? 'Untitled'}
                </p>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Unfold text
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[0.97rem] leading-8 text-stone-800">
                  {item.unfold_text}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
