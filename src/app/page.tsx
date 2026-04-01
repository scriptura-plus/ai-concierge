import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible/books";

const hebrewScriptures = BIBLE_BOOKS.slice(0, 39);
const greekScriptures = BIBLE_BOOKS.slice(39);

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-8 text-sm text-neutral-600">
        Select a book to begin your verse-based insight study.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
          Hebrew-Aramaic Scriptures
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {hebrewScriptures.map((book) => (
            <Link
              key={book.id}
              href={`/bible/${book.id}`}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-5 text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:shadow"
            >
              {book.title}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
          Christian Greek Scriptures
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {greekScriptures.map((book) => (
            <Link
              key={book.id}
              href={`/bible/${book.id}`}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-5 text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:shadow"
            >
              {book.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
