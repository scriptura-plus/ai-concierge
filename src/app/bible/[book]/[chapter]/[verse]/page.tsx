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

type InsightItem = {
  title: string
  text: string
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')
  const [insightTitle, setInsightTitle] = useState('Loading insight...')
  const [insightText, setInsightText] = useState('')

  useEffect(() => {
    async function load() {
      const resolved = await params
      setBook(resolved.book)
      setChapter(resolved.chapter)
      setVerse(resolved.verse)

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book: resolved.book,
            chapter: resolved.chapter,
            verse: resolved.verse,
            count: 12,
          }),
        })

        const data = await res.json()

        const firstInsight: InsightItem | undefined = data?.insights?.[0]

        if (firstInsight) {
          setInsightTitle(firstInsight.title || 'Untitled insight')
          setInsightText(firstInsight.text || '')
        } else {
          setInsightTitle('No insight returned.')
          setInsightText('')
        }
      } catch {
        setInsightTitle('Error loading insight')
        setInsightText('')
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
          {book
            ? `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
            : 'Loading...'}
        </h1>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-xl font-semibold text-neutral-900">
            {insightTitle}
          </h2>

          <p className="whitespace-pre-line text-base leading-7 text-neutral-800">
            {insightText}
          </p>
        </div>
      </div>
    </main>
  )
}
