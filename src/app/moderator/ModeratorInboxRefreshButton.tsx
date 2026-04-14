'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ModeratorInboxRefreshButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function handleRefresh() {
    setIsRefreshing(true)
    router.refresh()

    window.setTimeout(() => {
      setIsRefreshing(false)
    }, 700)
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50 disabled:opacity-60"
    >
      {isRefreshing ? 'Обновляем...' : 'Обновить'}
    </button>
  )
}
