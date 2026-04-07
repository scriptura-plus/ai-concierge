import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type WordMapNode = {
  focus_label: string
  original_word: string
  transliteration: string
  core_meaning: string
  why_it_matters: string
  dig_deeper_hint: string
}

function buildPrompt(reference: string, verseText: string) {
  return `
You are an elite Bible close-reading analyst working inside an advanced moderator workspace.

MODE:
Word Lens V3 — Word Map

INPUTS:
- Reference: ${reference}
- Verse text: ${verseText}

Write the full output in Russian.

IMPORTANT TRANSLITERATION RULE

Whenever you provide transliteration, write it in readable Russian transliteration, not in Latin letters.
Example:
- not "patach ozen"
- but "патах озен"

MISSION

Your task is not to choose one random interesting word.
Your task is to identify the 3 to 5 words or expressions in this verse that carry the strongest semantic and interpretive weight.

You are building a semantic map of the verse.

These may include:
- single words
- meaningful expressions
- important verbs
- compact wording units
- small connective phrases
- dense formulations that carry more force than they first appear to

SELECTION RULE

Do not choose a word just because it sounds striking.
Choose only words or expressions that genuinely:
- unlock the meaning of the verse
- sharpen the reading of the verse
- carry hidden semantic pressure
- open a real path for deeper research

Your job is to be selective, not exhaustive.

FOR EACH CHOSEN WORD OR EXPRESSION, PROVIDE:

1. focus_label
How this word or expression appears to the ordinary reader in the verse.

2. original_word
The most likely original-language form behind it
- Greek for New Testament verses
- Hebrew or Aramaic for Old Testament verses
Only when reasonably identifiable.

3. transliteration
A readable Russian transliteration.

4. core_meaning
A concise semantic core in Russian.

5. why_it_matters
A short but substantial explanation in Russian of why this is a key meaning-node in the verse.

6. dig_deeper_hint
A short intellectual hook in Russian:
what direction becomes promising if the moderator chooses to dig deeper into this word.

QUALITY RULES

- Write in Russian
- Do not sound like a pasted lexicon
- Do not produce dry academic clutter
- Do not preach
- Do not inflate weak points into artificial insights
- Do not include doubtful etymology unless it is genuinely useful and reasonably grounded
- Stay very close to the verse
- Be precise, alive, selective, and intellectually readable
- Each chosen node should feel like a potential entrance into a strong long-form article

LIMITS

- Return 3 to 5 items
- Do not return fewer than 3 unless the verse is extremely minimal
- Do not return more than 5
- Do not choose trivial words with low interpretive value

OUTPUT CONTRACT

Return ONLY valid JSON.
No markdown.
No code fences.
No commentary outside JSON.

FORMAT:
[
  {
    "focus_label": "...",
    "original_word": "...",
    "transliteration": "...",
    "core_meaning": "...",
    "why_it_matters": "...",
    "dig_deeper_hint": "..."
  }
]

FINAL GOAL

The result should give the moderator a semantic map of the verse:
3 to 5 strong meaning-nodes,
each one clear enough to help decide where to dig deeper next.
`.trim()
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parsePayload(raw: string): WordMapNode[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        focus_label: String(item.focus_label ?? '').trim(),
        original_word: String(item.original_word ?? '').trim(),
        transliteration: String(item.transliteration ?? '').trim(),
        core_meaning: String(item.core_meaning ?? '').trim(),
        why_it_matters: String(item.why_it_matters ?? '').trim(),
        dig_deeper_hint: String(item.dig_deeper_hint ?? '').trim(),
      }))
      .filter(
        (item) =>
          item.focus_label &&
          item.original_word &&
          item.transliteration &&
          item.core_meaning &&
          item.why_it_matters &&
          item.dig_deeper_hint
      )
      .slice(0, 5)

    if (cleaned.length < 3) return null
    return cleaned
  } catch {
    return null
  }
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 1000)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
}

function payloadLooksRussian(payload: WordMapNode[]): boolean {
  const joined = payload
    .flatMap((item) => [
      item.focus_label,
      item.original_word,
      item.transliteration,
      item.core_meaning,
      item.why_it_matters,
      item.dig_deeper_hint,
    ])
    .join(' ')

  return looksRussian(joined)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()

    if (!reference || !verseText) {
      return NextResponse.json(
        { error: 'reference and verseText are required.' },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(reference, verseText)

    const result = await runModel({
      prompt,
      model: process.env.UNFOLD_MODEL || 'gpt-5.4',
      maxOutputTokens: 4000,
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

    let payload = parsePayload(rawText)

    if (!payload) {
      const extracted = extractJsonArray(rawText)
      if (extracted) {
        payload = parsePayload(extracted)
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Failed to parse moderator Word Map JSON.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!payloadLooksRussian(payload)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for moderator Word Map.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reference,
      verseText,
      payload,
    })
  } catch (error) {
    console.error('Moderator Word Map API error:', error)

    return NextResponse.json(
      {
        error: 'Something went wrong while generating moderator Word Map.',
      },
      { status: 500 }
    )
  }
}
