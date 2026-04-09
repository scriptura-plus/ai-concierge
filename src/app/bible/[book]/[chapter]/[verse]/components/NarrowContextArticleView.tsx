type NarrowContextArticle = {
  title: string
  lead: string
  body: string[]
  highlight_line?: string
}

type NarrowContextArticleViewProps = {
  article: NarrowContextArticle | null
  isLoading: boolean
  error: string
  articleLabel: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
  backLabel: string
  shareLabel: string
  copiedLabel: string
  copyLabel: string
  copyFailedLabel: string
  shareStatus: string
  copyStatus: 'idle' | 'copied' | 'failed'
  tryAgainLabel: string
  onBack: () => void
  onCopy: () => void
  onShare: () => void
  onRetry: () => void
}

export default function NarrowContextArticleView({
  article,
  isLoading,
  error,
  articleLabel,
  loadingLabel,
  loadingText,
  unavailableLabel,
  backLabel,
  shareLabel,
  copiedLabel,
  copyLabel,
  copyFailedLabel,
  shareStatus,
  copyStatus,
  tryAgainLabel,
  onBack,
  onCopy,
  onShare,
  onRetry,
}: NarrowContextArticleViewProps) {
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

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {backLabel}
            </button>

            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              {tryAgainLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return null
  }

  return (
    <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {backLabel}
          </button>

          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {articleLabel}
          </p>
        </div>

        <h2 className="mb-5 text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
          {article.title}
        </h2>

        <p className="text-[1.05rem] leading-9 text-stone-900">{article.lead}</p>

        {article.highlight_line?.trim() ? (
          <div className="mt-6 rounded-[22px] border border-stone-300/70 bg-[#fffaf1]/85 px-5 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
            <p className="text-[1rem] italic leading-8 text-stone-800">
              {article.highlight_line}
            </p>
          </div>
        ) : null}

        <div className="mt-7 space-y-6">
          {article.body.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`} className="text-[1rem] leading-8 text-stone-800">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
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
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {shareLabel}
          </button>
        </div>

        {shareStatus ? (
          <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>
        ) : null}
      </div>
    </div>
  )
}
