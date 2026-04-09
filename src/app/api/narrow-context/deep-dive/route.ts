import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'

type NarrowContextDirection = {
  id: string
  title: string
  summary: string
  why_it_matters: string
  dig_deeper: string
}

type NarrowContextArticle = {
  title: string
  lead: string
  body: string[]
  highlight_line?: string
}

type DeepDivePayload = {
  article?: NarrowContextArticle
}

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') {
    return `
Write the full output in Russian.
All fields must be fully in Russian.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'es') {
    return `
Write the full output in Spanish.
All fields must be fully in Spanish.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'fr') {
    return `
Write the full output in French.
All fields must be fully in French.
Do not use English in explanatory text.
`.trim()
  }

  if (targetLanguage === 'de') {
    return `
Write the full output in German.
All fields must be fully in German.
Do not use English in explanatory text.
`.trim()
  }

  return `
Write the full output in English.
All explanatory text must be in English.
`.trim()
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function parsePayload(raw: string): DeepDivePayload | null {
  try {
    const parsed = JSON.parse(raw) as DeepDivePayload
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    const extracted = extractJsonObject(raw)
    if (!extracted) return null

    try {
      const parsed = JSON.parse(extracted) as DeepDivePayload
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }
}

function validateArticle(payload: DeepDivePayload): NarrowContextArticle | null {
  const article = payload.article
  if (!article || typeof article !== 'object') return null

  const title = normalizeText(article.title)
  const lead = normalizeText(article.lead)
  const body = Array.isArray(article.body)
    ? article.body.map((item) => normalizeText(item)).filter(Boolean)
    : []
  const highlightLine = normalizeText(article.highlight_line)

  if (!title || !lead || body.length < 2) {
    return null
  }

  return {
    title,
    lead,
    body: body.slice(0, 3),
    highlight_line: highlightLine || '',
  }
}

function buildPrompt(params: {
  reference: string
  verseText: string
  paragraphReference: string
  paragraphText: string
  direction: NarrowContextDirection
  targetLanguage: SupportedLanguage
}) {
  return `
You are writing a premium short article for a Bible-reading experience called Scriptura+.

Your task is to take ONE previously selected paragraph-direction and deepen it into a short, elegant, insight-rich article.

IMPORTANT:
This is NOT a sermon.
This is NOT generic commentary.
This is NOT a devotional reflection.
This is NOT a summary of everything in the paragraph.

This is a focused deep dive into one chosen reading direction.

========================================
1. INPUT
========================================

TARGET VERSE REFERENCE:
${params.reference}

TARGET VERSE TEXT:
${params.verseText}

PARAGRAPH REFERENCE:
${params.paragraphReference}

PARAGRAPH TEXT:
${params.paragraphText}

SELECTED DIRECTION TITLE:
${params.direction.title}

SELECTED DIRECTION SUMMARY:
${params.direction.summary}

WHY IT MATTERS:
${params.direction.why_it_matters}

DIG DEEPER:
${params.direction.dig_deeper}

${languageInstruction(params.targetLanguage)}

========================================
2. CORE GOAL
========================================

Write a short article that makes this chosen direction feel:
- sharper
- richer
- more memorable
- more worth keeping

The reader should feel:
“Yes, that really is the hidden pressure point here.”

========================================
3. REQUIRED STRUCTURE
========================================

Return:
- title
- lead
- body
- highlight_line

title:
Short, elegant, specific.
Not generic.

lead:
2-4 sentences.
It should open the angle clearly and attractively.

body:
Return 2 or 3 paragraphs.
Each paragraph should deepen the same angle, not switch to a new one.

highlight_line:
One short, memorable line in a refined journal style.
Not cheesy.
Not preachy.
Not exaggerated.

========================================
4. WRITING RULES
========================================

This article must:
- stay anchored in the paragraph
- deepen the selected direction only
- avoid drifting into unrelated themes
- feel intelligent and refined
- remain readable on mobile

Do not:
- retell the whole paragraph
- broaden into a different angle
- preach
- moralize generically
- use cliché religious phrasing
- sound academic and stiff

Preferred tone:
- precise
- literary
- warm
- controlled
- insightful
- elegant

Style target:
“a polished short piece in an expensive intellectual biblical journal”

========================================
5. DEPTH RULE
========================================

The value of the article should come from:
- clarifying hidden logic
- making a subtle emphasis visible
- explaining why the selected direction is genuinely important
- showing how the paragraph quietly pushes the reader toward this meaning

Subtle but real is better than dramatic but fake.

========================================
6. OUTPUT FORMAT
========================================

Return ONLY valid JSON.
No markdown.
No code fences.
No commentary.

Use exactly this structure:

{
  "article": {
    "title": "string",
    "lead": "string",
    "body": [
      "string",
      "string"
    ],
    "highlight_line": "string"
  }
}

========================================
7. FINAL CHECK
========================================

Before returning:
- Is this still the same selected angle?
- Did I deepen rather than widen?
- Does it read cleanly and beautifully?
- Would a thoughtful reader feel that this article genuinely sharpened the original direction?

If not, improve it before output.
`.trim()
}

function buildFallbackArticle(direction: NarrowContextDirection): NarrowContextArticle {
  return {
    title: direction.title,
    lead:
      direction.summary ||
      'This direction deserves a closer reading because the paragraph gives it more weight than a first glance might suggest.',
    body: [
      direction.why_it_matters ||
        'Its importance lies in how it sharpens the paragraph from within rather than adding meaning from outside.',
      direction.dig_deeper ||
        'A deeper reading should stay close to the wording, the movement of the paragraph, and the local pressure of the text.',
    ],
    highlight_line:
      'The paragraph often reveals its center not by noise, but by the line it quietly leans on.',
  }
}

export async function POST(req: Request) {
  try {
    const {
      book,
      chapter,
      verse,
      paragraphReference,
      paragraphText,
      direction,
      targetLanguage,
    } = await req.json()

    if (!book || !chapter || !verse || !paragraphText || !direction) {
      return NextResponse.json(
        { error: 'book, chapter, verse, paragraphText, and direction are required.' },
        { status: 400 }
      )
    }

    const safeLanguage: SupportedLanguage =
      targetLanguage === 'ru' ||
      targetLanguage === 'es' ||
      targetLanguage === 'fr' ||
      targetLanguage === 'de'
        ? targetLanguage
        : 'en'

    const safeBook = String(book).trim()
    const safeChapter = Number(chapter)
    const safeVerse = Number(verse)
    const safeParagraphReference = normalizeText(paragraphReference) || `${safeBook} ${safeChapter}:${safeVerse}`
    const safeParagraphText = normalizeText(paragraphText)

    if (!Number.isInteger(safeChapter) || !Number.isInteger(safeVerse)) {
      return NextResponse.json(
        { error: 'chapter and verse must be integers.' },
        { status: 400 }
      )
    }

    if (!safeParagraphText) {
      return NextResponse.json(
        { error: 'paragraphText must not be empty.' },
        { status: 400 }
      )
    }

    const rawDirection = direction as Partial<NarrowContextDirection>
    const safeDirection: NarrowContextDirection = {
      id: normalizeText(rawDirection.id) || 'dir_1',
      title: normalizeText(rawDirection.title),
      summary: normalizeText(rawDirection.summary),
      why_it_matters: normalizeText(rawDirection.why_it_matters),
      dig_deeper: normalizeText(rawDirection.dig_deeper),
    }

    if (
      !safeDirection.title ||
      !safeDirection.summary ||
      !safeDirection.why_it_matters ||
      !safeDirection.dig_deeper
    ) {
      return NextResponse.json(
        { error: 'direction is incomplete.' },
        { status: 400 }
      )
    }

    const reference = `${safeBook} ${safeChapter}:${safeVerse}`
    const verseText = ''

    const prompt = buildPrompt({
      reference,
      verseText,
      paragraphReference: safeParagraphReference,
      paragraphText: safeParagraphText,
      direction: safeDirection,
      targetLanguage: safeLanguage,
    })

    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 2200,
    })

    let article: NarrowContextArticle | null = null
    let rawText = ''

    if (result.ok && result.rawText) {
      rawText = result.rawText
      const parsed = parsePayload(result.rawText)
      if (parsed) {
        article = validateArticle(parsed)
      }
    }

    if (!article) {
      article = buildFallbackArticle(safeDirection)
    }

    return NextResponse.json({
      reference,
      paragraphReference: safeParagraphReference,
      directionId: safeDirection.id,
      targetLanguage: safeLanguage,
      article,
      raw: rawText || '',
    })
  } catch (error) {
    console.error('Narrow Context Deep Dive API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while generating narrow context deep dive.',
      },
      { status: 500 }
    )
  }
}
