import { NextResponse } from "next/server";
import { getVerseText } from "@/lib/bible/getVerseText";
import { runModel } from "@/lib/ai/run-model";

type InsightItem = {
  title: string;
  text: string;
};

function buildPrompt(
  reference: string,
  verseText: string,
  focusWord?: string,
  count = 12
) {
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

Your task is to produce ${count} distinct, non-obvious, high-value insight cards based on this Bible verse.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

CORE PRINCIPLE:
This is not commentary.
This is not summary.
This is not preaching.
This is discovery.

CRITICAL ACCURACY RULES:
- Base your insights on the verse text provided above
- Do not attribute words or phrases to the verse if they do not appear in the verse text
- Do not blend in wording from nearby verses unless clearly marked as wider context
- If a point depends on broader context, make that explicit
- Stay anchored in this specific verse

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
- an unexpected implication
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

export async function POST(req: Request) {
  try {
    const { book, chapter, verse, focusWord, count } = await req.json();

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: "book, chapter, and verse are required." },
        { status: 400 }
      );
    }

    const verseText = await getVerseText(book, chapter, verse);

    if (!verseText) {
      return NextResponse.json(
        { error: "Failed to load verse text from WEB API." },
        { status: 500 }
      );
    }

    const reference = `${book} ${chapter}:${verse}`;
    const safeCount = Math.min(Math.max(Number(count ?? 12), 10), 20);

    const prompt = buildPrompt(reference, verseText, focusWord, safeCount);

    const result = await runModel({
      prompt,
      model: "gpt-5.4-mini",
      maxOutputTokens: 3000,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          raw: result.raw || "",
        },
        { status: 500 }
      );
    }

    const rawText = result.rawText;

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
      verseText,
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
