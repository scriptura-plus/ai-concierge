import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookById } from '@/lib/bible/books'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
}

async function getInsight(book: string, chapter: string, verse: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ book, chapter, verse }),
    cache: 'no-store',
  })

  if (!res.ok) {
    return 'Error loading insight'
  }

  const data = await res.json()
  return data.text
}

export default async function VerseDetailPage({ params }: PageProps) {
  const { book, chapter, verse } = await params
  const selectedBook = getBookById(book)

  if (!selectedBook) {
    notFound()
  }

  const insight = await getInsight(book, chapter, verse)

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${selectedBook.id}/${chapter}`}
          className="mb-6 text-sm text-neutral-500"
        >
          ← Back
        </Link>

        <h1 className="mb-4 text-3xl font-semibold text-neutral-900">
          {selectedBook.title} {chapter}:{verse}
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
