import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type RefinementResult = {
  title: string
  text: string
}

type RequestBody = {
  reference?: string
  verseText?: string
  sourceText?: string
  targetLanguage?: AppLanguage
  mode?: 'generate'
}

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
}

const RESPONSE_EXAMPLE = {
  result: {
    title: 'Short title',
    text: 'Natural congregation-ready spoken comment built around the user’s core thought.',
  },
}

function normalizeLanguage(value: unknown): AppLanguage {
  if (value === 'ru' || value === 'es' || value === 'fr' || value === 'de') return value
  return 'en'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
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
  const combinedPrompt = `
[SYSTEM INSTRUCTIONS]
${system}

[USER TASK]
${prompt}
`.trim()

  const result = await runModel({
    prompt: combinedPrompt,
  })

  const extracted = extractFirstStringDeep(result)
  if (extracted) return extracted

  throw new Error(
    `Model returned an unsupported response format: ${JSON.stringify(result).slice(0, 1200)}`
  )
}

function systemPrompt(language: AppLanguage) {
  return `
You are writing for a Bible study product's "Refine" mode.
Return only valid JSON.
Write all user-facing content in ${LANGUAGE_LABELS[language]}.

Goal:
Take the user's core comment foundation and turn it into one natural congregation-ready spoken comment.

Core principle:
The user's input is not a disposable rough draft. It is the foundation of the comment.
Preserve its core thought faithfully.
If the user's wording is already strong, memorable, or beautifully said, keep it as close as possible.
Only adapt wording when needed to make the final comment sound natural aloud.

Important:
- The result must sound like a real person speaking calmly into a microphone at a congregation meeting.
- It must feel complete and ready to say aloud, not like a note or a compressed thesis.
- Build around one central thought only.
- The result should usually feel like about 25-35 seconds when spoken aloud.
- Target roughly 55-95 words when the language naturally allows it.
- Usually 3-5 sentences, but natural rhythm matters more than sentence count.
- The comment should have a small natural flow:
  1. enter the thought naturally,
  2. unfold the core idea,
  3. show why it matters or what it clarifies,
  4. end cleanly.
- Do not turn it into a sermonette, mini-article, or lecture.
- Do not sound stiff, preachy, theatrical, or artificially polished.
- Do not merely paraphrase the verse.
- Do not flatten the user's strong wording into something generic.
- Do not replace the user's thought with a different angle.
- Avoid template openings such as:
  "I liked that..."
  "I noticed that..."
  "It caught my attention that..."
  "From this verse we see that..."
  "Here it is emphasized that..."
- Also avoid dry textbook openings that sound overly manufactured.
- Prefer a natural immediate entry into the thought.
- The title should be short, clear, quiet, and non-dramatic.
- Return exactly one result.
- Return JSON matching this shape exactly:

${JSON.stringify(RESPONSE_EXAMPLE, null, 2)}
`.trim()
}

function userPrompt(reference: string, verseText: string, sourceText: string) {
  return `
Reference: ${reference || 'Not provided'}

Verse text:
${verseText || 'Not provided'}

User's comment foundation:
${sourceText}

Task:
Build one natural spoken congregation comment around this foundation.

Requirements:
1. Keep the same core thought and do not drift into a different angle.
2. Treat the user's wording as the foundation, not as disposable draft material.
3. If a phrase is already strong, preserve it as much as possible.
4. If the wording is too abrupt or too compressed, build naturally around it.
5. Make the result sound easy to say aloud in real life.
6. Let the result feel complete at about 25-35 seconds.
7. Do not make it feel like a written paragraph or mini-talk.
8. Do not begin with a cliché first-person frame unless absolutely necessary.
9. Make it clean enough to display on a shareable card.
10. Return exactly one result.
`.trim()
}

function sanitizeResult(value: unknown): RefinementResult | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<RefinementResult>

  const title = isNonEmptyString(raw.title) ? raw.title.trim() : ''
  const text = isNonEmptyString(raw.text) ? raw.text.trim() : ''

  if (!title || !text) return null

  return { title, text }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    const reference = isNonEmptyString(body.reference) ? body.reference.trim() : ''
    const verseText = isNonEmptyString(body.verseText) ? body.verseText.trim() : ''
    const sourceText = isNonEmptyString(body.sourceText) ? body.sourceText.trim() : ''
    const targetLanguage = normalizeLanguage(body.targetLanguage)

    if (!sourceText) {
      return NextResponse.json(
        { error: 'sourceText is required.' },
        { status: 400 }
      )
    }

    const raw = await callModel(
      systemPrompt(targetLanguage),
      userPrompt(reference, verseText, sourceText)
    )

    const parsed = safeParseJson<{ result?: unknown }>(raw)
    const result = sanitizeResult(parsed?.result)

    if (!result) {
      return NextResponse.json(
        { error: 'No valid refined comment was returned.', raw },
        { status: 500 }
      )
    }

    return NextResponse.json({
      result,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown refinement server error.'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
