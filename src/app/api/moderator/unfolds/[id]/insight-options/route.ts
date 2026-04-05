import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type InsightOption = {
  title: string
  text: string
}

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' ||
    value === 'tension' ||
    value === 'why_this_phrase'
    ? value
    : 'insights'
}

function buildPrompt(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldText: string
  selectedPassage: string
}) {
  return `
You are building short premium-quality Bible insight cards for a moderator workflow.

REFERENCE:
${params.reference}

SOURCE MODE:
${params.sourceMode}

SOURCE INSIGHT TITLE:
${params.sourceTitle}

SOURCE INSIGHT TEXT:
${params.sourceText}

UNFOLD TEXT:
${params.unfoldText}

SELECTED PASSAGE (SACRED - MUST STAY VERBATIM):
${params.selectedPassage}

TASK:
Generate exactly 3 short insight-card options.

CRITICAL RULES:
- The selected passage is sacred.
- Preserve the selected passage verbatim in every option.
- Do not paraphrase it.
- Do not shorten it.
- Do not rewrite it.
- Keep the SAME original insight angle.
- Do NOT branch into adjacent ideas.
- Do NOT introduce a new angle.
- These are 3 packaging options for the same thought, not 3 different thoughts.

CARD FORMAT:
- Each option must have:
  - "title"
  - "text"
- "title" should be sharp, elegant, memorable.
- "text" should be compact enough for one iPhone insight card.
- Aim for about 3 sentences total.
- The selected passage should sit naturally inside the card text.
- The surrounding wording should be concise, premium, and clear.
- Avoid clichés and preaching tone.

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array with exactly 3 items

EXAMPLE SHAPE:
[
  {
    "title": "A Strong Title",
    "text": "Sentence one. Exact selected sentence here. Sentence three."
  }
]
`.trim()
}

function parseOptions(raw: string): InsightOption[] | null {
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

    return cleaned.length ? cleaned.slice(0, 3) : null
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

function allOptionsPreservePassage(options: InsightOption[], selectedPassage: string) {
  return options.every((option) => option.text.includes(selectedPassage))
}

export async function POST(req: Request, _context: RouteContext) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const sourceTitle = String(body.sourceTitle ?? '').trim()
    const sourceText = String(body.sourceText ?? '').trim()
    const unfoldText = String(body.unfoldText ?? '').trim()
    const selectedPassage = String(body.selectedPassage ?? '').trim()
    const sourceMode = normalizeSourceMode(body.sourceMode)

    if (!reference || !sourceTitle || !sourceText || !unfoldText || !selectedPassage) {
      return NextResponse.json(
        {
          error: 'reference, sourceTitle, sourceText, unfoldText, and selectedPassage are required.',
        },
        { status: 400 }
      )
    }

    const prompt = buildPrompt({
      reference,
      sourceMode,
      sourceTitle,
      sourceText,
      unfoldText,
      selectedPassage,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2200,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
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

    if (!options || options.length !== 3) {
      return NextResponse.json(
        {
          error: 'Failed to parse exactly 3 insight options.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!allOptionsPreservePassage(options, selectedPassage)) {
      return NextResponse.json(
        {
          error: 'Model failed to preserve the selected passage verbatim in all options.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Insight options API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating insight options.' },
      { status: 500 }
    )
  }
}
