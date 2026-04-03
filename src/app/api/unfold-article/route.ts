import { NextResponse } from "next/server";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type ArticlePayload = {
  title: string;
  lead: string;
  body: string[];
  quote?: string;
};

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === "ru") return "Write the full output in Russian.";
  if (targetLanguage === "es") return "Write the full output in Spanish.";
  if (targetLanguage === "fr") return "Write the full output in French.";
  if (targetLanguage === "de") return "Write the full output in German.";
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

export async function POST(req: Request) {
  try {
    const {
      reference,
      verseText,
      insightTitle,
      insightText,
      targetLanguage,
    } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: [{ role: "user", content: prompt }],
        max_output_tokens: 2600,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed.", raw: responseText || "Empty OpenAI error response" },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText);
    const rawText = extractOpenAIText(data);

    let article = parseArticle(rawText);

    if (!article) {
      const extracted = extractJsonObject(rawText);
      if (extracted) article = parseArticle(extracted);
    }

    if (!article) {
      return NextResponse.json(
        { error: "Failed to parse article JSON.", raw: rawText || "Empty model response" },
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
