import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type RussianAutoCandidateSource = {
  sourceTitleRu: string
  sourceTextRu: string
  unfoldTitleRu: string
  unfoldTextRu: string
}

type CandidateOption = {
  title: string
  text: string
}

function languageInstruction(targetLanguage: SupportedLanguage) {
  if (targetLanguage === 'ru') {
    return `
Write the full article in Russian.
Every field must be in Russian:
- title
- lead
- every body paragraph
- quote if present

Do not use English in the final answer.
Do not leave headings or prose in English.
`.trim()
  }

  if (targetLanguage === 'es') {
    return `
Write the full article in Spanish.
Every field must be in Spanish.
Do not use English in the final answer.
`.trim()
  }

  if (targetLanguage === 'fr') {
    return `
Write the full article in French.
Every field must be in French.
Do not use English in the final answer.
`.trim()
  }

  if (targetLanguage === 'de') {
    return `
Write the full article in German.
Every field must be in German.
Do not use English in the final answer.
`.trim()
  }

  return 'Write the full article in English.'
}

function buildPrompt(
  reference: string,
  verseText: string,
  insightTitle: string,
  insightText: string,
  targetLanguage: SupportedLanguage
) {
  return `
You are writing a long-form journal-style article for an advanced Bible insight app.

Your task is to take one selected insight and unfold it into a deep, elegant, intellectually serious article.

${languageInstruction(targetLanguage)}

INPUTS

Reference:
${reference}

Verse text:
${verseText}

Selected insight title:
${insightTitle}

Selected insight text:
${insightText}

MISSION

Write a fully developed article that feels like a piece from a high-end intellectual journal:
- serious
- elegant
- dense with thought
- carefully structured
- readable and polished
- never preachy
- never simplistic
- never list-like
- compelling enough that the reader wants to continue into the next paragraph

This is NOT:
- a sermon
- a devotional
- a bullet-point summary
- a short explanation
- a list of facts
- a casual blog post

This IS:
- a long-form analytical essay
- built around one central insight
- written with compositional control
- enriched by language, structure, historical context, literary texture, and conceptual tension where relevant
- shaped with narrative pull, so the movement of thought carries the reader forward

CRITICAL STYLE RULES

- Write in continuous article form
- No bullet points
- No numbered sections
- No “first, second, third”
- No motivational tone
- No doctrinal preaching
- No filler
- No shallow repetition of the same idea
- Each paragraph must deepen the thought
- Each paragraph should create a natural pull into the next one
- Use transitions, tension, contrast, texture, and controlled unfolding so the article feels difficult to stop reading
- Avoid generic ChatGPT-style summary prose

TONE

The tone should feel like a thoughtful article in an expensive literary-intellectual magazine:
- restrained
- exact
- mature
- quietly powerful
- scholarly without becoming dry
- beautiful without becoming theatrical

STRUCTURE

Write the article in this internal progression:
1. Open with a strong intellectual entrance into the central tension of the insight.
2. Clarify why the chosen insight is more significant than it first appears.
3. Move slowly through the verse and its wording.
4. Expand the idea through linguistic, literary, contextual, and historical depth where useful.
5. Show how this insight changes the reading of the verse as a whole.
6. End with a strong, lucid, non-preachy closing movement.

QUALITY BAR

- Prefer depth over speed
- Prefer density over length-padding
- Prefer elegance over bluntness
- Prefer argument over slogan
- Prefer developed prose over compressed notes
- Prefer paragraph-level movement over static explanation
- The reader should feel invited deeper and deeper into the thought

LENGTH

Target roughly 1200-1800 words if the material supports it.
Do not force length with fluff.
If the idea is better served in a somewhat shorter but still substantial article, keep it dense and controlled.

OUTPUT CONTRACT

Return ONLY valid JSON.
No markdown.
No commentary outside JSON.
Format:
{
  "title": "...",
  "lead": "...",
  "body": ["...", "...", "..."],
  "quote": "optional short line"
}

OUTPUT REQUIREMENTS

- "title" should feel elegant, serious, and article-worthy
- "lead" should function like a strong opening paragraph that immediately creates interest
- "body" must contain 3-5 substantial paragraphs
- the body paragraphs must read like a continuous essay broken into paragraphs, not disconnected notes
- "quote" is optional, but if present it should be brief and memorable
`.trim()
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function parseArticle(raw: string): ArticlePayload | null {
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.title !== 'string') return null
    if (typeof parsed.lead !== 'string') return null
    if (!Array.isArray(parsed.body)) return null

    const body = parsed.body
      .map((item: any) => String(item ?? '').trim())
      .filter(Boolean)

    if (!body.length) return null

    return {
      title: String(parsed.title).trim(),
      lead: String(parsed.lead).trim(),
      body,
      quote: typeof parsed.quote === 'string' ? parsed.quote.trim() : undefined,
    }
  } catch {
    return null
  }
}

function parseRussianAutoCandidateSource(raw: string): RussianAutoCandidateSource | null {
  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed?.sourceTitleRu !== 'string') return null
    if (typeof parsed?.sourceTextRu !== 'string') return null
    if (typeof parsed?.unfoldTitleRu !== 'string') return null
    if (typeof parsed?.unfoldTextRu !== 'string') return null

    return {
      sourceTitleRu: parsed.sourceTitleRu.trim(),
      sourceTextRu: parsed.sourceTextRu.trim(),
      unfoldTitleRu: parsed.unfoldTitleRu.trim(),
      unfoldTextRu: parsed.unfoldTextRu.trim(),
    }
  } catch {
    return null
  }
}

function parseCandidateOptions(raw: string): CandidateOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        text: String(item.text ?? '').trim(),
      }))
      .filter((item) => item.title && item.text)

    return cleaned.length ? cleaned.slice(0, 3) : null
  } catch {
    return null
  }
}

function looksRussian(text: string): boolean {
  const sample = text.slice(0, 700)
  const cyrillicMatches = sample.match(/[А-Яа-яЁё]/g) ?? []
  return cyrillicMatches.length >= 12
}

function articleLooksRussian(article: ArticlePayload): boolean {
  const joined = [
    article.title,
    article.lead,
    ...article.body,
    article.quote ?? '',
  ].join(' ')

  return looksRussian(joined)
}

function parseReference(reference: string): {
  verse_ref: string
  book: string
  chapter: number
  verse: number
} | null {
  const trimmed = reference.trim()
  const match = trimmed.match(/^(.*)\s+(\d+):(\d+)$/)

  if (!match) return null

  const [, rawBook, rawChapter, rawVerse] = match
  const book = rawBook.trim().toLowerCase()
  const chapter = Number(rawChapter)
  const verse = Number(rawVerse)

  if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return null
  }

  return {
    verse_ref: trimmed,
    book,
    chapter,
    verse,
  }
}

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' || value === 'tension' || value === 'why_this_phrase'
    ? value
    : 'insights'
}

function buildUnfoldText(article: ArticlePayload): string {
  return [
    article.title,
    '',
    article.lead,
    '',
    ...article.body,
    ...(article.quote ? ['', `“${article.quote}”`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function normalizeTextForKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function buildCandidateSignature(title: string, text: string) {
  return `${normalizeTextForKey(title)}|||${normalizeTextForKey(text)}`
}

function dedupeCandidateOptions(items: CandidateOption[]) {
  const unique: CandidateOption[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const title = item.title.trim()
    const text = item.text.trim()

    if (!title || !text) continue
    if (text.length < 120) continue

    const key = buildCandidateSignature(title, text)
    if (seen.has(key)) continue

    seen.add(key)
    unique.push({ title, text })
  }

  return unique
}

function buildRussianNormalizationPrompt(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldTitle: string
  unfoldText: string
}) {
  return `
Ты подготавливаешь русский рабочий слой для автогенерации кандидатов из unfold в Scriptura+.

ССЫЛКА:
${params.reference}

РЕЖИМ:
${params.sourceMode}

SOURCE TITLE:
${params.sourceTitle}

SOURCE TEXT:
${params.sourceText}

UNFOLD TITLE:
${params.unfoldTitle}

UNFOLD TEXT:
${params.unfoldText}

ЗАДАЧА:
Преобразуй этот материал в естественный русский рабочий вариант для модератора.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Сохрани тот же угол мысли.
- Не выдумывай новых идей.
- Не расширяй материал лишним.
- Не упрощай смысл.
- Не делай текст проповедническим.
- Верни только валидный JSON.

ФОРМАТ:
{
  "sourceTitleRu": "...",
  "sourceTextRu": "...",
  "unfoldTitleRu": "...",
  "unfoldTextRu": "..."
}
`.trim()
}

async function normalizeAutoCandidateSourceToRussian(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldTitle: string
  unfoldText: string
}): Promise<RussianAutoCandidateSource> {
  const alreadyRussian =
    looksRussian(params.sourceTitle) &&
    looksRussian(params.sourceText) &&
    looksRussian(params.unfoldTitle) &&
    looksRussian(params.unfoldText)

  if (alreadyRussian) {
    return {
      sourceTitleRu: params.sourceTitle.trim(),
      sourceTextRu: params.sourceText.trim(),
      unfoldTitleRu: params.unfoldTitle.trim(),
      unfoldTextRu: params.unfoldText.trim(),
    }
  }

  const prompt = buildRussianNormalizationPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2600,
  })

  if (!result.ok) {
    throw new Error(result.error || 'Не удалось привести unfold к русскому рабочему слою.')
  }

  const rawText = result.rawText
  let normalized = parseRussianAutoCandidateSource(rawText)

  if (!normalized) {
    const extracted = extractJsonObject(rawText)
    if (extracted) {
      normalized = parseRussianAutoCandidateSource(extracted)
    }
  }

  if (!normalized) {
    throw new Error('Не удалось распарсить русский рабочий слой для unfold.')
  }

  return normalized
}

function buildAutoCandidatePrompt(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitleRu: string
  sourceTextRu: string
  unfoldTitleRu: string
  unfoldTextRu: string
}) {
  return `
Ты — генератор сильных карточек-кандидатов для Scriptura+.

Твоя задача — автоматически извлечь из unfold-статьи 3 сильные candidate-карточки,
которые уже можно подать модератору в review.

ССЫЛКА:
${params.reference}

РЕЖИМ:
${params.sourceMode}

ИСХОДНЫЙ ЗАГОЛОВОК:
${params.sourceTitleRu}

ИСХОДНЫЙ ТЕКСТ ИНСАЙТА:
${params.sourceTextRu}

UNFOLD ЗАГОЛОВОК:
${params.unfoldTitleRu}

UNFOLD ТЕКСТ:
${params.unfoldTextRu}

ОСНОВНОЙ ПРИНЦИП:
- Найди 3 действительно сильных угла внутри unfold.
- Каждый вариант должен быть отдельной полноценной short insight-card.
- Не делай rough notes.
- Не делай мини-статьи.
- Не делай проповедь.
- Не делай соседние варианты одной и той же мысли.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Все 3 карточки должны быть на русском языке.
- Каждая карточка должна иметь один ясный центр тяжести.
- Карточка должна звучать как save-ready candidate.
- Избегай банальностей, штампов и общих духовных фраз.
- Избегай вежливой bland-прозы в стиле ChatGPT.
- Не повторяй один и тот же угол другими словами.
- Каждая карточка должна быть 4-5 предложений.
- Заголовок должен быть коротким, сильным и пригодным для сохранения.
- Красота должна идти через точность и вау-эффект формулировки, а не через театральность.

СТАНДАРТ КАЧЕСТВА:
- Карточка должна находить реальный угол, а не просто красиво пересказывать статью.
- Карточка должна быть компактной, но плотной.
- Карточка должна оставлять ощущение, что её уже хочется сохранить.
- Каждая карточка должна быть достаточно самостоятельной, чтобы пройти в обычный review-поток.

ПРАВИЛА ВЫВОДА:
- Верни ТОЛЬКО валидный JSON
- Без markdown
- Без code fences
- Без комментариев
- Вывод должен быть JSON-массивом ровно из 3 элементов

ФОРМАТ:
[
  {
    "title": "Короткий сильный заголовок",
    "text": "Четыре или пять предложений полноценной сильной карточки."
  }
]
`.trim()
}

async function generateAutoCandidatesFromUnfold(params: {
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  article: ArticlePayload
}): Promise<CandidateOption[]> {
  const unfoldText = buildUnfoldText(params.article)
  const normalized = await normalizeAutoCandidateSourceToRussian({
    reference: params.reference,
    sourceMode: params.sourceMode,
    sourceTitle: params.sourceTitle,
    sourceText: params.sourceText,
    unfoldTitle: params.article.title,
    unfoldText,
  })

  const prompt = buildAutoCandidatePrompt({
    reference: params.reference,
    sourceMode: params.sourceMode,
    sourceTitleRu: normalized.sourceTitleRu,
    sourceTextRu: normalized.sourceTextRu,
    unfoldTitleRu: normalized.unfoldTitleRu,
    unfoldTextRu: normalized.unfoldTextRu,
  })

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2800,
  })

  if (!result.ok) {
    throw new Error(result.error || 'Не удалось автоматически извлечь кандидатов из unfold.')
  }

  const rawText = result.rawText
  let options = parseCandidateOptions(rawText)

  if (!options) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      options = parseCandidateOptions(extracted)
    }
  }

  if (!options || options.length !== 3) {
    throw new Error('Не удалось распарсить ровно 3 auto-candidate варианта из unfold.')
  }

  const deduped = dedupeCandidateOptions(options)

  if (deduped.length === 0) {
    throw new Error('Автогенерация unfold не дала пригодных кандидатов.')
  }

  return deduped.slice(0, 3)
}

async function saveUnfoldEvent(params: {
  reference: string
  sourceMode?: unknown
  sourceInsightId?: unknown
  sourceTitle: string
  sourceText: string
  sourceAngleNote?: unknown
  article: ArticlePayload
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsedRef = parseReference(params.reference)

  if (!parsedRef) {
    return { ok: false, error: 'Could not parse reference for unfold event.' }
  }

  const supabase = getSupabaseServerClient()

  const sourceInsightId =
    typeof params.sourceInsightId === 'string' && params.sourceInsightId.trim()
      ? params.sourceInsightId.trim()
      : null

  const sourceAngleNote =
    typeof params.sourceAngleNote === 'string' && params.sourceAngleNote.trim()
      ? params.sourceAngleNote.trim()
      : null

  const { data, error } = await supabase
    .schema('private')
    .from('unfold_events')
    .insert({
      verse_ref: parsedRef.verse_ref,
      book: parsedRef.book,
      chapter: parsedRef.chapter,
      verse: parsedRef.verse,
      source_insight_id: sourceInsightId,
      source_mode: normalizeSourceMode(params.sourceMode),
      source_title: params.sourceTitle,
      source_text: params.sourceText,
      source_angle_note: sourceAngleNote,
      unfold_title: params.article.title,
      unfold_text: buildUnfoldText(params.article),
      review_status: 'new',
      promoted_insight_id: null,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return {
      ok: false,
      error: `Failed to save unfold event: ${error?.message ?? 'Unknown insert error.'}`,
    }
  }

  return { ok: true, id: data.id as string }
}

async function saveAutoGeneratedCandidates(params: {
  eventId: string
  reference: string
  sourceMode: SourceMode
  sourceAngleNote?: unknown
  options: CandidateOption[]
}): Promise<{ insertedCount: number }> {
  const parsedRef = parseReference(params.reference)

  if (!parsedRef) {
    throw new Error('Could not parse reference for auto-candidate intake.')
  }

  const supabase = getSupabaseServerClient()

  const { data: existingRows, error: existingError } = await supabase
    .schema('private')
    .from('generated_candidates')
    .select('title_ru, text_ru')
    .eq('book', parsedRef.book)
    .eq('chapter', parsedRef.chapter)
    .eq('verse', parsedRef.verse)
    .neq('candidate_status', 'trashed')

  if (existingError) {
    throw new Error(`Failed to load existing candidates: ${existingError.message}`)
  }

  const existingKeys = new Set(
    (existingRows ?? [])
      .map((row) => {
        const title = String(row.title_ru ?? '').trim()
        const text = String(row.text_ru ?? '').trim()
        return title && text ? buildCandidateSignature(title, text) : null
      })
      .filter(Boolean) as string[]
  )

  const angleNoteBase =
    typeof params.sourceAngleNote === 'string' && params.sourceAngleNote.trim()
      ? params.sourceAngleNote.trim()
      : 'Auto-derived from unfold'

  const freshItems = params.options.filter((item) => {
    const key = buildCandidateSignature(item.title, item.text)
    return !existingKeys.has(key)
  })

  if (!freshItems.length) {
    return { insertedCount: 0 }
  }

  const insertPayload = freshItems.map((item) => ({
    verse_ref: parsedRef.verse_ref,
    book: parsedRef.book,
    chapter: parsedRef.chapter,
    verse: parsedRef.verse,
    source_type: 'unfold_derived',
    candidate_status: 'new',
    title_ru: item.title,
    text_ru: item.text,
    angle_note: `${angleNoteBase}`.slice(0, 500),
    review_note: `Auto-derived from unfold ${params.eventId}`,
  }))

  const { error: insertError } = await supabase
    .schema('private')
    .from('generated_candidates')
    .insert(insertPayload)

  if (insertError) {
    throw new Error(`Failed to save unfold-derived candidates: ${insertError.message}`)
  }

  return { insertedCount: insertPayload.length }
}

export async function POST(req: Request) {
  try {
    const {
      reference,
      verseText,
      insightTitle,
      insightText,
      targetLanguage,
      sourceMode,
      sourceAngleNote,
      sourceInsightId,
    } = await req.json()

    const safeReference = String(reference ?? '').trim() || 'Unknown reference'
    const safeVerseText = String(verseText ?? '').trim()
    const safeInsightTitle = String(insightTitle ?? '').trim()
    const safeInsightText = String(insightText ?? '').trim()

    if (!safeVerseText || !safeInsightTitle || !safeInsightText) {
      return NextResponse.json(
        { error: 'reference, verseText, insightTitle, and insightText are required.' },
        { status: 400 }
      )
    }

    const safeLanguage: SupportedLanguage =
      targetLanguage === 'ru' ||
      targetLanguage === 'es' ||
      targetLanguage === 'fr' ||
      targetLanguage === 'de'
        ? targetLanguage
        : 'en'

    const normalizedSourceMode = normalizeSourceMode(sourceMode)

    const prompt = buildPrompt(
      safeReference,
      safeVerseText,
      safeInsightTitle,
      safeInsightText,
      safeLanguage
    )

    const result = await runModel({
      prompt,
      model: process.env.UNFOLD_MODEL || 'gpt-5.4',
      maxOutputTokens: 5000,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          raw: result.raw || '',
        },
        { status: 500 }
      )
    }

    const rawText = result.rawText

    let article = parseArticle(rawText)

    if (!article) {
      const extracted = extractJsonObject(rawText)
      if (extracted) {
        article = parseArticle(extracted)
      }
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Failed to parse article JSON.', raw: rawText || 'Empty model response' },
        { status: 500 }
      )
    }

    if (safeLanguage === 'ru' && !articleLooksRussian(article)) {
      return NextResponse.json(
        {
          error: 'Model did not return Russian content for article mode.',
          raw: rawText || 'Empty model response',
        },
        { status: 500 }
      )
    }

    const saveResult = await saveUnfoldEvent({
      reference: safeReference,
      sourceMode,
      sourceInsightId,
      sourceTitle: safeInsightTitle,
      sourceText: safeInsightText,
      sourceAngleNote,
      article,
    })

    let autoCandidatesInserted = 0
    let autoCandidatesError: string | null = null

    if (saveResult.ok) {
      try {
        const autoOptions = await generateAutoCandidatesFromUnfold({
          reference: safeReference,
          sourceMode: normalizedSourceMode,
          sourceTitle: safeInsightTitle,
          sourceText: safeInsightText,
          article,
        })

        const autoSave = await saveAutoGeneratedCandidates({
          eventId: saveResult.id,
          reference: safeReference,
          sourceMode: normalizedSourceMode,
          sourceAngleNote,
          options: autoOptions,
        })

        autoCandidatesInserted = autoSave.insertedCount
      } catch (error) {
        autoCandidatesError =
          error instanceof Error
            ? error.message
            : 'Failed to auto-create unfold-derived candidates.'
      }
    }

    return NextResponse.json({
      article,
      eventSaved: saveResult.ok,
      eventId: saveResult.ok ? saveResult.id : null,
      eventError: saveResult.ok ? null : saveResult.error,
      autoCandidatesInserted,
      autoCandidatesError,
    })
  } catch (error) {
    console.error('Unfold article API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong while generating the article.' },
      { status: 500 }
    )
  }
}
