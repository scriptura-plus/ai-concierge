import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getParagraphText } from '@/lib/bible/getParagraphText'
import { getVerseText } from '@/lib/bible/getVerseText'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type NarrowContextHighlight = {
  text: string
  kind: HighlightKind
}

type NarrowContextDirection = {
  id: string
  title: string
  summary: string
  why_it_matters: string
  dig_deeper: string
}

type NarrowContextPayload = {
  paragraph?: {
    reference?: string
    full_text?: string
    highlights?: NarrowContextHighlight[]
  }
  directions?: NarrowContextDirection[]
}

type CandidateOption = {
  title: string
  text: string
  angle_note: string
}

type GeneratedCandidateRow = {
  id: string
  title_ru: string | null
  text_ru: string | null
  candidate_status: string | null
}

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') {
    return `
Write the full output in Russian.
All fields must be fully in Russian, except id values and kind values.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'es') {
    return `
Write the full output in Spanish.
All fields must be fully in Spanish, except id values and kind values.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'fr') {
    return `
Write the full output in French.
All fields must be fully in French, except id values and kind values.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'de') {
    return `
Write the full output in German.
All fields must be fully in German, except id values and kind values.
Do not use English in explanatory text.
`.trim()
  }

  return `
Write the full output in English.
All explanatory text must be in English.
`.trim()
}

function translationLanguageName(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') return 'Russian'
  if (targetLanguage === 'es') return 'Spanish'
  if (targetLanguage === 'fr') return 'French'
  if (targetLanguage === 'de') return 'German'
  return 'English'
}

function buildParagraphTranslationPrompt(params: {
  paragraphText: string
  targetLanguage: SupportedLanguage
}) {
  return `
Translate the following Bible paragraph into ${translationLanguageName(params.targetLanguage)}.

STRICT RULES:
- Return ONLY the translated paragraph text.
- No JSON.
- No markdown.
- No commentary.
- No quotation marks around the result.
- Preserve the original meaning closely.
- Make the paragraph read naturally in ${translationLanguageName(params.targetLanguage)}.
- Keep it as one readable paragraph block.

PARAGRAPH:
${params.paragraphText}
`.trim()
}

async function translateParagraphText(
  paragraphText: string,
  targetLanguage: SupportedLanguage
): Promise<string> {
  if (targetLanguage === 'en') {
    return paragraphText
  }

  const result = await runModel({
    prompt: buildParagraphTranslationPrompt({
      paragraphText,
      targetLanguage,
    }),
    model: 'gpt-5.4-mini',
    maxOutputTokens: 1200,
  })

  if (!result.ok || !result.rawText?.trim()) {
    return paragraphText
  }

  const translated = result.rawText.replace(/^["'`]+|["'`]+$/g, '').trim()
  return translated || paragraphText
}

function buildPrompt(params: {
  reference: string
  verseText: string
  paragraphReference: string
  paragraphText: string
  targetLanguage: SupportedLanguage
}) {
  return `
You are designing a premium Bible-reading experience called Scriptura+.

Your task is to analyze ONE paragraph that contains the target verse and return a structured result for a reading interface.

This mode is called PARAGRAPH MODE.

IMPORTANT:
This is NOT a sermon.
This is NOT a devotional.
This is NOT generic commentary.
This is NOT a summary of the paragraph.

This mode must help the reader feel:
“I have read this before, but I did not notice this.”

The goal is to reveal the hidden meaning-structures, tensions, pivots, and high-potential reading directions inside the paragraph.

========================================
1. INPUT
========================================

TARGET VERSE REFERENCE:
${params.reference}

TARGET VERSE TEXT:
${params.verseText}

PARAGRAPH REFERENCE:
${params.paragraphReference}

FULL PARAGRAPH TEXT:
${params.paragraphText}

${languageInstruction(params.targetLanguage)}

You must work only from the paragraph provided.
Do not invent wording.
Do not import nearby text unless it is already inside the paragraph.
Stay text-anchored.

========================================
2. CORE PRODUCT GOAL
========================================

Your output must create a 3-layer experience:

LAYER 1 — FULL PARAGRAPH
Show the full paragraph as a readable whole.

LAYER 2 — HIGHLIGHTED MEANING DIRECTIONS
Identify the strongest meaning-bearing words or phrases in the paragraph.
These are not random important words.
These are the paragraph’s meaning-levers:
- pivots
- contrasts
- loaded words
- structural turns
- emotional pressure points
- phrases that carry hidden weight

LAYER 3 — FIVE PROMISING DIRECTIONS
Produce 5 different high-potential reading directions that arise from this paragraph.

Each direction should feel like a real door into deeper reading.

========================================
3. WHAT MAKES A GOOD DIRECTION
========================================

A strong direction:
- is anchored in the paragraph
- is not obvious
- does not repeat the other directions
- opens a real line of thought
- shows why this part of the paragraph is worth further exploration

Each direction must include:
- title
- summary
- why_it_matters
- dig_deeper

Meaning of fields:

title:
Short, sharp, memorable, intelligent.
Not cute. Not vague.

summary:
2-4 sentences.
Explain what becomes visible here in the paragraph.

why_it_matters:
1-3 sentences.
Why this direction changes or sharpens the reading.

dig_deeper:
1-2 sentences.
What kind of deeper exploration this direction invites.

========================================
4. DIVERSITY RULE
========================================

The 5 directions must NOT be five versions of the same idea.

Across the 5, aim for diversity such as:
- one direction built on a hidden key word
- one built on paragraph logic or movement
- one built on contrast or tension
- one built on rhetoric or emotional force
- one built on implication or consequence
- one built on what is unexpectedly emphasized
- one built on what the reader might overlook

Do not force categories mechanically.
But the final five must clearly differ from one another.

========================================
5. HIGHLIGHT RULES
========================================

You must return a small set of highlighted units from the paragraph.

These highlights should mark only the paragraph’s real meaning-levers.

Do NOT highlight too much.

Target:
- usually 4 to 8 highlights
- each highlight should be short
- a highlight may be:
  - a single word
  - a short phrase
  - a contrast pair
  - a turn in thought

For each highlight, include:
- text
- kind

Allowed values for kind:
- keyword
- phrase
- contrast
- pivot

CRITICAL:
- Every highlight text must appear exactly inside the paragraph text above.
- Do not paraphrase highlight text.
- Do not invent highlight wording.
- Keep highlights short and exact.

========================================
6. STYLE RULES
========================================

Tone:
- intelligent
- clear
- precise
- readable
- elegant
- modern
- warm but not sentimental

Style target:
“an expensive intellectual journal about the text”

Do NOT sound like:
- a preacher
- a Bible dictionary
- a generic devotional writer
- a social media motivational account

Avoid:
- clichés
- vague spiritual language
- inflated piety
- generic statements that could fit almost any paragraph

========================================
7. WOW-EFFECT RULE
========================================

The best result is one where the reader feels:
“I would not have noticed that on my own.”

To achieve that, prefer:
- hidden centers of gravity
- quiet but decisive words
- unexpected turns in logic
- subtle intensifications from nearby lines
- tensions that become visible only when reading the whole paragraph

========================================
8. HARD RESTRICTIONS
========================================

Do NOT:
- summarize the paragraph as a whole
- explain every verse equally
- produce generic moral lessons
- produce theological preaching
- make all 5 directions similar
- exaggerate depth where the text does not support it
- write decorative fluff

If the paragraph does not support a dramatic insight, stay honest and precise.
Subtle but real is better than impressive but fake.

========================================
9. OUTPUT FORMAT
========================================

Return ONLY valid JSON.
No markdown.
No commentary.
No code fences.

Use exactly this structure:

{
  "paragraph": {
    "reference": "${params.paragraphReference}",
    "full_text": "${params.paragraphText}",
    "highlights": [
      {
        "text": "string",
        "kind": "keyword | phrase | contrast | pivot"
      }
    ]
  },
  "directions": [
    {
      "id": "dir_1",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    },
    {
      "id": "dir_2",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    },
    {
      "id": "dir_3",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    },
    {
      "id": "dir_4",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    },
    {
      "id": "dir_5",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "dig_deeper": "string"
    }
  ]
}

========================================
10. FINAL QUALITY CHECK BEFORE OUTPUT
========================================

Before returning the JSON, silently verify:

- Are the 5 directions genuinely different?
- Are they all clearly anchored in the paragraph?
- Is at least 2 or 3 of them strong enough to create a real “I did not notice that” effect?
- Are the highlights selective rather than excessive?
- Does every highlight text appear exactly inside the paragraph?
- Is the tone sharp, readable, and non-generic?

If not, improve before outputting.
`.trim()
}

function buildCandidatePrompt(params: {
  reference: string
  verseText: string
  paragraphReference: string
  paragraphText: string
  directions: NarrowContextDirection[]
  sourceLanguage: SupportedLanguage
}) {
  return `
Ты превращаешь результаты Narrow Context в кандидаты карточек для moderator review в Scriptura+.

ССЫЛКА:
${params.reference}

ТЕКСТ СТИХА:
${params.verseText}

АБЗАЦ:
${params.paragraphReference}
${params.paragraphText}

ЯЗЫК ИСХОДНОГО NARROW CONTEXT:
${params.sourceLanguage}

NARROW CONTEXT DIRECTIONS:
${JSON.stringify(params.directions, null, 2)}

ЗАДАЧА:
На основе этих paragraph-направлений создай 3-5 сильных candidate-карточек на РУССКОМ языке.
Это должны быть уже хорошие карточки для review, а не сырые заметки.

ГЛАВНЫЙ ПРИНЦИП:
- Каждая карточка должна рождаться из одного paragraph-direction.
- Не делай общую проповедь по стиху.
- Не пересказывай весь абзац.
- Не смешивай всё в один расплывчатый комментарий.
- Карточка должна показывать, что становится видно именно из ближайшего абзаца.
- Лучше меньше, но сильнее.

АНТИ-БОГОСЛОВСКИЙ ФИЛЬТР:
- Не используй церковный язык.
- Не используй конфессиональный язык.
- Не используй проповеднический тон.
- Не используй богословские термины.
- Не навязывай доктринальных выводов.
- Пиши как современный нейтральный аналитический AI-инструмент.

ЗАПРЕЩЕНО:
- богословие
- доктрина
- догмат
- троица
- триединый
- ипостась
- стих учит
- это доказывает
- божественная истина
- церковные формулы
- confession / doctrine / theology / sermon language

СТАНДАРТ КАРТОЧКИ:
- Заголовок короткий и сильный
- Текст плотный, ясный, интересный
- Не мини-статья
- Не короткая заметка в 2 предложения
- Обычно 5-7 предложений
- Карточка должна быть save-worthy, а не просто "может быть"

КАЖДАЯ КАРТОЧКА ДОЛЖНА:
- быть привязана к одному paragraph-direction
- показывать, почему ближайший абзац реально уточняет стих
- звучать как finished insight
- быть написана по-русски

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Плотная карточка на русском.",
    "angle_note": "Narrow Context: title"
  }
]
`.trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function parsePayload(raw: string): NarrowContextPayload | null {
  try {
    const parsed = JSON.parse(raw) as NarrowContextPayload
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    const extracted = extractJsonObject(raw)
    if (!extracted) return null

    try {
      const parsed = JSON.parse(extracted) as NarrowContextPayload
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }
}

function parseCandidateOptions(raw: string): CandidateOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: normalizeText(item.title),
        text: normalizeText(item.text),
        angle_note: normalizeText(item.angle_note),
      }))
      .filter((item) => item.title && item.text && item.angle_note)

    return cleaned.length ? cleaned.slice(0, 5) : null
  } catch {
    return null
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanHighlightKind(value: unknown): HighlightKind | null {
  const raw = normalizeText(value).toLowerCase()

  if (
    raw === 'keyword' ||
    raw === 'phrase' ||
    raw === 'contrast' ||
    raw === 'pivot'
  ) {
    return raw
  }

  return null
}

function parseReference(reference: string): {
  verse_ref: string
  book: string
  chapter: number
  verse: number
} | null {
  const trimmed = reference.trim()
  const match = trimmed.match(/^(.*)\s+(\d+):(\d+)$/)

  if (!match) return null

  const [, rawBook, rawChapter, rawVerse] = match
  const book = normalizeText(rawBook).toLowerCase()
  const chapter = Number(rawChapter)
  const verse = Number(rawVerse)

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return null
  }

  return {
    verse_ref: trimmed,
    book,
    chapter,
    verse,
  }
}

function normalizeTextForKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function buildCandidateSignature(title: string, text: string) {
  return `${normalizeTextForKey(title)}|||${normalizeTextForKey(text)}`
}

function dedupeCandidateOptions(items: CandidateOption[]) {
  const unique: CandidateOption[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const title = item.title.trim()
    const text = item.text.trim()
    const angle_note = item.angle_note.trim()

    if (!title || !text || !angle_note) continue
    if (text.length < 120) continue

    const key = buildCandidateSignature(title, text)
    if (seen.has(key)) continue

    seen.add(key)
    unique.push({ title, text, angle_note })
  }

  return unique
}

async function loadExistingGeneratedCandidates(params: {
  book: string
  chapter: number
  verse: number
}) {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .schema('private')
    .from('generated_candidates')
    .select('id, title_ru, text_ru, candidate_status')
    .eq('book', params.book.toLowerCase())
    .eq('chapter', params.chapter)
    .eq('verse', params.verse)
    .neq('candidate_status', 'trashed')

  if (error) {
    throw new Error(`Failed to load generated candidates: ${error.message}`)
  }

  return (data ?? []) as GeneratedCandidateRow[]
}

function validatePayload(
  payload: NarrowContextPayload,
  paragraphReference: string,
  paragraphText: string
): {
  paragraph: {
    reference: string
    full_text: string
    highlights: NarrowContextHighlight[]
  }
  directions: NarrowContextDirection[]
} | null {
  const fullText = normalizeText(payload.paragraph?.full_text) || paragraphText
  const reference = normalizeText(payload.paragraph?.reference) || paragraphReference

  if (!fullText) return null

  const rawHighlights = Array.isArray(payload.paragraph?.highlights)
    ? payload.paragraph?.highlights
    : []

  const highlights: NarrowContextHighlight[] = []
  const seenHighlightKeys = new Set<string>()

  for (const item of rawHighlights) {
    if (!item || typeof item !== 'object') continue

    const text = normalizeText((item as NarrowContextHighlight).text)
    const kind = cleanHighlightKind((item as NarrowContextHighlight).kind)

    if (!text || !kind) continue
    if (!fullText.includes(text)) continue
    if (text.length > 120) continue

    const key = `${kind}::${text}`
    if (seenHighlightKeys.has(key)) continue
    seenHighlightKeys.add(key)

    highlights.push({ text, kind })

    if (highlights.length >= 8) break
  }

  const rawDirections = Array.isArray(payload.directions) ? payload.directions : []
  const directions: NarrowContextDirection[] = []
  const seenDirectionIds = new Set<string>()

  for (let i = 0; i < rawDirections.length; i += 1) {
    const item = rawDirections[i]
    if (!item || typeof item !== 'object') continue

    const id = normalizeText((item as NarrowContextDirection).id) || `dir_${i + 1}`
    const title = normalizeText((item as NarrowContextDirection).title)
    const summary = normalizeText((item as NarrowContextDirection).summary)
    const whyItMatters = normalizeText((item as NarrowContextDirection).why_it_matters)
    const digDeeper = normalizeText((item as NarrowContextDirection).dig_deeper)

    if (!title || !summary || !whyItMatters || !digDeeper) continue
    if (seenDirectionIds.has(id)) continue

    seenDirectionIds.add(id)

    directions.push({
      id,
      title,
      summary,
      why_it_matters: whyItMatters,
      dig_deeper: digDeeper,
    })

    if (directions.length >= 5) break
  }

  if (directions.length < 3) {
    return null
  }

  return {
    paragraph: {
      reference,
      full_text: fullText,
      highlights,
    },
    directions,
  }
}

function buildFallbackDirections(): NarrowContextDirection[] {
  return [
    {
      id: 'dir_1',
      title: 'The nearest line of thought',
      summary:
        'The verse should first be read inside the immediate flow of the surrounding lines, not as an isolated sentence. The nearby wording may carry more pressure than a surface reading suggests.',
      why_it_matters:
        'This keeps the reader anchored in the smallest meaningful unit before moving outward.',
      dig_deeper:
        'Look at how the surrounding lines prepare, sharpen, or complete the target verse.',
    },
    {
      id: 'dir_2',
      title: 'What the paragraph stresses',
      summary:
        'Some words in the paragraph likely carry more weight than they seem at first glance. Their force may shape the meaning of the verse more than the most obvious phrase does.',
      why_it_matters:
        'The paragraph often hides its center of gravity in wording the reader would otherwise pass quickly.',
      dig_deeper:
        'Explore which words or phrases quietly hold the paragraph together and why.',
    },
    {
      id: 'dir_3',
      title: 'How the verse sounds here',
      summary:
        'The verse may sound different once it is heard as part of this local block. The nearby verses can change its tone, logic, or emphasis even without adding much length.',
      why_it_matters:
        'This is often where a more precise reading begins: not with more data, but with the right frame.',
      dig_deeper:
        'Explore how the paragraph changes the force of the verse compared with reading it alone.',
    },
    {
      id: 'dir_4',
      title: 'The paragraph’s inner turn',
      summary:
        'Many paragraphs contain a quiet shift in movement, contrast, or emphasis. The target verse may sit inside that turn rather than stand apart from it.',
      why_it_matters:
        'Spotting the turn can reveal why the verse is placed exactly where it is.',
      dig_deeper:
        'Look for transitions, contrasts, or pivots that shape the paragraph’s movement.',
    },
    {
      id: 'dir_5',
      title: 'What becomes visible nearby',
      summary:
        'The paragraph may not enlarge the verse dramatically, but it often makes the verse more exact. Even a small local gain can be more valuable than a forced grand interpretation.',
      why_it_matters:
        'Precision is often more useful than exaggeration.',
      dig_deeper:
        'Explore the smallest nearby details that make the verse read more truthfully.',
    },
  ]
}

async function buildRussianCandidatesFromDirections(params: {
  reference: string
  verseText: string
  paragraphReference: string
  paragraphText: string
  directions: NarrowContextDirection[]
  sourceLanguage: SupportedLanguage
}) {
  const prompt = buildCandidatePrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2600,
  })

  const rawText = result.rawText || ''

  if (!result.ok || !rawText) {
    throw new Error('Narrow Context candidate generator failed.')
  }

  let options = parseCandidateOptions(rawText)

  if (!options) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      options = parseCandidateOptions(extracted)
    }
  }

  if (!options || options.length === 0) {
    throw new Error('Failed to parse Narrow Context candidate cards.')
  }

  return dedupeCandidateOptions(options)
}

export async function POST(req: Request) {
  try {
    const {
      book,
      chapter,
      verse,
      targetLanguage,
    } = await req.json()

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: 'book, chapter, and verse are required.' },
        { status: 400 }
      )
    }

    const safeLanguage: SupportedLanguage =
      targetLanguage === 'ru' ||
      targetLanguage === 'es' ||
      targetLanguage === 'fr' ||
      targetLanguage === 'de'
        ? targetLanguage
        : 'en'

    const safeBook = String(book).trim()
    const safeChapter = Number(chapter)
    const safeVerse = Number(verse)

    if (!Number.isInteger(safeChapter) || !Number.isInteger(safeVerse)) {
      return NextResponse.json(
        { error: 'chapter and verse must be integers.' },
        { status: 400 }
      )
    }

    const verseText = await getVerseText(safeBook, safeChapter, safeVerse)

    if (!verseText) {
      return NextResponse.json(
        { error: 'Failed to load verse text from WEB API.' },
        { status: 500 }
      )
    }

    const paragraphResult = await getParagraphText(safeBook, safeChapter, safeVerse)

    if (!paragraphResult) {
      return NextResponse.json(
        { error: 'Failed to build paragraph context.' },
        { status: 500 }
      )
    }

    const reference = `${safeBook} ${safeChapter}:${safeVerse}`
    const parsedRef = parseReference(reference)

    if (!parsedRef) {
      return NextResponse.json(
        { error: 'Failed to parse reference.' },
        { status: 500 }
      )
    }

    const localizedParagraphText = await translateParagraphText(
      paragraphResult.paragraph.text,
      safeLanguage
    )

    const prompt = buildPrompt({
      reference,
      verseText,
      paragraphReference: paragraphResult.paragraph.reference,
      paragraphText: localizedParagraphText,
      targetLanguage: safeLanguage,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 3000,
    })

    let validated:
      | {
          paragraph: {
            reference: string
            full_text: string
            highlights: NarrowContextHighlight[]
          }
          directions: NarrowContextDirection[]
        }
      | null = null

    let rawText = ''

    if (result.ok && result.rawText) {
      rawText = result.rawText
      const parsed = parsePayload(result.rawText)
      if (parsed) {
        validated = validatePayload(
          parsed,
          paragraphResult.paragraph.reference,
          localizedParagraphText
        )
      }
    }

    if (!validated) {
      validated = {
        paragraph: {
          reference: paragraphResult.paragraph.reference,
          full_text: localizedParagraphText,
          highlights: [],
        },
        directions: buildFallbackDirections(),
      }
    }

    let insertedCandidateCount = 0
    let candidateIntakeError: string | null = null

    try {
      if (validated.directions.length > 0) {
        const options = await buildRussianCandidatesFromDirections({
          reference,
          verseText,
          paragraphReference: validated.paragraph.reference,
          paragraphText: validated.paragraph.full_text,
          directions: validated.directions,
          sourceLanguage: safeLanguage,
        })

        if (options.length > 0) {
          const existingRows = await loadExistingGeneratedCandidates({
            book: parsedRef.book,
            chapter: parsedRef.chapter,
            verse: parsedRef.verse,
          })

          const existingKeys = new Set(
            existingRows
              .map((row) =>
                row.title_ru?.trim() && row.text_ru?.trim()
                  ? buildCandidateSignature(row.title_ru, row.text_ru)
                  : null
              )
              .filter(Boolean) as string[]
          )

          const freshItems = options.filter((item) => {
            const key = buildCandidateSignature(item.title, item.text)
            return !existingKeys.has(key)
          })

          if (freshItems.length > 0) {
            const supabase = getSupabaseServerClient()

            const insertPayload = freshItems.map((item) => ({
              verse_ref: parsedRef.verse_ref,
              book: parsedRef.book,
              chapter: parsedRef.chapter,
              verse: parsedRef.verse,
              source_type: 'narrow_context',
              candidate_status: 'new',
              title_ru: item.title,
              text_ru: item.text,
              angle_note: item.angle_note.slice(0, 500),
              review_note: null,
            }))

            const { error } = await supabase
              .schema('private')
              .from('generated_candidates')
              .insert(insertPayload)

            if (error) {
              throw new Error(`Failed to save Narrow Context candidates: ${error.message}`)
            }

            insertedCandidateCount = insertPayload.length
          }
        }
      }
    } catch (error) {
      candidateIntakeError =
        error instanceof Error ? error.message : 'Narrow Context candidate intake failed.'
    }

    return NextResponse.json({
      reference,
      verseText,
      targetLanguage: safeLanguage,
      selection: paragraphResult.selection,
      paragraph: validated.paragraph,
      directions: validated.directions,
      raw: rawText || '',
      insertedCandidateCount,
      candidateIntakeError,
    })
  } catch (error) {
    console.error('Narrow Context API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while generating narrow context.',
      },
      { status: 500 }
    )
  }
}
