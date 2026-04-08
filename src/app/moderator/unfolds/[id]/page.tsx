import Link from 'next/link'
import { notFound } from 'next/navigation'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import InsightBuilder from './InsightBuilder'

export const dynamic = 'force-dynamic'

type UnfoldDetailRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  source_mode: 'insights' | 'word' | 'tension' | 'why_this_phrase'
  source_title: string
  source_text: string
  source_angle_note: string | null
  unfold_title: string | null
  unfold_text: string
  review_status: 'new' | 'reviewed' | 'promoted' | 'hidden'
  created_at: string
  updated_at: string
  source_insight_id: string | null
  promoted_insight_id: string | null
}

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type RussianModeratorPayload = {
  sourceTitleRu: string
  sourceTextRu: string
  sourceAngleNoteRu: string | null
  unfoldTitleRu: string | null
  unfoldTextRu: string
}

function formatMode(mode: UnfoldDetailRow['source_mode']) {
  if (mode === 'why_this_phrase') return 'Почему эта фраза'
  if (mode === 'word') return 'Слово'
  if (mode === 'tension') return 'Напряжение'
  return 'Инсайты'
}

function formatStatus(status: UnfoldDetailRow['review_status']) {
  if (status === 'new') return 'Новый'
  if (status === 'reviewed') return 'Просмотрен'
  if (status === 'promoted') return 'Сохранён'
  return 'Скрыт'
}

function statusClasses(status: UnfoldDetailRow['review_status']) {
  if (status === 'new') {
    return 'border-amber-400 bg-amber-100 text-amber-900'
  }

  if (status === 'promoted') {
    return 'border-emerald-400 bg-emerald-100 text-emerald-900'
  }

  if (status === 'reviewed') {
    return 'border-sky-400 bg-sky-100 text-sky-900'
  }

  return 'border-stone-400 bg-stone-200 text-stone-700'
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function looksRussian(text: string | null | undefined): boolean {
  const sample = String(text ?? '').slice(0, 900)
  const matches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return matches.length >= 10
}

function needsRussianModeratorLayer(item: UnfoldDetailRow): boolean {
  return !(
    looksRussian(item.source_title) &&
    looksRussian(item.source_text) &&
    looksRussian(item.unfold_text)
  )
}

function buildRussianModeratorPrompt(item: UnfoldDetailRow) {
  return `
Ты подготавливаешь русский рабочий слой для модератора Scriptura+.

ССЫЛКА:
${item.verse_ref}

РЕЖИМ:
${item.source_mode}

ИСХОДНЫЙ SOURCE TITLE:
${item.source_title}

ИСХОДНЫЙ SOURCE TEXT:
${item.source_text}

SOURCE ANGLE NOTE:
${item.source_angle_note ?? ''}

ИСХОДНЫЙ UNFOLD TITLE:
${item.unfold_title ?? ''}

ИСХОДНЫЙ UNFOLD TEXT:
${item.unfold_text}

ЗАДАЧА:
Переведи весь этот модераторский материал на естественный русский язык.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Это рабочий перевод для модератора, не пересказ.
- Сохрани тот же угол мысли.
- Не добавляй новых идей.
- Не сокращай содержание без необходимости.
- Не делай текст проповедническим.
- Если поле изначально пустое, верни null для него.
- Верни только валидный JSON.

ФОРМАТ ОТВЕТА:
{
  "sourceTitleRu": "...",
  "sourceTextRu": "...",
  "sourceAngleNoteRu": "... или null",
  "unfoldTitleRu": "... или null",
  "unfoldTextRu": "..."
}
`.trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parseRussianModeratorPayload(raw: string): RussianModeratorPayload | null {
  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed?.sourceTitleRu !== 'string') return null
    if (typeof parsed?.sourceTextRu !== 'string') return null
    if (typeof parsed?.unfoldTextRu !== 'string') return null

    const sourceAngleNoteRu =
      parsed?.sourceAngleNoteRu === null
        ? null
        : typeof parsed?.sourceAngleNoteRu === 'string'
          ? parsed.sourceAngleNoteRu.trim()
          : null

    const unfoldTitleRu =
      parsed?.unfoldTitleRu === null
        ? null
        : typeof parsed?.unfoldTitleRu === 'string'
          ? parsed.unfoldTitleRu.trim()
          : null

    return {
      sourceTitleRu: parsed.sourceTitleRu.trim(),
      sourceTextRu: parsed.sourceTextRu.trim(),
      sourceAngleNoteRu,
      unfoldTitleRu,
      unfoldTextRu: parsed.unfoldTextRu.trim(),
    }
  } catch {
    return null
  }
}

async function normalizeForRussianModerator(item: UnfoldDetailRow): Promise<UnfoldDetailRow> {
  if (!needsRussianModeratorLayer(item)) {
    return item
  }

  const prompt = buildRussianModeratorPrompt(item)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2600,
  })

  if (!result.ok) {
    return item
  }

  const rawText = result.rawText
  let normalized = parseRussianModeratorPayload(rawText)

  if (!normalized) {
    const extracted = extractJsonObject(rawText)
    if (extracted) {
      normalized = parseRussianModeratorPayload(extracted)
    }
  }

  if (!normalized) {
    return item
  }

  return {
    ...item,
    source_title: normalized.sourceTitleRu || item.source_title,
    source_text: normalized.sourceTextRu || item.source_text,
    source_angle_note: normalized.sourceAngleNoteRu,
    unfold_title: normalized.unfoldTitleRu,
    unfold_text: normalized.unfoldTextRu || item.unfold_text,
  }
}

async function loadUnfoldById(id: string): Promise<UnfoldDetailRow | null> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('unfold_events')
    .select(
      `
        id,
        verse_ref,
        book,
        chapter,
        verse,
        source_mode,
        source_title,
        source_text,
        source_angle_note,
        unfold_title,
        unfold_text,
        review_status,
        created_at,
        updated_at,
        source_insight_id,
        promoted_insight_id
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Не удалось загрузить unfold event: ${error.message}`)
  }

  return (data ?? null) as UnfoldDetailRow | null
}

export default async function ModeratorUnfoldDetailPage({ params }: PageProps) {
  const { id } = await params

  let item: UnfoldDetailRow | null = null

  try {
    const loaded = await loadUnfoldById(id)
    item = loaded ? await normalizeForRussianModerator(loaded) : null
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось загрузить unfold event.'

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Модератор
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                Проверка unfold
              </h1>
            </div>

            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Назад во входящие
            </Link>
          </div>

          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 text-red-700">
            {message}
          </div>
        </div>
      </main>
    )
  }

  if (!item) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Модератор
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Проверка unfold
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Единый русский рабочий слой для модератора, независимо от языка пользовательского unfold.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/moderator/insights"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Сохранённые карточки
            </Link>

            <Link
              href="/moderator/unfolds"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Назад во входящие
            </Link>

            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Домой
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusClasses(item.review_status)}`}
          >
            Текущий статус: {formatStatus(item.review_status)}
          </div>

          {item.promoted_insight_id ? (
            <Link
              href={`/moderator/insights/${item.promoted_insight_id}`}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Открыть сохранённую карточку
            </Link>
          ) : null}

          {item.review_status === 'new' ? (
            <>
              <form action={`/api/moderator/unfolds/${item.id}/review`} method="POST">
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/moderator/unfolds/${item.id}`}
                />
                <button
                  type="submit"
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                >
                  Отметить как просмотренное
                </button>
              </form>

              <form action={`/api/moderator/unfolds/${item.id}/hide`} method="POST">
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/moderator/unfolds/${item.id}`}
                />
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Скрыть
                </button>
              </form>
            </>
          ) : item.review_status === 'reviewed' ? (
            <form action={`/api/moderator/unfolds/${item.id}/hide`} method="POST">
              <input
                type="hidden"
                name="returnTo"
                value={`/moderator/unfolds/${item.id}`}
              />
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                Скрыть
              </button>
            </form>
          ) : null}
        </div>

        <InsightBuilder
          unfoldId={item.id}
          reference={item.verse_ref}
          sourceMode={item.source_mode}
          sourceTitle={item.source_title}
          sourceText={item.source_text}
          unfoldText={item.unfold_text}
        />

        <div className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.review_status)}`}
              >
                {formatStatus(item.review_status)}
              </span>

              <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                {formatMode(item.source_mode)}
              </span>

              <span className="text-xs text-stone-500">
                Создано: {formatDate(item.created_at)}
              </span>

              <span className="text-xs text-stone-500">
                Обновлено: {formatDate(item.updated_at)}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Ссылка
                </p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{item.verse_ref}</p>
              </div>

              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Идентификаторы
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Event ID: {item.id}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Source insight ID: {item.source_insight_id ?? 'NULL'}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                  Promoted insight ID: {item.promoted_insight_id ?? 'NULL'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Исходный заголовок
              </p>
              <p className="mt-2 text-xl font-semibold leading-8 text-stone-900">
                {item.source_title}
              </p>
            </div>

            {item.source_angle_note ? (
              <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Заметка об угле
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {item.source_angle_note}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Исходный текст
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[0.97rem] leading-8 text-stone-800">
                  {item.source_text}
                </div>
              </div>

              <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Заголовок unfold
                </p>
                <p className="mt-2 text-xl font-semibold leading-8 text-stone-900">
                  {item.unfold_title ?? 'Без заголовка'}
                </p>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Текст unfold
                </p>
                <div className="mt-2 whitespace-pre-wrap text-[0.97rem] leading-8 text-stone-800">
                  {item.unfold_text}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
