import { NextResponse } from "next/server";

type SupportedTargetLanguage = "ru" | "es" | "fr" | "de";

type TranslatePayload = {
  title: string;
  text: string;
  targetLanguage: SupportedTargetLanguage;
};

function getLanguageInstruction(targetLanguage: SupportedTargetLanguage) {
  if (targetLanguage === "ru") return "Translate into Russian.";
  if (targetLanguage === "es") return "Translate into Spanish.";
  if (targetLanguage === "fr") return "Translate into French.";
  return "Translate into German.";
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

function parseCard(raw: string) {
  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.title === "string" &&
      typeof parsed.text === "string"
    ) {
      return {
        title: parsed.title.trim(),
        text: parsed.text.trim(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    const text = String(body?.text ?? "").trim();
    const targetLanguage = body?.targetLanguage as SupportedTargetLanguage;

    if (!title || !text || !targetLanguage) {
      return NextResponse.json(
        { error: "title, text, and targetLanguage are required." },
        { status: 400 }
      );
    }

    if (!["ru", "es", "fr", "de"].includes(targetLanguage)) {
      return NextResponse.json(
        { error: "Unsupported targetLanguage." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const prompt = `
You are a precise literary translator.

Task:
Translate the following card into the requested target language.

Rules:
- Preserve meaning exactly
- Preserve the title / body structure
- Keep the style elegant and natural
- Do not explain
- Do not add commentary
- Return ONLY valid JSON
- No markdown
- Format:
{
  "title": "...",
  "text": "..."
}

${getLanguageInstruction(targetLanguage)}

TITLE:
${title}

TEXT:
${text}
`.trim();

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

    let card = parseCard(rawText);

    if (!card) {
      const extracted = extractJsonObject(rawText);
      if (extracted) {
        card = parseCard(extracted);
      }
    }

    if (!card) {
      return NextResponse.json(
        {
          error: "Failed to parse translation JSON.",
          raw: rawText || "Empty model response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      targetLanguage,
      card,
    });
  } catch (error) {
    console.error("Translate card API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while translating the card." },
      { status: 500 }
    );
  }
}
