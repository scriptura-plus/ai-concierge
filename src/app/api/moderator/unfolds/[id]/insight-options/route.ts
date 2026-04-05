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
Ты подготавливаешь русский рабочий слой для модераторского workflow Scriptura+.

ССЫЛКА:
${params.reference}

РЕЖИМ ИСХОДНОГО ИНСАЙТА:
${params.sourceMode}

SOURCE INSIGHT TITLE:
${params.sourceTitle}

SOURCE INSIGHT TEXT:
${params.sourceText}

UNFOLD TEXT:
${params.unfoldText}

SELECTED PASSAGE:
${params.selectedPassage}

ЗАДАЧА:
Преобразуй все входные данные в естественный русский рабочий вариант для модератора.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Сохрани тот же угол мысли.
- Не выдумывай новых идей.
- Не расширяй материал.
- Не упрощай смысл.
- Не делай текст проповедническим.
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
    throw new Error(result.error || 'Не удалось привести unfold к русскому рабочему слою.')
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
    throw new Error('Не удалось распарсить JSON с русской нормализацией.')
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
Ты — генератор сильных карточек-инсайтов для Scriptura+.

Твоя задача — создать 3 разных, но равноценных варианта карточки на основе уже найденного угла мысли.

ССЫЛКА:
${params.reference}

РЕЖИМ:
${params.sourceMode}

ИСХОДНЫЙ ЗАГОЛОВОК:
${params.sourceTitleRu}

ИСХОДНЫЙ ТЕКСТ ИНСАЙТА:
${params.sourceTextRu}

UNFOLD ТЕКСТ:
${params.unfoldTextRu}

ВЫБРАННЫЙ ФРАГМЕНТ (СВЯЩЕННЫЙ, ДОЛЖЕН СОХРАНИТЬСЯ ДОСЛОВНО):
${params.selectedPassageRu}

ОСНОВНОЙ ПРИНЦИП:
Это не новый угол.
Это не соседняя идея.
Это не новый комментарий.
Это более сильная, более точная, более законченная упаковка того же инсайта.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Сохрани тот же самый угол мысли.
- Не уходи в соседние направления.
- Не добавляй новую большую идею.
- Выбранный фрагмент должен войти в каждый вариант дословно.
- Не перефразируй его.
- Не сокращай его.
- Каждый вариант должен ощущаться как полноценная карточка, а не как краткая рамка вокруг цитаты.
- Длина должна соответствовать обычной карточке Insight.
- Делай примерно 4–5 предложений.
- Не делай текст телеграфным.
- Не делай текст проповедническим.
- Не используй банальности, штампы и общие духовные фразы.
- Каждый вариант должен быть читаемым, плотным, интеллектуальным и законченным.
- Заголовок должен быть коротким, цепким, достойным сохранения.
- Текст должен быть современным, ясным и достаточно насыщенным.

СТАНДАРТ КАЧЕСТВА:
- Избегай очевидностей.
- Избегай повторения одной мысли другими словами.
- Карточка должна звучать как сильный finished insight, а не как компрессия.

ПРАВИЛА ВЫВОДА:
- Верни ТОЛЬКО валидный JSON
- Без markdown
- Без code fences
- Без комментариев
- Вывод должен быть JSON-массивом ровно из 3 элементов

ФОРМАТ:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Четыре или пять предложений полноценного инсайта."
  }
]
`.trim()
}

function parseOptions(raw: string): InsightOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
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

function countSentences(text: string): number {
  const matches = text.match(/[.!?…]+/g)
  return matches ? matches.length : 1
}

function optionsHaveNormalInsightLength(options: InsightOption[]): boolean {
  return options.every((option) => {
    const sentences = countSentences(option.text)
    return sentences >= 4 && sentences <= 6
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
          error: 'Не удалось распарсить ровно 3 варианта инсайта.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsPreservePassage(options, normalized.selectedPassageRu)) {
      return NextResponse.json(
        {
          error: 'Модель не сохранила выбранный русский фрагмент дословно во всех вариантах.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsLookRussian(options)) {
      return NextResponse.json(
        {
          error: 'Модель не вернула варианты на русском языке.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!optionsHaveNormalInsightLength(options)) {
      return NextResponse.json(
        {
          error: 'Модель вернула слишком короткие или слишком длинные варианты. Нужен полноценный размер обычной insight-card.',
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
            : 'Что-то пошло не так при генерации вариантов инсайта.',
      },
      { status: 500 }
    )
  }
}
