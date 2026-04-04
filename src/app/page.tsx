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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((book) => {
        const tone = getBookTone(book.title);

        return (
          <Link
            key={book.id}
            href={`/bible/${book.id}`}
            className="group relative overflow-hidden rounded-[14px] border px-4 py-5 shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0_18px_34px_rgba(15,23,42,0.16)] active:translate-y-[1px] active:scale-[0.975] active:shadow-[0_8px_16px_rgba(15,23,42,0.12)]"
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
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.10), transparent 42%)",
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fb_40%,#eef2f7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-14">
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Section I
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Hebrew-Aramaic Scriptures
            </h2>
          </div>

          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Section II
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Christian Greek Scriptures
            </h2>
          </div>

          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  );
}
