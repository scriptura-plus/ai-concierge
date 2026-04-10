import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getVerseText, getWebBookId } from '@/lib/bible/getVerseText'
import { getParagraphText } from '@/lib/bible/getParagraphText'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type ContextDirection = {
  id: string
  level: 'paragraph' | 'chapter' | 'book' | 'bible_line'
  title: string
  summary: string
  why_it_matters: string
  dig_deeper: string
}

type ContextAssessment = {
  best_level: 'paragraph' | 'chapter' | 'book' | 'bible_line' | 'none'
  note: string
}

type ContextModelPayload = {
  context_assessment?: ContextAssessment
  directions?: ContextDirection[]
}

type ContextPoint = {
  title: string
  text: string
}

type ContextPayload = {
  lead: string
  points: ContextPoint[]
  takeaway: string
}

type ContextApiResponse = {
  context: ContextPayload
  context_assessment: ContextAssessment
  directions: ContextDirection[]
  reference: string
  verseText: string
  raw: string
}

type BibleApiVerse = {
  verse?: number
  text?: string
}

type BibleApiChapterResponse = {
  verses?: BibleApiVerse[]
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parsePayload(raw: string): ContextModelPayload | null {
  try {
    const parsed = JSON.parse(raw) as ContextModelPayload
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    const extracted = extractJsonObject(raw)
    if (!extracted) return null

    try {
      const parsed = JSON.parse(extracted) as ContextModelPayload
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }
}

function isValidLevel(value: unknown): value is ContextDirection['level'] {
  return value === 'paragraph' || value === 'chapter' || value === 'book' || value === 'bible_line'
}

function isValidBestLevel(value: unknown): value is ContextAssessment['best_level'] {
  return (
    value === 'paragraph' ||
    value === 'chapter' ||
    value === 'book' ||
    value === 'bible_line' ||
    value === 'none'
  )
}

function labels(language: SupportedLanguage) {
  if (language === 'ru') {
    return {
      leadPrefix: 'Контекстные направления, которые реально помогают точнее понять этот стих.',
      takeawayPrefix: 'Наиболее полезный уровень контекста:',
      why: 'Почему это важно:',
      dig: 'Куда копать:',
      honestTitle: 'Честный вывод',
      paragraph: 'абзац',
      chapter: 'глава',
      book: 'книга',
      bible_line: 'широкая библейская линия',
      none: 'не найден',
    }
  }

  if (language === 'es') {
    return {
      leadPrefix: 'Direcciones contextuales que realmente ayudan a entender mejor este versículo.',
      takeawayPrefix: 'Nivel de contexto más útil:',
      why: 'Por qué importa:',
      dig: 'Profundizar:',
      honestTitle: 'Conclusión honesta',
      paragraph: 'párrafo',
      chapter: 'capítulo',
      book: 'libro',
      bible_line: 'línea bíblica amplia',
      none: 'no encontrado',
    }
  }

  if (language === 'fr') {
    return {
      leadPrefix: 'Directions contextuelles qui aident réellement à mieux comprendre ce verset.',
      takeawayPrefix: 'Niveau de contexte le plus utile :',
      why: 'Pourquoi cela compte :',
      dig: 'Creuser plus loin :',
      honestTitle: 'Conclusion honnête',
      paragraph: 'paragraphe',
      chapter: 'chapitre',
      book: 'livre',
      bible_line: 'ligne biblique large',
      none: 'non trouvé',
    }
  }

  if (language === 'de') {
    return {
      leadPrefix: 'Kontext-Richtungen, die wirklich helfen, diesen Vers genauer zu verstehen.',
      takeawayPrefix: 'Hilfreichste Kontextebene:',
      why: 'Warum das wichtig ist:',
      dig: 'Weiter graben:',
      honestTitle: 'Ehrliches Fazit',
      paragraph: 'Absatz',
      chapter: 'Kapitel',
      book: 'Buch',
      bible_line: 'weite Bibellinie',
      none: 'nicht gefunden',
    }
  }

  return {
    leadPrefix: 'Contextual directions that genuinely help explain this verse more clearly.',
    takeawayPrefix: 'Most helpful context level:',
    why: 'Why this matters:',
    dig: 'Dig deeper:',
    honestTitle: 'Honest conclusion',
    paragraph: 'paragraph',
    chapter: 'chapter',
    book: 'book',
    bible_line: 'wider Bible line',
    none: 'none',
  }
}

function bestLevelLabel(level: ContextAssessment['best_level'], language: SupportedLanguage) {
  const l = labels(language)
  if (level === 'paragraph') return l.paragraph
  if (level === 'chapter') return l.chapter
  if (level === 'book') return l.book
  if (level === 'bible_line') return l.bible_line
  return l.none
}

function outputLanguageInstruction(language: SupportedLanguage) {
  if (language === 'ru') {
    return 'Все человекочитаемые поля JSON верни на русском языке.'
  }

  if (language === 'es') {
    return 'Все человекочитаемые поля JSON верни на испанском языке.'
  }

  if (language === 'fr') {
    return 'Все человекочитаемые поля JSON верни на французском языке.'
  }

  if (language === 'de') {
    return 'Все человекочитаемые поля JSON верни на немецком языке.'
  }

  return 'All human-readable JSON fields must be returned in English.'
}

async function getChapterSnapshot(
  book: string,
  chapter: number
): Promise<{ reference: string; text: string } | null> {
  const bookId = getWebBookId(book)
  if (!bookId) return null

  const url = `https://bible-api.com/data/web/${bookId}/${chapter}`

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) return null

    const data: BibleApiChapterResponse = await response.json()

    if (!Array.isArray(data.verses) || data.verses.length === 0) return null

    const parts = data.verses
      .map((item) => {
        const verseNo = Number(item.verse)
        const text = normalizeText(item.text)

        if (!Number.isInteger(verseNo) || !text) return ''
        return `${verseNo}. ${text}`
      })
      .filter(Boolean)

    if (parts.length === 0) return null

    return {
      reference: `${book} ${chapter}`,
      text: parts.join(' '),
    }
  } catch {
    return null
  }
}

function buildPrompt(params: {
  reference: string
  verseText: string
  book: string
  paragraphReference: string
  paragraphText: string
  chapterReference: string
  chapterText: string
  targetLanguage: SupportedLanguage
}) {
  return `
Ты работаешь как исследователь контекста для Scriptura+.

Твоя задача — определить:
какой контекст, если вообще какой-то, действительно помогает точнее, глубже и честнее понять выбранный стих.

Центр всегда один: сам выбранный стих.
Не абзац ради абзаца.
Не глава ради главы.
Не книга ради книги.
Не общая тема Библии ради красивого звучания.

Если контекст не усиливает понимание стиха, ты обязан это признать.

ГЛАВНЫЙ ВОПРОС:
Какой контекст, и на каком уровне, действительно помогает понять этот стих лучше?

КАСКАД КОНТЕКСТА:
1. paragraph — ближайший осмысленный поток вокруг стиха
2. chapter — движение главы, сцена, аргумент, контраст, нарастание, функция стиха
3. book — роль стиха в книге
4. bible_line — только если есть естественная, сильная, текстово оправданная связь, реально проясняющая стих

ПРАВИЛА:
- Всегда предпочитай самый низкий уровень, который реально работает.
- Не считай полезным то, что просто стоит рядом.
- Близость ещё не равна объяснению.
- Направление допустимо только если оно помогает понять именно выбранный стих.
- Если убрать выбранный стих, и мысль останется почти той же, направление нужно отбросить.
- Если ближайший уровень уже работает, выше не поднимайся ради полноты.
- Допустимы не только сильные направления, но и скромные, если они честно дают небольшое уточнение.
- Если даже скромное усиление было бы натяжкой, верни честный пустой результат.
- Лучше 3 сильных направления, чем 5 просто нормальных.
- Не возвращай направление только потому, что оно приемлемое; возвращай только если оно ясно отличается по типу contextual gain от уже выбранных.

ДВУХПОРОГОВАЯ СИСТЕМА:
- Сильное направление: контекст заметно заостряет стих, меняет чтение или ясно объясняет его функцию, место или силу.
- Скромное направление: контекст не даёт яркого прорыва, но честно уточняет стих, снимает недопонимание или делает его роль яснее.
- Не раздувай скромные наблюдения до сильных.

АНТИВОДНЫЙ БЛОК:
- Не раздувай.
- Одно направление = одно ясное contextual gain.
- Не смешивай сразу несколько разных осей в одном блоке.
- Избегай литературного надувания.
- Не используй выражения вроде:
  "скрытая ось",
  "не случайный порядок",
  "это не просто..., а...",
  "как будто печать",
  "контрсила",
  "сам акт становится частью смысла"
  если это нельзя строго показать из текста.
- Пиши суше, строже и короче.
- Если убрать красивые слова, должно остаться реальное уточнение стиха.

ОГРАНИЧИТЕЛЬ ДЛЯ bible_line:
- Используй уровень bible_line только если он действительно проясняет этот стих, а не просто делает его более большим или богословски торжественным.
- Не вставляй автоматически общую тему Библии, Царство, оправдание имени Бога, восстановление и другие большие рамки, если сам стих естественно этого не открывает.
- Если сомневаешься, оставайся на уровне paragraph, chapter или book.
- При bible_line используй сдержанный язык, а не категоричность.

ФОРМАТ НАПРАВЛЕНИЙ:
Для каждого направления дай:
- id
- level
- title
- summary
- why_it_matters
- dig_deeper

ОГРАНИЧЕНИЯ ПО ДЛИНЕ:
- summary: максимум 2 предложения
- why_it_matters: максимум 1 короткое предложение
- dig_deeper: максимум 1 короткое предложение

ФИНАЛЬНАЯ ПРОВЕРКА:
Для каждого направления мысленно заверши фразу:
"Это помогает понять стих лучше, потому что..."
Если не можешь завершить её ясно и конкретно, направление нужно отбросить.

${outputLanguageInstruction(params.targetLanguage)}

ИСХОДНЫЕ ДАННЫЕ

ЦЕЛЕВОЙ СТИХ:
${params.reference}
${params.verseText}

КНИГА:
${params.book}

БЛИЖАЙШИЙ АБЗАЦ:
${params.paragraphReference}
${params.paragraphText}

СНИМОК ГЛАВЫ:
${params.chapterReference}
${params.chapterText}

Верни только валидный JSON в таком формате:

{
  "context_assessment": {
    "best_level": "paragraph | chapter | book | bible_line | none",
    "note": "string"
  },
  "directions": [
    {
      "id": "ctx_1",
      "level": "paragraph | chapter | book | bible_line",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    }
  ]
}

Если сильных или честных скромных направлений нет, верни:
{
  "context_assessment": {
    "best_level": "none",
    "note": "string"
  },
  "directions": []
}
`.trim()
}

function validatePayload(
  payload: ContextModelPayload
): { assessment: ContextAssessment; directions: ContextDirection[] } | null {
  const bestLevel = payload.context_assessment?.best_level
  const note = normalizeText(payload.context_assessment?.note)

  if (!isValidBestLevel(bestLevel) || !note) return null

  const directions: ContextDirection[] = []
  const seen = new Set<string>()

  if (Array.isArray(payload.directions)) {
    for (let i = 0; i < payload.directions.length; i += 1) {
      const item = payload.directions[i]
      if (!item || typeof item !== 'object') continue

      const id = normalizeText(item.id) || `ctx_${i + 1}`
      const level = item.level
      const title = normalizeText(item.title)
      const summary = normalizeText(item.summary)
      const why = normalizeText(item.why_it_matters)
      const dig = normalizeText(item.dig_deeper)

      if (!isValidLevel(level)) continue
      if (!title || !summary || !why || !dig) continue
      if (seen.has(id)) continue

      seen.add(id)

      directions.push({
        id,
        level,
        title,
        summary,
        why_it_matters: why,
        dig_deeper: dig,
      })
    }
  }

  if (bestLevel !== 'none' && directions.length === 0) {
    return null
  }

  return {
    assessment: {
      best_level: bestLevel,
      note,
    },
    directions,
  }
}

function toLegacyContextPayload(
  assessment: ContextAssessment,
  directions: ContextDirection[],
  language: SupportedLanguage
): ContextPayload {
  const l = labels(language)

  if (directions.length === 0) {
    return {
      lead: assessment.note,
      points: [
        {
          title: l.honestTitle,
          text: assessment.note,
        },
      ],
      takeaway: assessment.note,
    }
  }

  return {
    lead: `${l.leadPrefix} ${assessment.note}`,
    points: directions.map((direction) => ({
      title: direction.title,
      text: [
        direction.summary,
        '',
        `${l.why} ${direction.why_it_matters}`,
        '',
        `${l.dig} ${direction.dig_deeper}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })),
    takeaway: `${l.takeawayPrefix} ${bestLevelLabel(assessment.best_level, language)}. ${assessment.note}`,
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = normalizeText(body.reference)
    const incomingVerseText = normalizeText(body.verseText)

    const targetLanguage: SupportedLanguage =
      body.targetLanguage === 'ru' ||
      body.targetLanguage === 'es' ||
      body.targetLanguage === 'fr' ||
      body.targetLanguage === 'de'
        ? body.targetLanguage
        : 'en'

    if (!reference || !incomingVerseText) {
      return NextResponse.json(
        { error: 'reference and verseText are required.' },
        { status: 400 }
      )
    }

    const referenceMatch = reference.match(/^(.*)\s+(\d+):(\d+)$/)

    if (!referenceMatch) {
      return NextResponse.json(
        { error: 'reference format is invalid.' },
        { status: 400 }
      )
    }

    const book = normalizeText(referenceMatch[1])
    const chapter = Number(referenceMatch[2])
    const verse = Number(referenceMatch[3])

    if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
      return NextResponse.json(
        { error: 'reference format is invalid.' },
        { status: 400 }
      )
    }

    const verseText =
      incomingVerseText || (await getVerseText(book, chapter, verse)) || incomingVerseText

    const paragraphResult = await getParagraphText(book, chapter, verse)
    const chapterSnapshot = await getChapterSnapshot(book, chapter)

    if (!paragraphResult || !chapterSnapshot) {
      return NextResponse.json(
        { error: 'Failed to build context sources.' },
        { status: 500 }
      )
    }

    const prompt = buildPrompt({
      reference,
      verseText,
      book,
      paragraphReference: paragraphResult.paragraph.reference,
      paragraphText: paragraphResult.paragraph.text,
      chapterReference: chapterSnapshot.reference,
      chapterText: chapterSnapshot.text,
      targetLanguage,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2600,
    })

    const rawText = result.rawText || ''

    if (!result.ok || !rawText) {
      return NextResponse.json(
        { error: 'Model failed to generate context.', raw: rawText },
        { status: 500 }
      )
    }

    const parsed = parsePayload(rawText)

    if (!parsed) {
      return NextResponse.json(
        { error: 'Failed to parse model output.', raw: rawText },
        { status: 500 }
      )
    }

    const validated = validatePayload(parsed)

    if (!validated) {
      return NextResponse.json(
        { error: 'Model output failed validation.', raw: rawText },
        { status: 500 }
      )
    }

    const context = toLegacyContextPayload(
      validated.assessment,
      validated.directions,
      targetLanguage
    )

    const response: ContextApiResponse = {
      reference,
      verseText,
      context,
      context_assessment: validated.assessment,
      directions: validated.directions,
      raw: rawText,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Context API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while generating context.',
      },
      { status: 500 }
    )
  }
}
