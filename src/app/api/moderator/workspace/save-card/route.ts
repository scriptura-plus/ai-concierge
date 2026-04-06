import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SupportedLanguage = 'en' | 'es' | 'fr' | 'de'

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

    if (!reference || !verseText || !book || !chapter || !verse || !titleRu || !textRu) {
      return NextResponse.json(
        { error: 'reference, verseText, book, chapter, verse, titleRu, and textRu are required.' },
        { status: 400 }
      )
    }

    const [en, es, fr, de] = await Promise.all([
      translateCard(titleRu, textRu, 'en'),
      translateCard(titleRu, textRu, 'es'),
      translateCard(titleRu, textRu, 'fr'),
      translateCard(titleRu, textRu, 'de'),
    ])

    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from('curated_insights')
      .insert({
        verse_ref: reference,
        book,
        chapter,
        verse,
        mode,
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
        angle_note: angleNote,
        status: 'saved',
        unfold_count: 0,
        promoted_from_unfold: false,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Failed to save card: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      savedId: data?.id ?? null,
    })
  } catch (error) {
    console.error('Workspace save card API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while saving the card.' },
      { status: 500 }
    )
  }
}
