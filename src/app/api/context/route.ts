import { NextResponse } from "next/server";
import { runModel } from "@/lib/ai/run-model";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type ContextPoint = {
  title: string;
  text: string;
};

type ContextPayload = {
  lead: string;
  points: ContextPoint[];
  takeaway: string;
};

function buildPrompt(
  reference: string,
  verseText: string,
  targetLanguage: SupportedLanguage = "en"
) {
  const languageInstruction =
    targetLanguage === "ru"
      ? `
Write the full output in Russian.
Every field must be in Russian:
- lead
- every point.title
- every point.text
- takeaway

Do not use English for the final answer.
Do not leave headings or prose in English.
`
      : targetLanguage === "es"
        ? `
Write the full output in Spanish.
Every field must be in Spanish.
Do not use English for the final answer.
`
        : targetLanguage === "fr"
          ? `
Write the full output in French.
Every field must be in French.
Do not use English for the final answer.
`
          : targetLanguage === "de"
            ? `
Write the full output in German.
Every field must be in German.
Do not use English for the final answer.
`
            : `
Write the full output in English.
`;

  return `
You are an elite Bible context analyst.

Your task is to generate a compact, high-value Context reading for ONE verse.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

MISSION:
Create a structured Context mode output for this verse.

IMPORTANT:
This is NOT an encyclopedia entry.
This is NOT a broad chapter summary.
This is NOT a sermon.
This is a selective reading aid.

CORE QUESTION:
What does a reader most need to know in order to read THIS verse more accurately and more deeply?

PRIORITY:
Surface only the context that materially changes or sharpens the reading of the verse.

GOOD CONTEXT TYPES:
- argument flow
- speaker / audience relation
- immediate literary movement
- contrast with nearby lines
- narrative pressure
- emotional situation
- covenantal or prophetic frame
- rhetorical structure
- why this verse lands where it does
- what the reader would likely miss without context

STYLE RULES:
- neutral
- restrained
- text-anchored
- analytical
- readable
- compact
- intellectually clear
- lightly journal-like, but not dramatic

VERY IMPORTANT STYLE RESTRICTIONS:
- avoid doctrinally loaded Christian stock phrasing
- avoid sermon language
- avoid generic church vocabulary
- do not introduce "cross" language unless explicitly present in the supplied verse/context
- do not introduce confessional wording unless explicitly present in the supplied verse/context
- prefer neutral wording like:
  "in this statement"
  "in this prayer"
  "in this argument"
  "in the immediate flow"
  "in the surrounding movement"
- do not speak as a preacher or theologian
- speak like a careful literary-context analyst

DO:
- be selective
- stay close to this verse
- explain why each context point matters
- make the result readable on a mobile screen
- use compact, disciplined paragraphs

DO NOT:
- dump general background
- give a whole-book survey
- over-explain
- drift into preaching
- pad with vague abstractions
- use markdown
- use commentary outside JSON

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
- lead: identify what kind of context matters most here
- points: produce exactly 4 points
- each point should isolate one load-bearing context factor
- each point title should be compact and distinctive
- takeaway: gather the context into one clear reading shift
- every paragraph must be precise and readable
- no markdown
- no code fences
- no commentary outside JSON
`.trim();
}

function isValidContextPayload(data: any): data is ContextPayload {
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

function cleanContextPayload(data: any): ContextPayload | null {
  if (!isValidContextPayload(data)) return null;

  const lead = data.lead.trim();
  const takeaway = data.takeaway.trim();

  const points = data.points
    .map((item: any) => ({
      title: String(item.title ?? "").trim(),
      text: String(item.text ?? "").trim(),
    }))
    .filter((item: ContextPoint) => item.title && item.text)
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

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 500);
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? [];
  return cyrillicMatches.length >= 12;
}

function payloadLooksRussian(payload: ContextPayload): boolean {
  const joined = [
    payload.lead,
    payload.takeaway,
    ...payload.points.flatMap((point) => [point.title, point.text]),
  ].join(" ");
  return looksRussian(joined);
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
      maxOutputTokens: 2600,
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

    let payload: ContextPayload | null = null;

    try {
      payload = cleanContextPayload(JSON.parse(rawText));
    } catch {
      payload = null;
    }

    if (!payload) {
      const extracted = extractJsonObject(rawText);
      if (extracted) {
        try {
          payload = cleanContextPayload(JSON.parse(extracted));
        } catch {
          payload = null;
        }
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          error: "Failed to parse Context JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    if (safeLanguage === "ru" && !payloadLooksRussian(payload)) {
      return NextResponse.json(
        {
          error: "Model did not return Russian content for Russian Context mode.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reference: safeReference,
      verseText: safeVerseText,
      targetLanguage: safeLanguage,
      context: payload,
    });
  } catch (error) {
    console.error("Context API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Context mode.",
      },
      { status: 500 }
    );
  }
}
