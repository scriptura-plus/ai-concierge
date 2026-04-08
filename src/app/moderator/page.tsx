'use client'

import Link from 'next/link'
import { BIBLE_BOOKS } from '@/lib/bible/books'

const hebrewScriptures = BIBLE_BOOKS.slice(0, 39)
const greekScriptures = BIBLE_BOOKS.slice(39)

const RU_BOOK_LABELS: Record<string, string> = {
  Genesis: 'Бытие',
  Exodus: 'Исход',
  Leviticus: 'Левит',
  Numbers: 'Числа',
  Deuteronomy: 'Второзаконие',
  Joshua: 'Иисус Навин',
  Judges: 'Судей',
  Ruth: 'Руфь',
  '1 Samuel': '1 Самуила',
  '2 Samuel': '2 Самуила',
  '1 Kings': '1 Царей',
  '2 Kings': '2 Царей',
  '1 Chronicles': '1 Летопись',
  '2 Chronicles': '2 Летопись',
  Ezra: 'Ездра',
  Nehemiah: 'Неемия',
  Esther: 'Эсфирь',
  Job: 'Иов',
  Psalms: 'Псалмы',
  Proverbs: 'Притчи',
  Ecclesiastes: 'Экклезиаст',
  'Song of Solomon': 'Песня Соломона',
  Isaiah: 'Исаия',
  Jeremiah: 'Иеремия',
  Lamentations: 'Плач Иеремии',
  Ezekiel: 'Иезекииль',
  Daniel: 'Даниил',
  Hosea: 'Осия',
  Joel: 'Иоиль',
  Amos: 'Амос',
  Obadiah: 'Авдий',
  Jonah: 'Иона',
  Micah: 'Михей',
  Nahum: 'Наум',
  Habakkuk: 'Аввакум',
  Zephaniah: 'Софония',
  Haggai: 'Аггей',
  Zechariah: 'Захария',
  Malachi: 'Малахия',
  Matthew: 'Матфея',
  Mark: 'Марка',
  Luke: 'Луки',
  John: 'Иоанна',
  Acts: 'Деяния',
  Romans: 'Римлянам',
  '1 Corinthians': '1 Коринфянам',
  '2 Corinthians': '2 Коринфянам',
  Galatians: 'Галатам',
  Ephesians: 'Эфесянам',
  Philippians: 'Филиппийцам',
  Colossians: 'Колоссянам',
  '1 Thessalonians': '1 Фессалоникийцам',
  '2 Thessalonians': '2 Фессалоникийцам',
  '1 Timothy': '1 Тимофею',
  '2 Timothy': '2 Тимофею',
  Titus: 'Титу',
  Philemon: 'Филимону',
  Hebrews: 'Евреям',
  James: 'Иакова',
  '1 Peter': '1 Петра',
  '2 Peter': '2 Петра',
  '1 John': '1 Иоанна',
  '2 John': '2 Иоанна',
  '3 John': '3 Иоанна',
  Jude: 'Иуды',
  Revelation: 'Откровение',
}

function ruTitle(title: string) {
  return RU_BOOK_LABELS[title] ?? title
}

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
    return { background: '#6d5a3e', border: '#5b4932', color: '#f9f3e7' }
  }

  if (historical.has(title)) {
    return { background: '#857055', border: '#6e5d46', color: '#fbf5ea' }
  }

  if (wisdom.has(title)) {
    return { background: '#786347', border: '#63523a', color: '#faf4e8' }
  }

  if (majorProphets.has(title)) {
    return { background: '#5f4e39', border: '#4f4130', color: '#f9f2e5' }
  }

  if (minorProphets.has(title)) {
    return { background: '#706045', border: '#5e513b', color: '#faf4e8' }
  }

  if (gospels.has(title)) {
    return { background: '#675640', border: '#564734', color: '#faf3e8' }
  }

  if (acts.has(title)) {
    return { background: '#90785c', border: '#77624b', color: '#fbf5ea' }
  }

  if (pauline.has(title)) {
    return { background: '#7e694f', border: '#695840', color: '#fbf5ea' }
  }

  if (generalLetters.has(title)) {
    return { background: '#726047', border: '#5f513c', color: '#faf4e8' }
  }

  if (revelation.has(title)) {
    return { background: '#5a4935', border: '#4a3d2c', color: '#f8f1e4' }
  }

  return { background: '#7d684e', border: '#68573f', color: '#fbf5ea' }
}

function BookGrid({ books }: { books: typeof BIBLE_BOOKS }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((book) => {
        const tone = getBookTone(book.title)

        return (
          <Link
            key={book.id}
            href={`/moderator/workspace/${book.id}`}
            className="group relative overflow-hidden rounded-[14px] border px-4 py-5 shadow-[0_10px_22px_rgba(49,35,16,0.08)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0_16px_28px_rgba(49,35,16,0.14)] active:translate-y-[1px] active:scale-[0.98]"
            style={{
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
              style={{ background: 'rgba(255,255,255,0.24)' }}
            />
            <span className="relative block text-[0.98rem] font-medium leading-6 tracking-[0.01em]">
              {ruTitle(book.title)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function ModeratorIndexPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f1e2_0%,#efe5cf_46%,#f5efe3_100%)] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Модератор
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              Рабочий кабинет
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              Выбери книгу, затем главу и стих. После этого откроется модераторский workspace по
              нужному месту Писания.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Unfold inbox
            </Link>

            <Link
              href="/moderator/insights"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Curated insights
            </Link>
          </div>
        </div>

        <section className="mb-14">
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Раздел I
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
              Еврейско-арамейские Писания
            </h2>
          </div>

          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Раздел II
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
              Христианские Греческие Писания
            </h2>
          </div>

          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  )
}
