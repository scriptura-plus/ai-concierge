import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RepairStyle = 'neutral' | 'aphoristic' | 'publicistic' | 'analytic'

type RepairOption = {
  title: string
  text: string
}

type RepairPayload = {
  options?: RepairOption[]
  error?: string
  raw?: string
}

function styleInstruction(styleMode: RepairStyle) {
  if (styleMode === 'aphoristic') {
    return 'Подача чуть более афористичная: формулировки компактнее, острее, запоминаемее, но без потери смысла.'
  }

  if (styleMode === 'publicistic') {
    return 'Подача более публицистическая: ясная, собранная, энергичная, но без крикливости.'
  }

  if (styleMode === 'analytic') {
    return 'Подача более аналитическая: чуть точнее, интеллектуальнее, логически собраннее.'
  }

  return 'Подача нейтральная: спокойная, чистая, ясная, без перегиба в стиль.'
}

function buildPrompt(params: {
  reference: string
  verseText: string
  originalCardText: string
  keepText: string
  removeText: string
  directionText: string
  styleMode: RepairStyle
}) {
  return `
Ты — редактор карточек-инсайтов для Scriptura+.

ТВОЯ ЗАДАЧА:
Нужно отремонтировать существующую карточку, а не придумать новый угол.
Сохраняй тот же смысловой угол, но перепакуй карточку сильнее и чище.

ССЫЛКА:
${params.reference}

ТЕКСТ СТИХА:
${params.verseText}

ИСХОДНАЯ КАРТОЧКА:
${params.originalCardText}

ЧТО ОБЯЗАТЕЛЬНО СОХРАНИТЬ:
${params.keepText || 'Ничего не задано'}

ЧТО НУЖНО УБРАТЬ ИЛИ НЕ ПОВТОРЯТЬ:
${params.removeText || 'Ничего не задано'}

КУДА ПОВЕСТИ МЫСЛЬ:
${params.directionText || 'Ничего не задано'}

СТИЛЬ:
${styleInstruction(params.styleMode)}

КРИТИЧЕСКИЕ ПРАВИЛА:
- Это тот же угол мысли, а не новый.
- Если блок "Что оставить" задан, сохрани его в каждом варианте.
- Не уходи в соседнюю идею.
- Не делай текст проповедническим.
- Не делай текст пустым или банальным.
- Карточка должна быть finished insight, а не наброском.
- Заголовок должен быть коротким и сильным.
- Сам текст должен быть плотным, ясным и цельным.
- Нормальный размер: примерно 4–5 предложений.
- Если указано, что что-то нужно убрать, не повторяй это.
- Если указано направление, реально поведи мысль туда.

ВЫВОД:
- Верни только валидный JSON
- Без markdown
- Без пояснений
- Ровно 3 варианта

ФОРМАТ:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Полноценная карточка из 4–5 предложений."
  },
  {
    "title": "Короткий сильный заголовок",
    "text": "Полноценная карточка из 4–5 предложений."
  },
  {
    "title": "Короткий сильный заголовок",
    "text": "Полноценная карточка из 4–5 предложений."
  }
]
`.trim()
}

function parseOptions(raw: string): RepairOption[] | null {
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

function normalizeStyleMode(value: unknown): RepairStyle {
  return value === 'aphoristic' ||
    value === 'publicistic' ||
    value === 'analytic'
    ? value
    : 'neutral'
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?…]+/g)
  return matches ? matches.length : 1
}

function optionsHaveNormalLength(options: RepairOption[]) {
  return options.every((option) => {
    const sentences = countSentences(option.text)
    return sentences >= 3 && sentences <= 6
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()
    const originalCardText = String(body.originalCardText ?? '').trim()
    const keepText = String(body.keepText ?? '').trim()
    const removeText = String(body.removeText ?? '').trim()
    const directionText = String(body.directionText ?? '').trim()
    const styleMode = normalizeStyleMode(body.styleMode)

    if (!reference || !verseText || !originalCardText) {
      return NextResponse.json(
        {
          error: 'reference, verseText, and originalCardText are required.',
        } satisfies RepairPayload,
        { status: 400 }
      )
    }

    if (!keepText && !removeText && !directionText) {
      return NextResponse.json(
        {
          error: 'At least one of keepText, removeText, or directionText is required.',
        } satisfies RepairPayload,
        { status: 400 }
      )
    }

    const prompt = buildPrompt({
      reference,
      verseText,
      originalCardText,
      keepText,
      removeText,
      directionText,
      styleMode,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2200,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate repaired card options.',
          raw: result.rawText || result.raw || '',
        } satisfies RepairPayload,
        { status: 500 }
      )
    }

    let options = parseOptions(result.rawText)

    if (!options) {
      const extracted = extractJsonArray(result.rawText)
      if (extracted) {
        options = parseOptions(extracted)
      }
    }

    if (!options || options.length !== 3) {
      return NextResponse.json(
        {
          error: 'Не удалось распарсить ровно 3 варианта ремонта.',
          raw: result.rawText || '',
        } satisfies RepairPayload,
        { status: 500 }
      )
    }

    if (!optionsHaveNormalLength(options)) {
      return NextResponse.json(
        {
          error: 'Модель вернула слишком короткие или слишком длинные варианты.',
          raw: result.rawText || '',
        } satisfies RepairPayload,
        { status: 500 }
      )
    }

    return NextResponse.json({
      options,
    } satisfies RepairPayload)
  } catch (error) {
    console.error('Repair builder API error:', error)

    return NextResponse.json(
      {
        error: 'Something went wrong while generating repaired card options.',
      } satisfies RepairPayload,
      { status: 500 }
    )
  }
}
