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
    return { background: '#5B5A60', border: '#4E4D53', color: '#F7F7F4' }
  }

  if (historical.has(title)) {
    return { background: '#6B6763', border: '#5D5956', color: '#F7F6F2' }
  }

  if (wisdom.has(title)) {
    return { background: '#635F66', border: '#56525A', color: '#F7F6F3' }
  }

  if (majorProphets.has(title)) {
    return { background: '#4F5258', border: '#45474C', color: '#F8F7F4' }
  }

  if (minorProphets.has(title)) {
    return { background: '#5D615C', border: '#50534F', color: '#F8F7F3' }
  }

  if (gospels.has(title)) {
    return { background: '#5B6068', border: '#4E535A', color: '#F8F7F4' }
  }

  if (acts.has(title)) {
    return { background: '#74717A', border: '#63606A', color: '#F8F7F4' }
  }

  if (pauline.has(title)) {
    return { background: '#69656E', border: '#5A5760', color: '#F8F7F4' }
  }

  if (generalLetters.has(title)) {
    return { background: '#5F646B', border: '#51555B', color: '#F8F7F4' }
  }

  if (revelation.has(title)) {
    return { background: '#4A4E55', border: '#404349', color: '#F8F7F4' }
  }

  return { background: '#66626B', border: '#59555E', color: '#F8F7F4' }
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
            className="group relative overflow-hidden rounded-[18px] border px-4 py-5 shadow-[0_6px_18px_rgba(32,28,24,0.08)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(32,28,24,0.12)] active:scale-[0.99]"
            style={{
              backgroundColor: tone.background,
              borderColor: tone.border,
              color: tone.color,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-35"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            />
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_40%)]" />
            <span className="relative block text-[1rem] font-medium leading-6 tracking-[0.01em]">
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F5EF_0%,#F3F0E8_46%,#F6F3EC_100%)] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Модератор
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              Рабочий кабинет
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#FAF8F2] px-4 py-2 text-sm font-medium text-stone-700 transition-colors duration-200 hover:bg-[#F2EEE5]"
            >
              Входящие unfold
            </Link>

            <Link
              href="/moderator/insights"
              className="rounded-full border border-stone-300 bg-[#FAF8F2] px-4 py-2 text-sm font-medium text-stone-700 transition-colors duration-200 hover:bg-[#F2EEE5]"
            >
              Сохранённые карточки
            </Link>
          </div>
        </div>

        <section className="mb-14">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-stone-950">
            Еврейско-арамейские Писания
          </h2>
          <BookGrid books={hebrewScriptures} />
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-stone-950">
            Христианские Греческие Писания
          </h2>
          <BookGrid books={greekScriptures} />
        </section>
      </div>
    </main>
  )
}
