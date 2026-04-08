import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') {
    return `
Write the full article in Russian.
Every field must be in Russian:
- title
- lead
- every body paragraph
- quote if present

Do not use English in the final answer.
Do not leave headings or prose in English.
`.trim()
  }

  if (targetLanguage === 'es') {
    return `
Write the full article in Spanish.
Every field must be in Spanish.
Do not use English in the final answer.
`.trim()
  }

  if (targetLanguage === 'fr') {
    return `
Write the full article in French.
Every field must be in French.
Do not use English in the final answer.
`.trim()
  }

  if (targetLanguage === 'de') {
    return `
Write the full article in German.
Every field must be in German.
Do not use English in the final answer.
`.trim()
  }

  return 'Write the full article in English.'
}

function buildPrompt(
  reference: string,
  verseText: string,
  insightTitle: string,
  insightText: string,
  targetLanguage: SupportedLanguage
) {
  return `
You are writing a long-form journal-style article for an advanced Bible insight app.

Your task is to take one selected insight and unfold it into a deep, elegant, intellectually serious article.

${languageInstruction(targetLanguage)}

INPUTS

Reference:
${reference}

Verse text:
${verseText}

Selected insight title:
${insightTitle}

Selected insight text:
${insightText}

MISSION

Write a fully developed article that feels like a piece from a high-end intellectual journal:
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
- built around one central insight
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
1. Open with a strong intellectual entrance into the central tension of the insight.
2. Clarify why the chosen insight is more significant than it first appears.
3. Move slowly through the verse and its wording.
4. Expand the idea through linguistic, literary, contextual, and historical depth where useful.
5. Show how this insight changes the reading of the verse as a whole.
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

function parseReference(reference: string): {
  verse_ref: string
  book: string
  chapter: number
  verse: number
} | null {
  const trimmed = reference.trim()
  const match = trimmed.match(/^(.*)\s+(\d+):(\d+)$/)

  if (!match) return null

  const [, rawBook, rawChapter, rawVerse] = match
  const book = rawBook.trim().toLowerCase()
  const chapter = Number(rawChapter)
  const verse = Number(rawVerse)

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return null
  }

  return {
    verse_ref: trimmed,
    book,
    chapter,
    verse,
  }
}

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' ||
    value === 'tension' ||
    value === 'why_this_phrase'
    ? value
    : 'insights'
}

function buildUnfoldText(article: ArticlePayload): string {
  return [
    article.title,
    '',
    article.lead,
    '',
    ...article.body,
    ...(article.quote ? ['', `“${article.quote}”`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function saveUnfoldEvent(params: {
  reference: string
  sourceMode?: unknown
  sourceInsightId?: unknown
  sourceTitle: string
  sourceText: string
  sourceAngleNote?: unknown
  article: ArticlePayload
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsedRef = parseReference(params.reference)

  if (!parsedRef) {
    return { ok: false, error: 'Could not parse reference for unfold event.' }
  }

  const supabase = getSupabaseServerClient()

  const sourceInsightId =
    typeof params.sourceInsightId === 'string' && params.sourceInsightId.trim()
      ? params.sourceInsightId.trim()
      : null

  const sourceAngleNote =
    typeof params.sourceAngleNote === 'string' && params.sourceAngleNote.trim()
      ? params.sourceAngleNote.trim()
      : null

  const { data, error } = await supabase
    .schema('private')
    .from('unfold_events')
    .insert({
      verse_ref: parsedRef.verse_ref,
      book: parsedRef.book,
      chapter: parsedRef.chapter,
      verse: parsedRef.verse,
      source_insight_id: sourceInsightId,
      source_mode: normalizeSourceMode(params.sourceMode),
      source_title: params.sourceTitle,
      source_text: params.sourceText,
      source_angle_note: sourceAngleNote,
      unfold_title: params.article.title,
      unfold_text: buildUnfoldText(params.article),
      review_status: 'new',
      promoted_insight_id: null,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return {
      ok: false,
      error: `Failed to save unfold event: ${error?.message ?? 'Unknown insert error.'}`,
    }
  }

  return { ok: true, id: data.id as string }
}

export async function POST(req: Request) {
  try {
    const {
      reference,
      verseText,
      insightTitle,
      insightText,
      targetLanguage,
      sourceMode,
      sourceAngleNote,
      sourceInsightId,
    } = await req.json()

    const safeReference = String(reference ?? '').trim() || 'Unknown reference'
    const safeVerseText = String(verseText ?? '').trim()
    const safeInsightTitle = String(insightTitle ?? '').trim()
    const safeInsightText = String(insightText ?? '').trim()

    if (!safeVerseText || !safeInsightTitle || !safeInsightText) {
      return NextResponse.json(
        { error: 'reference, verseText, insightTitle, and insightText are required.' },
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

    const prompt = buildPrompt(
      safeReference,
      safeVerseText,
      safeInsightTitle,
      safeInsightText,
      safeLanguage
    )

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

    if (safeLanguage === 'ru' && !articleLooksRussian(article)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for article mode.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    const saveResult = await saveUnfoldEvent({
      reference: safeReference,
      sourceMode,
      sourceInsightId,
      sourceTitle: safeInsightTitle,
      sourceText: safeInsightText,
      sourceAngleNote,
      article,
    })

    return NextResponse.json({
      article,
      eventSaved: saveResult.ok,
      eventId: saveResult.ok ? saveResult.id : null,
      eventError: saveResult.ok ? null : saveResult.error,
    })
  } catch (error) {
    console.error('Unfold article API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong while generating the article.' },
      { status: 500 }
    )
  }
}
