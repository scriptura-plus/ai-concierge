import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookById } from '@/lib/bible/books'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
  }>
}

export default async function ModeratorVerseSelectPage({ params }: PageProps) {
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

  const verseCount = selectedBook.verseCounts[chapterNumber - 1]

  if (!verseCount) {
    notFound()
  }

  const verses = Array.from({ length: verseCount }, (_, index) => index + 1)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#f5f0fb_48%,#f8f4fc_100%)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/moderator/open/${selectedBook.id}`}
          className="mb-6 text-sm text-violet-500 transition hover:text-violet-700"
        >
          ← Назад
        </Link>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">
          Moderator · Select verse
        </p>

        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-stone-950">
          {selectedBook.title} {chapterNumber}
        </h1>

        <div className="grid grid-cols-4 gap-3">
          {verses.map((verse) => (
            <Link
              key={verse}
              href={`/moderator/review/${selectedBook.id}/${chapterNumber}/${verse}`}
              className="flex aspect-square items-center justify-center rounded-[14px] border border-violet-200 bg-white/88 text-lg font-medium text-violet-950 shadow-[0_10px_22px_rgba(91,33,182,0.08)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:border-violet-300 hover:shadow-[0_16px_30px_rgba(91,33,182,0.14)] active:translate-y-[1px] active:scale-[0.975] active:shadow-[0_8px_16px_rgba(91,33,182,0.10)]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {verse}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
