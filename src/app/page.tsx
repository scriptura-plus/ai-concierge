import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible/books";

const hebrewScriptures = BIBLE_BOOKS.slice(0, 39);
const greekScriptures = BIBLE_BOOKS.slice(39);

function getBookTone(title: string) {
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

  const gospels = new Set(["Matthew", "Mark", "Luke", "John"]);
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
    return { background: "#4e6176", border: "#435567", color: "#f8fafc" };
  }

  if (historical.has(title)) {
    return { background: "#5c7188", border: "#4f6379", color: "#f8fafc" };
  }

  if (wisdom.has(title)) {
    return { background: "#55697f", border: "#4a5d72", color: "#f8fafc" };
  }

  if (majorProphets.has(title)) {
    return { background: "#495d73", border: "#3f5266", color: "#f8fafc" };
  }

  if (minorProphets.has(title)) {
    return { background: "#52667c", border: "#46596d", color: "#f8fafc" };
  }

  if (gospels.has(title)) {
    return { background: "#506378", border: "#44576a", color: "#f8fafc" };
  }

  if (acts.has(title)) {
    return { background: "#62778e", border: "#556980", color: "#f8fafc" };
  }

  if (pauline.has(title)) {
    return { background: "#5a6f86", border: "#4e6278", color: "#f8fafc" };
  }

  if (generalLetters.has(title)) {
    return { background: "#546980", border: "#485b70", color: "#f8fafc" };
  }

  if (revelation.has(title)) {
    return { background: "#4b5f74", border: "#405366", color: "#f8fafc" };
  }

  return { background: "#5b7086", border: "#4f6276", color: "#f8fafc" };
}

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#f7f8fb] px-4 py-6">
      <p className="mb-8 text-sm text-slate-600">
        Select a book to begin your verse-based insight study.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-slate-900">
          Hebrew-Aramaic Scriptures
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {hebrewScriptures.map((book) => {
            const tone = getBookTone(book.title);

            return (
              <Link
                key={book.id}
                href={`/bible/${book.id}`}
                className="rounded-2xl border px-4 py-5 shadow-sm transition hover:shadow-md"
                style={{
                  backgroundColor: tone.background,
                  borderColor: tone.border,
                  color: tone.color,
                }}
              >
                {book.title}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-slate-900">
          Christian Greek Scriptures
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {greekScriptures.map((book) => {
            const tone = getBookTone(book.title);

            return (
              <Link
                key={book.id}
                href={`/bible/${book.id}`}
                className="rounded-2xl border px-4 py-5 shadow-sm transition hover:shadow-md"
                style={{
                  backgroundColor: tone.background,
                  borderColor: tone.border,
                  color: tone.color,
                }}
              >
                {book.title}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
