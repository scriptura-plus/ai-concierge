'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')
  const [insight, setInsight] = useState('Loading insight...')

  useEffect(() => {
    async function load() {
      const resolved = await params
      setBook(resolved.book)
      setChapter(resolved.chapter)
      setVerse(resolved.verse)

      try {
        const res = await fetch('/api/insight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book: resolved.book,
            chapter: resolved.chapter,
            verse: resolved.verse,
          }),
        })

        const data = await res.json()
        setInsight(data.text || 'No insight returned.')
      } catch {
        setInsight('Error loading insight')
      }
    }

    load()
  }, [params])

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${book}/${chapter}`}
          className="mb-6 text-sm text-neutral-500"
        >
          ← Back
        </Link>

        <h1 className="mb-4 text-3xl font-semibold text-neutral-900">
          {book ? `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}` : 'Loading...'}
        </h1>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-base leading-7 text-neutral-800 whitespace-pre-line">
            {insight}
          </p>
        </div>
      </div>
    </main>
  )
}
