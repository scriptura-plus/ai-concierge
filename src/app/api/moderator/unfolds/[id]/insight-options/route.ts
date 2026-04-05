import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type InsightOption = {
  title: string
  text: string
}

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type RussianNormalizationPayload = {
  sourceTitleRu: string
  sourceTextRu: string
  unfoldTextRu: string
  selectedPassageRu: string
}

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' || value === 'tension' || value === 'why_this_phrase'
    ? value
    : 'insights'
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 800)
  const matches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return matches.length >= 10
}

function buildRussianNormalizationPrompt(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldText: string
  selectedPassage: string
}) {
  return `
Ты подготавливаешь русский рабочий слой для модераторского процесса Scriptura+.

ССЫЛКА:
${params.reference}

РЕЖИМ:
${params.sourceMode}

SOURCE TITLE:
${params.sourceTitle}

SOURCE TEXT:
${params.sourceText}

UNFOLD TEXT:
${params.unfoldText}

SELECTED PASSAGE:
${params.selectedPassage}

ЗАДАЧА:
Переведи весь материал на естественный русский язык для работы модератора.

ПРАВИЛА:
- Сохрани тот же самый угол мысли.
- Не добавляй новых идей.
- Не сокращай смысл.
- Не делай текст проповедническим.
- Не превращай это в пересказ.
- Верни только валидный JSON.

ФОРМАТ:
{
  "sourceTitleRu": "...",
  "sourceTextRu": "...",
  "unfoldTextRu": "...",
  "selectedPassageRu": "..."
}
`.trim()
}

function parseRussianNormalization(raw: string): RussianNormalizationPayload | null {
  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed?.sourceTitleRu !== 'string') return null
    if (typeof parsed?.sourceTextRu !== 'string') return null
    if (typeof parsed?.unfoldTextRu !== 'string') return null
    if (typeof parsed?.selectedPassageRu !== 'string') return null

    return {
      sourceTitleRu: parsed.sourceTitleRu.trim(),
      sourceTextRu: parsed.sourceTextRu.trim(),
      unfoldTextRu: parsed.unfoldTextRu.trim(),
      selectedPassageRu: parsed.selectedPassageRu.trim(),
    }
  } catch {
    return null
  }
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

async function normalizeInputsToRussian(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldText: string
  selectedPassage: string
}): Promise<RussianNormalizationPayload> {
  const alreadyRussian =
    looksRussian(params.sourceTitle) &&
    looksRussian(params.sourceText) &&
    looksRussian(params.unfoldText) &&
    looksRussian(params.selectedPassage)

  if (alreadyRussian) {
    return {
      sourceTitleRu: params.sourceTitle.trim(),
      sourceTextRu: params.sourceText.trim(),
      unfoldTextRu: params.unfoldText.trim(),
      selectedPassageRu: params.selectedPassage.trim(),
    }
  }

  const prompt = buildRussianNormalizationPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2400,
  })

  if (!result.ok) {
    throw new Error(result.error || 'Не удалось перевести рабочий материал в русский язык.')
  }

  const rawText = result.rawText
  let normalized = parseRussianNormalization(rawText)

  if (!normalized) {
    const extracted = extractJsonObject(rawText)
    if (extracted) {
      normalized = parseRussianNormalization(extracted)
    }
  }

  if (!normalized) {
    throw new Error('Не удалось разобрать JSON русского рабочего слоя.')
  }

  return normalized
}

function buildPrompt(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitleRu: string
  sourceTextRu: string
  unfoldTextRu: string
  selectedPassageRu: string
}) {
  return `
Ты создаёшь карточки библейских инсайтов для модераторского процесса Scriptura+.

Твоя задача — предложить 3 сильных варианта карточки на основе уже найденного угла и выбранного модератором фрагмента.

ССЫЛКА:
${params.reference}

ИСХОДНЫЙ РЕЖИМ:
${params.sourceMode}

ИСХОДНЫЙ ЗАГОЛОВОК:
${params.sourceTitleRu}

ИСХОДНЫЙ ТЕКСТ ИНСАЙТА:
${params.sourceTextRu}

UNFOLD ТЕКСТ:
${params.unfoldTextRu}

ВЫБРАННЫЙ ФРАГМЕНТ:
${params.selectedPassageRu}

ГЛАВНЫЙ ПРИНЦИП:
Это не пересказ.
Это не комментарий.
Это не проповедь.
Это точная упаковка уже найденной мысли в формат сильной insight-card.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Сохрани тот же самый угол мысли.
- Не уходи в соседние идеи.
- Не открывай новый угол.
- Выбранный фрагмент должен остаться дословно в каждом варианте.
- Не перефразируй выбранный фрагмент.
- Не укорачивай выбранный фрагмент.
- Эти 3 варианта отличаются подачей, а не направлением мысли.
- Карточка должна быть по длине и плотности как обычный хороший insight.
- Это должен быть полноценный card text, а не короткая обёртка вокруг цитаты.

СТАНДАРТ КАЧЕСТВА:
- Избегай банальности
- Избегай расплывчатости
- Избегай штампов
- Избегай “религиозного канцелярита”
- Каждый вариант должен звучать как достойная сохранения карточка
- Карточка должна ощущаться завершённой, а не обрезанной

СТИЛЬ:
- ясно
- современно
- умно
- плотно, но читабельно
- выразительно без крикливости
- без проповеднического тона

ФОРМАТ:
- Верни ровно 3 варианта
- У каждого варианта должны быть:
  - "title"
  - "text"
- "title" должен быть коротким, точным, цепким
- "text" должен быть из 4–5 предложений
- "text" должен быть самодостаточным и готовым для карточки

ПРАВИЛА ВЫВОДА:
- Верни ТОЛЬКО валидный JSON
- Без markdown
- Без code fences
- Без комментариев
- Вывод должен быть JSON-массивом

ПРИМЕР ФОРМЫ:
[
  {
    "title": "Сильный заголовок",
    "text": "Первое предложение. Дословно сохранённый фрагмент. Третье предложение. Четвёртое предложение."
  }
]
`.trim()
}

function parseOptions(raw: string): InsightOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        text: String(item.text ?? '').trim(),
      }))
      .filter((item) => item.title && item.text)

    return cleaned.length ? cleaned.slice(0, 3) : null
  } catch {
    return null
  }
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function allOptionsPreservePassage(options: InsightOption[], selectedPassageRu: string) {
  return options.every((option) => option.text.includes(selectedPassageRu))
}

function allOptionsLookRussian(options: InsightOption[]): boolean {
  return options.every((option) => looksRussian(`${option.title} ${option.text}`))
}

function allOptionsHaveEnoughSentences(options: InsightOption[]): boolean {
  return options.every((option) => {
    const count = option.text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length
    return count >= 4
  })
}

export async function POST(req: Request, _context: RouteContext) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const sourceTitle = String(body.sourceTitle ?? '').trim()
    const sourceText = String(body.sourceText ?? '').trim()
    const unfoldText = String(body.unfoldText ?? '').trim()
    const selectedPassage = String(body.selectedPassage ?? '').trim()
    const sourceMode = normalizeSourceMode(body.sourceMode)

    if (!reference || !sourceTitle || !sourceText || !unfoldText || !selectedPassage) {
      return NextResponse.json(
        {
          error: 'reference, sourceTitle, sourceText, unfoldText, and selectedPassage are required.',
        },
        { status: 400 }
      )
    }

    const normalized = await normalizeInputsToRussian({
      reference,
      sourceMode,
      sourceTitle,
      sourceText,
      unfoldText,
      selectedPassage,
    })

    const prompt = buildPrompt({
      reference,
      sourceMode,
      sourceTitleRu: normalized.sourceTitleRu,
      sourceTextRu: normalized.sourceTextRu,
      unfoldTextRu: normalized.unfoldTextRu,
      selectedPassageRu: normalized.selectedPassageRu,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2600,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          raw: result.raw || '',
        },
        { status: 500 }
      )
    }

    const rawText = result.rawText
    let options = parseOptions(rawText)

    if (!options) {
      const extracted = extractJsonArray(rawText)
      if (extracted) {
        options = parseOptions(extracted)
      }
    }

    if (!options || options.length !== 3) {
      return NextResponse.json(
        {
          error: 'Не удалось разобрать ровно 3 варианта карточки.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsPreservePassage(options, normalized.selectedPassageRu)) {
      return NextResponse.json(
        {
          error: 'Модель не сохранила выбранный фрагмент дословно во всех вариантах.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsLookRussian(options)) {
      return NextResponse.json(
        {
          error: 'Модель не вернула русские варианты карточек.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsHaveEnoughSentences(options)) {
      return NextResponse.json(
        {
          error: 'Варианты получились слишком короткими. Ожидался формат полноценной insight-card.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      options,
      normalizedSelectedPassage: normalized.selectedPassageRu,
    })
  } catch (error) {
    console.error('Insight options API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Что-то пошло не так при генерации вариантов карточки.',
      },
      { status: 500 }
    )
  }
}
