import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getVerseText, getWebBookId } from '@/lib/bible/getVerseText'
import { getParagraphText } from '@/lib/bible/getParagraphText'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type ContextDirectionLevel = 'chapter' | 'situation' | 'book' | 'historical' | 'bible_line'
type ContextBestLevel = ContextDirectionLevel | 'none'

type ContextDirection = {
  id: string
  level: ContextDirectionLevel
  title: string
  if_read_alone: string
  wider_frame: string
  what_changes: string
  why_it_matters: string
  dig_deeper: string
}

type ContextAssessment = {
  best_level: ContextBestLevel
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

function isValidLevel(value: unknown): value is ContextDirectionLevel {
  return (
    value === 'chapter' ||
    value === 'situation' ||
    value === 'book' ||
    value === 'historical' ||
    value === 'bible_line'
  )
}

function isValidBestLevel(value: unknown): value is ContextBestLevel {
  return (
    value === 'chapter' ||
    value === 'situation' ||
    value === 'book' ||
    value === 'historical' ||
    value === 'bible_line' ||
    value === 'none'
  )
}

function labels(language: SupportedLanguage) {
  if (language === 'ru') {
    return {
      leadPrefix:
        'Широкие контекстные направления, которые действительно помогают точнее понять этот стих.',
      takeawayPrefix: 'Наиболее полезный уровень широкого контекста:',
      honestTitle: 'Честный вывод',
      alone: 'Если читать стих отдельно:',
      frame: 'Широкая рамка:',
      changes: 'Что меняется:',
      why: 'Почему это важно:',
      dig: 'Куда копать:',
      chapter: 'глава',
      situation: 'ситуация адресатов',
      book: 'книга',
      historical: 'историческая обстановка',
      bible_line: 'более широкая библейская линия',
      none: 'не найден',
    }
  }

  if (language === 'es') {
    return {
      leadPrefix:
        'Direcciones de contexto amplio que realmente ayudan a entender mejor este versículo.',
      takeawayPrefix: 'Nivel de contexto amplio más útil:',
      honestTitle: 'Conclusión honesta',
      alone: 'Si se lee el versículo por separado:',
      frame: 'Marco amplio:',
      changes: 'Qué cambia:',
      why: 'Por qué importa:',
      dig: 'Profundizar:',
      chapter: 'capítulo',
      situation: 'situación de los destinatarios',
      book: 'libro',
      historical: 'contexto histórico',
      bible_line: 'línea bíblica amplia',
      none: 'no encontrado',
    }
  }

  if (language === 'fr') {
    return {
      leadPrefix:
        'Directions de contexte large qui aident réellement à mieux comprendre ce verset.',
      takeawayPrefix: 'Niveau de contexte large le plus utile :',
      honestTitle: 'Conclusion honnête',
      alone: 'Si on lit le verset isolément :',
      frame: 'Cadre large :',
      changes: 'Ce qui change :',
      why: 'Pourquoi cela compte :',
      dig: 'Creuser plus loin :',
      chapter: 'chapitre',
      situation: 'situation des destinataires',
      book: 'livre',
      historical: 'contexte historique',
      bible_line: 'ligne biblique large',
      none: 'non trouvé',
    }
  }

  if (language === 'de') {
    return {
      leadPrefix:
        'Weite Kontext-Richtungen, die wirklich helfen, diesen Vers genauer zu verstehen.',
      takeawayPrefix: 'Hilfreichste Ebene des weiten Kontexts:',
      honestTitle: 'Ehrliches Fazit',
      alone: 'Wenn man den Vers isoliert liest:',
      frame: 'Weiter Rahmen:',
      changes: 'Was sich ändert:',
      why: 'Warum das wichtig ist:',
      dig: 'Weiter graben:',
      chapter: 'Kapitel',
      situation: 'Situation der Adressaten',
      book: 'Buch',
      historical: 'historischer Hintergrund',
      bible_line: 'weite Bibellinie',
      none: 'nicht gefunden',
    }
  }

  return {
    leadPrefix: 'Wider-context directions that genuinely help explain this verse more clearly.',
    takeawayPrefix: 'Most helpful wider-context level:',
    honestTitle: 'Honest conclusion',
    alone: 'If the verse is read alone:',
    frame: 'Wider frame:',
    changes: 'What changes:',
    why: 'Why this matters:',
    dig: 'Dig deeper:',
    chapter: 'chapter',
    situation: 'recipient situation',
    book: 'book',
    historical: 'historical setting',
    bible_line: 'wider Bible line',
    none: 'none',
  }
}

function bestLevelLabel(level: ContextBestLevel, language: SupportedLanguage) {
  const l = labels(language)
  if (level === 'chapter') return l.chapter
  if (level === 'situation') return l.situation
  if (level === 'book') return l.book
  if (level === 'historical') return l.historical
  if (level === 'bible_line') return l.bible_line
  return l.none
}

function outputLanguageInstruction(language: SupportedLanguage) {
  if (language === 'ru') return 'Все человекочитаемые поля JSON верни на русском языке.'
  if (language === 'es') return 'Все человекочитаемые поля JSON верни на испанском языке.'
  if (language === 'fr') return 'Все человекочитаемые поля JSON верни на французском языке.'
  if (language === 'de') return 'Все человекочитаемые поля JSON верни на немецком языке.'
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
Ты работаешь как исследователь ШИРОКОГО КОНТЕКСТА для Scriptura+.

Твоя задача — показать, какая более крупная рамка помогает понять выбранный стих:
- глава как целое
- ситуация адресатов
- логика книги
- историческая обстановка
- при реальном основании — более широкая библейская линия

Это НЕ узкий контекст.
Узкий контекст работает через соседние стихи и ближайший абзац.
Широкий контекст не должен в основном опираться на соседние стихи.

ГЛАВНЫЙ ВОПРОС:
Какой более широкий контекст помогает точнее понять этот стих: кто написал, кому, в какой ситуации, в какой логике главы и книги, и как это меняет чтение стиха?

ЖЁСТКОЕ ПРАВИЛО:
Если направление опирается в основном на соседние стихи до и после выбранного стиха, это не широкий контекст.

КАСКАД ШИРОКОГО КОНТЕКСТА:
1. chapter — движение главы как целого
2. situation — ситуация адресатов, давление, проблема, цель обращения
3. book — линия книги, цель автора, место стиха в книге
4. historical — историческая или социальная обстановка, если она реально помогает понять стих
5. bible_line — только если есть естественная, сильная, текстово оправданная более широкая библейская линия

ЧТО СЧИТАЕТСЯ ХОРОШИМ РЕЗУЛЬТАТОМ:
Широкий контекст хорош, если он показывает:
- почему стих сказан именно так
- какую проблему он решает
- на какую ситуацию отвечает
- какова его функция в главе или книге
- как авторское намерение меняет прочтение стиха
- как историческая обстановка помогает понять тон и вес стиха
- как более крупная линия делает стих точнее, а не просто масштабнее

ЧТО НЕЛЬЗЯ ДЕЛАТЬ:
- подменять широкий контекст пересказом соседних стихов
- строить ответ почти целиком на ближайшем абзаце
- выдавать локальный контекст за широкий
- расширять ради красивой большой темы
- делать общие богословские выводы без связи с ситуацией стиха

ВНУТРЕННЕЕ СМЫСЛОВОЕ ЯДРО:
Ниже перечислены допустимые крупные библейские линии, которые могут работать как ВНУТРЕННИЙ фильтр, но не должны автоматически вставляться в ответ:
- право владычества Бога
- оправдание его имени / репутации
- линия Царства и небесного правления
- ограниченность человеческих систем
- постепенное раскрытие Божьего замысла
- завет
- святилище / посредничество
- восстановление Божьего порядка
- финальная передача власти Отцу

Эти линии допустимы только если:
- сам стих, глава, книга или ситуация реально их открывают
- они помогают понять стих точнее
- они не выглядят вставленными извне
- текст наружу остаётся сдержанным, исследовательским и не звучит доктринально навязанным

ДВУХПОРОГОВАЯ СИСТЕМА:
- Сильное направление: широкий контекст заметно меняет чтение стиха или ясно показывает его функцию.
- Скромное направление: широкий контекст не даёт прорыва, но честно снимает слишком узкое чтение или уточняет рамку стиха.
- Не раздувай скромные наблюдения до сильных.

АНТИВОДНЫЙ БЛОК:
- Не раздувай.
- Одно направление = один ясный gain.
- Не строй архитектуру и систему там, где достаточно прямого объяснения.
- Не используй красивые формулы без реального уточнения стиха.
- Если два направления говорят почти об одном и том же, оставь только одно.
- Лучше 2–3 сильных направления, чем 5 просто приемлемых.

ОБЯЗАТЕЛЬНО ПОКАЗЫВАЙ ЛОГИЧЕСКИЙ МОСТ:
Для каждого направления объясни по шагам:
1. как стих может читаться отдельно
2. какая именно широкая рамка это уточняет
3. что именно меняется в чтении стиха из-за этой рамки

Не заставляй читателя самому достраивать мост.

ОГРАНИЧИТЕЛЬ ДЛЯ bible_line:
- Используй уровень bible_line только если он действительно проясняет этот стих, а не просто делает его более масштабным.
- Не вставляй автоматически общую тему Библии, Царство, оправдание имени Бога, восстановление и другие большие рамки, если сам текст естественно этого не открывает.
- Если сомневаешься, оставайся на уровне chapter, situation, book или historical.
- При bible_line используй осторожный язык, а не категоричность.

ФОРМАТ НАПРАВЛЕНИЙ:
Для каждого направления дай:
- id
- level
- title
- if_read_alone
- wider_frame
- what_changes
- why_it_matters
- dig_deeper

ОГРАНИЧЕНИЯ ПО ДЛИНЕ:
- if_read_alone: максимум 2 предложения
- wider_frame: максимум 2 предложения
- what_changes: максимум 2 предложения
- why_it_matters: максимум 1 короткое предложение
- dig_deeper: максимум 1 короткое предложение

ФИНАЛЬНАЯ ПРОВЕРКА:
Для каждого направления мысленно заверши фразу:
"Этот более широкий контекст помогает понять стих лучше, потому что..."
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
    "best_level": "chapter | situation | book | historical | bible_line | none",
    "note": "string"
  },
  "directions": [
    {
      "id": "ctx_1",
      "level": "chapter | situation | book | historical | bible_line",
      "title": "string",
      "if_read_alone": "string",
      "wider_frame": "string",
      "what_changes": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    }
  ]
}

Если широкий контекст не даёт реального усиления:
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
      const ifReadAlone = normalizeText(item.if_read_alone)
      const widerFrame = normalizeText(item.wider_frame)
      const whatChanges = normalizeText(item.what_changes)
      const why = normalizeText(item.why_it_matters)
      const dig = normalizeText(item.dig_deeper)

      if (!isValidLevel(level)) continue
      if (!title || !ifReadAlone || !widerFrame || !whatChanges || !why || !dig) continue
      if (seen.has(id)) continue

      seen.add(id)

      directions.push({
        id,
        level,
        title,
        if_read_alone: ifReadAlone,
        wider_frame: widerFrame,
        what_changes: whatChanges,
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
        `${l.alone} ${direction.if_read_alone}`,
        '',
        `${l.frame} ${direction.wider_frame}`,
        '',
        `${l.changes} ${direction.what_changes}`,
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

async function getVerseData(reference: string, incomingVerseText: string) {
  const match = reference.match(/^(.*)\s+(\d+):(\d+)$/)

  if (!match) {
    return { error: 'reference format is invalid.' as const }
  }

  const book = normalizeText(match[1])
  const chapter = Number(match[2])
  const verse = Number(match[3])

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return { error: 'reference format is invalid.' as const }
  }

  const verseText = incomingVerseText || (await getVerseText(book, chapter, verse)) || incomingVerseText
  const paragraphResult = await getParagraphText(book, chapter, verse)
  const chapterSnapshot = await getChapterSnapshot(book, chapter)

  if (!paragraphResult || !chapterSnapshot) {
    return { error: 'Failed to build context sources.' as const }
  }

  return {
    book,
    chapter,
    verse,
    verseText,
    paragraphReference: paragraphResult.paragraph.reference,
    paragraphText: paragraphResult.paragraph.text,
    chapterReference: chapterSnapshot.reference,
    chapterText: chapterSnapshot.text,
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

    const verseData = await getVerseData(reference, incomingVerseText)

    if ('error' in verseData) {
      return NextResponse.json({ error: verseData.error }, { status: 400 })
    }

    const prompt = buildPrompt({
      reference,
      verseText: verseData.verseText,
      book: verseData.book,
      paragraphReference: verseData.paragraphReference,
      paragraphText: verseData.paragraphText,
      chapterReference: verseData.chapterReference,
      chapterText: verseData.chapterText,
      targetLanguage,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 3000,
    })

    const rawText = result.rawText || ''

    if (!result.ok || !rawText) {
      return NextResponse.json(
        { error: 'Model failed to generate wide context.', raw: rawText },
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
      verseText: verseData.verseText,
      context,
      context_assessment: validated.assessment,
      directions: validated.directions,
      raw: rawText,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Wide Context API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while generating wide context.',
      },
      { status: 500 }
    )
  }
}
