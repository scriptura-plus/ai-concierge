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
You are an elite generator of close-reading Bible insight cards for the Tension Lens.

Your task is to produce 5-7 distinct cards based on ONE verse.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

TENSION LENS DEFINITION:
This lens identifies where the verse contains real pressure, surprise, paradox, contrast, reversal, or inner instability.

CORE RULE:
Every card must localize the source of tension.
Do not merely say that the verse is “deep” or “paradoxical.”
Show where the tension actually lives.

VALID SOURCES OF TENSION MAY INCLUDE:
- a contrast between two words or phrases
- an unexpected verbal choice
- a surprising image
- a reversal of expected emphasis
- a pressure between what the reader expects and what the verse actually says
- a tension between surface simplicity and deeper force
- a tension between this verse and its immediate literary setting, if clearly stated

DO:
- Stay anchored in the wording of the verse
- Name the actual source of tension
- Make each card clearly different
- Produce sharp, text-rooted close reading

DO NOT:
- Invent contradictions
- Create artificial drama
- Produce vague “this is powerful” observations
- Drift into generic commentary
- Build cards on broad theology instead of textual pressure
- Use original-language trivia unless absolutely necessary

QUALITY TEST:
If the tension cannot be localized, the card should not exist.

EACH CARD MUST:
- Be anchored in a specific textual feature
- Explain what creates the tension
- Show why that tension matters
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
    "title": "Pressure Inside the Wording",
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
          error: "Failed to parse Tension lens JSON.",
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
    console.error("Tension Lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Tension lens cards.",
      },
      { status: 500 }
    );
  }
}
