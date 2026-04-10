'use client'

type WordLensNodeKind =
  | 'word'
  | 'phrase'
  | 'formula'
  | 'idiom'
  | 'image'
  | 'contrast'

type WordLensNode = {
  id: string
  kind: WordLensNodeKind
  label: string
  original: string
  transliteration?: string
  semantic_core: string
  why_it_matters: string
  dig_deeper: string
}

type WordLensPayload = {
  lead: string
  nodes: WordLensNode[]
}

type WordLensViewProps = {
  isReady: boolean
  isLoading: boolean
  error: string
  data: WordLensPayload | null
  title: string
  leadFallback: string
  takeawayFallback: string
  pointLabel: string
  takeawayLabel: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
  tryAgainLabel: string
  changeLabel: string
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
  shareLabel: string
  shareStatus: string
  copyStatus: 'idle' | 'copied' | 'failed'
  customPromptValue: string
  onCustomPromptChange: (value: string) => void
  onRetry: () => void
  onChangeMode: () => void
  onCopy: () => void
  onShare: () => void
  onNodeSelect: (nodeId: string) => void
  onCustomDig: () => void
}

function kindBadge(kind: WordLensNodeKind) {
  if (kind === 'word') return 'Word'
  if (kind === 'phrase') return 'Phrase'
  if (kind === 'formula') return 'Formula'
  if (kind === 'idiom') return 'Idiom'
  if (kind === 'image') return 'Image'
  return 'Contrast'
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

export default function WordLensView({
  isReady,
  isLoading,
  error,
  data,
  title,
  leadFallback,
  takeawayFallback,
  pointLabel,
  takeawayLabel,
  loadingLabel,
  loadingText,
  unavailableLabel,
  tryAgainLabel,
  changeLabel,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  shareLabel,
  shareStatus,
  copyStatus,
  customPromptValue,
  onCustomPromptChange,
  onRetry,
  onChangeMode,
  onCopy,
  onShare,
  onNodeSelect,
  onCustomDig,
}: WordLensViewProps) {
  if (!isReady) {
    return renderIntroPanel(
      title,
      leadFallback,
      pointLabel,
      [
        'This lens builds a map of the strongest meaning-nodes inside the wording of the verse.',
        'The goal is not generic commentary, but lexical entrances that genuinely open the text.',
        'Each node should feel like a promising path: semantic weight, idiom, formula, image, or contrast.',
      ],
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
    return renderIntroPanel(
      title,
      leadFallback,
      pointLabel,
      [
        'This lens builds a map of the strongest meaning-nodes inside the wording of the verse.',
        'The goal is not generic commentary, but lexical entrances that genuinely open the text.',
        'Each node should feel like a promising path: semantic weight, idiom, formula, image, or contrast.',
      ],
      takeawayLabel,
      takeawayFallback
    )
  }

  return (
    <div className="tab-panel-enter mt-5 space-y-5">
      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {title}
            </p>

            <button
              type="button"
              onClick={onChangeMode}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              {changeLabel}
            </button>
          </div>

          <p className="text-[1rem] leading-8 text-stone-800">{data.lead}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700"
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
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700"
            >
              {shareLabel}
            </button>

            {shareStatus ? (
              <span className="self-center text-sm text-stone-500">{shareStatus}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Word map
          </p>

          <div className="space-y-4">
            {data.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onNodeSelect(node.id)}
                className="block w-full rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-stone-300/70 bg-[#fffaf1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {kindBadge(node.kind)}
                  </span>

                  <p className="text-[1.04rem] font-semibold leading-7 text-stone-900">
                    {node.label}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  <p className="text-[0.96rem] leading-7 text-stone-800">
                    <span className="font-semibold text-stone-900">{node.original}</span>
                    {node.transliteration ? (
                      <span className="text-stone-500"> · {node.transliteration}</span>
                    ) : null}
                  </p>
                </div>

                <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Semantic core
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.semantic_core}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Why this matters
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.why_it_matters}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Dig deeper
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.dig_deeper}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Your own digging direction
          </p>

          <textarea
            value={customPromptValue}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="Describe what exactly you want to dig into in this verse..."
            className="min-h-[120px] w-full rounded-[20px] border border-stone-300/70 bg-[#fffaf1] px-4 py-3 text-[0.98rem] leading-7 text-stone-800 outline-none placeholder:text-stone-400"
          />

          <button
            type="button"
            onClick={onCustomDig}
            className="mt-4 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            Dig into this direction
          </button>
        </div>
      </div>
    </div>
  )
}
