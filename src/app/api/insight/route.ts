import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { book, chapter, verse } = await req.json()

  // Временный ответ (пока без AI)
  return NextResponse.json({
    text: `Insight for ${book} ${chapter}:${verse}

This is where your AI-generated insight will appear.

Next step: connect OpenAI.`,
  })
}
