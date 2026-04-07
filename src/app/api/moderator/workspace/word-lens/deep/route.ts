import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type DeepWordNode = {
  focus_label: string
  original_word: string
  transliteration: string
  core_meaning: string
  why_it_matters: string
  dig_deeper_hint: string
}

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

function buildPrompt(reference: string, verseText: string, node: DeepWordNode) {
  return `
You are writing a long-form journal-style article for an advanced Bible moderator workspace.

MODE:
Word Lens V3 — Deep Word Article

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

SELECTED WORD MAP NODE:
- focus_label: ${node.focus_label}
- original_word: ${node.original_word}
- transliteration: ${node.transliteration}
- core_meaning: ${node.core_meaning}
- why_it_matters: ${node.why_it_matters}
- dig_deeper_hint: ${node.dig_deeper_hint}

Write the full output in Russian.

MISSION

Take this selected semantic node and unfold it into a deep, elegant, intellectually serious article that helps the moderator see why this word or expression changes the reading of the verse.

This is not a generic lexical note.
This is not a sermon.
This is not a list of glosses.
This is not a bullet-point explanation.

This is:
- a long-form analytical essay
- built around one chosen word or expression
- anchored in the verse
- philologically aware but readable
- intellectually alive
- written with compositional control
- capable of yielding strong future insight cards

WHAT THE ARTICLE SHOULD DO

1. Begin with a strong intellectual opening around the chosen word or expression.
2. Explain why this node matters more than it first appears.
3. Move through the wording of the verse slowly and carefully.
4. Draw on the original-language form and semantic core where useful.
5. Show how this word shapes the force of the verse as a whole.
6. Follow the direction implied in the dig_deeper_hint when useful.
7. End with a lucid, non-preachy closing movement.

STYLE RULES

- Write in Russian
- Elegant, dense, readable, and mature
- High-end intellectual journal tone
- Not preachy
- Not sentimental
- Not bloated
- No bullet points
- No numbered sections in the final prose
- No shallow repetition
- Each paragraph must deepen the thought
- Each paragraph should create a natural pull into the next one
- Avoid generic ChatGPT-style summary prose
- Do not overclaim etymology if uncertain
- Stay close to the verse and the selected node

LENGTH

Target roughly 1200-1800 words if the material supports it.
Do not force length with fluff.
If the material is better served a bit shorter, keep it substantial, dense, and controlled.

OUTPUT CONTRACT

Return ONLY valid JSON.
No markdown.
No commentary outside JSON.

FORMAT:
{
  "title": "...",
  "lead": "...",
  "body": ["...", "...", "..."],
  "quote": "optional short line"
}

OUTPUT REQUIREMENTS

- "title" should feel elegant, serious, and article-worthy
- "lead" should function like a strong opening paragraph
- "body" must contain 3-5 substantial paragraphs
- the body paragraphs must read like a continuous essay broken into paragraphs, not disconnected notes
- "quote" is optional, but if present it should be brief and memorable
`.trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parseArticle(raw: string): ArticlePayload | null {
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.title !== 'string') return null
    if (typeof parsed.lead !== 'string') return null
    if (!Array.isArray(parsed.body)) return null

    const body = parsed.body
      .map((item: any) => String(item ?? '').trim())
      .filter(Boolean)

    if (!body.length) return null

    return {
      title: String(parsed.title).trim(),
      lead: String(parsed.lead).trim(),
      body,
      quote: typeof parsed.quote === 'string' ? parsed.quote.trim() : undefined,
    }
  } catch {
    return null
  }
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 700)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
}

function articleLooksRussian(article: ArticlePayload): boolean {
  const joined = [
    article.title,
    article.lead,
    ...article.body,
    article.quote ?? '',
  ].join(' ')

  return looksRussian(joined)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()

    const node: DeepWordNode = {
      focus_label: String(body.focus_label ?? '').trim(),
      original_word: String(body.original_word ?? '').trim(),
      transliteration: String(body.transliteration ?? '').trim(),
      core_meaning: String(body.core_meaning ?? '').trim(),
      why_it_matters: String(body.why_it_matters ?? '').trim(),
      dig_deeper_hint: String(body.dig_deeper_hint ?? '').trim(),
    }

    if (
      !reference ||
      !verseText ||
      !node.focus_label ||
      !node.original_word ||
      !node.transliteration ||
      !node.core_meaning ||
      !node.why_it_matters ||
      !node.dig_deeper_hint
    ) {
      return NextResponse.json(
        {
          error:
            'reference, verseText, focus_label, original_word, transliteration, core_meaning, why_it_matters, and dig_deeper_hint are required.',
        },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(reference, verseText, node)

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

    let article = parseArticle(rawText)

    if (!article) {
      const extracted = extractJsonObject(rawText)
      if (extracted) {
        article = parseArticle(extracted)
      }
    }

    if (!article) {
      return NextResponse.json(
        {
          error: 'Failed to parse deep Word Article JSON.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    if (!articleLooksRussian(article)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for deep Word Article.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reference,
      verseText,
      node,
      article,
    })
  } catch (error) {
    console.error('Deep Word Article API error:', error)

    return NextResponse.json(
      {
        error: 'Something went wrong while generating deep Word Article.',
      },
      { status: 500 }
    )
  }
}
