import { NextResponse } from "next/server";
import { getVerseText } from "@/lib/bible/getVerseText";
import { runModel } from "@/lib/ai/run-model";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupportedLanguage = "en" | "ru" | "es" | "fr" | "de";

type InsightItem = {
  title: string;
  text: string;
};

type CuratedInsightRow = {
  id: string;
  mode: "insights" | "word" | "tension" | "why_this_phrase";
  title_en: string | null;
  text_en: string | null;
  title_ru: string | null;
  text_ru: string | null;
  title_es: string | null;
  text_es: string | null;
  title_fr: string | null;
  text_fr: string | null;
  title_de: string | null;
  text_de: string | null;
  angle_note: string | null;
  status: "draft" | "saved" | "hidden";
  created_at: string;
};

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === "ru") {
    return `
Write the full output in Russian.
Every title and every card text must be fully in Russian.
Do not use English in the final answer.
`;
  }

  if (targetLanguage === "es") {
    return `
Write the full output in Spanish.
Every title and every card text must be fully in Spanish.
Do not use English in the final answer.
`;
  }

  if (targetLanguage === "fr") {
    return `
Write the full output in French.
Every title and every card text must be fully in French.
Do not use English in the final answer.
`;
  }

  if (targetLanguage === "de") {
    return `
Write the full output in German.
Every title and every card text must be fully in German.
Do not use English in the final answer.
`;
  }

  return `
Write the full output in English.
Every title and every card text must be fully in English.
`;
}

function pickLocalizedValue(
  row: CuratedInsightRow,
  targetLanguage: SupportedLanguage
): InsightItem | null {
  const title =
    targetLanguage === "ru"
      ? row.title_ru
      : targetLanguage === "es"
        ? row.title_es
        : targetLanguage === "fr"
          ? row.title_fr
          : targetLanguage === "de"
            ? row.title_de
            : row.title_en;

  const text =
    targetLanguage === "ru"
      ? row.text_ru
      : targetLanguage === "es"
        ? row.text_es
        : targetLanguage === "fr"
          ? row.text_fr
          : targetLanguage === "de"
            ? row.text_de
            : row.text_en;

  if (!title?.trim() || !text?.trim()) {
    return null;
  }

  return {
    title: title.trim(),
    text: text.trim(),
  };
}

function buildAvoidRepeatsBlock(savedRows: CuratedInsightRow[]) {
  if (!savedRows.length) {
    return `
NO SAVED INSIGHTS YET:
You are generating the full set from scratch.
`.trim();
  }

  const lines = savedRows
    .map((row, index) => {
      const baseTitle =
        row.title_en?.trim() ||
        row.title_ru?.trim() ||
        row.title_es?.trim() ||
        row.title_fr?.trim() ||
        row.title_de?.trim() ||
        "Untitled";

      const baseText =
        row.text_en?.trim() ||
        row.text_ru?.trim() ||
        row.text_es?.trim() ||
        row.text_fr?.trim() ||
        row.text_de?.trim() ||
        "";

      return `${index + 1}. MODE: ${row.mode}
TITLE: ${baseTitle}
ANGLE NOTE: ${row.angle_note ?? ""}
TEXT: ${baseText}`;
    })
    .join("\n\n");

  return `
ALREADY SAVED INSIGHTS:
The following cards are already saved for this verse.

${lines}

CRITICAL NON-DUPLICATION RULE:
- Do not regenerate the same angle.
- Do not paraphrase any saved card.
- Do not produce a card that substantially overlaps a saved card.
- Search for fresh, clearly different angles only.
`.trim();
}

function buildPrompt(params: {
  reference: string;
  verseText: string;
  focusWord?: string;
  count: number;
  targetLanguage: SupportedLanguage;
  savedRows: CuratedInsightRow[];
}) {
  const focusBlock = params.focusWord?.trim()
    ? `
FOCUS MODE:
Pay special attention to this word or phrase:
"${params.focusWord.trim()}"

If possible, let many of the insights revolve around that focal point from different angles.
`
    : `
FOCUS MODE:
No specific word or phrase was provided.
Generate insights based on the verse as a whole.
`;

  const avoidRepeatsBlock = buildAvoidRepeatsBlock(params.savedRows);

  return `
You are an elite generator of biblical insight cards.

Your task is to produce ${params.count} distinct, non-obvious, high-value insight cards based on this Bible verse.

REFERENCE:
${params.reference}

VERSE TEXT:
${params.verseText}

${languageInstruction(params.targetLanguage)}

CORE PRINCIPLE:
This is not commentary.
This is not summary.
This is not preaching.
This is discovery.

CRITICAL ACCURACY RULES:
- Base your insights on the verse text provided above
- Do not attribute words or phrases to the verse if they do not appear in the verse text
- Do not blend in wording from nearby verses unless clearly marked as wider context
- If a point depends on broader context, make that explicit
- Stay anchored in this specific verse

AUDIENCE:
Thoughtful, scripture-literate adult readers who value depth, precision, and fresh angles.

PRIMARY GOAL:
Generate insights that feel rare, sharp, and worth saving.

QUALITY STANDARD:
- Avoid obvious observations
- Avoid generic spiritual language
- Avoid clichés
- Avoid repeating the same idea in different words
- Each card must reveal a different angle, tension, contrast, pattern, or implication
- Do not produce insights that could fit almost any verse

DIVERSITY RULE:
Across the full set, vary the type of insight. Draw from different angles such as:
- a surprising wording detail
- an inner tension in the verse
- a hidden contrast
- context that changes the emotional force
- a structural or rhetorical feature
- an unexpected implication
- a paradox
- a practical implication that is not immediately obvious
- a focus on one striking word or phrase
- an insight based on what the verse does NOT say but the reader might expect

${focusBlock}

${avoidRepeatsBlock}

STYLE:
- Clear
- Modern
- Intelligent
- Concise but vivid
- Memorable without sounding dramatic
- No religious clichés
- No vague abstraction

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Each item must have:
  - "title": short, sharp, intriguing
  - "text": 4-5 sentences, tightly written, readable, and self-contained

Example:
[
  {
    "title": "The Detail That Slows the Verse Down",
    "text": "Sentence one. Sentence two. Sentence three. Sentence four."
  }
]
`.trim();
}

function parseInsights(raw: string): InsightItem[] | null {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? "").trim(),
        text: String(item.text ?? "").trim(),
      }))
      .filter((item) => item.title && item.text);

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

async function loadSavedInsights(params: {
  book: string;
  chapter: number;
  verse: number;
  targetLanguage: SupportedLanguage;
}): Promise<{ localized: InsightItem[]; rows: CuratedInsightRow[] }> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("curated_insights")
    .select(
      `
      id,
      mode,
      title_en,
      text_en,
      title_ru,
      text_ru,
      title_es,
      text_es,
      title_fr,
      text_fr,
      title_de,
      text_de,
      angle_note,
      status,
      created_at
    `
    )
    .eq("book", params.book.toLowerCase())
    .eq("chapter", params.chapter)
    .eq("verse", params.verse)
    .eq("status", "saved")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load curated insights: ${error.message}`);
  }

  const rows = (data ?? []) as CuratedInsightRow[];

  const localized = rows
    .map((row) => pickLocalizedValue(row, params.targetLanguage))
    .filter(Boolean) as InsightItem[];

  return { localized, rows };
}

export async function POST(req: Request) {
  try {
    const {
      book,
      chapter,
      verse,
      focusWord,
      count,
      targetLanguage,
    } = await req.json();

    if (!book || !chapter || !verse) {
      return NextResponse.json(
        { error: "book, chapter, and verse are required." },
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

    const safeBook = String(book).trim();
    const safeChapter = Number(chapter);
    const safeVerse = Number(verse);

    const verseText = await getVerseText(safeBook, safeChapter, safeVerse);

    if (!verseText) {
      return NextResponse.json(
        { error: "Failed to load verse text from WEB API." },
        { status: 500 }
      );
    }

    const reference = `${safeBook} ${safeChapter}:${safeVerse}`;
    const safeCount = Math.min(Math.max(Number(count ?? 12), 1), 20);

    const { localized: savedInsights, rows: savedRows } = await loadSavedInsights({
      book: safeBook,
      chapter: safeChapter,
      verse: safeVerse,
      targetLanguage: safeLanguage,
    });

    const remainingCount = Math.max(safeCount - savedInsights.length, 0);

    let generatedInsights: InsightItem[] = [];

    if (remainingCount > 0) {
      const prompt = buildPrompt({
        reference,
        verseText,
        focusWord,
        count: remainingCount,
        targetLanguage: safeLanguage,
        savedRows,
      });

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
            savedInsights,
            savedCount: savedInsights.length,
            generatedCount: 0,
          },
          { status: 500 }
        );
      }

      const rawText = result.rawText;

      let parsed = parseInsights(rawText);

      if (!parsed) {
        const extracted = extractJsonArray(rawText);
        if (extracted) {
          parsed = parseInsights(extracted);
        }
      }

      if (!parsed) {
        return NextResponse.json(
          {
            error: "Failed to parse insights JSON.",
            raw: rawText || "Empty model response",
            savedInsights,
            savedCount: savedInsights.length,
            generatedCount: 0,
          },
          { status: 500 }
        );
      }

      generatedInsights = parsed.slice(0, remainingCount);
    }

    const insights = [...savedInsights, ...generatedInsights];

    return NextResponse.json({
      reference,
      verseText,
      focusWord: focusWord ?? "",
      targetLanguage: safeLanguage,

      savedCount: savedInsights.length,
      generatedCount: generatedInsights.length,
      count: insights.length,

      savedInsights,
      generatedInsights,
      insights,
    });
  } catch (error) {
    console.error("Insights API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating insights.",
      },
      { status: 500 }
    );
  }
}
