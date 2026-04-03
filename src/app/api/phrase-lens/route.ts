import { NextResponse } from "next/server";

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
You are an elite generator of close-reading Bible insight cards for the Why This Phrase lens.

Your task is to produce 5-7 distinct cards based on ONE verse.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

WHY THIS PHRASE LENS DEFINITION:
This lens asks why the verse is phrased in this exact way rather than in a simpler, flatter, or more expected way.

CORE RULE:
Every card must focus on form, phrasing, wording shape, or rhetorical construction.
Do not drift into generic commentary.

VALID ANGLES MAY INCLUDE:
- why this phrase carries more force than a simpler alternative
- why this wording slows the reader down
- why the verse chooses this image, construction, or verbal turn
- what would be lost if the phrase were rewritten more plainly
- how the shape of the sentence creates meaning
- how phrasing controls emphasis, tone, pressure, or direction

DO:
- Stay anchored in the actual wording of the verse
- Treat phrasing as meaningful, not decorative
- Make each card distinct
- Explain why the phrase matters, not just that it sounds interesting

DO NOT:
- Invent hidden codes
- Drift into generic theology
- Produce mere paraphrases
- Use original-language trivia unless absolutely necessary
- Create artificial depth without textual grounding

QUALITY TEST:
A strong card should make the reader feel:
"this exact phrasing is doing real work."

EACH CARD MUST:
- Be anchored in a specific phrase, wording turn, or sentence shape
- Explain why this phrasing matters
- Show what the phrasing adds that a simpler version would lose
- Be 3-5 sentences long

STYLE:
- Modern
- Intelligent
- Precise
- Controlled
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
    "title": "A Phrase Doing More Than It Seems",
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

    const safeReference = String(reference ?? "").trim() || "Unknown reference";
    const safeVerseText = String(verseText ?? "").trim();

    if (!safeVerseText) {
      return NextResponse.json(
        { error: "verseText is required." },
        { status: 400 }
      );
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
          error: "Failed to parse Phrase lens JSON.",
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
    console.error("Phrase Lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Phrase lens cards.",
      },
      { status: 500 }
    );
  }
}
