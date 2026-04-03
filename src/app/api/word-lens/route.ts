import { NextResponse } from "next/server";
import { getVerseText } from "@/lib/bible/getVerseText";

type InsightItem = {
  title: string;
  text: string;
};

function buildPrompt(
  reference: string,
  verseText: string,
  targetLanguage: "en" | "ru" | "es" = "en"
) {
  const languageInstruction =
    targetLanguage === "ru"
      ? "Write the full output in Russian."
      : targetLanguage === "es"
        ? "Write the full output in Spanish."
        : "Write the full output in English.";

  return `
You are an elite generator of close-reading Bible insight cards for the Word Lens.

Your task is to produce 6-8 distinct cards based on ONE verse.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

WORD LENS DEFINITION:
This lens focuses on the hidden weight of words, short phrases, particles, grammatical pivots, verbal force, and meaningful small textual units.

CORE RULE:
Stay close to the wording of the verse itself.

DO:
- Focus on one word, short phrase, contrast, repetition, grammatical turn, or small textual feature
- Show why that detail matters
- Produce observations that feel precise, anchored, and worth noticing
- Make each card meaningfully different from the others

DO NOT:
- Drift into generic commentary
- Turn every card into Greek/Hebrew trivia
- Build cards on the whole beauty of the verse in general
- Explain broad context unless it directly clarifies the chosen word or phrase
- Invent details not grounded in the verse text

QUALITY FILTER:
A good Word Lens card should feel like:
"there is more weight in this small textual detail than the reader first notices."

EACH CARD MUST:
- Be anchored in a specific textual feature
- Stay at the level of lexical/small-unit close reading
- Be clear, sharp, and self-contained
- Be 3-5 sentences long

STYLE:
- Modern
- Intelligent
- Precise
- Readable
- No preaching tone
- No clichés
- No filler

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Each item must have:
  - "title": short and sharp
  - "text": 3-5 sentences

Example:
[
  {
    "title": "A Small Word With Force",
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
    const { reference, verseText, targetLanguage } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    let safeReference = String(reference ?? "").trim();
    let safeVerseText = String(verseText ?? "").trim();

    if (!safeVerseText) {
      return NextResponse.json(
        { error: "verseText is required." },
        { status: 400 }
      );
    }

    if (!safeReference) {
      safeReference = "Unknown reference";
    }

    const safeLanguage: "en" | "ru" | "es" =
      targetLanguage === "ru" || targetLanguage === "es" ? targetLanguage : "en";

    const prompt = buildPrompt(safeReference, safeVerseText, safeLanguage);

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
        max_output_tokens: 2200,
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

    let cards = parseInsights(rawText);

    if (!cards) {
      const extracted = extractJsonArray(rawText);
      if (extracted) {
        cards = parseInsights(extracted);
      }
    }

    if (!cards) {
      return NextResponse.json(
        {
          error: "Failed to parse Word lens JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference: safeReference,
      verseText: safeVerseText,
      targetLanguage: safeLanguage,
      count: cards.length,
      cards,
    });
  } catch (error) {
    console.error("Word Lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Word lens cards.",
      },
      { status: 500 }
    );
  }
}
