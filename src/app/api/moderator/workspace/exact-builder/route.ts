import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type ExactBuilderOption = {
  title: string
  text: string
}

function parseOptions(raw: string): ExactBuilderOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        text: String(item.text ?? '').trim(),
      }))
      .filter((item) => item.title && item.text)
      .slice(0, 3)

    return cleaned.length ? cleaned : null
  } catch {
    return null
  }
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function containsVerbatimSacredPassage(sacredPassage: string, candidateText: string) {
  const normalizedSacred = normalizeForCompare(sacredPassage)
  const normalizedCandidate = normalizeForCompare(candidateText)
  return normalizedCandidate.includes(normalizedSacred)
}

function buildPrompt(params: {
  reference: string
  verseText: string
  sacredPassage: string
  mode: 'fresh' | 'more'
}) {
  const variationInstruction =
    params.mode === 'more'
      ? 'Generate 3 NEW options that are noticeably different in packaging from a previous batch.'
      : 'Generate 3 strong initial options.'

  return `
You are an elite editor of short Russian Bible insight cards.

REFERENCE:
${params.reference}

VERSE TEXT:
${params.verseText}

SACRED PASSAGE:
${params.sacredPassage}

TASK:
Turn the sacred passage into 3 short Russian insight cards.

NON-NEGOTIABLE RULE:
Every option MUST contain the sacred passage verbatim inside the card text.
Do not paraphrase it.
Do not shorten it.
Do not replace words.
Do not quote a different sentence instead.
Do not substitute the verse text for the sacred passage.
You may only add framing sentences before or after it.

CRITICAL:
The sacred passage must appear inside the "text" field exactly as given.
If you fail to preserve it exactly, the output is invalid.

${variationInstruction}

OUTPUT GOAL:
Each option should feel like a ready short comment card:
- compact
- clear
- elegant
- thoughtful
- suitable for a strong meeting comment
- not preachy
- not bloated

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array of exactly 3 objects
- Each object must have:
  - "title": short Russian title
  - "text": 4-6 Russian sentences
- The sacred passage must be visibly included inside each "text"

FORMAT:
[
  {
    "title": "...",
    "text": "..."
  }
]
`.trim()
}

async function generateOptions(params: {
  reference: string
  verseText: string
  sacredPassage: string
  mode: 'fresh' | 'more'
}) {
  const prompt = buildPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2200,
  })

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || 'Model request failed.',
      raw: result.raw || '',
      options: null,
    }
  }

  const rawText = result.rawText
  let options = parseOptions(rawText)

  if (!options) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      options = parseOptions(extracted)
    }
  }

  if (!options) {
    return {
      ok: false as const,
      error: 'Failed to parse exact builder options.',
      raw: rawText || 'Empty model response',
      options: null,
    }
  }

  const strictOptions = options.filter((option) =>
    containsVerbatimSacredPassage(params.sacredPassage, option.text)
  )

  if (strictOptions.length === 0) {
    return {
      ok: false as const,
      error: 'Model did not preserve the sacred passage verbatim.',
      raw: rawText || '',
      options: null,
    }
  }

  return {
    ok: true as const,
    error: '',
    raw: rawText || '',
    options: strictOptions,
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()
    const sacredPassage = String(body.sacredPassage ?? '').trim()
    const mode = body.mode === 'more' ? 'more' : 'fresh'

    if (!reference || !verseText || !sacredPassage) {
      return NextResponse.json(
        { error: 'reference, verseText, and sacredPassage are required.' },
        { status: 400 }
      )
    }

    const firstPass = await generateOptions({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    if (firstPass.ok) {
      return NextResponse.json({ options: firstPass.options })
    }

    const retryPass = await generateOptions({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    if (retryPass.ok) {
      return NextResponse.json({ options: retryPass.options })
    }

    return NextResponse.json(
      {
        error: retryPass.error || firstPass.error || 'Failed to generate exact builder options.',
        raw: retryPass.raw || firstPass.raw || '',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Exact builder API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating exact builder options.' },
      { status: 500 }
    )
  }
}
