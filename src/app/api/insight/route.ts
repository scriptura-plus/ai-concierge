import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { book, chapter, verse } = await req.json()

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { text: 'GOOGLE_API_KEY is missing in Vercel environment variables.' },
        { status: 500 }
      )
    }

    const prompt = `
You are an elite insight generator for biblical texts.

Your task is NOT to provide theological explanations.
Your task is to generate one deep, surprising, intellectually rich insight based on a verse reference.

STYLE:
- Encyclopedic but engaging
- No preaching
- No clichés
- No surface-level explanation
- Feels like a discovery

OUTPUT:
Write exactly one short insight, 4–6 sentences.
Reference: ${book} ${chapter}:${verse}
    `.trim()

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )

    const data = await response.json()

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No insight was generated.'

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Insight API error:', error)

    return NextResponse.json(
      { text: 'Something went wrong while generating the insight.' },
      { status: 500 }
    )
  }
}
