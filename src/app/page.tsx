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
    return { background: "#44576B", border: "#39495A", color: "#F8FAFC" };
  }

  if (historical.has(title)) {
    return { background: "#647A91", border: "#56697E", color: "#F8FAFC" };
  }

  if (wisdom.has(title)) {
    return { background: "#566A80", border: "#495B70", color: "#F8FAFC" };
  }

  if (majorProphets.has(title)) {
    return { background: "#3F5266", border: "#344454", color: "#F8FAFC" };
  }

  if (minorProphets.has(title)) {
    return { background: "#4D6176", border: "#415365", color: "#F8FAFC" };
  }

  if (gospels.has(title)) {
    return { background: "#495D72", border: "#3E5062", color: "#F8FAFC" };
  }

  if (acts.has(title)) {
    return { background: "#70869D", border: "#5E7287", color: "#F8FAFC" };
  }

  if (pauline.has(title)) {
    return { background: "#5D748B", border: "#4F6479", color: "#F8FAFC" };
  }

  if (generalLetters.has(title)) {
    return { background: "#52687E", border: "#45586C", color: "#F8FAFC" };
  }

  if (revelation.has(title)) {
    return { background: "#476075", border: "#3B5062", color: "#F8FAFC" };
  }

  return { background: "#5D748B", border: "#4F6479", color: "#F8FAFC" };
}

function BookGrid({ books }: { books: typeof BIBLE_BOOKS }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7 lg:grid-cols-8">
      {books.map((book) => {
        const tone = getBookTone(book.title);

        return (
          <Link
            key={book.id}
            href={`/bible/${book.id}`}
            aria-label={book.title}
            title={book.title}
            className="group relative overflow-hidden rounded-[10px] border px-1.5 py-4 text-center shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(15,23,42,0.14)] active:scale-[0.985] active:shadow-[0_6px_14px_rgba(15,23,42,0.10)]"
            style={{
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{ background: "rgba(255,255,255,0.34)" }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.10), transparent 42%)",
              }}
            />
            <span className="relative block text-[0.92rem] font-medium leading-5 tracking-[0.01em]">
              {book.shortTitle}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_40%,#eef2f7_100%)]">
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Hebrew-Aramaic Scriptures
            </h2>
          </div>

          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Christian Greek Scriptures
            </h2>
          </div>

          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  );
}
