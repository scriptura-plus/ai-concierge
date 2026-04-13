'use client'

import { useState } from 'react'

type ActionSubmitButtonProps = {
  idleLabel: string
  pendingLabel: string
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export default function ActionSubmitButton({
  idleLabel,
  pendingLabel,
  variant = 'secondary',
  disabled = false,
}: ActionSubmitButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const isDisabled = disabled || isPending

  const baseClassName =
    'rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'

  const variantClassName =
    variant === 'primary'
      ? 'bg-stone-900 text-stone-50 hover:bg-stone-800'
      : variant === 'danger'
        ? 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
        : 'border border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

  return (
    <button
      type="submit"
      disabled={isDisabled}
      onClick={() => {
        if (!disabled) {
          setIsPending(true)
        }
      }}
      className={`${baseClassName} ${variantClassName}`}
    >
      {isPending ? pendingLabel : idleLabel}
    </button>
  )
}
