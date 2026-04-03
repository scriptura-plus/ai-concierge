import { NextResponse } from "next/server";
import { runModel } from "@/lib/ai/run-model";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type LensCard = {
  title: string;
  text: string;
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
You are an elite close-reading analyst for Bible verses.

MODE:
Word Lens

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

TASK:
Generate a focused set of insight cards that read this verse through the lens of WORD WEIGHT.

CORE QUESTION:
What carries unusual semantic force inside the words, expressions, particles, or verbal choices of this verse?

WHAT TO LOOK FOR:
- key words with hidden weight
- strong verbs
- meaningful small wording units
- expressions that carry more force than they first appear to
- subtle shades flattened by ordinary reading
- compressed wording with large implications
- notable lexical pressure inside the verse

IMPORTANT:
This is not a translation comparison block.
This is not a context article.
This is not preaching.
This is a word-weight card set.

QUALITY STANDARD:
- produce distinct cards, not paraphrases of the same point
- each card should isolate a different wording pressure point
- avoid generic devotional language
- stay close to the actual wording of this verse
- do not drift into broad theology unless clearly anchored in the verse
- make the cards feel sharp, intelligent, and worth saving

STYLE:
- compact
- modern
- precise
- vivid but controlled
- no clichés
- no filler
- no markdown

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Produce exactly 6 cards
- Each item must have:
  - "title": short, sharp, intriguing
  - "text": 4-5 sentences, tightly written, self-contained

EXAMPLE:
[
  {
    "title": "A Verb Doing More Than It Seems",
    "text": "Sentence one. Sentence two. Sentence three. Sentence four."
  }
]
`.trim();
}

function parseCards(raw: string): LensCard[] | null {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return null;

    const cleaned = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? "").trim(),
        text: String(item.text ?? "").trim(),
      }))
      .filter((item) => item.title && item.text)
      .slice(0, 6);

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

    let cards = parseCards(rawText);

    if (!cards) {
      const extracted = extractJsonArray(rawText);
      if (extracted) {
        cards = parseCards(extracted);
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
      cards,
    });
  } catch (error) {
    console.error("Word lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Word lens.",
      },
      { status: 500 }
    );
  }
}
