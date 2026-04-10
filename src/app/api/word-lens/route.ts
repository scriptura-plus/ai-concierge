import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

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
    ? raw.body.filter((item): item is string => isNonEmptyString(item)).map((item) => item.trim())
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

async function callModel(system: string, prompt: string) {
  const result = await runModel({
    system,
    prompt,
    temperature: 0.4,
  })

  if (typeof result === 'string') return result

  if (result && typeof result === 'object') {
    if ('text' in result && typeof result.text === 'string') return result.text
    if ('content' in result && typeof result.content === 'string') return result.content
    if ('output' in result && typeof result.output === 'string') return result.output
  }

  throw new Error('Model returned an unsupported response format.')
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

      return NextResponse.json({
        reference,
        targetLanguage,
        lead,
        nodes,
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

    const prompt = isNonEmptyString((body as CustomDigRequestBody).prompt)
      ? (body as CustomDigRequestBody).prompt.trim()
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
