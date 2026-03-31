import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookById } from '@/lib/bible/books'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
  }>
}

export default async function VerseSelectPage({ params }: PageProps) {
  const { book, chapter } = await params
  const selectedBook = getBookById(book)

  if (!selectedBook) {
    notFound()
  }

  const chapterNumber = Number(chapter)

  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > selectedBook.chapters
  ) {
    notFound()
  }

  const verses = Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${selectedBook.id}`}
          className="mb-6 text-sm text-neutral-500"
        >
          ← Back
        </Link>

        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
          Select verse
        </p>

        <h1 className="mb-6 text-3xl font-semibold text-neutral-900">
          {selectedBook.title} {chapterNumber}
        </h1>

        <div className="grid grid-cols-4 gap-3">
          {verses.map((verse) => (
            <Link
              key={verse}
              href={`/bible/${selectedBook.id}/${chapterNumber}/${verse}`}
              className="flex aspect-square items-center justify-center rounded-2xl border border-neutral-200 text-lg font-medium text-neutral-900 transition hover:border-neutral-400"
            >
              {verse}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
