import Link from 'next/link'

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type ArticleViewProps = {
  article: ArticlePayload
  reference: string
  articleLabel: string
  backToCardsLabel: string
  copyArticleLabel: string
  shareArticleLabel: string
  copiedLabel: string
  copyFailedLabel: string
  homeLabel: string
  copyStatus: 'idle' | 'copied' | 'failed'
  shareStatus: string
  onBack: () => void
  onCopy: () => void
  onShare: () => void
}

export default function ArticleView({
  article,
  reference,
  articleLabel,
  backToCardsLabel,
  copyArticleLabel,
  shareArticleLabel,
  copiedLabel,
  copyFailedLabel,
  homeLabel,
  copyStatus,
  shareStatus,
  onBack,
  onCopy,
  onShare,
}: ArticleViewProps) {
  return (
    <div className="card-pop mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {backToCardsLabel}
          </button>

          <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {articleLabel}
          </span>
        </div>

        <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {reference}
        </p>

        <h2 className="mb-6 text-center text-[2.15rem] font-semibold leading-tight tracking-tight text-stone-900">
          {article.title}
        </h2>

        <p className="mb-8 text-[1.1rem] leading-9 text-stone-900">{article.lead}</p>

        {article.quote ? (
          <blockquote className="mb-8 border-l-2 border-stone-300 pl-4 text-[1rem] italic leading-8 text-stone-700">
            {article.quote}
          </blockquote>
        ) : null}

        <div className="space-y-7 text-[0.98rem] leading-8 text-stone-800">
          {article.body.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {copyStatus === 'copied'
              ? copiedLabel
              : copyStatus === 'failed'
                ? copyFailedLabel
                : copyArticleLabel}
          </button>

          <button
            type="button"
            onClick={onShare}
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {shareArticleLabel}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {backToCardsLabel}
          </button>

          <Link
            href="/"
            className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-center text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            {homeLabel}
          </Link>
        </div>

        {shareStatus && <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>}
      </div>
    </div>
  )
}
