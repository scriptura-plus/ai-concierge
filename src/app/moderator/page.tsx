'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BIBLE_BOOKS } from '@/lib/bible/books'

type BookOption = {
  id: string
  title: string
}

type InboxCountResponse = {
  pendingCount?: number
  error?: string
}

type SectionKey = 'ot' | 'nt'

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

function sanitizePositiveInteger(value: string) {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  const normalized = String(Number(digits))
  return normalized === '0' ? '' : normalized
}

function ruLabel(book: BookOption) {
  return RU_BOOK_LABELS[book.title] ?? book.title
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
    return {
      bg: 'linear-gradient(180deg,#6f5c3f 0%,#5c4a31 100%)',
      border: '#8c7550',
      text: '#fff8ea',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (historical.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#8e7858 0%,#786247 100%)',
      border: '#a18863',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.09)',
    }
  }

  if (wisdom.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#7f6748 0%,#6a553a 100%)',
      border: '#957a56',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (majorProphets.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#66543b 0%,#56462f 100%)',
      border: '#7a6547',
      text: '#fff8ea',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (minorProphets.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#746045 0%,#625138 100%)',
      border: '#8a724f',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (gospels.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#705d43 0%,#5e4e37 100%)',
      border: '#876f51',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (acts.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#988062 0%,#7f694f 100%)',
      border: '#ab906f',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.09)',
    }
  }

  if (pauline.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#877053 0%,#705c43 100%)',
      border: '#9b8160',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.09)',
    }
  }

  if (generalLetters.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#7c664b 0%,#67553e 100%)',
      border: '#917757',
      text: '#fff8ec',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  if (revelation.has(title)) {
    return {
      bg: 'linear-gradient(180deg,#645139 0%,#52432f 100%)',
      border: '#786145',
      text: '#fff8ea',
      glow: 'rgba(255,244,214,0.10)',
    }
  }

  return {
    bg: 'linear-gradient(180deg,#857055 0%,#6f5d45 100%)',
    border: '#987f60',
    text: '#fff8ec',
    glow: 'rgba(255,244,214,0.09)',
  }
}

function sectionButtonClasses(active: boolean) {
  return active
    ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-[0_8px_18px_rgba(28,25,23,0.16)]'
    : 'border-[#d7c39f] bg-[#fff7e7] text-stone-700 hover:bg-[#faefd9]'
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
    </div>
  )
}

function ParchmentPanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[30px] border border-[#ddc89f] p-5 shadow-[0_18px_40px_rgba(84,61,24,0.12),inset_0_1px_0_rgba(255,251,240,0.66)] ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at top left, rgba(255,249,231,0.92), transparent 34%),
          radial-gradient(circle at bottom right, rgba(220,192,139,0.18), transparent 30%),
          radial-gradient(circle at 18% 24%, rgba(140,112,67,0.05), transparent 12%),
          radial-gradient(circle at 82% 68%, rgba(140,112,67,0.05), transparent 12%),
          linear-gradient(180deg,#f4e7c6 0%,#eddcb6 48%,#e9d5ab 100%)
        `,
      }}
    >
      <div
        className="rounded-[24px] border border-[#d8c39a] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,250,239,0.74),inset_0_-10px_20px_rgba(177,140,82,0.07)]"
        style={{
          backgroundImage: `
            radial-gradient(circle at top, rgba(255,248,229,0.9), transparent 42%),
            radial-gradient(circle at 80% 20%, rgba(201,170,120,0.08), transparent 20%),
            radial-gradient(circle at 25% 75%, rgba(201,170,120,0.08), transparent 18%),
            linear-gradient(180deg,#fbf3df 0%,#f4e7cb 52%,#ecd9b8 100%)
          `,
        }}
      >
        {children}
      </div>
    </section>
  )
}

function BookCard({
  book,
  isSelected,
  onSelect,
}: {
  book: BookOption
  isSelected: boolean
  onSelect: (bookId: string) => void
}) {
  const tone = getBookTone(book.title)

  return (
    <button
      type="button"
      onClick={() => onSelect(book.id)}
      className="group relative overflow-hidden rounded-[16px] border px-4 py-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(15,23,42,0.14)] active:translate-y-[1px] active:scale-[0.99]"
      style={{
        borderColor: isSelected ? '#3f3120' : tone.border,
        color: tone.text,
        backgroundImage: isSelected
          ? `
            radial-gradient(circle at top left, rgba(255,246,220,0.16), transparent 38%),
            radial-gradient(circle at bottom right, rgba(255,246,220,0.08), transparent 34%),
            linear-gradient(180deg,#4c3b28 0%,#382b1d 100%)
          `
          : `
            radial-gradient(circle at top left, ${tone.glow}, transparent 38%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)),
            ${tone.bg}
          `,
        boxShadow: isSelected
          ? '0 14px 26px rgba(37,27,16,0.24), inset 0 1px 0 rgba(255,247,224,0.14)'
          : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: 'rgba(255,255,255,0.32)' }}
      />
      <div
        className="pointer-events-none absolute right-2 top-2 h-6 w-6 rounded-full border opacity-40"
        style={{ borderColor: 'rgba(255,255,255,0.45)' }}
      />
      <span className="relative block text-[1.02rem] font-medium leading-6 tracking-[0.01em]">
        {ruLabel(book)}
      </span>
    </button>
  )
}

export default function ModeratorIndexPage() {
  const [selectedSection, setSelectedSection] = useState<SectionKey>('ot')
  const [book, setBook] = useState(hebrewScriptures[0]?.id ?? 'genesis')
  const [chapter, setChapter] = useState('3')
  const [verse, setVerse] = useState('16')
  const [error, setError] = useState('')
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [countError, setCountError] = useState('')

  const selectedBooks = selectedSection === 'ot' ? hebrewScriptures : greekScriptures

  const selectedBook = useMemo(
    () => BIBLE_BOOKS.find((item) => item.id === book) ?? BIBLE_BOOKS[0],
    [book]
  )

  const workspaceHref = useMemo(() => {
    if (!book || !chapter || !verse) return ''
    return `/moderator/workspace/${book}/${chapter}/${verse}`
  }, [book, chapter, verse])

  useEffect(() => {
    if (!selectedBooks.some((item) => item.id === book)) {
      setBook(selectedBooks[0]?.id ?? '')
    }
  }, [selectedBooks, book])

  useEffect(() => {
    let isCancelled = false

    async function loadInboxCount() {
      try {
        const res = await fetch('/api/moderator/unfolds/count', {
          cache: 'no-store',
        })

        const data: InboxCountResponse = await res.json()

        if (isCancelled) return

        if (!res.ok) {
          setCountError(data.error || 'Не удалось загрузить очередь unfold.')
          setPendingCount(null)
          return
        }

        setPendingCount(typeof data.pendingCount === 'number' ? data.pendingCount : 0)
        setCountError('')
      } catch {
        if (isCancelled) return
        setCountError('Не удалось загрузить очередь unfold.')
        setPendingCount(null)
      }
    }

    void loadInboxCount()

    return () => {
      isCancelled = true
    }
  }, [])

  function handleOpenVerseWorkspace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!book || !chapter || !verse) {
      setError('Выбери книгу, главу и стих.')
      return
    }

    setError('')
    window.location.href = workspaceHref
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f1e2_0%,#efe5cf_46%,#f5efe3_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Модератор
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Рабочий кабинет
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Здесь два маршрута работы: открыть конкретный стих и перейти в рабочую среду или
              отдельно разобрать входящие unfold-сигналы.
            </p>
          </div>

          <Link
            href="/moderator"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Домой
          </Link>
        </div>

        <ParchmentPanel className="mb-5">
          <SectionHeader eyebrow="Verse Workspace" title="Начать работу со стихом" />

          <p className="max-w-4xl text-sm leading-6 text-stone-600">
            Сначала выбери книгу из полной карты Писания, а затем укажи главу и стих. После этого
            откроется отдельный модераторский workspace по стиху, а не обычный пользовательский
            reading screen.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedSection('ot')}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${sectionButtonClasses(
                selectedSection === 'ot'
              )}`}
            >
              Еврейско-арамейские Писания
            </button>

            <button
              type="button"
              onClick={() => setSelectedSection('nt')}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${sectionButtonClasses(
                selectedSection === 'nt'
              )}`}
            >
              Христианские Греческие Писания
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-[1.45rem] font-semibold tracking-tight text-stone-900">
              {selectedSection === 'ot'
                ? 'Еврейско-арамейские Писания'
                : 'Христианские Греческие Писания'}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {selectedBooks.map((item) => (
                <BookCard
                  key={item.id}
                  book={item}
                  isSelected={item.id === book}
                  onSelect={(bookId) => {
                    setBook(bookId)
                    setError('')
                  }}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleOpenVerseWorkspace} className="mt-6">
            <div className="grid gap-4 md:grid-cols-[1.25fr_0.65fr_0.65fr_auto]">
              <div className="rounded-[18px] border border-[#d8c39a] bg-[linear-gradient(180deg,#fff9eb_0%,#f8edd5_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,251,241,0.85)]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Выбранная книга
                </span>
                <p className="mt-2 text-lg font-semibold text-stone-900">
                  {selectedBook ? ruLabel(selectedBook) : '—'}
                </p>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Глава
                </span>
                <input
                  value={chapter}
                  onChange={(e) => setChapter(sanitizePositiveInteger(e.target.value))}
                  inputMode="numeric"
                  placeholder="3"
                  className="mt-2 w-full rounded-[18px] border border-[#d2bea0] bg-[#fffaf1] px-4 py-3 text-[0.98rem] text-stone-900 outline-none transition focus:border-stone-500"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Стих
                </span>
                <input
                  value={verse}
                  onChange={(e) => setVerse(sanitizePositiveInteger(e.target.value))}
                  inputMode="numeric"
                  placeholder="16"
                  className="mt-2 w-full rounded-[18px] border border-[#d2bea0] bg-[#fffaf1] px-4 py-3 text-[0.98rem] text-stone-900 outline-none transition focus:border-stone-500"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-[18px] bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                >
                  Начать работу
                </button>
              </div>
            </div>
          </form>

          <div className="mt-4 rounded-[18px] border border-[#d8c39a] bg-[linear-gradient(180deg,#fff9eb_0%,#f8edd5_100%)] px-4 py-3 text-sm text-stone-700 shadow-[inset_0_1px_0_rgba(255,251,241,0.85)]">
            Текущий выбор:{' '}
            <span className="font-semibold text-stone-900">
              {selectedBook ? ruLabel(selectedBook) : '—'} {chapter || '—'}:{verse || '—'}
            </span>
          </div>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </ParchmentPanel>

        <ParchmentPanel className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Очередь сигналов
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                Входящие unfold
              </h2>

              {countError ? (
                <p className="mt-2 text-sm leading-6 text-red-700">{countError}</p>
              ) : pendingCount === null ? (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Загружаем состояние очереди…
                </p>
              ) : pendingCount > 0 ? (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Сейчас ждут обзора:{' '}
                  <span className="font-semibold text-stone-900">{pendingCount}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Свежих unfold-сигналов сейчас нет.
                </p>
              )}
            </div>

            <Link
              href="/moderator/unfolds"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              Открыть inbox
            </Link>
          </div>
        </ParchmentPanel>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/moderator/insights"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Библиотека сохранённых карточек
          </Link>
        </div>
      </div>
    </main>
  )
}
