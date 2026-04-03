import { NextResponse } from "next/server";
import { runModel } from "@/lib/ai/run-model";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type ComparePoint = {
  title: string;
  labelA: string;
  quoteA: string;
  labelB: string;
  quoteB: string;
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
  targetLanguage: SupportedLanguage = "en"
) {
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
This mode must SHOW the comparison, not merely describe it.

That means each comparison point must include:
- two short compared translation fragments
- short labels naming the translation line or version family
- a compact explanation of why the difference matters

LEGAL / FORMAT DISCIPLINE:
- Use only SHORT micro-quotations
- Each quoted fragment should normally be about 2-8 words
- Do not reproduce long verse quotations
- Do not paste multiple full translations
- Only quote the exact small wording units needed for comparison

WHAT TO LOOK FOR:
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
- Make the compared fragments feel visibly different

DO NOT:
- Invent differences that are not meaningful
- Force doctrinal conflict when it is not really there
- Produce vague filler
- Turn this into a sermon
- Over-explain
- Use markdown
- Use long quotations

FORMAT:
Return ONE JSON object with this exact structure:
{
  "lead": "2-4 sentences",
  "points": [
    {
      "title": "short sharp label",
      "labelA": "short source label",
      "quoteA": "very short quotation fragment",
      "labelB": "short source label",
      "quoteB": "very short quotation fragment",
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
- each point must include two visible compared fragments
- labels can be things like "NWT", "ESV/NASB", "Formal", "Dynamic", etc.
- takeaway: gather the result into one clear final reading
- every paragraph must be precise and readable
- no markdown
- no code fences
- no commentary outside JSON
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
        typeof item.labelA === "string" &&
        typeof item.quoteA === "string" &&
        typeof item.labelB === "string" &&
        typeof item.quoteB === "string" &&
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
      labelA: String(item.labelA ?? "").trim(),
      quoteA: String(item.quoteA ?? "").trim(),
      labelB: String(item.labelB ?? "").trim(),
      quoteB: String(item.quoteB ?? "").trim(),
      text: String(item.text ?? "").trim(),
    }))
    .filter(
      (item: ComparePoint) =>
        item.title &&
        item.labelA &&
        item.quoteA &&
        item.labelB &&
        item.quoteB &&
        item.text
    )
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

export async function POST(req: Request) {
  try {
    const { reference, verseText, targetLanguage } = await req.json();

    const safeReference = String(reference ?? "").trim() || "Unknown reference";
    const safeVerseText = String(verseText ?? "").trim();

    if (!safeVerseText) {
      return NextResponse.json(
        { error: "verseText is required." },
        { status: 400 }
      );
    }

    const safeLanguage: SupportedLanguage =
      targetLanguage === "ru" ||
      targetLanguage === "es" ||
      targetLanguage === "fr" ||
      targetLanguage === "de"
        ? targetLanguage
        : "en";

    const prompt = buildPrompt(safeReference, safeVerseText, safeLanguage);

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
