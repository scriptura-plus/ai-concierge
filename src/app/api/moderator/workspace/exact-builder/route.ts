import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RawFrameOption = {
  title: string
  before_text: string
  after_text: string
}

type FinalOption = {
  title: string
  text: string
}

function parseRawOptions(raw: string): RawFrameOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        before_text: String(item.before_text ?? '').trim(),
        after_text: String(item.after_text ?? '').trim(),
      }))
      .filter((item) => item.title && (item.before_text || item.after_text))
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

function assembleCardText(beforeText: string, sacredPassage: string, afterText: string) {
  const parts = [beforeText.trim(), sacredPassage.trim(), afterText.trim()].filter(Boolean)
  return parts.join(' ')
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
Generate framing text around the sacred passage for 3 short Russian insight cards.

IMPORTANT:
You must NOT rewrite the sacred passage.
You must NOT include the sacred passage inside before_text or after_text.
The sacred passage will be inserted later by the server exactly as given.

You are only generating:
- a short title
- before_text: 1-2 Russian sentences before the sacred passage
- after_text: 1-3 Russian sentences after the sacred passage

${variationInstruction}

QUALITY GOAL:
Each option should feel like a ready short comment card:
- compact
- clear
- elegant
- thoughtful
- suitable for a strong meeting comment
- not preachy
- not bloated
- each option should package the same insight differently

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array of exactly 3 objects
- Each object must have:
  - "title": short Russian title
  - "before_text": brief framing text before the sacred passage
  - "after_text": brief continuation after the sacred passage
- Do not include the sacred passage itself in either field

FORMAT:
[
  {
    "title": "...",
    "before_text": "...",
    "after_text": "..."
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
  let rawOptions = parseRawOptions(rawText)

  if (!rawOptions) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      rawOptions = parseRawOptions(extracted)
    }
  }

  if (!rawOptions) {
    return {
      ok: false as const,
      error: 'Failed to parse exact builder options.',
      raw: rawText || 'Empty model response',
      options: null,
    }
  }

  const finalOptions: FinalOption[] = rawOptions.map((option) => ({
    title: option.title,
    text: assembleCardText(option.before_text, params.sacredPassage, option.after_text),
  }))

  const strictOptions = finalOptions.filter((option) =>
    containsVerbatimSacredPassage(params.sacredPassage, option.text)
  )

  if (strictOptions.length === 0) {
    return {
      ok: false as const,
      error: 'Model did not produce valid framing around the sacred passage.',
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

    if (firstPass.ok && firstPass.options && firstPass.options.length >= 3) {
      return NextResponse.json({ options: firstPass.options.slice(0, 3) })
    }

    const retryPass = await generateOptions({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    if (retryPass.ok && retryPass.options && retryPass.options.length > 0) {
      const merged = [...(firstPass.options ?? []), ...retryPass.options]
      const unique: FinalOption[] = []
      const seen = new Set()

      for (const option of merged) {
        const key = `${option.title}|||${option.text}`
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(option)
      }

      if (unique.length > 0) {
        return NextResponse.json({ options: unique.slice(0, 3) })
      }
    }

    return NextResponse.json(
      {
        error:
          retryPass.error || firstPass.error || 'Failed to generate exact builder options.',
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
