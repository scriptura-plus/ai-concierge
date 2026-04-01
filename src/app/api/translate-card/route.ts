import { NextResponse } from "next/server";

type LanguageOption = "ru" | "es";

type TranslateCardRequest = {
  title?: string;
  text?: string;
  targetLanguage?: LanguageOption;
};

function buildTranslationPrompt(
  title: string,
  text: string,
  targetLanguage: LanguageOption
) {
  const languageName = targetLanguage === "ru" ? "Russian" : "Spanish";

  return `
You are a precise translator for a Bible insight card app.

Translate the following insight card into ${languageName}.

RULES:
- Preserve the meaning exactly
- Preserve the tone and sharpness
- Do not add new ideas
- Do not shorten unnecessarily
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary
- Output must be exactly one JSON object with:
  - "title"
  - "text"

INPUT CARD:
{
  "title": ${JSON.stringify(title)},
  "text": ${JSON.stringify(text)}
}
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

function parseTranslatedCard(raw: string): { title: string; text: string } | null {
  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const title = String(parsed.title ?? "").trim();
    const text = String(parsed.text ?? "").trim();

    if (!title || !text) {
      return null;
    }

    return { title, text };
  } catch {
    return null;
  }
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
    const body = (await req.json()) as TranslateCardRequest;
    const title = body.title?.trim();
    const text = body.text?.trim();
    const targetLanguage = body.targetLanguage;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    if (!title || !text) {
      return NextResponse.json(
        { error: "title and text are required." },
        { status: 400 }
      );
    }

    if (targetLanguage !== "ru" && targetLanguage !== "es") {
      return NextResponse.json(
        { error: "targetLanguage must be 'ru' or 'es'." },
        { status: 400 }
      );
    }

    const prompt = buildTranslationPrompt(title, text, targetLanguage);

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
        max_output_tokens: 1200,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "OpenAI translation request failed.",
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

    let translated = parseTranslatedCard(rawText);

    if (!translated) {
      const extracted = extractJsonObject(rawText);
      if (extracted) {
        translated = parseTranslatedCard(extracted);
      }
    }

    if (!translated) {
      return NextResponse.json(
        {
          error: "Failed to parse translated card JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      targetLanguage,
      card: translated,
    });
  } catch (error) {
    console.error("Translate card API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while translating the card.",
      },
      { status: 500 }
    );
  }
}
