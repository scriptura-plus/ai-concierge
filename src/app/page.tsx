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
    return { background: "#495d72", border: "#3f5163", color: "#f8fafc" };
  }

  if (historical.has(title)) {
    return { background: "#5f758d", border: "#53677d", color: "#f8fafc" };
  }

  if (wisdom.has(title)) {
    return { background: "#55697f", border: "#495c70", color: "#f8fafc" };
  }

  if (majorProphets.has(title)) {
    return { background: "#44586d", border: "#394b5d", color: "#f8fafc" };
  }

  if (minorProphets.has(title)) {
    return { background: "#50657b", border: "#44576a", color: "#f8fafc" };
  }

  if (gospels.has(title)) {
    return { background: "#4c6076", border: "#415365", color: "#f8fafc" };
  }

  if (acts.has(title)) {
    return { background: "#688098", border: "#5a7086", color: "#f8fafc" };
  }

  if (pauline.has(title)) {
    return { background: "#5a7188", border: "#4d6277", color: "#f8fafc" };
  }

  if (generalLetters.has(title)) {
    return { background: "#52687f", border: "#465a6e", color: "#f8fafc" };
  }

  if (revelation.has(title)) {
    return { background: "#486075", border: "#3d5163", color: "#f8fafc" };
  }

  return { background: "#5b7086", border: "#4f6276", color: "#f8fafc" };
}

function BookGrid({
  books,
}: {
  books: typeof BIBLE_BOOKS;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((book) => {
        const tone = getBookTone(book.title);

        return (
          <Link
            key={book.id}
            href={`/bible/${book.id}`}
            className="group relative overflow-hidden rounded-[22px] border px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
            style={{
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{ background: "rgba(255,255,255,0.32)" }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.12), transparent 45%)",
              }}
            />
            <span className="relative block text-[0.98rem] font-medium leading-6 tracking-[0.01em]">
              {book.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_42%,#eef2f7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-12 overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(245,248,252,0.94)_100%)] px-6 py-8 shadow-[0_20px_50px_rgba(15,23,42,0.07)] sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Scriptura+
            </p>

            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Explore Scripture with depth, structure, and clarity.
            </h1>

            <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-slate-600 sm:text-[1.06rem]">
              Select a book to begin a verse-based study experience designed to
              feel calm, precise, and intellectually rewarding from the first tap.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                66 books
              </div>
              <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                Structured by canon
              </div>
              <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                Verse-first research
              </div>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Section I
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Hebrew-Aramaic Scriptures
              </h2>
            </div>

            <div className="hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm sm:block">
              Law · History · Wisdom · Prophets
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Law
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              History
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Wisdom
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Prophets
            </span>
          </div>

          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Section II
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Christian Greek Scriptures
              </h2>
            </div>

            <div className="hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm sm:block">
              Gospels · Acts · Letters · Revelation
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Gospels
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Acts
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Letters
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Revelation
            </span>
          </div>

          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  );
}
