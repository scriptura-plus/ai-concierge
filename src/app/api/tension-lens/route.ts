import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type TensionLensMode = 'map' | 'deep_dive' | 'custom_dig'

type TensionNodeKind =
  | 'contrast'
  | 'paradox'
  | 'reversal'
  | 'shock'
  | 'pressure'
  | 'collision'

type TensionLensNode = {
  id: string
  kind: TensionNodeKind
  label: string
  tension_line: string
  what_feels_strange: string
  why_it_matters: string
  dig_deeper: string
}

type TensionLensArticlePayload = {
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
  node?: TensionLensNode
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
      kind: 'contrast',
      label: 'strength through weakness',
      tension_line: 'The verse sounds stable on the surface, but the logic turns in an unexpected direction.',
      what_feels_strange: 'It joins two ideas that a modern reader normally keeps apart.',
      why_it_matters: 'This tension changes how the verse should be heard.',
      dig_deeper: 'Trace why the wording forces that collision instead of a smoother statement.',
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

function normalizeMode(value: unknown): TensionLensMode {
  if (value === 'deep_dive' || value === 'custom_dig') return value
  return 'map'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cleanNodeKind(value: unknown): TensionNodeKind {
  if (
    value === 'contrast' ||
    value === 'paradox' ||
    value === 'reversal' ||
    value === 'shock' ||
    value === 'pressure' ||
    value === 'collision'
  ) {
    return value
  }

  return 'contrast'
}

function sanitizeNodes(value: unknown): TensionLensNode[] {
  if (!Array.isArray(value)) return []

  const result: TensionLensNode[] = []

  value.forEach((item, index) => {
    const raw = item as Partial<TensionLensNode>

    const label = isNonEmptyString(raw?.label) ? raw.label.trim() : ''
    const tension_line = isNonEmptyString(raw?.tension_line)
      ? raw.tension_line.trim()
      : ''
    const what_feels_strange = isNonEmptyString(raw?.what_feels_strange)
      ? raw.what_feels_strange.trim()
      : ''
    const why_it_matters = isNonEmptyString(raw?.why_it_matters)
      ? raw.why_it_matters.trim()
      : ''
    const dig_deeper = isNonEmptyString(raw?.dig_deeper)
      ? raw.dig_deeper.trim()
      : ''

    if (!label || !tension_line || !what_feels_strange || !why_it_matters || !dig_deeper) {
      return
    }

    result.push({
      id: isNonEmptyString(raw?.id) ? raw.id.trim() : `node_${index + 1}`,
      kind: cleanNodeKind(raw?.kind),
      label,
      tension_line,
      what_feels_strange,
      why_it_matters,
      dig_deeper,
    })
  })

  return result.slice(0, 7)
}

function sanitizeArticle(value: unknown): TensionLensArticlePayload | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<TensionLensArticlePayload>

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
You are building a Bible study product's "Tension Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Find 5-7 real tension nodes inside the verse.
A tension node is not just an interesting thought. It is a place where the verse pulls against expectation:
contrast, paradox, reversal, collision, pressure point, or surprising logic.

Important:
- Focus on what feels unstable, surprising, sharp, reversed, or internally charged in the wording.
- Do not give generic devotional thoughts.
- Do not just paraphrase the verse.
- "tension_line" must name the tension clearly and compactly.
- "what_feels_strange" must explain what a normal reader would not expect here.
- "why_it_matters" must show how this tension changes the reading of the verse.
- "dig_deeper" must point to one strong direction for deeper study.
- Prefer genuine tension over decorative insight.
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
Build a Tension Lens map for this verse.

Requirements:
1. Detect 5-7 strongest tension nodes.
2. Each node must come from the wording or logic of the verse itself.
3. Tension nodes may include:
   - contrast
   - paradox
   - reversal
   - shock
   - pressure point
   - collision of expectations
4. Avoid vague "interesting" ideas that are not actually tense.
5. Make each node feel like a real doorway into the verse's inner force.
6. Keep every field concise but meaningful.
7. Avoid repeating the same tension in slightly different words.
`.trim()
}

function deepDiveSystemPrompt(language: AppLanguage) {
  return `
You are writing the deep-dive article for the Bible study product's "Tension Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Expand one selected tension node into a focused article.

Important:
- This is not a generic essay.
- The article must stay anchored to the selected tension.
- Explain why this tension exists in the verse and what it does to the reading.
- Prefer exegetical clarity over dramatic language.
- Use 4-7 body paragraphs.
- Each paragraph should advance the thought.
- The final line should feel distilled and memorable.
- Return JSON matching this shape exactly:

${JSON.stringify(ARTICLE_SCHEMA_EXAMPLE, null, 2)}
`.trim()
}

function deepDiveUserPrompt(reference: string, verseText: string, node: TensionLensNode) {
  return `
Reference: ${reference}

Verse:
${verseText}

Selected tension node:
${JSON.stringify(node, null, 2)}

Task:
Write a focused deep-dive article on this selected tension.

Requirements:
1. Start from how a modern reader would usually hear the verse.
2. Show where the wording resists that smooth first reading.
3. Explain the specific tension inside the statement, image, or logic.
4. Use the most productive angle for this node:
   - contrast in wording
   - reversal of expectation
   - paradoxical force
   - inner pressure between two ideas
   - rhetorical sharpness
   - collision with modern assumptions
5. Bring the reader back to the verse itself.
6. Do not drift into broad commentary.
7. The title should include the selected tension and a sharp thesis.
`.trim()
}

function customDigSystemPrompt(language: AppLanguage) {
  return `
You are writing a directed study article for the Bible study product's "Tension Lens" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Respect the user's chosen digging direction and produce a focused tension-based study.

Important:
- Follow the user's direction closely.
- Stay anchored to the wording and internal pressure of the verse.
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
Write a focused tension-study article that follows this direction.

Requirements:
1. Honor the user's exact vector of interest.
2. Stay grounded in the wording, logic, or reversal inside the verse.
3. Use contrast, paradox, reversal, rhetorical force, or expectation-collision when truly relevant.
4. Do not drift into broad exposition.
5. Make the article feel like a discovery.
6. Bring the conclusion back to how this tension changes the reading of the verse.
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
          ? 'Эта линза показывает внутренние напряжения стиха — места, где текст идет не по самой ожидаемой линии.'
          : 'This lens shows the inner tensions of the verse — the places where the text does not move along the most expected line.'

      const nodes = sanitizeNodes(parsed.nodes)

      if (nodes.length === 0) {
        return NextResponse.json(
          { error: 'No valid tension-lens nodes were returned.', raw },
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
      error instanceof Error ? error.message : 'Unknown tension-lens server error.'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
