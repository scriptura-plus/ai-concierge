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
  return (
    <div className="verse-enter mb-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {reference || '—'}
        </p>

        {isLoading ? (
          <div className="space-y-4">
            <p className="text-center text-[1.02rem] font-medium text-stone-700">
              {loadingLabel}
            </p>
            <p className="text-center text-[1.08rem] leading-9 text-stone-700">
              {loadingText}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-center text-[1.02rem] font-medium text-stone-700">
              {unavailableLabel}
            </p>
            <p className="text-center text-[1.08rem] leading-9 text-stone-700">{error}</p>
          </div>
        ) : (
          <p className="text-fade text-[1.2rem] leading-[2.05rem] text-stone-800 italic">
            {verseText}
          </p>
        )}
      </div>
    </div>
  )
}
