import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RetitlePayload = {
  titles?: string[]
  error?: string
  raw?: string
}

function parseTitles(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.titles)) {
      return null
    }

    const cleaned = parsed.titles
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)

    if (!cleaned.length) return null

    return Array.from(new Set(cleaned)).slice(0, 3)
  } catch {
    return null
  }
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function buildPrompt(reference: string, verseText: string, currentTitle: string, cardText: string) {
  return `
You are helping a moderator improve a Bible insight card title.

TASK:
Read the verse and the current card text.
Do NOT rewrite the card text.
Do NOT change the meaning or angle.
Suggest 3 alternative Russian titles only.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

CURRENT TITLE:
${currentTitle}

CARD TEXT:
${cardText}

RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary
- Output in Russian
- Keep the same angle as the existing card
- Make titles sharper, cleaner, and more memorable
- Do not become sensational or clickbait
- Each title should be distinct
- Each title should be short enough for a card

FORMAT:
{
  "titles": [
    "...",
    "...",
    "..."
  ]
}
`.trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()
    const currentTitle = String(body.currentTitle ?? '').trim()
    const cardText = String(body.cardText ?? '').trim()

    if (!reference || !verseText || !currentTitle || !cardText) {
      return NextResponse.json(
        {
          error: 'reference, verseText, currentTitle, and cardText are required.',
        } satisfies RetitlePayload,
        { status: 400 }
      )
    }

    const prompt = buildPrompt(reference, verseText, currentTitle, cardText)

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 600,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate alternative titles.',
          raw: result.rawText || result.raw || '',
        } satisfies RetitlePayload,
        { status: 500 }
      )
    }

    let parsed = parseTitles(result.rawText)

    if (!parsed) {
      const extracted = extractJsonObject(result.rawText)
      if (extracted) {
        parsed = parseTitles(extracted)
      }
    }

    if (!parsed || parsed.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse alternative titles.',
          raw: result.rawText || '',
        } satisfies RetitlePayload,
        { status: 500 }
      )
    }

    return NextResponse.json({
      titles: parsed,
    } satisfies RetitlePayload)
  } catch (error) {
    console.error('Retitle API error:', error)

    return NextResponse.json(
      {
        error: 'Something went wrong while generating alternative titles.',
      } satisfies RetitlePayload,
      { status: 500 }
    )
  }
}
