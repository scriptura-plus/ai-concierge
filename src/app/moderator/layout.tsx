import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Scriptura AI Moderator',
  description: 'Moderator workspace for Scriptura AI',
  manifest: '/moderator.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Moderator',
  },
  icons: {
    icon: [
      { url: '/moderator-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/moderator-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: '/moderator-apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: ['/moderator-icon-192.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#f5f0fb',
}

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
