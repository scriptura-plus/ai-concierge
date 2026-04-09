type VerseBlockProps = {
  isLoading: boolean
  error: string
  reference: string
  verseText: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
}

export default function VerseBlock({
  isLoading,
  error,
  reference,
  verseText,
  loadingLabel,
  loadingText,
  unavailableLabel,
}: VerseBlockProps) {
  if (isLoading) {
    return (
      <div className="verse-shell rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#faf3e4_0%,#f0e1bd_58%,#e7d3ab_100%)] px-6 py-7 shadow-inner">
          <p className="mb-4 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {loadingLabel}
          </p>
          <div className="space-y-3">
            <div className="skeleton-line h-4 w-11/12 rounded-full bg-stone-200/80" />
            <div className="skeleton-line h-4 w-10/12 rounded-full bg-stone-200/80" />
            <div className="skeleton-line h-4 w-9/12 rounded-full bg-stone-200/80" />
          </div>
          <p className="mt-5 text-sm text-stone-500">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="verse-shell rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-red-200/70 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f5ead4_55%,#eedab9_100%)] px-6 py-7 shadow-inner">
          <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {unavailableLabel}
          </p>
          <p className="text-[1rem] leading-8 text-stone-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="verse-shell verse-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {reference}
        </p>
        <p className="text-[1.08rem] leading-9 text-stone-800 italic">{verseText}</p>
      </div>
    </div>
  )
}
