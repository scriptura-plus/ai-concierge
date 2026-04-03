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
      ? `
Write the full output in Russian.
Every field must be in Russian:
- every title
- every text block

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
You are an elite close-reading analyst for Bible verses.

MODE:
Why This Phrase Lens

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

TASK:
Generate a focused set of insight cards that read this verse through the lens of WHY THIS PHRASE.

CORE QUESTION:
Why is this verse phrased this way instead of in a flatter, more ordinary, or more expected way?

WHAT TO LOOK FOR:
- force of the whole phrase as a crafted construction
- why a specific expression is chosen
- rhetorical formula
- compact phrasing with unusual force
- choice of image or verbal shape
- why the verse sounds like this and not like a simpler paraphrase
- sentence architecture that creates meaning
- phrasing that does interpretive work by form, not just by content

IMPORTANT:
This is not a translation comparison block.
This is not a context article.
This is not preaching.
This is a close-reading phrase-form card set.

QUALITY STANDARD:
- produce distinct cards, not paraphrases of the same point
- each card should isolate a different phrasing choice, rhetorical move, or formal pressure point
- avoid generic devotional language
- stay anchored in the exact wording and shape of this verse
- do not flatten the verse into generic meaning
- make the cards feel precise, elegant, and insight-heavy

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
    "title": "A Phrase Doing More Than Explaining",
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

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 500);
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? [];
  return cyrillicMatches.length >= 12;
}

function cardsLookRussian(cards: LensCard[]): boolean {
  const joined = cards.flatMap((card) => [card.title, card.text]).join(" ");
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
          error: "Failed to parse Why This Phrase lens JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    if (safeLanguage === "ru" && !cardsLookRussian(cards)) {
      return NextResponse.json(
        {
          error: "Model did not return Russian content for Why This Phrase lens.",
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
    console.error("Why This Phrase lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Why This Phrase lens.",
      },
      { status: 500 }
    );
  }
}
