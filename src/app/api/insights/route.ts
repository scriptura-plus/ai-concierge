import { NextResponse } from "next/server";

type InsightItem = {
  title: string;
  text: string;
};

function buildPrompt(reference: string, focusWord?: string, count = 12) {
  const focusBlock = focusWord?.trim()
    ? `
FOCUS MODE:
Pay special attention to this word or phrase:
"${focusWord.trim()}"

If possible, let many of the insights revolve around that focal point from different angles.
`
    : `
FOCUS MODE:
No specific word or phrase was provided.
Generate insights based on the verse as a whole.
`;

  return `
You are an elite generator of biblical insight cards.

Your task is to produce ${count} distinct, non-obvious, high-value insight cards based on this Bible verse reference:

${reference}

CORE PRINCIPLE:
This is not commentary.
This is not summary.
This is not preaching.
This is discovery.

AUDIENCE:
Thoughtful, scripture-literate adult readers who value depth, precision, and fresh angles.

PRIMARY GOAL:
Generate insights that feel rare, sharp, and worth saving.

QUALITY STANDARD:
- Avoid obvious observations
- Avoid generic spiritual language
- Avoid clichés
- Avoid repeating the same idea in different words
- Each card must reveal a different angle, tension, contrast, pattern, or implication
- Do not produce insights that could fit almost any verse

DIVERSITY RULE:
Across the full set, vary the type of insight. Draw from different angles such as:
- a surprising wording detail
- an inner tension in the verse
- a hidden contrast
- context that changes the emotional force
- a structural or rhetorical feature
- an unexpected biblical echo
- a paradox
- a practical implication that is not immediately obvious
- a focus on one striking word or phrase
- an insight based on what the verse does NOT say but the reader might expect

${focusBlock}

STYLE:
- Clear
- Modern
- Intelligent
- Concise but vivid
- Memorable without sounding dramatic
- No religious clichés
- No vague abstraction

FORMAT:
Return exactly ${count} cards in this plain text format:

===CARD===
TITLE: <short title>
TEXT: <4-5 sentences>

===CARD===
TITLE: <short title>
TEXT: <4-5 sentences>

RULES:
- Do NOT return JSON
- Do NOT return markdown
- Do NOT use code fences
- Do NOT add any intro or outro
- Each card must begin with ===CARD===
- Each card must contain exactly one TITLE: line and one TEXT: block
- Put the full text after TEXT:
`.trim();
}

function extractText(data: any): string {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "")
      .join("") ?? ""
  );
}

function parseCards(raw: string): InsightItem[] {
  const chunks = raw
    .split("===CARD===")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const results: InsightItem[] = [];

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/TITLE:\s*(.+)/i);
    const textMatch = chunk.match(/TEXT:\s*([\s\S]+)/i);

    const title = titleMatch?.[1]?.trim() ?? "";
    const text = textMatch?.[1]?.trim() ?? "";

    if (title && text) {
      results.push({ title, text });
    }
  }

  return results;
}

export async function POST(req: Request) {
  try {
    const { book, chapter, verse, focusWord, count } = await req.json();

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is missing." },
        { status: 500 }
      );
    }

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: "book, chapter, and verse are required." },
        { status: 400 }
      );
    }

    const reference = `${book} ${chapter}:${verse}`;
    const safeCount = Math.min(Math.max(Number(count ?? 12), 10), 20);

    const prompt = buildPrompt(reference, focusWord, safeCount);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = extractText(data);
    const insights = parseCards(rawText);

    if (!insights.length) {
      return NextResponse.json(
        {
          error: "Failed to parse insight cards.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference,
      focusWord: focusWord ?? "",
      count: insights.length,
      insights,
    });
  } catch (error) {
    console.error("Insights API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating insights.",
      },
      { status: 500 }
    );
  }
}
