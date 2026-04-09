type ComparePoint = {
  title: string
  labelA: string
  quoteA: string
  labelB: string
  quoteB: string
  text: string
}

type ComparePayload = {
  lead: string
  points: ComparePoint[]
  takeaway: string
}

type CompareViewProps = {
  isReady: boolean
  isLoading: boolean
  error: string
  data: ComparePayload | null
  title: string
  leadFallback: string
  takeawayFallback: string
  diffLabel: string
  takeawayLabel: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
  point1: string
  point2: string
  point3: string
  tryAgainLabel: string
  backToTopLabel: string
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
  shareLabel: string
  copyStatus: 'idle' | 'copied' | 'failed'
  shareStatus: string
  onRetry: () => void
  onBackToTop: () => void
  onCopy: () => void
  onShare: () => void
}

function renderStructuredPanel(
  title: string,
  lead: string,
  labelPrefix: string,
  points: string[],
  takeawayLabel: string,
  takeaway: string
) {
  return (
    <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {title}
        </p>

        <p className="text-[1rem] leading-8 text-stone-800">{lead}</p>

        <div className="mt-5 space-y-3">
          {points.map((point, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-[18px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                {labelPrefix} {index + 1}
              </p>
              <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            {takeawayLabel}
          </p>
          <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{takeaway}</p>
        </div>
      </div>
    </div>
  )
}

export default function CompareView({
  isReady,
  isLoading,
  error,
  data,
  title,
  leadFallback,
  takeawayFallback,
  diffLabel,
  takeawayLabel,
  loadingLabel,
  loadingText,
  unavailableLabel,
  point1,
  point2,
  point3,
  tryAgainLabel,
  backToTopLabel,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  shareLabel,
  copyStatus,
  shareStatus,
  onRetry,
  onBackToTop,
  onCopy,
  onShare,
}: CompareViewProps) {
  if (!isReady) {
    return renderStructuredPanel(
      title,
      leadFallback,
      diffLabel,
      [point1, point2, point3],
      takeawayLabel,
      takeawayFallback
    )
  }

  if (isLoading) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {loadingLabel}
          </p>
          <p className="text-[1.08rem] leading-9 text-stone-800">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {unavailableLabel}
          </p>
          <p className="text-[1.08rem] leading-9 text-stone-800">{error}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            {tryAgainLabel}
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return renderStructuredPanel(
      title,
      leadFallback,
      diffLabel,
      [point1, point2, point3],
      takeawayLabel,
      takeawayFallback
    )
  }

  return (
    <div className="tab-panel-enter card-pop mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {title}
        </p>

        <p className="text-[1rem] leading-8 text-stone-800">{data.lead}</p>

        <div className="mt-5 space-y-4">
          {data.points.map((point, index) => (
            <div
              key={`${point.title}-${index}`}
              className="rounded-[20px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                {point.title}
              </p>

              <div className="mt-3 space-y-3">
                <div className="rounded-[16px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {point.labelA}
                  </p>
                  <p className="mt-1 text-[1rem] leading-7 text-stone-900">“{point.quoteA}”</p>
                </div>

                <div className="rounded-[16px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {point.labelB}
                  </p>
                  <p className="mt-1 text-[1rem] leading-7 text-stone-900">“{point.quoteB}”</p>
                </div>
              </div>

              <p className="mt-4 text-[0.97rem] leading-7 text-stone-800">{point.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            {takeawayLabel}
          </p>
          <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{data.takeaway}</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onBackToTop}
            className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {backToTopLabel}
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {copyStatus === 'copied'
              ? copiedLabel
              : copyStatus === 'failed'
                ? copyFailedLabel
                : copyLabel}
          </button>

          <button
            type="button"
            onClick={onShare}
            className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {shareLabel}
          </button>
        </div>

        {shareStatus && <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>}
      </div>
    </div>
  )
}
