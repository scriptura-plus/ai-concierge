import Link from 'next/link'
import { BIBLE_BOOKS } from '@/lib/bible/books'

function BookGrid({
  title,
  books,
}: {
  title: string
  books: typeof BIBLE_BOOKS
}) {
  return (
    <section className="w-full">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/bible/${book.id}`}
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
          >
            {book.title}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const oldTestamentBooks = BIBLE_BOOKS
  const newTestamentBooks: typeof BIBLE_BOOKS = []

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
            Step 1
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Choose a Bible book</h1>
          <p className="mt-2 text-gray-600">
            Select a book to begin your verse-based insight study.
          </p>
        </header>

        <div className="space-y-10">
          <BookGrid title="Hebrew-Aramaic Scriptures" books={oldTestamentBooks} />
          <BookGrid title="Christian Greek Scriptures" books={newTestamentBooks} />
        </div>
      </div>
    </main>
  )
}
