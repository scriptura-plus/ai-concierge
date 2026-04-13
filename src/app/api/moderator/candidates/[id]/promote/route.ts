import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type TranslationPayload = {
  en: { title: string; text: string }
  es: { title: string; text: string }
  fr: { title: string; text: string }
  de: { title: string; text: string }
}

type CandidateRow = {
  id: string
  verse_ref: string
  book: string
  chapter: number
  verse: number
  source_type: string
  title_ru: string
  text_ru: string
  angle_note: string | null
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

function buildSafeAngleNote(row: CandidateRow) {
  const raw = row.angle_note?.trim()
  if (raw) return raw

  const fallback = `Promoted from ${row.source_type || 'candidate'}: ${row.title_ru}`.trim()
  return fallback.slice(0, 500)
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Candidate id is required.' }, { status: 400 })
    }

    const formData = await req.formData()
    const returnTo = String(formData.get('returnTo') ?? '/moderator').trim() || '/moderator'

    const supabase = getSupabaseServerClient()

    const { data: candidate, error: candidateError } = await supabase
      .schema('private')
      .from('generated_candidates')
      .select('id, verse_ref, book, chapter, verse, source_type, title_ru, text_ru, angle_note')
      .eq('id', id)
      .maybeSingle()

    if (candidateError || !candidate) {
      return NextResponse.json(
        {
          error: `Failed to load candidate: ${candidateError?.message ?? 'Candidate not found.'}`,
        },
        { status: 500 }
      )
    }

    const row = candidate as CandidateRow
    const safeAngleNote = buildSafeAngleNote(row)

    const translations = await translateInsightCard({
      reference: row.verse_ref,
      titleRu: row.title_ru,
      textRu: row.text_ru,
    })

    const insertPayload = {
      verse_ref: row.verse_ref,
      book: row.book,
      chapter: row.chapter,
      verse: row.verse,
      mode: 'insights',
      angle_note: safeAngleNote,
      status: 'saved',
      unfold_count: 0,
      promoted_from_unfold: false,
      source_language: 'ru',

      title_ru: row.title_ru,
      text_ru: row.text_ru,
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

    const { error: updateError } = await supabase
      .schema('private')
      .from('generated_candidates')
      .update({
        candidate_status: 'featured',
        review_note: `Promoted to curated insight ${inserted.id}`,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        {
          error: `Curated insight saved, but failed to update candidate: ${updateError.message}`,
        },
        { status: 500 }
      )
    }

    revalidatePath('/moderator')
    revalidatePath(returnTo)

    return NextResponse.redirect(new URL(returnTo, req.url), { status: 303 })
  } catch (error) {
    console.error('Promote candidate API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while promoting the candidate.',
      },
      { status: 500 }
    )
  }
}
