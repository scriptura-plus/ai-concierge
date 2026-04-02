import { NextResponse } from 'next/server'

type RequestBody = {
  reference?: string
  verseText?: string
  insightTitle?: string
  insightText?: string
  focusWord?: string
  targetLanguage?: 'en' | 'ru' | 'es'
}

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

function buildArticlePrompt({
  reference,
  verseText,
  insightTitle,
  insightText,
  focusWord,
  targetLanguage,
}: Required<RequestBody>) {
  const languageInstruction =
    targetLanguage === 'ru'
      ? 'Write the result in Russian.'
      : targetLanguage === 'es'
        ? 'Write the result in Spanish.'
        : 'Write the result in English.'

  const focusBlock = focusWord?.trim()
    ? `Focus word or phrase: ${focusWord.trim()}`
    : 'No focus word was provided.'

  return `
You are creating a premium editorial article for a Bible insight app.

${languageInstruction}

Your task is to unfold one selected insight into a structured long-form article that feels like a refined intellectual magazine piece:
- elegant
- dense with thought
- readable
- serious
- non-preachy
- non-list-like
- not simplistic

INPUT

Reference:
${reference}

Verse text:
${verseText}

Selected insight title:
${insightTitle}

Selected insight text:
${insightText}

${focusBlock}

GOAL

Turn the chosen insight into a substantial journal-style article.
The article should feel polished and literary-intellectual, not like sermon notes and not like a bullet-point explanation.

IMPORTANT STYLE RULES

- No bullet points in the article body
- No numbered sections
- No devotional tone
- No preaching
- No filler
- No shallow repetition
- Each paragraph must add something
- The prose should feel elegant, controlled, and mature

STRUCTURE TO PRODUCE

Return valid JSON only with this exact shape:

{
  "title": "string",
  "lead": "string",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "quote": "optional short striking sentence"
}

FIELD RULES

title:
- a refined article title
- not too long
- should feel editorial, not mechanical

lead:
- one strong opening paragraph
- should introduce the central tension or insight
- should read like a premium journal opening

body:
- an array of substantial paragraphs
- ideally 6 to 10 paragraphs
- each paragraph should be complete and polished
- no markdown
- no bullet points
- no numbering

quote:
- optional
- one short striking sentence or phrase
- should sound elegant and quotable
- omit it if there is no good one

QUALITY

The article should:
- begin with intellectual tension
- move through the verse carefully
- deepen through wording, structure, context, and conceptual implications where useful
- remain fact-sensitive and disciplined
- sound like a serious long-form essay

Do not return markdown.
Do not wrap JSON in code fences.
Return JSON only.
`.trim()
}

function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const pieces =
    data?.output
      ?.flatMap((item: any) => item?.content ?? [])
      ?.map((part: any) => {
        if (typeof part?.text === 'string') return part.text
        if (typeof part?.output_text === 'string') return part.output_text
        return ''
      })
      ?.filter(Boolean) ?? []

  return pieces.join('').trim()
}

function coerceArticlePayload(raw: any, fallbackTitle: string): ArticlePayload | null {
  if (!raw || typeof raw !== 'object') return null

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : fallbackTitle

  const lead =
    typeof raw.lead === 'string' && raw.lead.trim()
      ? raw.lead.trim()
      : ''

  const body =
  Array.isArray(raw.body)
    ? raw.body
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter((item: string) => Boolean(item))
    : []

  const quote =
    typeof raw.quote === 'string' && raw.quote.trim()
      ? raw.quote.trim()
      : undefined

  if (!lead || body.length === 0) return null

  return {
    title,
    lead,
    body,
    quote,
  }
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json()
    const { reference, verseText, insightTitle, insightText, focusWord, targetLanguage } = body

    if (!reference || !verseText || !insightTitle || !insightText) {
      return NextResponse.json(
        { error: 'reference, verseText, insightTitle, and insightText are required.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is missing.' },
        { status: 500 }
      )
    }

    const prompt = buildArticlePrompt({
      reference,
      verseText,
      insightTitle,
      insightText,
      focusWord: focusWord ?? '',
      targetLanguage: (targetLanguage ?? 'en') as 'en' | 'ru' | 'es',
    })

    const model = process.env.UNFOLD_MODEL || 'gpt-5.4'

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        reasoning: {
          effort: 'high',
        },
        input: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_output_tokens: 5000,
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'OpenAI request failed.',
          raw: responseText || 'Empty OpenAI error response',
        },
        { status: 500 }
      )
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        {
          error: 'OpenAI returned non-JSON HTTP response.',
          raw: responseText || 'Empty HTTP response body',
        },
        { status: 500 }
      )
    }

    const rawText = extractOpenAIText(data)
    if (!rawText) {
      return NextResponse.json(
        {
          error: 'Model returned empty article.',
          raw: responseText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        {
          error: 'Model did not return valid JSON.',
          raw: rawText,
        },
        { status: 500 }
      )
    }

    const article = coerceArticlePayload(parsed, insightTitle)
    if (!article) {
      return NextResponse.json(
        {
          error: 'Model returned incomplete article structure.',
          raw: rawText,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Unfold article API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating the article.' },
      { status: 500 }
    )
  }
}
