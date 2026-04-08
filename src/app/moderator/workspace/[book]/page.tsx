import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookById } from '@/lib/bible/books'

type PageProps = {
  params: Promise<{
    book: string
  }>
}

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

type Tone = {
  background: string
  border: string
  color: string
}

function getChapterTone(title: string): Tone {
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

export default async function ModeratorChapterSelectPage({ params }: PageProps) {
  const { book } = await params
  const selectedBook = getBookById(book)

  if (!selectedBook) {
    notFound()
  }

  const tone = getChapterTone(selectedBook.title)

  const chapters = Array.from(
    { length: selectedBook.chapters },
    (_, index) => index + 1
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F5EF_0%,#F3F0E8_46%,#F6F3EC_100%)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href="/moderator"
          className="mb-6 text-sm text-stone-500 transition-colors duration-200 hover:text-stone-700"
        >
          ← Назад
        </Link>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
          Выбор главы
        </p>

        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-stone-950">
          {ruTitle(selectedBook.title)}
        </h1>

        <div className="grid grid-cols-4 gap-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter}
              href={`/moderator/workspace/${selectedBook.id}/${chapter}`}
              className="flex aspect-square items-center justify-center rounded-[18px] border text-lg font-medium shadow-[0_6px_18px_rgba(32,28,24,0.08)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(32,28,24,0.12)] active:scale-[0.99]"
              style={{
                backgroundColor: tone.background,
                borderColor: tone.border,
                color: tone.color,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {chapter}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
