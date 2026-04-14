'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ModeratorInboxAutoRefresh() {
  const router = useRouter()
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    function safeRefresh() {
      const now = Date.now()

      if (now - lastRefreshRef.current < 1200) {
        return
      }

      lastRefreshRef.current = now
      router.refresh()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        safeRefresh()
      }
    }

    function handleWindowFocus() {
      safeRefresh()
    }

    function handlePageShow() {
      safeRefresh()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [router])

  return null
}
