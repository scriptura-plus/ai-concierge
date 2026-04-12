import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type PhraseLensMode = 'map' | 'deep_dive' | 'custom_dig'

type PhraseNodeKind =
  | 'precision'
  | 'framing'
  | 'sequence'
  | 'restriction'
  | 'emphasis'
  | 'rhetorical_choice'

type PhraseLensNode = {
  id: string
  kind: PhraseNodeKind
  label: string
  phrase_line: string
  what_is_precise: string
  why_this_wording: string
  dig_deeper: string
}

type PhraseLensArticlePayload = {
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
  node?: PhraseLensNode
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
      kind: 'precision',
      label: 'this is eternal life',
      phrase_line: 'The phrase does not merely mention life; it defines it with unusual precision.',
      what_is_precise: 'The wording presents eternal life not as duration alone but as something defined in a particular way.',
      why_this_wording: 'This exact phrasing directs the reader to definition, not only promise.',
      dig_deeper: 'Trace why the sentence is built as a definition rather than as a reward statement.',
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

function normalizeMode(value: unknown): PhraseLensMode {
  if (value === 'deep_dive' || value === 'custom_dig') return value
  return 'map'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cleanNodeKind(value: unknown): PhraseNodeKind {
  if (
    value === 'precision' ||
    value === 'framing' ||
    value === 'sequence' ||
    value === 'restriction' ||
    value === 'emphasis' ||
    value === 'rhetorical_choice'
  ) {
    return value
  }

  return 'precision'
}

function sanitizeNodes(value: unknown): PhraseLensNode[] {
  if (!Array.isArray(value)) return []

  const result: PhraseLensNode[] = []

  value.forEach((item, index) => {
    const raw = item as Partial<PhraseLensNode>

    const label = isNonEmptyString(raw?.label) ? raw.label.trim() : ''
    const phrase_line = isNonEmptyString(raw?.phrase_line) ? raw.phrase_line.trim() : ''
    const what_is_precise = isNonEmptyString(raw?.what_is_precise)
      ? raw.what_is_precise.trim()
      : ''
    const why_this_wording = isNonEmptyString(raw?.why_this_wording)
      ? raw.why_this_wording.trim()
      : ''
    const dig_deeper = isNonEmptyString(raw?.dig_deeper) ? raw.dig_deeper.trim() : ''

    if (!label || !phrase_line || !what_is_precise || !why_this_wording || !dig_deeper) {
      return
    }

    result.push({
      id: isNonEmptyString(raw?.id) ? raw.id.trim() : `node_${index + 1}`,
      kind: cleanNodeKind(raw?.kind),
      label,
      phrase_line,
      what_is_precise,
      why_this_wording,
      dig_deeper,
    })
  })

  return result.slice(0, 7)
}

function sanitizeArticle(value: unknown): PhraseLensArticlePayload | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<PhraseLensArticlePayload>

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
You are building a Bible study product's "Why This Phrase" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Find 5-7 phrasing nodes inside the verse.
A phrasing node is not mainly about the meaning of a single word.
It is about why the sentence is built this exact way:
precision, framing, sequence, restriction, emphasis, or rhetorical choice.

Important:
- Focus on formulation, sentence force, ordering, narrowing, definition-shape, and exact verbal construction.
- Do not give generic devotional thoughts.
- Do not merely paraphrase the verse.
- "phrase_line" must name the phrasing force clearly and compactly.
- "what_is_precise" must explain what is exact, narrow, or deliberate in the phrasing.
- "why_this_wording" must show how the exact wording changes the reading of the verse.
- "dig_deeper" must suggest one strong next direction for deeper study.
- Prefer real formulation choices over decorative observations.
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
Build a Why This Phrase map for this verse.

Requirements:
1. Detect 5-7 strongest phrasing nodes.
2. Each node must come from the wording or sentence logic of the verse itself.
3. Phrasing nodes may include:
   - precision
   - framing
   - sequence
   - restriction
   - emphasis
   - rhetorical choice
4. Avoid generic "interesting" ideas that are really just commentary.
5. Make each node feel like a real doorway into why the sentence is shaped this way.
6. Keep every field concise but meaningful.
7. Avoid repeating the same phrasing point in slightly different words.
`.trim()
}

function deepDiveSystemPrompt(language: AppLanguage) {
  return `
You are writing the deep-dive article for the Bible study product's "Why This Phrase" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Expand one selected phrasing node into a focused article.

Important:
- This is not a generic essay.
- The article must stay anchored to the selected phrasing choice.
- Explain why this exact formulation exists in the verse and what it does to the reading.
- Prefer exegetical clarity over dramatic language.
- Use 4-7 body paragraphs.
- Each paragraph should advance the thought.
- The final line should feel distilled and memorable.
- Return JSON matching this shape exactly:

${JSON.stringify(ARTICLE_SCHEMA_EXAMPLE, null, 2)}
`.trim()
}

function deepDiveUserPrompt(reference: string, verseText: string, node: PhraseLensNode) {
  return `
Reference: ${reference}

Verse:
${verseText}

Selected phrasing node:
${JSON.stringify(node, null, 2)}

Task:
Write a focused deep-dive article on this selected phrasing node.

Requirements:
1. Start from how a modern reader would usually hear the sentence.
2. Show what the wording is doing more precisely than that first hearing suggests.
3. Explain the exact formulation choice inside the statement, sequence, restriction, or emphasis.
4. Use the most productive angle for this node:
   - definitional force
   - sentence framing
   - word order or sequence
   - narrowing or restriction
   - emphasis
   - rhetorical choice
   - contrast with a looser modern paraphrase
5. Bring the reader back to the verse itself.
6. Do not drift into broad commentary.
7. The title should include the selected phrasing and a sharp thesis.
`.trim()
}

function customDigSystemPrompt(language: AppLanguage) {
  return `
You are writing a directed study article for the Bible study product's "Why This Phrase" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Respect the user's chosen digging direction and produce a focused phrasing-based study.

Important:
- Follow the user's direction closely.
- Stay anchored to the exact wording and formulation of the verse.
- This is not a generic commentary.
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
Write a focused phrasing-study article that follows this direction.

Requirements:
1. Honor the user's exact vector of interest.
2. Stay grounded in the wording, formulation, structure, narrowing, or emphasis of the verse.
3. Use phrasing analysis when truly relevant.
4. Do not drift into broad exposition.
5. Make the article feel like a discovery.
6. Bring the conclusion back to how this exact phrasing changes the reading of the verse.
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
          ? 'Эта линза показывает, почему стих сформулирован именно так — где точность формулировки сама направляет чтение.'
          : 'This lens shows why the verse is phrased this exact way — where formulation itself directs the reading.'

      const nodes = sanitizeNodes(parsed.nodes)

      if (nodes.length === 0) {
        return NextResponse.json(
          { error: 'No valid phrase-lens nodes were returned.', raw },
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
      error instanceof Error ? error.message : 'Unknown phrase-lens server error.'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
