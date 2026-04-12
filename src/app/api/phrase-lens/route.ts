import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type LensCard = {
  title: string
  text: string
}

type PhraseLensResponse = {
  cards?: LensCard[]
  error?: string
  raw?: string
}

function normalizeLanguage(value: unknown): SupportedLanguage {
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

async function callModel(prompt: string) {
  const result = await runModel({ prompt })
  const extracted = extractFirstStringDeep(result)

  if (extracted) return extracted

  throw new Error(
    `Model returned an unsupported response format: ${JSON.stringify(result).slice(0, 1200)}`
  )
}

function buildLanguageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') {
    return `
Write the full output in Russian.
Every title and every text block must be in Russian.
Do not leave headings or prose in English.
`.trim()
  }

  if (targetLanguage === 'es') {
    return `
Write the full output in Spanish.
Every title and every text block must be in Spanish.
Do not leave headings or prose in English.
`.trim()
  }

  if (targetLanguage === 'fr') {
    return `
Write the full output in French.
Every title and every text block must be in French.
Do not leave headings or prose in English.
`.trim()
  }

  if (targetLanguage === 'de') {
    return `
Write the full output in German.
Every title and every text block must be in German.
Do not leave headings or prose in English.
`.trim()
  }

  return `
Write the full output in English.
`.trim()
}

function buildPrompt(
  reference: string,
  verseText: string,
  targetLanguage: SupportedLanguage
) {
  const languageInstruction = buildLanguageInstruction(targetLanguage)

  return `
You are building the Bible study product's "Why This Phrase" lens.

${languageInstruction}

Return ONLY valid JSON.
No markdown.
No commentary outside JSON.

Output schema:
{
  "cards": [
    {
      "title": "Card title",
      "text": "Card text"
    }
  ]
}

Task:
Generate exactly 5 cards for this verse.

Reference:
${reference}

Verse:
${verseText}

What this lens IS:
- It studies why the verse is phrased THIS way and not another way.
- It focuses on wording choice, formulation, sentence shape, emphasis placement, sequence, repetition, naming choice, relational phrasing, rhetorical compression, and why the author says it in this exact form.
- It asks: why this phrase, why this formula, why this wording, why this order?

What this lens is NOT:
- Not a word-study lens. Do not focus on etymology, lexical roots, transliteration, or original-language word weight as the main point.
- Not a tension lens. Do not center the card on paradox, shock, reversal, or contradiction unless the phrasing itself is the real issue.
- Not generic commentary.
- Not devotional paraphrase.

Card rules:
- Each card must isolate one phrasing decision.
- Each card must feel distinct from the others.
- Each card must explain how the exact formulation guides the reading.
- Make the insight compact, sharp, and readable.
- Prefer concrete phrasing observations over abstract theology.
- Avoid repeating the verse loosely in different words.
- Do not mention "this phrase lens" inside the cards.

Good angles:
- Why this relationship is named this way
- Why this phrase is defined instead of merely stated
- Why the wording is compressed
- Why the sentence puts one part before another
- Why a title, name, or formula is included
- Why the verse chooses this expression instead of a simpler alternative
- Why the wording preserves ambiguity, sharpness, or focus

Title style:
- Short
- Sharp
- Non-generic
- Should sound like a real reading key

Text style:
- 2-4 sentences
- Clear, precise, elegant
- No filler

Important:
At least 3 of the 5 cards must clearly be about phrasing/formulation choice, not just general meaning.
`.trim()
}

function sanitizeCards(value: unknown): LensCard[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const raw = item as Partial<LensCard>

      const title = isNonEmptyString(raw?.title) ? raw.title.trim() : ''
      const text = isNonEmptyString(raw?.text) ? raw.text.trim() : ''

      if (!title || !text) return null

      return { title, text }
    })
    .filter((item): item is LensCard => Boolean(item))
    .slice(0, 5)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      reference?: unknown
      verseText?: unknown
      targetLanguage?: unknown
    }

    const reference = isNonEmptyString(body.reference) ? body.reference.trim() : ''
    const verseText = isNonEmptyString(body.verseText) ? body.verseText.trim() : ''
    const targetLanguage = normalizeLanguage(body.targetLanguage)

    if (!reference || !verseText) {
      return NextResponse.json(
        { error: 'reference and verseText are required.' },
        { status: 400 }
      )
    }

    const raw = await callModel(buildPrompt(reference, verseText, targetLanguage))
    const parsed = safeParseJson<PhraseLensResponse>(raw)

    if (!parsed) {
      return NextResponse.json(
        { error: 'Could not parse model output.', raw },
        { status: 500 }
      )
    }

    const cards = sanitizeCards(parsed.cards)

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'No valid phrase-lens cards were returned.', raw },
        { status: 500 }
      )
    }

    return NextResponse.json({ cards })
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
