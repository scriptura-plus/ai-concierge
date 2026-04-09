import HighlightedParagraph from './HighlightedParagraph'

type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type NarrowContextHighlight = {
  text: string
  kind: HighlightKind
}

type NarrowContextDirection = {
  id: string
  title: string
  summary: string
  why_it_matters: string
  dig_deeper: string
}

type NarrowContextPayload = {
  paragraph: {
    reference: string
    full_text: string
    highlights: NarrowContextHighlight[]
  }
  directions: NarrowContextDirection[]
}

type NarrowContextViewProps = {
  isReady: boolean
  isLoading: boolean
  error: string
  data: NarrowContextPayload | null
  title: string
  introLead: string
  introTakeaway: string
  pointLabel: string
  takeawayLabel: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
  point1: string
  point2: string
  point3: string
  point4: string
  point5: string
  paragraphLabel: string
  highlightsLabel: string
  directionsLabel: string
  whyItMattersLabel: string
  digDeeperLabel: string
  tryAgainLabel: string
  shareLabel: string
  changeLabel: string
  copiedLabel: string
  copyLabel: string
  copyFailedLabel: string
  shareStatus: string
  copyStatus: 'idle' | 'copied' | 'failed'
  onRetry: () => void
  onDirectionSelect: (directionId: string) => void
  onChangeMode: () => void
  onCopy: () => void
  onShare: () => void
}

function highlightKindLabel(kind: HighlightKind) {
  if (kind === 'pivot') return 'PIVOT'
  if (kind === 'contrast') return 'CONTRAST'
  if (kind === 'phrase') return 'PHRASE'
  return 'KEYWORD'
}

function renderIntroPanel(
  title: string,
  lead: string,
  pointLabel: string,
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
                {pointLabel} {index + 1}
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

export default function NarrowContextView({
  isReady,
  isLoading,
  error,
  data,
  title,
  introLead,
  introTakeaway,
  pointLabel,
  takeawayLabel,
  loadingLabel,
  loadingText,
  unavailableLabel,
  point1,
  point2,
  point3,
  point4,
  point5,
  paragraphLabel,
  highlightsLabel,
  directionsLabel,
  whyItMattersLabel,
  digDeeperLabel,
  tryAgainLabel,
  shareLabel,
  changeLabel,
  copiedLabel,
  copyLabel,
  copyFailedLabel,
  shareStatus,
  copyStatus,
  onRetry,
  onDirectionSelect,
  onChangeMode,
  onCopy,
  onShare,
}: NarrowContextViewProps) {
  if (!isReady) {
    return renderIntroPanel(
      title,
      introLead,
      pointLabel,
      [point1, point2, point3, point4, point5],
      takeawayLabel,
      introTakeaway
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
    return renderIntroPanel(
      title,
      introLead,
      pointLabel,
      [point1, point2, point3, point4, point5],
      takeawayLabel,
      introTakeaway
    )
  }

  return (
    <div className="tab-panel-enter mt-5 space-y-5">
      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {paragraphLabel}
            </p>

            <button
              type="button"
              onClick={onChangeMode}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              {changeLabel}
            </button>
          </div>

          <p className="mb-4 text-sm font-medium text-stone-500">{data.paragraph.reference}</p>

          <HighlightedParagraph
            text={data.paragraph.full_text}
            highlights={data.paragraph.highlights}
          />

          {data.paragraph.highlights.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                {highlightsLabel}
              </p>

              <div className="flex flex-wrap gap-2">
                {data.paragraph.highlights.map((item, index) => (
                  <div
                    key={`${item.kind}-${item.text}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-[#fffaf1]/85 px-3 py-1.5 text-sm text-stone-700"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {highlightKindLabel(item.kind)}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
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

          {shareStatus && <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>}
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {directionsLabel}
          </p>

          <div className="space-y-4">
            {data.directions.map((direction) => (
              <button
                key={direction.id}
                type="button"
                onClick={() => onDirectionSelect(direction.id)}
                className="block w-full rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-[1.04rem] font-semibold leading-7 text-stone-900">
                  {direction.title}
                </p>

                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {direction.summary}
                </p>

                <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {whyItMattersLabel}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {direction.why_it_matters}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {digDeeperLabel}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {direction.dig_deeper}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
