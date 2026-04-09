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
NO SAVED EXPLORER CARDS YET:
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
ALREADY SAVED EXPLORER CARDS:
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

If helpful, let several cards orbit around this focal point from clearly different angles.
`
    : `
FOCUS MODE:
No specific word or phrase was provided.
Generate explorer cards based on the verse as a whole.
`;

  const avoidRepeatsBlock = buildAvoidRepeatsBlock(params.savedRows);

  return `
You are an elite generator of Bible verse explorer cards.

Your task is to produce ${params.count} distinct, non-obvious, high-value explorer cards based on this Bible verse.

REFERENCE:
${params.reference}

VERSE TEXT:
${params.verseText}

${languageInstruction(params.targetLanguage)}

CORE PRINCIPLE:
This is not commentary.
This is not summary.
This is not preaching.
This is not a polished final insight.
This is the opening stage of exploration.

WHAT AN EXPLORER CARD IS:
An explorer card surfaces one promising angle of reading.
It helps the reader notice one perspective, tension, wording feature, contrast, or implication worth unfolding further.
It should feel like an entry point into deeper reading, not the final destination.

CRITICAL ACCURACY RULES:
- Base every card on the verse text provided above
- Do not attribute words or phrases to the verse if they do not appear in the verse text
- Do not blend in wording from nearby verses unless clearly marked as wider context
- If a point depends on broader context, make that explicit
- Stay anchored in this specific verse

AUDIENCE:
Thoughtful, scripture-literate adult readers who value depth, precision, and fresh angles.

PRIMARY GOAL:
Generate cards that help the reader explore where to look next in the verse.

QUALITY STANDARD:
- Avoid obvious observations
- Avoid generic spiritual language
- Avoid clichés
- Avoid repeating the same idea in different words
- Each card must reveal a different angle, tension, contrast, pattern, or implication
- Do not produce cards that could fit almost any verse
- Do not sound like a finished sermon point
- Do not close the thought too neatly
- Leave strong forward motion toward Unfold

DIVERSITY RULE:
Across the full set, vary the type of angle. Draw from different directions such as:
- a surprising wording detail
- an inner tension in the verse
- a hidden contrast
- context that changes the emotional force
- a structural or rhetorical feature
- an unexpected implication
- a paradox
- a practical implication that is not immediately obvious
- a focus on one striking word or phrase
- an angle based on what the verse does NOT say but the reader might expect

${focusBlock}

${avoidRepeatsBlock}

STYLE:
- Clear
- Modern
- Intelligent
- Concise but vivid
- Exploratory rather than final
- No religious clichés
- No vague abstraction
- No dramatic overstatement

TITLE RULE:
The title should name the angle clearly and attractively.
It should feel like a doorway into a line of reading, not like a slogan or a clickbait headline.

TEXT RULE:
The text should be 3-4 sentences.
Sentence 1: name or frame the angle.
Sentence 2: show what in the verse supports that angle.
Sentence 3: explain why this angle matters for reading the verse.
Sentence 4 if needed: leave a sense of further depth still to unfold.

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Each item must have:
  - "title": short, clear, angle-oriented
  - "text": 3-4 sentences, readable, exploratory, and self-contained enough to stand alone while still inviting further unfolding

Example:
[
  {
    "title": "Knowledge as Relationship",
    "text": "This verse may be defining knowledge in relational rather than merely informational terms. The wording does not point first to quantity of facts, but to a kind of recognition bound up with knowing God and Christ. That changes the center of the verse from data to living connection. It also opens a deeper question about what kind of knowing the verse is really talking about."
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
    .schema("private")
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

    let savedInsights: InsightItem[] = [];
    let savedRows: CuratedInsightRow[] = [];

    try {
      const loaded = await loadSavedInsights({
        book: safeBook,
        chapter: safeChapter,
        verse: safeVerse,
        targetLanguage: safeLanguage,
      });

      savedInsights = loaded.localized;
      savedRows = loaded.rows;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `loadSavedInsights failed: ${error.message}`
              : "loadSavedInsights failed.",
          debug: {
            reference,
            safeBook,
            safeChapter,
            safeVerse,
            targetLanguage: safeLanguage,
          },
        },
        { status: 500 }
      );
    }

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
            error: result.error || "runModel failed.",
            raw: result.raw || "",
            debug: {
              stage: "runModel",
              reference,
              savedCount: savedInsights.length,
              remainingCount,
              targetLanguage: safeLanguage,
            },
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
            debug: {
              stage: "parseInsights",
              reference,
              savedCount: savedInsights.length,
              remainingCount,
              targetLanguage: safeLanguage,
            },
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
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating insights.",
      },
      { status: 500 }
    );
  }
}
