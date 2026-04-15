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
  title: string | null;
  text: string | null;
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

type GeneratedCandidateRow = {
  id: string;
  title_ru: string | null;
  text_ru: string | null;
  candidate_status: string | null;
};

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === "ru") {
    return `
Write the full output in Russian.
Every title and every card text must be fully in Russian.
Do not use English in the final answer.
`.trim();
  }

  if (targetLanguage === "es") {
    return `
Write the full output in Spanish.
Every title and every card text must be fully in Spanish.
Do not use English in the final answer.
`.trim();
  }

  if (targetLanguage === "fr") {
    return `
Write the full output in French.
Every title and every card text must be fully in French.
Do not use English in the final answer.
`.trim();
  }

  if (targetLanguage === "de") {
    return `
Write the full output in German.
Every title and every card text must be fully in German.
Do not use English in the final answer.
`.trim();
  }

  return `
Write the full output in English.
Every title and every card text must be fully in English.
`.trim();
}

function pickLocalizedValue(
  row: CuratedInsightRow,
  targetLanguage: SupportedLanguage
): InsightItem | null {
  const fallbackTitle =
    row.title_en?.trim() ||
    row.title?.trim() ||
    row.title_ru?.trim() ||
    row.title_es?.trim() ||
    row.title_fr?.trim() ||
    row.title_de?.trim() ||
    "";

  const fallbackText =
    row.text_en?.trim() ||
    row.text?.trim() ||
    row.text_ru?.trim() ||
    row.text_es?.trim() ||
    row.text_fr?.trim() ||
    row.text_de?.trim() ||
    "";

  const title =
    targetLanguage === "ru"
      ? row.title_ru?.trim() || fallbackTitle
      : targetLanguage === "es"
        ? row.title_es?.trim() || fallbackTitle
        : targetLanguage === "fr"
          ? row.title_fr?.trim() || fallbackTitle
          : targetLanguage === "de"
            ? row.title_de?.trim() || fallbackTitle
            : row.title_en?.trim() || row.title?.trim() || fallbackTitle;

  const text =
    targetLanguage === "ru"
      ? row.text_ru?.trim() || fallbackText
      : targetLanguage === "es"
        ? row.text_es?.trim() || fallbackText
        : targetLanguage === "fr"
          ? row.text_fr?.trim() || fallbackText
          : targetLanguage === "de"
            ? row.text_de?.trim() || fallbackText
            : row.text_en?.trim() || row.text?.trim() || fallbackText;

  if (!title || !text) {
    return null;
  }

  return {
    title,
    text,
  };
}

function buildAvoidRepeatsBlock(savedRows: CuratedInsightRow[]) {
  if (!savedRows.length) {
    return `
NO SAVED CARDS YET:
You are generating the full set from scratch.
`.trim();
  }

  const lines = savedRows
    .map((row, index) => {
      const baseTitle =
        row.title_en?.trim() ||
        row.title?.trim() ||
        row.title_ru?.trim() ||
        row.title_es?.trim() ||
        row.title_fr?.trim() ||
        row.title_de?.trim() ||
        "Untitled";

      const baseText =
        row.text_en?.trim() ||
        row.text?.trim() ||
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
ALREADY SAVED CARDS:
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

One or more cards may orbit around this focal point, but each card must still reveal a clearly different angle.
Do not merely repeat the same point with different wording.
`.trim()
    : `
FOCUS MODE:
No specific word or phrase was provided.
Generate cards based on the verse as a whole.
`.trim();

  const avoidRepeatsBlock = buildAvoidRepeatsBlock(params.savedRows);

  return `
You are an elite generator of Bible verse cards for Scriptura+.

Your task is to produce ${params.count} distinct, non-obvious, high-value cards based on this Bible verse.

REFERENCE:
${params.reference}

VERSE TEXT:
${params.verseText}

${languageInstruction(params.targetLanguage)}

CORE IDENTITY OF THE OUTPUT:
These are not sermons.
These are not devotional comments.
These are not vague study notes.
These are not rough brainstorming fragments.

Each card must feel like a save-ready short insight:
- one strong angle
- one clear center of gravity
- compact, elegant packaging
- enough intellectual and stylistic force that a moderator often wants to save it immediately

The card should still invite deeper unfolding, but it must already feel finished as a short form.

CRITICAL ACCURACY RULES:
- Base every card on the verse text provided above
- Do not attribute words or phrases to the verse if they do not appear in the verse text
- Do not blend in wording from nearby verses unless clearly marked as wider context
- If a point depends on broader context, make that explicit
- Stay anchored in this specific verse

AUDIENCE:
Thoughtful, scripture-literate adult readers who value precision, depth, freshness, and memorable phrasing.

PRIMARY GOAL:
Find a strong angle in the verse and express it with enough clarity, shape, and force that the card already feels worth saving.

QUALITY STANDARD:
- Avoid obvious observations
- Avoid generic spiritual language
- Avoid clichés
- Avoid repeating the same idea in different words
- Each card must reveal a different angle, tension, contrast, pattern, or implication
- Do not produce cards that could fit almost any verse
- Do not sound like a sermon point
- Do not sound like a study-note template
- Do not sound like a polite ChatGPT explanation
- Do not close the thought with a bland moral or generic takeaway
- The card should feel alive, specific, and mentally gripping
- The card should have at least a light wow-effect through precision, turn of thought, or elegant phrasing
- Beauty should come from exactness and insight, not from decorative language

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

A STRONG CARD USUALLY DOES AT LEAST ONE OF THESE THINGS:
- shifts the reader's center of attention
- exposes an unnoticed tension
- reveals a hidden contrast
- shows why one phrase carries more weight than it first seems
- reframes an apparently obvious reading
- notices a structural move that changes how the verse lands

${focusBlock}

${avoidRepeatsBlock}

STYLE:
- Clear
- Modern
- Intelligent
- Compact but dense
- Elegant without sounding literary
- Controlled rather than dramatic
- Specific rather than abstract
- Readable, but not flat

ANTI-BLAND RULES:
Avoid empty lead-ins and generic framing such as:
- "This verse shows..."
- "Here we see..."
- "This reminds us..."
- "The text teaches..."
- "This opens a deeper meaning..."
unless the sentence carries real, specific analytical movement.
Do not write in a school-outline rhythm.
Do not let two consecutive sentences do the same job.

TITLE RULE:
The title must capture the specific turn of the angle.
It should feel sharp, memorable, and worth saving.
Avoid vague abstractions, bland theological nouns, and titles that sound like section headers.
Do not use titles that could fit dozens of unrelated verses.

TEXT RULE:
- The text should be 4-5 sentences.
- The whole card must hold one clear center of gravity.
- The card must not feel like a note or an outline; it must feel like a complete short insight.
- Sentence by sentence, the thought must move forward rather than repeat itself.
- The card should contain at least one sentence that feels precise, vivid, or unexpectedly well-turned.
- The last sentence should leave depth, pressure, or resonance — not a bland conclusion.
- The card should be short enough to read quickly but strong enough to save immediately.

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array
- Each item must have:
  - "title": short, sharp, angle-oriented
  - "text": 4-5 sentences, readable, elegant, and save-ready

Example:
[
  {
    "title": "Knowledge as Relationship",
    "text": "This verse may be defining knowledge in relational rather than merely informational terms. The wording does not point first to quantity of facts, but to a kind of recognition bound up with knowing God and Christ. That shifts the center of the verse from data to living connection. Eternal life is therefore tied not simply to what is understood, but to whom one is bound. The verse leaves the reader asking what kind of knowing can carry that much weight."
  }
]
`.trim();
}

function buildRussianTranslationPrompt(items: InsightItem[]) {
  const payload = items.map((item, index) => ({
    index,
    title: item.title,
    text: item.text,
  }));

  return `
Translate the following Bible cards into natural Russian for moderator working-layer candidates.

CRITICAL RULES:
- Preserve the exact same angle and structure of thought.
- Do not add new ideas.
- Do not compress the meaning.
- Keep the title sharp and readable.
- Keep the text natural Russian, not robotic.
- Return ONLY valid JSON.
- Output must be an array with the same number of items and the same indexes.

INPUT:
${JSON.stringify(payload, null, 2)}

OUTPUT FORMAT:
[
  {
    "index": 0,
    "title": "...",
    "text": "..."
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

function parseTranslatedInsights(raw: string, expectedCount: number): InsightItem[] | null {
  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        index: Number(item.index),
        title: String(item.title ?? "").trim(),
        text: String(item.text ?? "").trim(),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.index) &&
          item.index >= 0 &&
          item.title &&
          item.text
      )
      .sort((a, b) => a.index - b.index);

    if (!cleaned.length) return null;
    if (cleaned.length !== expectedCount) return null;

    return cleaned.map((item) => ({
      title: item.title,
      text: item.text,
    }));
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

function normalizeTextForKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildCandidateSignature(title: string, text: string) {
  return `${normalizeTextForKey(title)}|||${normalizeTextForKey(text)}`;
}

function dedupeInsights(items: InsightItem[]) {
  const unique: InsightItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const title = item.title.trim();
    const text = item.text.trim();

    if (!title || !text) continue;
    if (text.length < 80) continue;

    const key = buildCandidateSignature(title, text);
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push({ title, text });
  }

  return unique;
}

function mergeUniqueInsights(existing: InsightItem[], incoming: InsightItem[]) {
  const seen = new Set(existing.map((item) => buildCandidateSignature(item.title, item.text)));
  const merged = [...existing];

  for (const item of incoming) {
    const key = buildCandidateSignature(item.title, item.text);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
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
      title,
      text,
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

async function loadExistingGeneratedCandidates(params: {
  book: string;
  chapter: number;
  verse: number;
}) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .schema("private")
    .from("generated_candidates")
    .select("id, title_ru, text_ru, candidate_status")
    .eq("book", params.book.toLowerCase())
    .eq("chapter", params.chapter)
    .eq("verse", params.verse)
    .neq("candidate_status", "trashed");

  if (error) {
    throw new Error(`Failed to load generated candidates: ${error.message}`);
  }

  return (data ?? []) as GeneratedCandidateRow[];
}

async function translateInsightsToRussian(items: InsightItem[]) {
  if (!items.length) return [];

  const prompt = buildRussianTranslationPrompt(items);

  const result = await runModel({
    prompt,
    model: "gpt-5.4-mini",
    maxOutputTokens: 3000,
  });

  if (!result.ok) {
    throw new Error(result.error || "Failed to translate generated insights to Russian.");
  }

  let parsed = parseTranslatedInsights(result.rawText, items.length);

  if (!parsed) {
    const extracted = extractJsonArray(result.rawText);
    if (extracted) {
      parsed = parseTranslatedInsights(extracted, items.length);
    }
  }

  if (!parsed) {
    throw new Error("Failed to parse Russian translations for generated insights.");
  }

  return dedupeInsights(parsed);
}

async function saveGeneratedCandidates(params: {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  focusWord?: string;
  generatedInsights: InsightItem[];
}) {
  if (!params.generatedInsights.length) {
    return { insertedCount: 0 };
  }

  const supabase = getSupabaseServerClient();
  const existingRows = await loadExistingGeneratedCandidates({
    book: params.book,
    chapter: params.chapter,
    verse: params.verse,
  });

  const existingKeys = new Set(
    existingRows
      .map((row) =>
        row.title_ru?.trim() && row.text_ru?.trim()
          ? buildCandidateSignature(row.title_ru, row.text_ru)
          : null
      )
      .filter(Boolean) as string[]
  );

  const deduped = dedupeInsights(params.generatedInsights);

  const freshItems = deduped.filter((item) => {
    const key = buildCandidateSignature(item.title, item.text);
    return !existingKeys.has(key);
  });

  if (!freshItems.length) {
    return { insertedCount: 0 };
  }

  const angleNote = params.focusWord?.trim()
    ? `Focus word: ${params.focusWord.trim()}`.slice(0, 500)
    : null;

  const insertPayload = freshItems.map((item) => ({
    verse_ref: params.reference,
    book: params.book.toLowerCase(),
    chapter: params.chapter,
    verse: params.verse,
    source_type: "user_request",
    candidate_status: "new",
    title_ru: item.title,
    text_ru: item.text,
    angle_note: angleNote,
    review_note: null,
  }));

  const { error } = await supabase
    .schema("private")
    .from("generated_candidates")
    .insert(insertPayload);

  if (error) {
    throw new Error(`Failed to save generated candidates: ${error.message}`);
  }

  return { insertedCount: insertPayload.length };
}

async function generateInsightsUntilFilled(params: {
  reference: string;
  verseText: string;
  focusWord?: string;
  targetLanguage: SupportedLanguage;
  savedRows: CuratedInsightRow[];
  targetCount: number;
}) {
  let collected: InsightItem[] = [];
  let lastRaw = "";
  const maxPasses = 3;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const remaining = params.targetCount - collected.length;
    if (remaining <= 0) break;

    const prompt = buildPrompt({
      reference: params.reference,
      verseText: params.verseText,
      focusWord: params.focusWord,
      count: remaining,
      targetLanguage: params.targetLanguage,
      savedRows: params.savedRows,
    });

    const result = await runModel({
      prompt,
      model: "gpt-5.4-mini",
      maxOutputTokens: 3200,
    });

    if (!result.ok) {
      throw new Error(result.error || "runModel failed.");
    }

    const rawText = result.rawText;
    lastRaw = rawText;

    let parsed = parseInsights(rawText);

    if (!parsed) {
      const extracted = extractJsonArray(rawText);
      if (extracted) {
        parsed = parseInsights(extracted);
      }
    }

    if (!parsed) {
      throw new Error("Failed to parse insights JSON.");
    }

    const cleaned = dedupeInsights(parsed);
    const merged = mergeUniqueInsights(collected, cleaned);

    if (merged.length === collected.length) {
      break;
    }

    collected = merged.slice(0, params.targetCount);
  }

  return {
    insights: collected.slice(0, params.targetCount),
    raw: lastRaw,
  };
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
    const safeCount = Math.min(Math.max(Number(count ?? 12), 0), 20);

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

    if (safeCount === 0) {
      return NextResponse.json({
        reference,
        verseText,
        focusWord: focusWord ?? "",
        targetLanguage: safeLanguage,
        savedCount: savedInsights.length,
        generatedCount: 0,
        insertedCandidateCount: 0,
        count: savedInsights.length,
        savedInsights,
        generatedInsights: [],
        insights: savedInsights,
      });
    }

    const remainingCount = Math.max(safeCount - savedInsights.length, 0);

    let generatedInsights: InsightItem[] = [];
    let insertedCandidateCount = 0;
    let generationRaw = "";

    if (remainingCount > 0) {
      try {
        const generated = await generateInsightsUntilFilled({
          reference,
          verseText,
          focusWord,
          targetLanguage: safeLanguage,
          savedRows,
          targetCount: remainingCount,
        });

        generatedInsights = generated.insights;
        generationRaw = generated.raw;
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to generate insights.",
            raw: generationRaw,
            debug: {
              stage: "generateInsightsUntilFilled",
              reference,
              savedCount: savedInsights.length,
              remainingCount,
              targetLanguage: safeLanguage,
            },
            savedInsights,
            savedCount: savedInsights.length,
            generatedCount: 0,
            insertedCandidateCount: 0,
          },
          { status: 500 }
        );
      }

      if (generatedInsights.length > 0) {
        try {
          let russianWorkingLayer: InsightItem[] = [];

          if (safeLanguage === "ru") {
            russianWorkingLayer = generatedInsights;
          } else if (safeLanguage === "en") {
            russianWorkingLayer = await translateInsightsToRussian(generatedInsights);
          }

          if (russianWorkingLayer.length > 0) {
            const intake = await saveGeneratedCandidates({
              book: safeBook,
              chapter: safeChapter,
              verse: safeVerse,
              reference,
              focusWord,
              generatedInsights: russianWorkingLayer,
            });

            insertedCandidateCount = intake.insertedCount;
          }
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to create moderator candidates.",
              debug: {
                stage: "candidateIntake",
                reference,
                safeBook,
                safeChapter,
                safeVerse,
                targetLanguage: safeLanguage,
              },
              savedInsights,
              generatedInsights,
              savedCount: savedInsights.length,
              generatedCount: generatedInsights.length,
              insertedCandidateCount: 0,
            },
            { status: 500 }
          );
        }
      }
    }

    const insights = [...savedInsights, ...generatedInsights];

    return NextResponse.json({
      reference,
      verseText,
      focusWord: focusWord ?? "",
      targetLanguage: safeLanguage,
      savedCount: savedInsights.length,
      generatedCount: generatedInsights.length,
      insertedCandidateCount,
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
