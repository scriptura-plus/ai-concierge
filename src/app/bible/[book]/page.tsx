import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookById } from '@/lib/bible/books'

type PageProps = {
  params: Promise<{
    book: string
  }>
}

export default async function ChapterSelectPage({ params }: PageProps) {
  const { book } = await params
  const selectedBook = getBookById(book)

  if (!selectedBook) {
    notFound()
  }

  const chapters = Array.from(
    { length: selectedBook.chapters },
    (_, index) => index + 1
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_40%,#eef2f7_100%)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href="/"
          className="mb-6 text-sm text-slate-500 transition hover:text-slate-700"
        >
          ← Back
        </Link>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Select chapter
        </p>

        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-950">
          {selectedBook.title}
        </h1>

        <div className="grid grid-cols-4 gap-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter}
              href={`/bible/${selectedBook.id}/${chapter}`}
              className="flex aspect-square items-center justify-center rounded-[14px] border border-slate-300 bg-white/88 text-lg font-medium text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:border-slate-400 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)] active:translate-y-[1px] active:scale-[0.975] active:shadow-[0_8px_16px_rgba(15,23,42,0.08)]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {chapter}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
