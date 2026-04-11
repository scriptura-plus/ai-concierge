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
      label: 'that they may know you',
      phrase_line: 'The phrase does more than mention knowledge; it frames the kind of relationship being described.',
      what_is_precise: 'The wording narrows the statement more carefully than a looser paraphrase would.',
      why_this_wording: 'This exact formulation controls how the verse should be heard.',
      dig_deeper: 'Trace why this line is phrased this way instead of with a broader, softer wording.',
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
    const dig_deeper = isNonEmptyString(raw?.dig_deeper)
      ? raw.dig_deeper.trim()
      : ''

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
You are building a Bible study product's "Phrase Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Find 5-7 exact phrasing nodes inside the verse.
A phrasing node is not a mere key word and not a general tension. It is a place where the exact wording, order, framing, narrowing, emphasis, or rhetorical shape matters.

Important:
- Focus on why the verse is said this way, not merely what it says.
- Do not give generic devotional thoughts.
- Do not reduce this to single-word lexicon notes unless the force is truly in the phrasing.
- "phrase_line" must identify the specific wording choice clearly.
- "what_is_precise" must explain what is exact, narrow, shaped, or carefully chosen here.
- "why_this_wording" must show how this precise formulation changes the reading of the verse.
- "dig_deeper" must point to one strong next direction.
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
Build a Phrase Lens map for this verse.

Requirements:
1. Detect 5-7 strongest phrasing nodes.
2. Each node must come from the exact wording or structure of the verse itself.
3. Phrasing nodes may include:
   - precision
   - framing
   - sequence
   - restriction
   - emphasis
   - rhetorical choice
4. Avoid generic "interesting ideas" that are not really about formulation.
5. Make each node feel like a real doorway into why this verse is said in this exact way.
6. Keep every field concise but meaningful.
7. Avoid repeating the same phrasing insight in slightly different wording.
`.trim()
}

function deepDiveSystemPrompt(language: AppLanguage) {
  return `
You are writing the deep-dive article for the Bible study product's "Phrase Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Expand one selected phrasing node into a focused article.

Important:
- This is not a generic essay.
- The article must stay anchored to the selected phrasing choice.
- Explain why this exact wording exists in the verse and what it does to the reading.
- Prefer exegetical clarity over ornament.
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
Write a focused deep-dive article on this selected phrasing choice.

Requirements:
1. Start from how a modern reader might hear the verse too loosely or too quickly.
2. Show what the exact wording is doing more carefully.
3. Explain the force of the phrasing itself: framing, narrowing, order, emphasis, or rhetorical shape.
4. Use the most productive angle for this node:
   - why this exact phrase and not a looser one
   - how order changes force
   - what the wording excludes or narrows
   - how the formulation frames the thought
   - where the rhetorical choice sharpens meaning
5. Bring the reader back to the verse itself.
6. Do not drift into broad commentary.
7. The title should include the selected phrasing issue and a sharp thesis.
`.trim()
}

function customDigSystemPrompt(language: AppLanguage) {
  return `
You are writing a directed study article for the Bible study product's "Phrase Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Respect the user's chosen digging direction and produce a focused phrasing-based study.

Important:
- Follow the user's direction closely.
- Stay anchored to the wording and formulation of the verse.
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
2. Stay grounded in wording, structure, sequence, narrowing, emphasis, or rhetorical force inside the verse.
3. Do not drift into broad exposition.
4. Make the article feel like a discovery.
5. Bring the conclusion back to how this exact formulation changes the reading of the verse.
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
          ? 'Эта линза показывает, как точная формулировка стиха направляет чтение — через порядок, рамку, сужение и акценты.'
          : 'This lens shows how the exact phrasing of the verse directs the reading — through order, framing, narrowing, and emphasis.'

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
