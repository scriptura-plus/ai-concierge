import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type WordLensMode = 'map' | 'deep_dive' | 'custom_dig'

type WordLensNodeKind =
  | 'word'
  | 'phrase'
  | 'formula'
  | 'idiom'
  | 'image'
  | 'contrast'

type WordLensNode = {
  id: string
  kind: WordLensNodeKind
  label: string
  original: string
  transliteration?: string
  semantic_core: string
  why_it_matters: string
  dig_deeper: string
}

type WordLensArticlePayload = {
  title: string
  lead: string
  body: string[]
  highlight_line?: string
}

type MapRequestBody = {
  reference?: string
  verseText?: string
  targetLanguage?: AppLanguage
  mode?: 'map'
}

type DeepDiveRequestBody = {
  reference?: string
  verseText?: string
  targetLanguage?: AppLanguage
  mode?: 'deep_dive'
  node?: WordLensNode
}

type CustomDigRequestBody = {
  reference?: string
  verseText?: string
  targetLanguage?: AppLanguage
  mode?: 'custom_dig'
  prompt?: string
}

type RequestBody = MapRequestBody | DeepDiveRequestBody | CustomDigRequestBody

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

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
}

const MAP_SCHEMA_EXAMPLE = {
  lead: 'Short lead',
  nodes: [
    {
      id: 'node_1',
      kind: 'phrase',
      label: 'eternal life',
      original: 'ζωὴ αἰώνιος',
      transliteration: 'zoe aionios',
      semantic_core: 'Short semantic core',
      why_it_matters: 'Why this matters for reading the verse',
      dig_deeper: 'One strong direction for deeper research',
    },
  ],
}

const ARTICLE_SCHEMA_EXAMPLE = {
  article: {
    title: 'Article title',
    lead: 'Short lead paragraph',
    body: ['Paragraph 1', 'Paragraph 2', 'Paragraph 3'],
    highlight_line: 'Closing line',
  },
}

function normalizeLanguage(value: unknown): AppLanguage {
  if (value === 'ru' || value === 'es' || value === 'fr' || value === 'de') return value
  return 'en'
}

function normalizeMode(value: unknown): WordLensMode {
  if (value === 'deep_dive' || value === 'custom_dig') return value
  return 'map'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cleanNodeKind(value: unknown): WordLensNodeKind {
  if (
    value === 'word' ||
    value === 'phrase' ||
    value === 'formula' ||
    value === 'idiom' ||
    value === 'image' ||
    value === 'contrast'
  ) {
    return value
  }

  return 'phrase'
}

function sanitizeNodes(value: unknown): WordLensNode[] {
  if (!Array.isArray(value)) return []

  const result: WordLensNode[] = []

  value.forEach((item, index) => {
    const raw = item as Partial<WordLensNode>

    const label = isNonEmptyString(raw?.label) ? raw.label.trim() : ''
    const original = isNonEmptyString(raw?.original) ? raw.original.trim() : ''
    const semantic_core = isNonEmptyString(raw?.semantic_core)
      ? raw.semantic_core.trim()
      : ''
    const why_it_matters = isNonEmptyString(raw?.why_it_matters)
      ? raw.why_it_matters.trim()
      : ''
    const dig_deeper = isNonEmptyString(raw?.dig_deeper)
      ? raw.dig_deeper.trim()
      : ''

    if (!label || !original || !semantic_core || !why_it_matters || !dig_deeper) {
      return
    }

    result.push({
      id: isNonEmptyString(raw?.id) ? raw.id.trim() : `node_${index + 1}`,
      kind: cleanNodeKind(raw?.kind),
      label,
      original,
      transliteration: isNonEmptyString(raw?.transliteration)
        ? raw.transliteration.trim()
        : '',
      semantic_core,
      why_it_matters,
      dig_deeper,
    })
  })

  return result.slice(0, 7)
}

function sanitizeArticle(value: unknown): WordLensArticlePayload | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<WordLensArticlePayload>

  const title = isNonEmptyString(raw.title) ? raw.title.trim() : ''
  const lead = isNonEmptyString(raw.lead) ? raw.lead.trim() : ''
  const body = Array.isArray(raw.body)
    ? raw.body
        .filter((item): item is string => isNonEmptyString(item))
        .map((item) => item.trim())
    : []
  const highlight_line = isNonEmptyString(raw.highlight_line)
    ? raw.highlight_line.trim()
    : ''

  if (!title || !lead || body.length === 0) return null

  return {
    title,
    lead,
    body,
    highlight_line,
  }
}

function stripCodeFences(value: string) {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(stripCodeFences(raw)) as T
  } catch {
    return null
  }
}

function mapSystemPrompt(language: AppLanguage) {
  return `
You are building a Bible study product's "Word Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Find 5-7 lexical or phrase-level meaning nodes inside the verse.
Nodes should feel like hidden entrances into the verse, not generic commentary.

Important:
- Focus on words, expressions, formulas, idioms, semantic pivots, author-specific wording, and historically meaningful phrasing.
- Do not give generic devotional thoughts.
- Do not repeat the whole verse in every field.
- "semantic_core" must be compact and precise.
- "why_it_matters" must explain how this node changes the reading of the verse.
- "dig_deeper" must suggest one compelling next direction.
- Prefer phrases when they carry more meaning than a single isolated word.
- Output 5 to 7 nodes.
- Return JSON matching this shape exactly:

${JSON.stringify(MAP_SCHEMA_EXAMPLE, null, 2)}
`.trim()
}

function mapUserPrompt(reference: string, verseText: string) {
  return `
Reference: ${reference}

Verse:
${verseText}

Task:
Build a Word Lens map for this verse.

Requirements:
1. Detect 5-7 strongest meaning nodes.
2. Each node must be grounded in the wording of the verse itself.
3. Nodes may be:
   - a key word
   - a phrase
   - a formula
   - an idiomatic expression
   - a semantic contrast
   - an image
4. "original" should give the key original-language form if appropriate.
5. "transliteration" should be included when helpful.
6. Keep every field concise but meaningful.
7. Avoid filler and avoid repeating the same idea across nodes.
`.trim()
}

function deepDiveSystemPrompt(language: AppLanguage) {
  return `
You are writing the deep-dive article for the Bible study product's Word Lens mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Expand one selected word/phrase node into a focused article.

Important:
- This is not a generic essay.
- The article must stay anchored to the selected node.
- The article must explain why this specific lexical node changes the reading of this specific verse.
- Prefer exegetical clarity over breadth.
- Use 4-7 body paragraphs.
- Each paragraph should move the thought forward.
- The final line should feel distilled and memorable.
- Return JSON matching this shape exactly:

${JSON.stringify(ARTICLE_SCHEMA_EXAMPLE, null, 2)}
`.trim()
}

function deepDiveUserPrompt(reference: string, verseText: string, node: WordLensNode) {
  return `
Reference: ${reference}

Verse:
${verseText}

Selected node:
${JSON.stringify(node, null, 2)}

Task:
Write a focused deep-dive article on this selected node.

Requirements:
1. Start from how the phrase/word is usually heard by a modern reader.
2. Show the non-obvious shift inside the verse.
3. Explain the semantic force of the original wording where fruitful.
4. Use the most productive angle for this node:
   - author usage
   - semantic field
   - historical perception
   - idiomatic force
   - phrase structure
   - contrast with modern assumptions
5. Bring the reader back to the verse itself.
6. Do not become a dictionary dump.
7. The article title should include the selected expression and a sharp thesis.
`.trim()
}

function customDigSystemPrompt(language: AppLanguage) {
  return `
You are writing a directed word-study article for the Bible study product's Word Lens mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Respect the user's chosen digging direction and produce a focused word-based study.

Important:
- Follow the user's direction closely.
- Stay anchored to the wording of the verse.
- This is still a word/phrase-based exploration, not a generic commentary.
- Use 4-7 body paragraphs.
- End with a distilled memorable line.
- Return JSON matching this shape exactly:

${JSON.stringify(ARTICLE_SCHEMA_EXAMPLE, null, 2)}
`.trim()
}

function customDigUserPrompt(reference: string, verseText: string, prompt: string) {
  return `
Reference: ${reference}

Verse:
${verseText}

User's digging direction:
${prompt}

Task:
Write a focused word-study article that follows this direction.

Requirements:
1. Honor the user's exact vector of interest.
2. Stay grounded in specific words or expressions from the verse.
3. Use lexical, semantic, authorial, historical, or idiomatic analysis when truly relevant.
4. Do not drift into broad generic exposition.
5. Make the article feel like a discovery.
6. Bring the conclusion back to how this changes the reading of the verse.
`.trim()
}

function buildCombinedPrompt(system: string, prompt: string) {
  return `
[SYSTEM INSTRUCTIONS]
${system}

[USER TASK]
${prompt}
`.trim()
}

function extractFirstStringDeep(value: unknown, depth = 0): string | null {
  if (depth > 6) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstStringDeep(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    const priorityKeys = [
      'text',
      'content',
      'output_text',
      'output',
      'response',
      'message',
      'completion',
      'result',
      'answer',
    ]

    for (const key of priorityKeys) {
      if (key in record) {
        const found = extractFirstStringDeep(record[key], depth + 1)
        if (found) return found
      }
    }

    for (const nested of Object.values(record)) {
      const found = extractFirstStringDeep(nested, depth + 1)
      if (found) return found
    }
  }

  return null
}

async function callModel(system: string, prompt: string) {
  const combinedPrompt = buildCombinedPrompt(system, prompt)
  const result = await runModel({
    prompt: combinedPrompt,
  })

  const extracted = extractFirstStringDeep(result)
  if (extracted) return extracted

  throw new Error(
    `Model returned an unsupported response format: ${JSON.stringify(result).slice(0, 1200)}`
  )
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
  const book = rawBook.trim().toLowerCase()
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

function buildWordLensCandidatePrompt(params: {
  reference: string
  verseText: string
  nodes: WordLensNode[]
  sourceLanguage: AppLanguage
}) {
  return `
Ты превращаешь результаты Word Lens в кандидаты карточек для moderator review в Scriptura+.

ССЫЛКА:
${params.reference}

ТЕКСТ СТИХА:
${params.verseText}

ЯЗЫК ИСХОДНОЙ WORD LENS MAP:
${params.sourceLanguage}

WORD LENS NODES:
${JSON.stringify(params.nodes, null, 2)}

ЗАДАЧА:
На основе этих смысловых узлов создай 3-5 сильных candidate-карточек на РУССКОМ языке.
Это должны быть уже хорошие карточки для review, а не сырые заметки.

ГЛАВНЫЙ ПРИНЦИП:
- Каждая карточка должна рождаться из одного из смысловых узлов Word Lens.
- Не делай общую проповедь по стиху.
- Не смешивай всё в один расплывчатый комментарий.
- Карточка должна держать один чёткий угол.
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
- быть привязана к одному Word Lens узлу
- показывать, почему этот узел реально меняет чтение стиха
- звучать как finished insight
- быть написана по-русски

ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Плотная карточка на русском.",
    "angle_note": "Word Lens: label"
  }
]
`.trim()
}

function parseCandidateOptions(raw: string): CandidateOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        text: String(item.text ?? '').trim(),
        angle_note: String(item.angle_note ?? '').trim(),
      }))
      .filter((item) => item.title && item.text && item.angle_note)

    return cleaned.length ? cleaned.slice(0, 5) : null
  } catch {
    return null
  }
}

async function buildRussianCandidatesFromNodes(params: {
  reference: string
  verseText: string
  nodes: WordLensNode[]
  sourceLanguage: AppLanguage
}) {
  const prompt = buildWordLensCandidatePrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 3000,
  })

  const rawText = extractFirstStringDeep(result)

  if (!rawText) {
    throw new Error('Word Lens candidate generator returned no usable text.')
  }

  let options = parseCandidateOptions(rawText)

  if (!options) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      options = parseCandidateOptions(extracted)
    }
  }

  if (!options || options.length === 0) {
    throw new Error('Failed to parse Word Lens candidate cards.')
  }

  return dedupeCandidateOptions(options)
}

async function saveWordLensCandidates(params: {
  reference: string
  nodes: WordLensNode[]
  sourceLanguage: AppLanguage
}) {
  const parsedRef = parseReference(params.reference)

  if (!parsedRef) {
    return { insertedCount: 0 }
  }

  const options = await buildRussianCandidatesFromNodes({
    reference: params.reference,
    verseText: params.reference ? '' : '',
    nodes: params.nodes,
    sourceLanguage: params.sourceLanguage,
  }).catch(async () => {
    return [] as CandidateOption[]
  })

  if (!options.length) {
    return { insertedCount: 0 }
  }

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

  if (!freshItems.length) {
    return { insertedCount: 0 }
  }

  const supabase = getSupabaseServerClient()

  const insertPayload = freshItems.map((item) => ({
    verse_ref: parsedRef.verse_ref,
    book: parsedRef.book,
    chapter: parsedRef.chapter,
    verse: parsedRef.verse,
    source_type: 'word_lens',
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
    throw new Error(`Failed to save Word Lens candidates: ${error.message}`)
  }

  return { insertedCount: insertPayload.length }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    const reference = isNonEmptyString(body.reference) ? body.reference.trim() : ''
    const verseText = isNonEmptyString(body.verseText) ? body.verseText.trim() : ''
    const targetLanguage = normalizeLanguage(body.targetLanguage)
    const mode = normalizeMode(body.mode)

    if (!reference || !verseText) {
      return NextResponse.json(
        { error: 'reference and verseText are required.' },
        { status: 400 }
      )
    }

    if (mode === 'map') {
      const raw = await callModel(
        mapSystemPrompt(targetLanguage),
        mapUserPrompt(reference, verseText)
      )

      const parsed = safeParseJson<{ lead?: unknown; nodes?: unknown }>(raw)

      if (!parsed) {
        return NextResponse.json(
          { error: 'Could not parse model output.', raw },
          { status: 500 }
        )
      }

      const lead = isNonEmptyString(parsed.lead)
        ? parsed.lead.trim()
        : targetLanguage === 'ru'
          ? 'Эта линза показывает смысловые узлы стиха, через которые текст открывается глубже.'
          : 'This lens shows meaning-nodes inside the verse through which the text opens more deeply.'

      const nodes = sanitizeNodes(parsed.nodes)

      if (nodes.length === 0) {
        return NextResponse.json(
          { error: 'No valid word-lens nodes were returned.', raw },
          { status: 500 }
        )
      }

      let insertedCandidateCount = 0
      let candidateIntakeError: string | null = null

      try {
        const intake = await (async () => {
          const parsedRef = parseReference(reference)
          if (!parsedRef) return { insertedCount: 0 }

          const options = await buildRussianCandidatesFromNodes({
            reference,
            verseText,
            nodes,
            sourceLanguage: targetLanguage,
          })

          if (!options.length) return { insertedCount: 0 }

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

          if (!freshItems.length) return { insertedCount: 0 }

          const supabase = getSupabaseServerClient()

          const insertPayload = freshItems.map((item) => ({
            verse_ref: parsedRef.verse_ref,
            book: parsedRef.book,
            chapter: parsedRef.chapter,
            verse: parsedRef.verse,
            source_type: 'word_lens',
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
            throw new Error(`Failed to save Word Lens candidates: ${error.message}`)
          }

          return { insertedCount: insertPayload.length }
        })()

        insertedCandidateCount = intake.insertedCount
      } catch (error) {
        candidateIntakeError =
          error instanceof Error ? error.message : 'Word Lens candidate intake failed.'
      }

      return NextResponse.json({
        reference,
        targetLanguage,
        lead,
        nodes,
        insertedCandidateCount,
        candidateIntakeError,
      })
    }

    if (mode === 'deep_dive') {
      const node = (body as DeepDiveRequestBody).node

      if (!node || typeof node !== 'object') {
        return NextResponse.json(
          { error: 'node is required for deep_dive mode.' },
          { status: 400 }
        )
      }

      const raw = await callModel(
        deepDiveSystemPrompt(targetLanguage),
        deepDiveUserPrompt(reference, verseText, node)
      )

      const parsed = safeParseJson<{ article?: unknown }>(raw)
      const article = sanitizeArticle(parsed?.article)

      if (!article) {
        return NextResponse.json(
          { error: 'No valid deep-dive article was returned.', raw },
          { status: 500 }
        )
      }

      return NextResponse.json({
        reference,
        targetLanguage,
        article,
      })
    }

    const customBody = body as CustomDigRequestBody
    const prompt = isNonEmptyString(customBody.prompt)
      ? customBody.prompt.trim()
      : ''

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required for custom_dig mode.' },
        { status: 400 }
      )
    }

    const raw = await callModel(
      customDigSystemPrompt(targetLanguage),
      customDigUserPrompt(reference, verseText, prompt)
    )

    const parsed = safeParseJson<{ article?: unknown }>(raw)
    const article = sanitizeArticle(parsed?.article)

    if (!article) {
      return NextResponse.json(
        { error: 'No valid custom-dig article was returned.', raw },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reference,
      targetLanguage,
      article,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown word-lens server error.'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
