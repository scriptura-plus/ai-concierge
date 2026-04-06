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
Every title and every card text must be fully in Russian.
Do not use English in the final answer.
`
      : targetLanguage === "es"
        ? `
Write the full output in Spanish.
Every title and every card text must be fully in Spanish.
Do not use English in the final answer.
`
        : targetLanguage === "fr"
          ? `
Write the full output in French.
Every title and every card text must be fully in French.
Do not use English in the final answer.
`
          : targetLanguage === "de"
            ? `
Write the full output in German.
Every title and every card text must be fully in German.
Do not use English in the final answer.
`
            : `
Write the full output in English.
Every title and every card text must be fully in English.
`;

  return `
You are an elite close-reading analyst for Bible verses.

MODE:
Tension Lens

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

${languageInstruction}

TASK:
Generate a focused set of insight cards that read this verse through the lens of TENSION.

CORE QUESTION:
What is internally unexpected, paradoxical, contrastive, compressed, or quietly disruptive inside this verse?

WHAT TO LOOK FOR:
- inner contrast
- hidden paradox
- surprising adjacency of ideas
- pressure between expectation and wording
- emotional or logical tension
- compact statements with destabilizing force
- places where the verse says less than expected, or says it in a sharper way than expected
- wording that creates unresolved productive pressure

IMPORTANT:
This is not a translation comparison block.
This is not a context article.
This is not preaching.
This is a tension-focused card set.

QUALITY STANDARD:
- produce distinct cards, not paraphrases of the same point
- each card should isolate a different tension, contrast, paradox, or surprise
- avoid generic devotional language
- stay anchored in the actual wording and force of this verse
- do not invent drama that the verse does not support
- make the cards feel sharp, surprising, and insight-heavy

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
    "title": "A Verse Pulling in Two Directions",
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
  const sample = text.slice(0, 1000);
  const matches = sample.match(/[А-Яа-яЁё]/g) ?? [];
  return matches.length >= 12;
}

function looksSpanish(text: string): boolean {
  const sample = text.toLowerCase().slice(0, 1200);
  return /(\b(el|la|los|las|una|uno|que|pero|como|porque|mientras)\b|[áéíóúñ])/i.test(sample);
}

function looksFrench(text: string): boolean {
  const sample = text.toLowerCase().slice(0, 1200);
  return /(\b(le|la|les|des|une|que|mais|dans|avec|sans)\b|[àâçéèêëîïôûùüÿœ])/i.test(sample);
}

function looksGerman(text: string): boolean {
  const sample = text.toLowerCase().slice(0, 1200);
  return /(\b(der|die|das|und|aber|nicht|mit|ohne|eine|einer)\b|[äöüß])/i.test(sample);
}

function cardsMatchLanguage(cards: LensCard[], targetLanguage: SupportedLanguage): boolean {
  const joined = cards.map((card) => `${card.title} ${card.text}`).join(" ");

  if (targetLanguage === "ru") return looksRussian(joined);
  if (targetLanguage === "es") return looksSpanish(joined);
  if (targetLanguage === "fr") return looksFrench(joined);
  if (targetLanguage === "de") return looksGerman(joined);

  return !looksRussian(joined);
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
          error: "Failed to parse Tension lens JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    if (!cardsMatchLanguage(cards, safeLanguage)) {
      return NextResponse.json(
        {
          error: `Model did not return ${safeLanguage} content for Tension lens.`,
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
    console.error("Tension lens API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating Tension lens.",
      },
      { status: 500 }
    );
  }
}
