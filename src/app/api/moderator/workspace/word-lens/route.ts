import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type WordReference = {
  reference: string
  quote: string
  note: string
}

type WordLensArticle = {
  focus_label: string
  original_word: string
  transliteration: string
  core_meaning: string
  why_it_matters: string
  cross_references: WordReference[]
  article: {
    title: string
    lead: string
    body: string[]
    quote?: string
  }
}

function buildPrompt(reference: string, verseText: string) {
  return `
You are an elite Bible word-study analyst writing for an advanced moderator workspace.

MODE:
Moderator Word Lens

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

Write the full output in Russian.

MISSION

Your task is to identify the ONE word or expression in this verse that carries the strongest semantic or interpretive weight, and unfold it in a way that helps a thoughtful non-specialist reader see the verse more clearly.

This is not a generic lexical note.
This is not a list of possible Greek or Hebrew glosses.
This is not preaching.

This is:
- a focused word-study
- anchored in the actual wording of the verse
- selective rather than exhaustive
- philologically aware but readable
- spiritually and intellectually meaningful without sounding devotional or sentimental

WHAT YOU MUST DO

1. Choose one key word or expression that truly carries interpretive weight in the verse.
2. Explain why this word matters more than it may appear at first.
3. Identify the likely original-language word behind it:
   - Greek for New Testament verses
   - Hebrew or Aramaic for Old Testament verses
4. Give:
   - the original word form
   - a readable transliteration
   - a concise semantic core
5. Show how this word or close semantic equivalent functions elsewhere in Scripture.
6. Use those other passages to clarify the force of the word in THIS verse.
7. End by showing how this word changes or sharpens the reading of the verse as a whole.

SELECTION RULE

Do not choose a word just because it sounds interesting.
Choose the word or expression that most strongly unlocks the verse.

STYLE RULES

- Write in Russian
- Be elegant, precise, and deeply readable
- Do not sound like a lexicon pasted into prose
- Do not give a dry academic dump
- Do not overclaim etymology if uncertain
- If etymology is unclear or not useful, say less rather than inventing
- Stay very close to the verse
- Avoid generic theology unless directly anchored in the word
- Make the analysis feel alive, textured, and worth saving
- The article must feel like a high-end intellectual journal piece, but still understandable to a thoughtful ordinary reader
- Paragraphs should deepen the thought and carry the reader forward

CROSS-REFERENCES

Provide 2-4 other biblical references where this word, or a very close semantic equivalent, helps illuminate its force.
For each one:
- include the reference
- include a short quotation or phrase
- include one brief note explaining why it matters

OUTPUT CONTRACT

Return ONLY valid JSON.
No markdown.
No code fences.
No commentary outside JSON.

FORMAT:
{
  "focus_label": "...",
  "original_word": "...",
  "transliteration": "...",
  "core_meaning": "...",
  "why_it_matters": "...",
  "cross_references": [
    {
      "reference": "...",
      "quote": "...",
      "note": "..."
    }
  ],
  "article": {
    "title": "...",
    "lead": "...",
    "body": ["...", "...", "..."],
    "quote": "optional short line"
  }
}

FIELD REQUIREMENTS

- focus_label: the chosen word or expression as the user would recognize it in the verse
- original_word: original-language form if reasonably identifiable
- transliteration: readable transliteration
- core_meaning: concise semantic core in Russian
- why_it_matters: short paragraph in Russian
- cross_references: 2-4 items
- article.title: elegant and serious
- article.lead: a strong opening paragraph
- article.body: 3-5 substantial paragraphs in Russian
- article.quote: optional and brief

QUALITY BAR

The output should help a moderator feel:
- why this word matters
- how it works in Scripture
- why the verse reads differently once this word is seen clearly
`.trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parsePayload(raw: string): WordLensArticle | null {
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.focus_label !== 'string') return null
    if (typeof parsed.original_word !== 'string') return null
    if (typeof parsed.transliteration !== 'string') return null
    if (typeof parsed.core_meaning !== 'string') return null
    if (typeof parsed.why_it_matters !== 'string') return null
    if (!Array.isArray(parsed.cross_references)) return null
    if (!parsed.article || typeof parsed.article !== 'object') return null
    if (typeof parsed.article.title !== 'string') return null
    if (typeof parsed.article.lead !== 'string') return null
    if (!Array.isArray(parsed.article.body)) return null

    const crossReferences = parsed.cross_references
      .map((item: any) => ({
        reference: String(item?.reference ?? '').trim(),
        quote: String(item?.quote ?? '').trim(),
        note: String(item?.note ?? '').trim(),
      }))
      .filter((item: WordReference) => item.reference && item.quote && item.note)
      .slice(0, 4)

    const body = parsed.article.body
      .map((item: any) => String(item ?? '').trim())
      .filter(Boolean)

    if (!crossReferences.length) return null
    if (!body.length) return null

    return {
      focus_label: String(parsed.focus_label).trim(),
      original_word: String(parsed.original_word).trim(),
      transliteration: String(parsed.transliteration).trim(),
      core_meaning: String(parsed.core_meaning).trim(),
      why_it_matters: String(parsed.why_it_matters).trim(),
      cross_references: crossReferences,
      article: {
        title: String(parsed.article.title).trim(),
        lead: String(parsed.article.lead).trim(),
        body,
        quote: typeof parsed.article.quote === 'string' ? parsed.article.quote.trim() : undefined,
      },
    }
  } catch {
    return null
  }
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 800)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
}

function payloadLooksRussian(payload: WordLensArticle): boolean {
  const joined = [
    payload.focus_label,
    payload.original_word,
    payload.transliteration,
    payload.core_meaning,
    payload.why_it_matters,
    ...payload.cross_references.flatMap((item) => [item.reference, item.quote, item.note]),
    payload.article.title,
    payload.article.lead,
    ...payload.article.body,
    payload.article.quote ?? '',
  ].join(' ')

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
      maxOutputTokens: 5000,
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
      const extracted = extractJsonObject(rawText)
      if (extracted) {
        payload = parsePayload(extracted)
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Failed to parse moderator Word lens JSON.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!payloadLooksRussian(payload)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for moderator Word lens.',
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
    console.error('Moderator Word lens API error:', error)

    return NextResponse.json(
      {
        error: 'Something went wrong while generating moderator Word lens.',
      },
      { status: 500 }
    )
  }
}
