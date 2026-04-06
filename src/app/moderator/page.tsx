'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type BookOption = {
  slug: string
  label: string
}

const BOOKS: BookOption[] = [
  { slug: 'genesis', label: 'Genesis' },
  { slug: 'exodus', label: 'Exodus' },
  { slug: 'leviticus', label: 'Leviticus' },
  { slug: 'numbers', label: 'Numbers' },
  { slug: 'deuteronomy', label: 'Deuteronomy' },
  { slug: 'joshua', label: 'Joshua' },
  { slug: 'judges', label: 'Judges' },
  { slug: 'ruth', label: 'Ruth' },
  { slug: '1-samuel', label: '1 Samuel' },
  { slug: '2-samuel', label: '2 Samuel' },
  { slug: '1-kings', label: '1 Kings' },
  { slug: '2-kings', label: '2 Kings' },
  { slug: '1-chronicles', label: '1 Chronicles' },
  { slug: '2-chronicles', label: '2 Chronicles' },
  { slug: 'ezra', label: 'Ezra' },
  { slug: 'nehemiah', label: 'Nehemiah' },
  { slug: 'esther', label: 'Esther' },
  { slug: 'job', label: 'Job' },
  { slug: 'psalms', label: 'Psalms' },
  { slug: 'proverbs', label: 'Proverbs' },
  { slug: 'ecclesiastes', label: 'Ecclesiastes' },
  { slug: 'song-of-solomon', label: 'Song of Solomon' },
  { slug: 'isaiah', label: 'Isaiah' },
  { slug: 'jeremiah', label: 'Jeremiah' },
  { slug: 'lamentations', label: 'Lamentations' },
  { slug: 'ezekiel', label: 'Ezekiel' },
  { slug: 'daniel', label: 'Daniel' },
  { slug: 'hosea', label: 'Hosea' },
  { slug: 'joel', label: 'Joel' },
  { slug: 'amos', label: 'Amos' },
  { slug: 'obadiah', label: 'Obadiah' },
  { slug: 'jonah', label: 'Jonah' },
  { slug: 'micah', label: 'Micah' },
  { slug: 'nahum', label: 'Nahum' },
  { slug: 'habakkuk', label: 'Habakkuk' },
  { slug: 'zephaniah', label: 'Zephaniah' },
  { slug: 'haggai', label: 'Haggai' },
  { slug: 'zechariah', label: 'Zechariah' },
  { slug: 'malachi', label: 'Malachi' },
  { slug: 'matthew', label: 'Matthew' },
  { slug: 'mark', label: 'Mark' },
  { slug: 'luke', label: 'Luke' },
  { slug: 'john', label: 'John' },
  { slug: 'acts', label: 'Acts' },
  { slug: 'romans', label: 'Romans' },
  { slug: '1-corinthians', label: '1 Corinthians' },
  { slug: '2-corinthians', label: '2 Corinthians' },
  { slug: 'galatians', label: 'Galatians' },
  { slug: 'ephesians', label: 'Ephesians' },
  { slug: 'philippians', label: 'Philippians' },
  { slug: 'colossians', label: 'Colossians' },
  { slug: '1-thessalonians', label: '1 Thessalonians' },
  { slug: '2-thessalonians', label: '2 Thessalonians' },
  { slug: '1-timothy', label: '1 Timothy' },
  { slug: '2-timothy', label: '2 Timothy' },
  { slug: 'titus', label: 'Titus' },
  { slug: 'philemon', label: 'Philemon' },
  { slug: 'hebrews', label: 'Hebrews' },
  { slug: 'james', label: 'James' },
  { slug: '1-peter', label: '1 Peter' },
  { slug: '2-peter', label: '2 Peter' },
  { slug: '1-john', label: '1 John' },
  { slug: '2-john', label: '2 John' },
  { slug: '3-john', label: '3 John' },
  { slug: 'jude', label: 'Jude' },
  { slug: 'revelation', label: 'Revelation' },
]

function sanitizePositiveInteger(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return ''
  const normalized = String(Number(digits))
  return normalized === '0' ? '' : normalized
}

export default function ModeratorIndexPage() {
  const [book, setBook] = useState('john')
  const [chapter, setChapter] = useState('3')
  const [verse, setVerse] = useState('16')
  const [error, setError] = useState('')

  const selectedBook = useMemo(
    () => BOOKS.find((item) => item.slug === book) ?? BOOKS[0],
    [book]
  )

  const workspaceHref = useMemo(() => {
    if (!book || !chapter || !verse) return ''
    return `/bible/${book}/${chapter}/${verse}`
  }, [book, chapter, verse])

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Модератор
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Рабочий кабинет
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Новая логика кабинета: модератор работает не только от unfold-событий, а от самого
            стиха. Сначала открывается конкретный стих, затем уже идёт поиск, огранка и сохранение
            сильных карточек.
          </p>
        </div>

        <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Verse Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                Открыть стих как рабочую среду
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                Это первый переход к новой модели. Пока в качестве безопасного шага стих
                открывается через основной reading screen, где уже работают saved cards, линзы,
                unfold и двухфазная загрузка. Следующий этап — отдельный полноценный workspace на
                один стих.
              </p>
            </div>

            <form
              onSubmit={handleOpenVerseWorkspace}
              className="grid gap-4 md:grid-cols-[1.5fr_0.7fr_0.7fr_auto]"
            >
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Книга
                </span>
                <select
                  value={book}
                  onChange={(e) => setBook(e.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-[0.98rem] text-stone-900 outline-none transition focus:border-stone-500"
                >
                  {BOOKS.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Глава
                </span>
                <input
                  value={chapter}
                  onChange={(e) => setChapter(sanitizePositiveInteger(e.target.value))}
                  inputMode="numeric"
                  placeholder="3"
                  className="mt-2 w-full rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-[0.98rem] text-stone-900 outline-none transition focus:border-stone-500"
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
                  className="mt-2 w-full rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-[0.98rem] text-stone-900 outline-none transition focus:border-stone-500"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-[18px] bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                >
                  Открыть стих
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm text-stone-700">
                Текущий выбор: {selectedBook.label} {chapter || '—'}:{verse || '—'}
              </div>

              {workspaceHref ? (
                <Link
                  href={workspaceHref}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Открыть напрямую
                </Link>
              ) : null}
            </div>

            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href="/moderator/unfolds"
            className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)]"
          >
            <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Модератор
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Входящие unfold</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Разбирай новые unfold-события, скрывай шум и извлекай из них сильные карточки.
              </p>
            </div>
          </Link>

          <Link
            href="/moderator/insights"
            className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)]"
          >
            <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Модератор
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Сохранённые инсайты</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Просматривай и очищай карточки, которые уже попадают в основной reading layer.
              </p>
            </div>
          </Link>

          <div className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
            <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Следующий этап
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Verse Workspace</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Будущая цель — отдельная среда на один стих: полка saved cards, directed search,
                passage builder, линзы и быстрые действия сохранения.
              </p>
              <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
                Сейчас этот блок служит ориентиром и напоминает, что центр модераторской работы —
                сам стих, а не только inbox unfold-событий.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Домой
          </Link>
        </div>
      </div>
    </main>
  )
}
