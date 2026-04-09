type ContextKind = 'narrow' | 'wide'

type ContextSheetProps = {
  isOpen: boolean
  title: string
  subtitle: string
  description: string
  closeLabel: string
  narrowLabel: string
  wideLabel: string
  narrowHelper: string
  wideHelper: string
  onClose: () => void
  onSelect: (mode: ContextKind) => void
}

export default function ContextSheet({
  isOpen,
  title,
  subtitle,
  description,
  closeLabel,
  narrowLabel,
  wideLabel,
  narrowHelper,
  wideHelper,
  onClose,
  onSelect,
}: ContextSheetProps) {
  if (!isOpen) return null

  return (
    <div className="sheet-overlay fixed inset-0 z-50 flex items-end bg-black/25 px-4 pb-4 pt-16">
      <div className="sheet-panel mx-auto w-full max-w-md rounded-[28px] border border-stone-300 bg-[#fbf6ea] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-stone-900">{title}</p>
            <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
            <p className="text-sm text-stone-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1.5 text-sm font-medium text-stone-700"
          >
            {closeLabel}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => onSelect('narrow')}
            className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
          >
            <p className="text-base font-semibold text-stone-900">{narrowLabel}</p>
            <p className="mt-1 text-sm text-stone-500">{narrowHelper}</p>
          </button>

          <button
            type="button"
            onClick={() => onSelect('wide')}
            className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
          >
            <p className="text-base font-semibold text-stone-900">{wideLabel}</p>
            <p className="mt-1 text-sm text-stone-500">{wideHelper}</p>
          </button>
        </div>
      </div>
    </div>
  )
}
