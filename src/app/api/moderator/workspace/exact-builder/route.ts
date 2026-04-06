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
The sacred passage must remain verbatim inside each option.
Do not paraphrase it.
Do not replace words.
Do not shorten it.
You may build around it, but you must preserve it exactly as given.

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

FORMAT:
[
  {
    "title": "...",
    "text": "..."
  }
]
`.trim()
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

    const prompt = buildPrompt({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2200,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Model request failed.',
          raw: result.raw || '',
        },
        { status: 500 }
      )
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
      return NextResponse.json(
        {
          error: 'Failed to parse exact builder options.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Exact builder API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating exact builder options.' },
      { status: 500 }
    )
  }
}
