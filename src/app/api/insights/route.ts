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

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Each item must have:
  - "title": short, sharp, intriguing
  - "text": 4-5 sentences, tightly written, readable, and self-contained

Example:
[
  {
    "title": "The Detail That Slows the Verse Down",
    "text": "Sentence one. Sentence two. Sentence three. Sentence four."
  }
]
`.trim();
}

function parseInsights(raw: string): InsightItem[] | null {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? "").trim(),
        text: String(item.text ?? "").trim(),
      }))
      .filter((item) => item.title && item.text);

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return raw.slice(start, end + 1);
}

function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const pieces =
    data?.output
      ?.flatMap((item: any) => item?.content ?? [])
      ?.map((part: any) => {
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.output_text === "string") return part.output_text;
        return "";
      })
      ?.filter(Boolean) ?? [];

  return pieces.join("").trim();
}

export async function POST(req: Request) {
  try {
    const { book, chapter, verse, focusWord, count } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_output_tokens: 3000,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "OpenAI request failed.",
          raw: responseText || "Empty OpenAI error response",
        },
        { status: 500 }
      );
    }

    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "OpenAI returned non-JSON HTTP response.",
          raw: responseText || "Empty HTTP response body",
        },
        { status: 500 }
      );
    }

    const rawText = extractOpenAIText(data);

    let insights = parseInsights(rawText);

    if (!insights) {
      const extracted = extractJsonArray(rawText);
      if (extracted) {
        insights = parseInsights(extracted);
      }
    }

    if (!insights) {
      return NextResponse.json(
        {
          error: "Failed to parse insights JSON.",
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
