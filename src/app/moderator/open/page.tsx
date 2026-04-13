import Link from 'next/link'
import { BIBLE_BOOKS } from '@/lib/bible/books'

const hebrewScriptures = BIBLE_BOOKS.slice(0, 39)
const greekScriptures = BIBLE_BOOKS.slice(39)

function getBookTone(title: string) {
  const torah = new Set([
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
  ])

  const historical = new Set([
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
  ])

  const wisdom = new Set([
    'Job',
    'Psalms',
    'Proverbs',
    'Ecclesiastes',
    'Song of Solomon',
  ])

  const majorProphets = new Set([
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
  ])

  const minorProphets = new Set([
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
  ])

  const gospels = new Set(['Matthew', 'Mark', 'Luke', 'John'])
  const acts = new Set(['Acts'])

  const pauline = new Set([
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
  ])

  const generalLetters = new Set([
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
  ])

  const revelation = new Set(['Revelation'])

  if (torah.has(title)) {
    return { background: '#6D5BA8', border: '#5F4D96', color: '#FBFAFF' }
  }

  if (historical.has(title)) {
    return { background: '#7D6CB5', border: '#6E5EA2', color: '#FBFAFF' }
  }

  if (wisdom.has(title)) {
    return { background: '#7463AE', border: '#65559A', color: '#FBFAFF' }
  }

  if (majorProphets.has(title)) {
    return { background: '#65539A', border: '#574786', color: '#FBFAFF' }
  }

  if (minorProphets.has(title)) {
    return { background: '#705DA8', border: '#614F94', color: '#FBFAFF' }
  }

  if (gospels.has(title)) {
    return { background: '#6B589F', border: '#5B4C89', color: '#FBFAFF' }
  }

  if (acts.has(title)) {
    return { background: '#8774BE', border: '#7564A8', color: '#FBFAFF' }
  }

  if (pauline.has(title)) {
    return { background: '#7867B0', border: '#69589D', color: '#FBFAFF' }
  }

  if (generalLetters.has(title)) {
    return { background: '#715FA6', border: '#624F92', color: '#FBFAFF' }
  }

  if (revelation.has(title)) {
    return { background: '#694F96', border: '#5A447F', color: '#FBFAFF' }
  }

  return { background: '#7867B0', border: '#69589D', color: '#FBFAFF' }
}

function BookGrid({ books }: { books: typeof BIBLE_BOOKS }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7 lg:grid-cols-8">
      {books.map((book) => {
        const tone = getBookTone(book.title)

        return (
          <Link
            key={book.id}
            href={`/moderator/open/${book.id}`}
            aria-label={book.title}
            title={book.title}
            className="group relative overflow-hidden rounded-[10px] border px-1.5 py-4 text-center shadow-[0_10px_20px_rgba(91,33,182,0.10)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(91,33,182,0.16)] active:scale-[0.985] active:shadow-[0_8px_16px_rgba(91,33,182,0.10)]"
            style={{
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{ background: 'rgba(255,255,255,0.34)' }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at top left, rgba(255,255,255,0.10), transparent 42%)',
              }}
            />
            <span className="relative block text-[0.92rem] font-medium leading-5 tracking-[0.01em]">
              {book.shortTitle}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function ModeratorOpenBookPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#f5f0fb_48%,#f8f4fc_100%)]">
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">
              Moderator
            </p>
            <h1 className="text-[1.7rem] font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Выбрать стих вручную
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Выбери книгу, затем главу и стих. После этого откроется тот же moderator review, где
              можно менять порядок карточек, дорабатывать их и управлять набором.
            </p>
          </div>

          <Link
            href="/moderator"
            className="rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
          >
            ← Назад к очереди
          </Link>
        </div>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Hebrew-Aramaic Scriptures
            </h2>
          </div>

          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Christian Greek Scriptures
            </h2>
          </div>

          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  )
}
