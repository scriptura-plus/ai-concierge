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
    text: 'Natural spoken comment.',
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
Turn the user's rough thought into one natural spoken comment for a congregation setting.

Important:
- The result must sound like a real person speaking naturally into a microphone.
- It should sound like their own words, not like a written article.
- Keep it around 20-35 seconds when spoken aloud.
- Usually 2-4 sentences.
- Keep one main thought only.
- If the user's wording is already strong, preserve as much of it as possible.
- Do not turn it into a sermonette or mini-article.
- Do not use stiff, preachy, overly polished, or theatrical language.
- Avoid template openings such as:
  "I liked that..."
  "I noticed that..."
  "It caught my attention that..."
  "From this verse we see that..."
  "Here it is emphasized that..."
- Prefer going directly into the thought.
- The title should be short, clear, and not dramatic.
- Return JSON matching this shape exactly:

${JSON.stringify(RESPONSE_EXAMPLE, null, 2)}
`.trim()
}

function userPrompt(reference: string, verseText: string, sourceText: string) {
  return `
Reference: ${reference || 'Not provided'}

Verse text:
${verseText || 'Not provided'}

User draft:
${sourceText}

Task:
Refine this into one natural spoken comment.

Requirements:
1. Keep the same core thought.
2. Make it sound natural and easy to say aloud.
3. Do not make it sound templated or artificial.
4. Do not begin with a cliché first-person frame unless absolutely necessary.
5. Make it clean enough to display on a shareable card.
6. Return exactly one result.
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
