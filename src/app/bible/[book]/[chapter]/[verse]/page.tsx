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

export default async function VerseDetailPage({ params }: PageProps) {
  const { book, chapter, verse } = await params
  const selectedBook = getBookById(book)

  if (!selectedBook) {
    notFound()
  }

  const chapterNumber = Number(chapter)
  const verseNumber = Number(verse)

  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > selectedBook.chapters
  ) {
    notFound()
  }

  if (!Number.isInteger(verseNumber) || verseNumber < 1 || verseNumber > 31) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${selectedBook.id}/${chapterNumber}`}
          className="mb-6 text-sm text-neutral-500"
        >
          ← Back
        </Link>

        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
          Verse
        </p>

        <h1 className="mb-4 text-3xl font-semibold text-neutral-900">
          {selectedBook.title} {chapterNumber}:{verseNumber}
        </h1>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-base leading-7 text-neutral-800">
            Verse text placeholder
          </p>
        </div>
      </div>
    </main>
  )
}
