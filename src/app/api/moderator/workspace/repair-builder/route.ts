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
    return 'Подача чуть более афористичная: формулировки компактнее, острее и запоминаемее, но без потери точности.'
  }

  if (styleMode === 'publicistic') {
    return 'Подача более публицистическая: ясная, собранная, энергичная, но без крикливости и без газетного пафоса.'
  }

  if (styleMode === 'analytic') {
    return 'Подача более аналитическая: точнее, интеллектуальнее, логически собраннее, но всё ещё читаемо и живо.'
  }

  return 'Подача нейтральная: спокойная, чистая, ясная, без стилевого перегиба.'
}

function normalizeStyleMode(value: unknown): RepairStyle {
  return value === 'aphoristic' ||
    value === 'publicistic' ||
    value === 'analytic'
    ? value
    : 'neutral'
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLoose(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[«»"“”]/g, '')
    .trim()
    .toLowerCase()
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
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

function countSentences(text: string): number {
  const matches = text.match(/[.!?…]+/g)
  return matches ? matches.length : 1
}

function countChars(text: string): number {
  return text.replace(/\s+/g, ' ').trim().length
}

function containsPreservedText(preservedText: string, candidateText: string) {
  const normalizedPreserved = normalizeForCompare(preservedText)
  if (!normalizedPreserved) return true

  const normalizedCandidate = normalizeForCompare(candidateText)
  return normalizedCandidate.includes(normalizedPreserved)
}

function looksChurchyOrTheological(text: string) {
  const sample = text.toLowerCase()

  const banned = [
    'богослов',
    'богословие',
    'доктрин',
    'догмат',
    'троиц',
    'триедин',
    'ипостас',
    'благодат',
    'священн',
    'церков',
    'конфессион',
    'православ',
    'католич',
    'протестант',
    'евангел',
    'стих учит',
    'этот стих учит',
    'это доказывает',
    'доказывает, что',
    'божествен',
    'божественная истина',
    'истина о',
    'явлено',
    'открывает истину',
    'теология',
    'theology',
    'doctrine',
    'dogma',
    'trinity',
    'triune',
    'hypostasis',
    'divine truth',
    'the verse teaches',
    'this proves',
  ]

  return banned.some((word) => sample.includes(word))
}

function textSimilarityKey(text: string) {
  return normalizeLoose(text)
}

function dedupeOptionsByText(options: RepairOption[]) {
  const unique: RepairOption[] = []
  const seenText = new Set<string>()

  for (const option of options) {
    const textKey = textSimilarityKey(option.text)
    if (seenText.has(textKey)) continue
    seenText.add(textKey)
    unique.push(option)
  }

  return unique
}

function isTooCloseToOriginal(originalCardText: string, candidateText: string) {
  const original = normalizeForCompare(originalCardText)
  const candidate = normalizeForCompare(candidateText)

  if (!original || !candidate) return false
  if (original === candidate) return true

  const originalLen = original.length
  const candidateLen = candidate.length
  const lengthGap = Math.abs(candidateLen - originalLen)

  if (lengthGap <= 40) {
    const overlap =
      original.includes(candidate) ||
      candidate.includes(original)

    if (overlap) return true
  }

  return false
}

function keepTextTooLarge(keepText: string) {
  if (!keepText) return false

  const sentenceCount = countSentences(keepText)
  const charCount = countChars(keepText)

  return sentenceCount > 2 || charCount > 260
}

function optionsHaveTargetLength(options: RepairOption[]) {
  return options.every((option) => {
    const sentences = countSentences(option.text)
    const chars = countChars(option.text)

    return sentences >= 5 && sentences <= 9 && chars >= 520 && chars <= 1900
  })
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
  const keepBlock = params.keepText
    ? `
ЧТО ОБЯЗАТЕЛЬНО СОХРАНИТЬ ДОСЛОВНО:
${params.keepText}

Если этот блок задан, он должен сохраниться в каждом варианте без смысловой потери.
Не выбрасывай его.
Не заменяй его более общим пересказом.
Но не строй всю карточку вокруг механического повторения этого блока.
Это ядро, а не вся карточка.
`
    : `
ЧТО ОБЯЗАТЕЛЬНО СОХРАНИТЬ:
Специальный фрагмент не задан. Сохрани сильное ядро исходной карточки, но не копируй всю карточку целиком.
`

  const removeBlock = params.removeText
    ? `
ЧТО НУЖНО УБРАТЬ, НЕ ПОВТОРЯТЬ ИЛИ ОСЛАБИТЬ:
${params.removeText}
`
    : `
ЧТО НУЖНО УБРАТЬ, НЕ ПОВТОРЯТЬ ИЛИ ОСЛАБИТЬ:
Специальный список не задан, но всё равно убери слабые хвосты, лишние повторения, общие слова и банальные связки.
`

  const directionBlock = params.directionText
    ? `
КУДА ПОВЕСТИ МЫСЛЬ:
${params.directionText}

Это указание обязательно учитывай. Не игнорируй его.
`
    : `
КУДА ПОВЕСТИ МЫСЛЬ:
Дополнительное направление не задано. Но всё равно усили мысль, сделай её точнее, глубже и законченнее.
`

  return `
Ты — старший редактор карточек-инсайтов для Scriptura+.

ТВОЯ ЗАДАЧА:
Нужно отремонтировать существующую карточку, а не придумать новый угол.
Сохраняй тот же смысловой угол, но перепакуй карточку сильнее, глубже, красивее и чище.

ССЫЛКА:
${params.reference}

ТЕКСТ СТИХА:
${params.verseText}

ИСХОДНАЯ КАРТОЧКА:
${params.originalCardText}

${keepBlock}

${removeBlock}

${directionBlock}

СТИЛЬ:
${styleInstruction(params.styleMode)}

ГЛАВНЫЙ ПРИНЦИП:
Это не новый инсайт рядом.
Это не соседняя мысль.
Это не свободное вдохновение.
Это улучшенная версия той же карточки:
- точнее
- плотнее
- глубже
- яснее
- сильнее по формулировке
- красивее по движению мысли
- с более сильным завершением

КРИТИЧЕСКИЕ ПРАВИЛА:
- Сохраняй тот же угол мысли, а не уводи в другой.
- Не делай вид, что просто переписал карточку другими словами.
- Реально отремонтируй её.
- Если блок «Что оставить» задан, сохрани его в каждом варианте.
- Не уходи в соседнюю идею.
- Не делай текст проповедническим.
- Не делай текст пустым или банальным.
- Не делай текст церковным.
- Не делай текст конфессиональным.
- Не делай текст богословским.
- Не используй церковно-богословский словарь.
- Не используй язык, который звучит как комментарий священнослужителя.
- Не навязывай доктринальный вывод.
- Заголовок должен быть коротким и сильным.
- Сам текст должен быть плотным, ясным, цельным и приятно читаемым.
- Карточка должна ощущаться как finished insight, а не как короткая заметка ChatGPT.
- Не делай мини-эссе и не лей воду.
- Но и не сжимай мысль до 4 коротких предложений.

ANTI-THEOLOGY / ANTI-CHURCH FILTER:
Приложением будут пользоваться люди разных религий, конфессий и мировоззрений.
Поэтому язык должен быть современным, нейтральным и аналитическим.

ЗАПРЕЩЕНО:
- богословие
- доктрина
- догмат
- троица
- триединый
- ипостась
- благодать в церковном тоне
- священная тайна
- стих учит
- это доказывает
- божественная истина
- церковные формулы
- конфессиональные выводы
- проповеднический тон
- devotional / sermon / church language

РАЗРЕШЁННЫЙ ЯЗЫК:
- современный
- нейтральный
- аналитический
- точный
- насыщенный
- читаемый
- без церковной окраски
- без богословского жаргона

ДОПОЛНИТЕЛЬНОЕ ТРЕБОВАНИЕ К 3 ВАРИАНТАМ:
Все 3 варианта должны сохранять тот же угол, но реально различаться по упаковке.
Нельзя выдавать один и тот же текст под тремя разными заголовками.
Нельзя выдавать почти одинаковые версии с косметической правкой.
Каждый вариант должен по-разному развивать ту же мысль:
- один может сделать акцент на формулировке
- другой на смысловом следствии
- третий на том, что это меняет в чтении стиха
Но это всё ещё должен быть тот же угол.

ТРЕБОВАНИЕ К КАЧЕСТВУ:
- Вариант должен быть достаточно хорошим, чтобы модератор захотел его сохранить.
- Избегай рыхлости.
- Избегай повтора одной и той же мысли разными словами.
- Избегай безопасной bland-прозы в стиле ChatGPT.
- Избегай газетного шума и напыщенности.
- Каждая карточка должна звучать как finished insight, а не как черновик.

ЦЕЛЕВОЙ ФОРМАТ:
- Не короткая заметка.
- Не мини-статья.
- А плотная развернутая карточка среднего объёма.
- Обычно это 6–8 предложений.
- Карточка должна успеть:
  1. открыть угол
  2. показать его по тексту
  3. усилить его
  4. довести его до сильного завершения

ВЫВОД:
- Верни только валидный JSON
- Без markdown
- Без пояснений
- Ровно 3 варианта

ФОРМАТ:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Плотная, красиво развернутая карточка среднего объёма."
  },
  {
    "title": "Короткий сильный заголовок",
    "text": "Плотная, красиво развернутая карточка среднего объёма."
  },
  {
    "title": "Короткий сильный заголовок",
    "text": "Плотная, красиво развернутая карточка среднего объёма."
  }
]
`.trim()
}

function validateOptions(params: {
  options: RepairOption[]
  originalCardText: string
  keepText: string
}) {
  const dedupedByText = dedupeOptionsByText(params.options)

  if (dedupedByText.length < 3) {
    return {
      ok: false as const,
      error: 'Модель вернула одинаковые или почти одинаковые варианты ремонта.',
    }
  }

  if (!optionsHaveTargetLength(dedupedByText)) {
    return {
      ok: false as const,
      error: 'Модель вернула слишком короткие, слишком длинные или слишком пустые варианты.',
    }
  }

  for (const option of dedupedByText) {
    if (looksChurchyOrTheological(`${option.title} ${option.text}`)) {
      return {
        ok: false as const,
        error: 'Модель вернула вариант с богословским или церковным языком.',
      }
    }

    if (params.keepText && !containsPreservedText(params.keepText, option.text)) {
      return {
        ok: false as const,
        error: 'Модель не сохранила указанный фрагмент.',
      }
    }

    if (isTooCloseToOriginal(params.originalCardText, option.text)) {
      return {
        ok: false as const,
        error: 'Модель почти не отремонтировала карточку и вернула слишком близкий к исходному текст.',
      }
    }
  }

  return {
    ok: true as const,
    options: dedupedByText.slice(0, 3),
  }
}

async function generateRepairOptions(params: {
  reference: string
  verseText: string
  originalCardText: string
  keepText: string
  removeText: string
  directionText: string
  styleMode: RepairStyle
}) {
  const prompt = buildPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 3200,
  })

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || 'Failed to generate repaired card options.',
      raw: result.rawText || result.raw || '',
      options: null,
    }
  }

  let options = parseOptions(result.rawText)

  if (!options) {
    const extracted = extractJsonArray(result.rawText)
    if (extracted) {
      options = parseOptions(extracted)
    }
  }

  if (!options || options.length !== 3) {
    return {
      ok: false as const,
      error: 'Не удалось распарсить ровно 3 варианта ремонта.',
      raw: result.rawText || '',
      options: null,
    }
  }

  const validated = validateOptions({
    options,
    originalCardText: params.originalCardText,
    keepText: params.keepText,
  })

  if (!validated.ok) {
    return {
      ok: false as const,
      error: validated.error,
      raw: result.rawText || '',
      options: null,
    }
  }

  return {
    ok: true as const,
    options: validated.options,
    raw: result.rawText || '',
  }
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
          error: 'Нужно указать хотя бы что оставить, что убрать или куда повести мысль.',
        } satisfies RepairPayload,
        { status: 400 }
      )
    }

    if (keepTextTooLarge(keepText)) {
      return NextResponse.json(
        {
          error:
            'Блок «Что оставить» слишком большой. Оставь 1 ключевую фразу или максимум 1–2 коротких предложения.',
        } satisfies RepairPayload,
        { status: 400 }
      )
    }

    const firstPass = await generateRepairOptions({
      reference,
      verseText,
      originalCardText,
      keepText,
      removeText,
      directionText,
      styleMode,
    })

    if (firstPass.ok && firstPass.options && firstPass.options.length === 3) {
      return NextResponse.json({
        options: firstPass.options,
      } satisfies RepairPayload)
    }

    const retryPass = await generateRepairOptions({
      reference,
      verseText,
      originalCardText,
      keepText,
      removeText,
      directionText,
      styleMode,
    })

    if (retryPass.ok && retryPass.options && retryPass.options.length === 3) {
      return NextResponse.json({
        options: retryPass.options,
      } satisfies RepairPayload)
    }

    return NextResponse.json(
      {
        error:
          retryPass.error || firstPass.error || 'Не удалось сгенерировать варианты ремонта.',
        raw: retryPass.raw || firstPass.raw || '',
      } satisfies RepairPayload,
      { status: 500 }
    )
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
