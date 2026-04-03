import { NextResponse } from "next/server";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";
type InsightItem = {
  title: string;
  text: string;
};

function buildPrompt(reference: string, verseText: string, targetLanguage: SupportedLanguage) {
  const languageInstruction =
    targetLanguage === "ru"
      ? "Write the full output in Russian."
      : targetLanguage === "es"
        ? "Write the full output in Spanish."
        : targetLanguage === "fr"
          ? "Write the full output in French."
          : targetLanguage === "de"
            ? "Write the full output in German."
            : "Write the full output in English.";

  return `
You are an elite generator of close-reading Bible insight cards for the Word lens.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

TASK:
Produce 5-7 distinct Word lens cards.

WORD LENS:
This lens stays close to words and small textual units.
It surfaces hidden weight, force, pressure, and significance in wording.

RULES:
- Return ONLY valid JSON
- Output must be a JSON array
- No markdown
- No commentary outside JSON
- Each item must have:
  - "title"
  - "text"
- "text" must be 3-5 sentences
- Avoid generic commentary
- Stay anchored in this specific verse

Example:
[
  {
    "title": "A Word Carrying More Weight",
    "text": "Sentence one. Sentence two. Sentence three. Sentence four."
  }
]
`.trim();
}

function parseInsights(raw: string): InsightItem[] | null {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return null;

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

  if (start === -1 || end === -1 || end <= start) return null;
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
    const { reference, verseText, targetLanguage } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const safeReference = String(reference ?? "").trim() || "Unknown reference";
    const safeVerseText = String(verseText ?? "").trim();

    if (!safeVerseText) {
      return NextResponse.json({ error: "verseText is required." }, { status: 400 });
    }

    const safeLanguage: SupportedLanguage =
      targetLanguage === "ru" ||
      targetLanguage === "es" ||
      targetLanguage === "fr" ||
      targetLanguage === "de"
        ? targetLanguage
        : "en";

    const prompt = buildPrompt(safeReference, safeVerseText, safeLanguage);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: [{ role: "user", content: prompt }],
        max_output_tokens: 2200,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed.", raw: responseText || "Empty OpenAI error response" },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText);
    const rawText = extractOpenAIText(data);

    let cards = parseInsights(rawText);

    if (!cards) {
      const extracted = extractJsonArray(rawText);
      if (extracted) cards = parseInsights(extracted);
    }

    if (!cards) {
      return NextResponse.json(
        { error: "Failed to parse Word lens JSON.", raw: rawText || "Empty model response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference: safeReference,
      verseText: safeVerseText,
      targetLanguage: safeLanguage,
      cards,
    });
  } catch (error) {
    console.error("Word lens API error:", error);
    return NextResponse.json(
      { error: "Something went wrong while generating Word lens cards." },
      { status: 500 }
    );
  }
}
