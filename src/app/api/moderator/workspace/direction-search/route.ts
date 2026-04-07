import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

function buildPrompt(reference: string, verseText: string, directionRequest: string) {
  return `
You are writing a long-form journal-style article for an advanced Bible insight app.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

DIRECTION OF SEARCH:
${directionRequest}

Write the full article in Russian.

MISSION

Write a fully developed article that explores the requested direction of thought and feels like a piece from a high-end intellectual journal:
- serious
- elegant
- dense with thought
- carefully structured
- readable and polished
- never preachy
- never simplistic
- never list-like
- compelling enough that the reader wants to continue into the next paragraph

This is NOT:
- a sermon
- a devotional
- a bullet-point summary
- a short explanation
- a list of facts
- a casual blog post

This IS:
- a long-form analytical essay
- built around one strong direction of inquiry
- written with compositional control
- enriched by language, structure, historical context, literary texture, and conceptual tension where relevant
- shaped with narrative pull, so the movement of thought carries the reader forward

CRITICAL STYLE RULES

- Write in continuous article form
- No bullet points
- No numbered sections
- No “first, second, third”
- No motivational tone
- No doctrinal preaching
- No filler
- No shallow repetition of the same idea
- Each paragraph must deepen the thought
- Each paragraph should create a natural pull into the next one
- Use transitions, tension, contrast, texture, and controlled unfolding so the article feels difficult to stop reading
- Avoid generic ChatGPT-style summary prose

TONE

The tone should feel like a thoughtful article in an expensive literary-intellectual magazine:
- restrained
- exact
- mature
- quietly powerful
- scholarly without becoming dry
- beautiful without becoming theatrical

STRUCTURE

Write the article in this internal progression:
1. Open with a strong intellectual entrance into the requested direction of inquiry.
2. Clarify why this angle is more significant than it first appears.
3. Move slowly through the verse and its wording.
4. Expand the idea through linguistic, literary, contextual, and historical depth where useful.
5. Show how this angle changes the reading of the verse as a whole.
6. End with a strong, lucid, non-preachy closing movement.

QUALITY BAR

- Prefer depth over speed
- Prefer density over length-padding
- Prefer elegance over bluntness
- Prefer argument over slogan
- Prefer developed prose over compressed notes
- Prefer paragraph-level movement over static explanation
- The reader should feel invited deeper and deeper into the thought

LENGTH

Target roughly 1200-1800 words if the material supports it.
Do not force length with fluff.
If the idea is better served in a somewhat shorter but still substantial article, keep it dense and controlled.

OUTPUT CONTRACT

Return ONLY valid JSON.
No markdown.
No commentary outside JSON.
Format:
{
  "title": "...",
  "lead": "...",
  "body": ["...", "...", "..."],
  "quote": "optional short line"
}

OUTPUT REQUIREMENTS

- "title" should feel elegant, serious, and article-worthy
- "lead" should function like a strong opening paragraph that immediately creates interest
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
    const directionRequest = String(body.directionRequest ?? '').trim()

    if (!reference || !verseText || !directionRequest) {
      return NextResponse.json(
        { error: 'reference, verseText, and directionRequest are required.' },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(reference, verseText, directionRequest)

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
        { error: 'Failed to parse article JSON.', raw: rawText || 'Empty model response' },
        { status: 500 }
      )
    }

    if (!articleLooksRussian(article)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for direction search.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Direction search API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating direction search.' },
      { status: 500 }
    )
  }
}
