type LensKind = 'translation' | 'word' | 'tension' | 'phrase'

type LensSheetProps = {
  isOpen: boolean
  title: string
  subtitle: string
  description: string
  closeLabel: string
  translationLabel: string
  wordLabel: string
  tensionLabel: string
  phraseLabel: string
  translationHelper: string
  wordHelper: string
  tensionHelper: string
  phraseHelper: string
  onClose: () => void
  onSelect: (lens: LensKind) => void
}

function renderModeOption(
  kind: string,
  title: string,
  helper: string,
  accentClass: string,
  onClick: () => void
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-[26px] border border-stone-300/80 bg-[linear-gradient(180deg,rgba(255,250,241,0.98)_0%,rgba(248,239,220,0.96)_100%)] px-5 py-5 text-left shadow-[0_10px_24px_rgba(94,72,37,0.08)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(94,72,37,0.12)] active:scale-[0.988]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_45%)]" />
      </div>

      <div className="relative flex items-start gap-4">
        <div
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/50 ${accentClass} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}
        >
          <span className="text-sm font-semibold text-stone-800">
            {kind === 'translation'
              ? 'T'
              : kind === 'word'
                ? 'W'
                : kind === 'tension'
                  ? 'N'
                  : 'P'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[1.02rem] font-semibold tracking-tight text-stone-900">{title}</p>
            <span className="translate-x-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-[2px]">
              →
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-stone-600">{helper}</p>
        </div>
      </div>
    </button>
  )
}

export default function LensSheet({
  isOpen,
  title,
  subtitle,
  description,
  closeLabel,
  translationLabel,
  wordLabel,
  tensionLabel,
  phraseLabel,
  translationHelper,
  wordHelper,
  tensionHelper,
  phraseHelper,
  onClose,
  onSelect,
}: LensSheetProps) {
  if (!isOpen) return null

  return (
    <div className="sheet-overlay fixed inset-0 z-50 bg-[rgba(20,16,10,0.30)] backdrop-blur-[10px]">
      <div className="flex h-full items-end px-4 pb-4 pt-16">
        <div className="sheet-panel mx-auto w-full max-w-md overflow-hidden rounded-[34px] border border-stone-300/80 bg-[linear-gradient(180deg,rgba(251,246,234,0.98)_0%,rgba(244,234,214,0.98)_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.20)]">
          <div className="px-5 pt-3">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-stone-300/90" />
          </div>

          <div className="px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[1.55rem] font-semibold tracking-tight text-stone-900">
                  {title}
                </p>
                <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
                <p className="text-sm text-stone-500">{description}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300/90 bg-[#fffaf1]/90 text-base font-medium text-stone-700 shadow-[0_6px_14px_rgba(94,72,37,0.08)] transition hover:bg-white active:scale-[0.97]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3.5">
              {renderModeOption(
                'translation',
                translationLabel,
                translationHelper,
                'bg-[linear-gradient(180deg,#efe5cc_0%,#e3d4ad_100%)]',
                () => onSelect('translation')
              )}

              {renderModeOption(
                'word',
                wordLabel,
                wordHelper,
                'bg-[linear-gradient(180deg,#ece3d6_0%,#dfd0bb_100%)]',
                () => onSelect('word')
              )}

              {renderModeOption(
                'tension',
                tensionLabel,
                tensionHelper,
                'bg-[linear-gradient(180deg,#eadfcd_0%,#dcc9ad_100%)]',
                () => onSelect('tension')
              )}

              {renderModeOption(
                'phrase',
                phraseLabel,
                phraseHelper,
                'bg-[linear-gradient(180deg,#ece6da_0%,#ddd2bf_100%)]',
                () => onSelect('phrase')
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
