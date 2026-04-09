type ModeStateCardProps = {
  title?: string
  loadingLabel?: string
  loadingText?: string
  error?: string
  retryLabel?: string
  onRetry?: () => void
  changeLabel?: string
  onChange?: () => void
  badgeLabel?: string
}

export default function ModeStateCard({
  title,
  loadingLabel,
  loadingText,
  error,
  retryLabel,
  onRetry,
  changeLabel,
  onChange,
  badgeLabel,
}: ModeStateCardProps) {
  const isLoading = !!loadingLabel

  return (
    <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        {(badgeLabel || onChange) && (
          <div className="mb-5 flex items-center justify-between gap-3">
            {badgeLabel ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span>{badgeLabel}</span>
              </div>
            ) : (
              <div />
            )}

            {onChange && changeLabel ? (
              <button
                type="button"
                onClick={onChange}
                className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
              >
                {changeLabel}
              </button>
            ) : null}
          </div>
        )}

        {title ? (
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {title}
          </p>
        ) : null}

        {isLoading && loadingText ? (
          <p className="text-[1.08rem] leading-9 text-stone-800">{loadingText}</p>
        ) : null}

        {!isLoading && error ? (
          <>
            <p className="text-[1.08rem] leading-9 text-stone-800">{error}</p>

            {onRetry && retryLabel ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {retryLabel}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
