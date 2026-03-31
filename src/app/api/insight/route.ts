import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { book, chapter, verse } = await req.json()

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        text: 'GOOGLE_API_KEY is missing.',
      })
    }

    const prompt = `
const prompt = `
You are an elite insight generator for biblical texts.

Your task is to produce ONE sharp, memorable, non-obvious insight based on a Bible verse reference.

STYLE:
- Feels like a discovery, not an explanation
- Modern, clear, intellectually engaging
- No preaching, no religious tone
- No abstract философия ради философии
- Avoid vague language

STRUCTURE:
1. Start with a strong hook (unexpected angle or reframing)
2. Develop the idea clearly
3. End with a subtle but powerful takeaway

REQUIREMENTS:
- 4 to 5 sentences only
- Each sentence must add value
- No filler, no repetition
- Make it something people would want to screenshot or share

IMPORTANT:
- Focus on meaning, pattern, or hidden dynamic
- You can connect psychology, behavior, systems thinking, or human nature
- Avoid simply restating the verse

Verse reference: ${book} ${chapter}:${verse}
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

    return NextResponse.json({
      text: 'Something went wrong while generating the insight.',
    })
  }
}
