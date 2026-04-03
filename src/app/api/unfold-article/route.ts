import { NextResponse } from "next/server";
import { runModel } from "@/lib/ai/run-model";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type ArticlePayload = {
  title: string;
  lead: string;
  body: string[];
  quote?: string;
};

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === "ru") {
    return `
Write the full output in Russian.
Every field must be in Russian:
- title
- lead
- every body paragraph
- quote if present

Do not use English for the final answer.
Do not leave headings or prose in English.
`;
  }

  if (targetLanguage === "es") {
    return `
Write the full output in Spanish.
Every field must be in Spanish.
Do not use English for the final answer.
`;
  }

  if (targetLanguage === "fr") {
    return `
Write the full output in French.
Every field must be in French.
Do not use English for the final answer.
`;
  }

  if (targetLanguage === "de") {
    return `
Write the full output in German.
Every field must be in German.
Do not use English for the final answer.
`;
  }

  return "Write the full output in English.";
}

function buildPrompt(
  reference: string,
  verseText: string,
  insightTitle: string,
  insightText: string,
  targetLanguage: SupportedLanguage
) {
  return `
You are an elite writer of compact scholarly devotional-style mini-articles.

REFERENCE:
${reference}

VERSE TEXT:
${verseText}

INSIGHT TITLE:
${insightTitle}

INSIGHT TEXT:
${insightText}

${languageInstruction(targetLanguage)}

TASK:
Expand the insight into a polished mini-article.

RULES:
- Return ONLY valid JSON
- No markdown
- No commentary outside JSON
- Format:
{
  "title": "...",
  "lead": "...",
  "body": ["...", "...", "..."],
  "quote": "optional short line"
}

STYLE:
- Elegant
- Dense but readable
- Premium magazine feel
- Not preachy
- Not bloated
- Keep body to 3-5 paragraphs
`.trim();
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function parseArticle(raw: string): ArticlePayload | null {
  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string") return null;
    if (typeof parsed.lead !== "string") return null;
    if (!Array.isArray(parsed.body)) return null;

    const body = parsed.body
      .map((item: any) => String(item ?? "").trim())
      .filter(Boolean);

    if (!body.length) return null;

    return {
      title: String(parsed.title).trim(),
      lead: String(parsed.lead).trim(),
      body,
      quote: typeof parsed.quote === "string" ? parsed.quote.trim() : undefined,
    };
  } catch {
    return null;
  }
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 700);
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? [];
  return cyrillicMatches.length >= 12;
}

function articleLooksRussian(article: ArticlePayload): boolean {
  const joined = [
    article.title,
    article.lead,
    ...article.body,
    article.quote ?? "",
  ].join(" ");

  return looksRussian(joined);
}

export async function POST(req: Request) {
  try {
    const {
      reference,
      verseText,
      insightTitle,
      insightText,
      targetLanguage,
    } = await req.json();

    const safeReference = String(reference ?? "").trim() || "Unknown reference";
    const safeVerseText = String(verseText ?? "").trim();
    const safeInsightTitle = String(insightTitle ?? "").trim();
    const safeInsightText = String(insightText ?? "").trim();

    if (!safeVerseText || !safeInsightTitle || !safeInsightText) {
      return NextResponse.json(
        { error: "reference, verseText, insightTitle, and insightText are required." },
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

    const prompt = buildPrompt(
      safeReference,
      safeVerseText,
      safeInsightTitle,
      safeInsightText,
      safeLanguage
    );

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

    let article = parseArticle(rawText);

    if (!article) {
      const extracted = extractJsonObject(rawText);
      if (extracted) {
        article = parseArticle(extracted);
      }
    }

    if (!article) {
      return NextResponse.json(
        { error: "Failed to parse article JSON.", raw: rawText || "Empty model response" },
        { status: 500 }
      );
    }

    if (safeLanguage === "ru" && !articleLooksRussian(article)) {
      return NextResponse.json(
        {
          error: "Model did not return Russian content for article mode.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Unfold article API error:", error);
    return NextResponse.json(
      { error: "Something went wrong while generating the article." },
      { status: 500 }
    );
  }
}
