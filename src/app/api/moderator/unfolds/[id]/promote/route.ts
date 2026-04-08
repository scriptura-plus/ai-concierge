import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type TranslationPayload = {
  en: { title: string; text: string }
  es: { title: string; text: string }
  fr: { title: string; text: string }
  de: { title: string; text: string }
}

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' || value === 'tension' || value === 'why_this_phrase'
    ? value
    : 'insights'
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

function buildTranslationPrompt(params: {
  reference: string
  titleRu: string
  textRu: string
}) {
  return `
You are translating a premium Bible insight card from Russian into 4 target languages.

REFERENCE:
${params.reference}

SOURCE LANGUAGE:
Russian

RUSSIAN TITLE:
${params.titleRu}

RUSSIAN TEXT:
${params.textRu}

TASK:
Translate this card into:
- English
- Spanish
- French
- German

CRITICAL RULES:
- Preserve the same exact insight angle.
- Do not add new ideas.
- Do not remove meaning.
- Keep the title sharp and natural in each language.
- Keep the card text compact and elegant.
- Do not sound robotic.
- Do not explain the translation.
- Return only valid JSON.

OUTPUT FORMAT:
{
  "en": { "title": "...", "text": "..." },
  "es": { "title": "...", "text": "..." },
  "fr": { "title": "...", "text": "..." },
  "de": { "title": "...", "text": "..." }
}
`.trim()
}

function parseTranslations(raw: string): TranslationPayload | null {
  try {
    const parsed = JSON.parse(raw)

    const langs = ['en', 'es', 'fr', 'de'] as const

    for (const lang of langs) {
      if (!parsed?.[lang]) return null
      if (typeof parsed[lang].title !== 'string') return null
      if (typeof parsed[lang].text !== 'string') return null
    }

    return {
      en: {
        title: parsed.en.title.trim(),
        text: parsed.en.text.trim(),
      },
      es: {
        title: parsed.es.title.trim(),
        text: parsed.es.text.trim(),
      },
      fr: {
        title: parsed.fr.title.trim(),
        text: parsed.fr.text.trim(),
      },
      de: {
        title: parsed.de.title.trim(),
        text: parsed.de.text.trim(),
      },
    }
  } catch {
    return null
  }
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

async function translateInsightCard(params: {
  reference: string
  titleRu: string
  textRu: string
}): Promise<TranslationPayload> {
  const prompt = buildTranslationPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2200,
  })

  if (!result.ok) {
    throw new Error(result.error || 'Translation model failed.')
  }

  const rawText = result.rawText
  let translations = parseTranslations(rawText)

  if (!translations) {
    const extracted = extractJsonObject(rawText)
    if (extracted) {
      translations = parseTranslations(extracted)
    }
  }

  if (!translations) {
    throw new Error('Failed to parse translated insight card JSON.')
  }

  return translations
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const titleRu = String(body.title ?? '').trim()
    const textRu = String(body.text ?? '').trim()
    const selectedPassage = String(body.selectedPassage ?? '').trim()
    const sourceMode = normalizeSourceMode(body.sourceMode)

    if (!id || !reference || !titleRu || !textRu) {
      return NextResponse.json(
        { error: 'id, reference, title, and text are required.' },
        { status: 400 }
      )
    }

    const parsedRef = parseReference(reference)

    if (!parsedRef) {
      return NextResponse.json(
        { error: 'Could not parse reference for promotion.' },
        { status: 400 }
      )
    }

    const translations = await translateInsightCard({
      reference,
      titleRu,
      textRu,
    })

    const supabase = getSupabaseServerClient()

    const angleNote = selectedPassage
      ? `Preserved passage: ${selectedPassage}`.slice(0, 500)
      : 'Promoted from selected unfold passage.'

    const insertPayload = {
      verse_ref: parsedRef.verse_ref,
      book: parsedRef.book,
      chapter: parsedRef.chapter,
      verse: parsedRef.verse,
      mode: sourceMode,
      angle_note: angleNote,
      status: 'saved',
      unfold_count: 0,
      promoted_from_unfold: true,
      source_language: 'ru',

      title_ru: titleRu,
      text_ru: textRu,
      title_en: translations.en.title,
      text_en: translations.en.text,
      title_es: translations.es.title,
      text_es: translations.es.text,
      title_fr: translations.fr.title,
      text_fr: translations.fr.text,
      title_de: translations.de.title,
      text_de: translations.de.text,

      title: translations.en.title,
      text: translations.en.text,
    }

    const { data: inserted, error: insertError } = await supabase
      .schema('private')
      .from('curated_insights')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError || !inserted?.id) {
      return NextResponse.json(
        {
          error: `Failed to save curated insight: ${insertError?.message ?? 'Unknown insert error.'}`,
        },
        { status: 500 }
      )
    }

    const promotedInsightId = inserted.id as string

    const { error: updateError } = await supabase
      .schema('private')
      .from('unfold_events')
      .update({
        review_status: 'promoted',
        promoted_insight_id: promotedInsightId,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        {
          error: `Curated insight saved, but failed to update unfold event: ${updateError.message}`,
        },
        { status: 500 }
      )
    }

    revalidatePath('/moderator/unfolds')
    revalidatePath(`/moderator/unfolds/${id}`)
    revalidatePath('/moderator/insights')
    revalidatePath(`/moderator/insights/${promotedInsightId}`)
    revalidatePath('/')

    return NextResponse.json({
      ok: true,
      promotedInsightId,
    })
  } catch (error) {
    console.error('Promote insight API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while promoting the selected insight.',
      },
      { status: 500 }
    )
  }
}
