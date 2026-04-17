import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SupportedLanguage = 'en' | 'es' | 'fr' | 'de'
type RepairSourceType = 'candidate' | 'reserve_insight' | 'featured_insight' | ''
type InsightBucket = 'featured' | 'reserve'

type TranslationPayload = {
  title: string
  text: string
}

function buildTranslationPrompt(titleRu: string, textRu: string, targetLanguage: SupportedLanguage) {
  const languageLabel =
    targetLanguage === 'en'
      ? 'English'
      : targetLanguage === 'es'
        ? 'Spanish'
        : targetLanguage === 'fr'
          ? 'French'
          : 'German'

  return `
Translate the following Russian Bible insight card into ${languageLabel}.

SOURCE TITLE:
${titleRu}

SOURCE TEXT:
${textRu}

RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary
- Keep the meaning intact
- Make the wording natural and readable
- Preserve the overall compact card style

FORMAT:
{
  "title": "...",
  "text": "..."
}
`.trim()
}

function parseTranslation(raw: string): TranslationPayload | null {
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.title !== 'string') return null
    if (typeof parsed.text !== 'string') return null

    return {
      title: parsed.title.trim(),
      text: parsed.text.trim(),
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

async function translateCard(titleRu: string, textRu: string, targetLanguage: SupportedLanguage) {
  const prompt = buildTranslationPrompt(titleRu, textRu, targetLanguage)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 900,
  })

  if (!result.ok) {
    throw new Error(`Failed to translate card into ${targetLanguage}.`)
  }

  let parsed = parseTranslation(result.rawText)

  if (!parsed) {
    const extracted = extractJsonObject(result.rawText)
    if (extracted) {
      parsed = parseTranslation(extracted)
    }
  }

  if (!parsed) {
    throw new Error(`Failed to parse ${targetLanguage} translation.`)
  }

  return parsed
}

function buildSafeAngleNote(params: {
  angleNote: string | null
  titleRu: string
  repairSourceType: RepairSourceType
}) {
  if (params.angleNote?.trim()) {
    return params.angleNote.trim().slice(0, 500)
  }

  const sourceLabel =
    params.repairSourceType === 'candidate'
      ? 'repair from candidate'
      : params.repairSourceType === 'reserve_insight'
        ? 'repair from reserve'
        : params.repairSourceType === 'featured_insight'
          ? 'repair from active'
          : 'manual workspace save'

  return `${sourceLabel}: ${params.titleRu}`.slice(0, 500)
}

async function decideBucket(params: {
  book: string
  chapter: number
  verse: number
}): Promise<InsightBucket> {
  const supabase = getSupabaseServerClient()

  const { count, error } = await supabase
    .schema('private')
    .from('curated_insights')
    .select('id', { count: 'exact', head: true })
    .eq('book', params.book)
    .eq('chapter', params.chapter)
    .eq('verse', params.verse)
    .eq('status', 'saved')
    .eq('bucket', 'featured')

  if (error) {
    throw new Error(`Failed to count featured cards: ${error.message}`)
  }

  return (count ?? 0) >= 12 ? 'reserve' : 'featured'
}

async function resolveRepairSource(params: {
  repairSourceType: RepairSourceType
  repairSourceId: string
  newInsightId: string
}) {
  if (!params.repairSourceType || !params.repairSourceId) {
    return
  }

  const supabase = getSupabaseServerClient()

  if (params.repairSourceType === 'candidate') {
    const { error } = await supabase
      .schema('private')
      .from('generated_candidates')
      .update({
        candidate_status: 'extended',
        review_note: `Used for repair and saved as curated insight ${params.newInsightId}`,
      })
      .eq('id', params.repairSourceId)

    if (error) {
      throw new Error(`Failed to close repaired candidate: ${error.message}`)
    }

    return
  }

  if (params.repairSourceType === 'reserve_insight') {
    const { error } = await supabase
      .schema('private')
      .from('curated_insights')
      .update({
        status: 'hidden',
      })
      .eq('id', params.repairSourceId)

    if (error) {
      throw new Error(`Failed to remove repaired reserve card: ${error.message}`)
    }

    return
  }

  if (params.repairSourceType === 'featured_insight') {
    return
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()
    const book = String(body.book ?? '').trim().toLowerCase()
    const chapter = Number(body.chapter)
    const verse = Number(body.verse)
    const titleRu = String(body.titleRu ?? '').trim()
    const textRu = String(body.textRu ?? '').trim()
    const mode = String(body.mode ?? 'insights').trim()

    const angleNote =
      typeof body.angleNote === 'string' && body.angleNote.trim()
        ? body.angleNote.trim()
        : null

    const repairSourceType =
      body.repairSourceType === 'candidate' ||
      body.repairSourceType === 'reserve_insight' ||
      body.repairSourceType === 'featured_insight'
        ? body.repairSourceType
        : ''

    const repairSourceId =
      typeof body.repairSourceId === 'string' ? body.repairSourceId.trim() : ''

    if (!reference || !verseText || !book || !chapter || !verse || !titleRu || !textRu) {
      return NextResponse.json(
        { error: 'reference, verseText, book, chapter, verse, titleRu, and textRu are required.' },
        { status: 400 }
      )
    }

    const [en, es, fr, de, bucket] = await Promise.all([
      translateCard(titleRu, textRu, 'en'),
      translateCard(titleRu, textRu, 'es'),
      translateCard(titleRu, textRu, 'fr'),
      translateCard(titleRu, textRu, 'de'),
      decideBucket({ book, chapter, verse }),
    ])

    const safeAngleNote = buildSafeAngleNote({
      angleNote,
      titleRu,
      repairSourceType,
    })

    const supabase = getSupabaseServerClient()

    const insertPayload = {
      verse_ref: reference,
      book,
      chapter,
      verse,
      mode,

      // canonical/base fields stay aligned with English,
      // same as the unfold promote flow
      title: en.title,
      text: en.text,

      title_ru: titleRu,
      text_ru: textRu,
      title_en: en.title,
      text_en: en.text,
      title_es: es.title,
      text_es: es.text,
      title_fr: fr.title,
      text_fr: fr.text,
      title_de: de.title,
      text_de: de.text,

      angle_note: safeAngleNote,
      status: 'saved',
      unfold_count: 0,
      promoted_from_unfold: false,
      bucket,
      source_language: 'ru',
    }

    const { data, error } = await supabase
      .schema('private')
      .from('curated_insights')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Failed to save card: ${error.message}` },
        { status: 500 }
      )
    }

    const savedId = data?.id ?? null

    if (savedId && repairSourceType && repairSourceId) {
      await resolveRepairSource({
        repairSourceType,
        repairSourceId,
        newInsightId: savedId,
      })
    }

    return NextResponse.json({
      ok: true,
      savedId,
      bucket,
    })
  } catch (error) {
    console.error('Workspace save card API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while saving the card.',
      },
      { status: 500 }
    )
  }
}
