import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible/books";

const hebrewScriptures = BIBLE_BOOKS.slice(0, 39);
const greekScriptures = BIBLE_BOOKS.slice(39);

function getBookTone(title: string): string {
  const torah = new Set([
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
  ]);

  const historical = new Set([
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
  ]);

  const wisdom = new Set([
    "Job",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
  ]);

  const majorProphets = new Set([
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
  ]);

  const minorProphets = new Set([
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
  ]);

  const gospels = new Set([
    "Matthew",
    "Mark",
    "Luke",
    "John",
  ]);

  const acts = new Set(["Acts"]);

  const pauline = new Set([
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
  ]);

  const generalLetters = new Set([
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
  ]);

  const revelation = new Set(["Revelation"]);

  if (torah.has(title)) {
    return "border-slate-700 bg-slate-900 text-slate-50 hover:border-slate-600 hover:bg-slate-800";
  }

  if (historical.has(title)) {
    return "border-blue-700 bg-blue-800 text-blue-50 hover:border-blue-600 hover:bg-blue-700";
  }

  if (wisdom.has(title)) {
    return "border-indigo-700 bg-indigo-800 text-indigo-50 hover:border-indigo-600 hover:bg-indigo-700";
  }

  if (majorProphets.has(title)) {
    return "border-sky-700 bg-sky-800 text-sky-50 hover:border-sky-600 hover:bg-sky-700";
  }

  if (minorProphets.has(title)) {
    return "border-cyan-700 bg-cyan-800 text-cyan-50 hover:border-cyan-600 hover:bg-cyan-700";
  }

  if (gospels.has(title)) {
    return "border-blue-800 bg-blue-900 text-blue-50 hover:border-blue-700 hover:bg-blue-800";
  }

  if (acts.has(title)) {
    return "border-indigo-600 bg-indigo-700 text-indigo-50 hover:border-indigo-500 hover:bg-indigo-600";
  }

  if (pauline.has(title)) {
    return "border-sky-600 bg-sky-700 text-sky-50 hover:border-sky-500 hover:bg-sky-600";
  }

  if (generalLetters.has(title)) {
    return "border-cyan-600 bg-cyan-700 text-cyan-50 hover:border-cyan-500 hover:bg-cyan-600";
  }

  if (revelation.has(title)) {
    return "border-slate-800 bg-slate-950 text-slate-50 hover:border-slate-700 hover:bg-slate-900";
  }

  return "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:shadow";
}

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
              className={`rounded-2xl border px-4 py-5 shadow-sm transition hover:shadow ${getBookTone(
                book.title
              )}`}
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
              className={`rounded-2xl border px-4 py-5 shadow-sm transition hover:shadow ${getBookTone(
                book.title
              )}`}
            >
              {book.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
