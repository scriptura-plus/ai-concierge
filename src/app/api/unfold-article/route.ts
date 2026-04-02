import { NextResponse } from 'next/server'

type RequestBody = {
  reference?: string
  verseText?: string
  insightTitle?: string
  insightText?: string
  focusWord?: string
  targetLanguage?: 'en' | 'ru' | 'es'
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
      ? 'Write the article in Russian.'
      : targetLanguage === 'es'
        ? 'Write the article in Spanish.'
        : 'Write the article in English.'

  const focusBlock = focusWord?.trim()
    ? `Focus word or phrase: ${focusWord.trim()}`
    : 'No focus word was provided.'

  return `
You are writing a long-form journal-style article for an advanced Bible insight app.

Your task is to take one selected insight and unfold it into a deep, elegant, intellectually serious article.

${languageInstruction}

INPUTS

Reference:
${reference}

Verse text:
${verseText}

Selected insight title:
${insightTitle}

Selected insight text:
${insightText}

${focusBlock}

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

TONE

The tone should feel like a thoughtful article in an expensive literary-intellectual magazine:
- restrained
- exact
- mature
- quietly powerful
- scholarly without becoming dry
- beautiful without becoming theatrical

STRUCTURE

1. Open with a strong intellectual entrance into the central tension of the insight.
2. Clarify why the chosen insight is more significant than it first appears.
3. Move slowly through the verse and its wording.
4. Expand the idea through linguistic, literary, contextual, and historical depth where useful.
5. Show how this insight changes the reading of the verse as a whole.
6. End with a strong, lucid, non-preachy closing paragraph.

QUALITY BAR

- Prefer depth over speed
- Prefer density over length-padding
- Prefer elegance over bluntness
- Prefer argument over slogan
- Prefer developed prose over compressed notes

LENGTH

Target roughly 1200-1800 words if the material supports it.
Do not force length with fluff.
If the idea is better served in a somewhat shorter but still substantial article, keep it dense and controlled.

OUTPUT

Return only the finished article text.
Do not add explanations, labels, bullet points, or JSON.
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

    const article = extractOpenAIText(data)

    if (!article) {
      return NextResponse.json(
        {
          error: 'Model returned empty article.',
          raw: responseText || 'Empty model response',
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
