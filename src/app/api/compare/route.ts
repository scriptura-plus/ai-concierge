import { NextResponse } from "next/server";

type ComparePoint = {
  title: string;
  text: string;
};

type ComparePayload = {
  lead: string;
  points: ComparePoint[];
  takeaway: string;
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
You are an elite Bible translation-comparison analyst.

Your task is to generate a compact, high-value Compare reading for ONE verse.

REFERENCE:
${reference}

BASE VERSE TEXT:
${verseText}

${languageInstruction}

MISSION:
Create a structured comparison mode output for this verse.

IMPORTANT:
This is NOT a card generator.
This is NOT a commentary.
This is NOT preaching.
This is a focused comparison of translation wording choices and the meaning shifts they create.

CORE PRINCIPLE:
Look for real translation-sensitive differences such as:
- wording choice
- explanatory vs direct phrasing
- formal vs dynamic rendering
- process vs state
- tone or emotional register
- rhetorical compression vs expansion
- poetic density
- sentence shape
- shift in emphasis
- semantic narrowing or widening

DO:
- Surface only load-bearing differences
- Stay close to wording and phrasing
- Show why the difference matters for reading
- Be compact and disciplined
- Keep the whole output readable on a mobile screen

DO NOT:
- Invent differences that are not meaningful
- Force doctrinal conflict when it is not really there
- Produce vague filler
- Turn this into a sermon
- Over-explain
- Use bullet points in the output JSON text
- Use markdown

FORMAT:
Return ONE JSON object with this exact structure:
{
  "lead": "2-4 sentences",
  "points": [
    {
      "title": "short sharp label",
      "text": "3-5 sentences"
    }
  ],
  "takeaway": "2-4 sentences"
}

RULES FOR CONTENT:
- lead: explain what kind of comparison this verse invites
- points: produce exactly 4 points
- each point must identify one meaningful comparison axis
- each point title should be compact and distinctive
- takeaway: gather the result into one clear final reading
- every paragraph must be precise and readable
- no markdown
- no code fences
- no commentary outside JSON

QUALITY TEST:
The reader should feel:
"I now understand what kind of translation pressure lives inside this verse."

`.trim();
}

function isValidComparePayload(data: any): data is ComparePayload {
  return (
    data &&
    typeof data === "object" &&
    typeof data.lead === "string" &&
    Array.isArray(data.points) &&
    data.points.length > 0 &&
    data.points.every(
      (item: any) =>
        item &&
        typeof item === "object" &&
        typeof item.title === "string" &&
        typeof item.text === "string"
    ) &&
    typeof data.takeaway === "string"
  );
}

function cleanComparePayload(data: any): ComparePayload | null {
  if (!isValidComparePayload(data)) return null;

  const lead = data.lead.trim();
  const takeaway = data.takeaway.trim();

  const points = data.points
    .map((item: any) => ({
      title: String(item.title ?? "").trim(),
      text: String(item.text ?? "").trim(),
    }))
    .filter((item: ComparePoint) => item.title && item.text)
    .slice(0, 4);

  if (!lead || !takeaway || points.length === 0) {
    return null;
  }

  return {
    lead,
    points,
    takeaway,
  };
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

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
        max_output_tokens: 2600,
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

    let payload: ComparePayload | null = null;

    try {
      payload = cleanComparePayload(JSON.parse(rawText));
    } catch {
      payload = null;
    }

    if (!payload) {
      const extracted = extractJsonObject(rawText);
      if (extracted) {
        try {
          payload = cleanComparePayload(JSON.parse(extracted));
        } catch {
          payload = null;
        }
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          error: "Failed to parse Compare JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference: safeReference,
      verseText: safeVerseText,
      targetLanguage: safeLanguage,
      compare: payload,
    });
  } catch (error) {
    console.error("Compare API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Compare mode.",
      },
      { status: 500 }
    );
  }
}
