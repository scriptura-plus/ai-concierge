import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type InsightOption = {
  title: string
  text: string
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
  bookSlug: string
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
    bookSlug: book.replace(/\s+/g, '-'),
  }
}

function normalizeTextForKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function buildCandidateSignature(title: string, text: string) {
  return `${normalizeTextForKey(title)}|||${normalizeTextForKey(text)}`
}

function dedupeOptions(items: InsightOption[]) {
  const unique: InsightOption[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const title = String(item.title ?? '').trim()
    const text = String(item.text ?? '').trim()

    if (!title || !text) continue

    const key = buildCandidateSignature(title, text)
    if (seen.has(key)) continue

    seen.add(key)
    unique.push({ title, text })
  }

  return unique
}

function buildAngleNote(params: {
  sourceMode: SourceMode
  selectedPassage: string
}) {
  const modeLabel =
    params.sourceMode === 'word'
      ? 'word'
      : params.sourceMode === 'tension'
        ? 'tension'
        : params.sourceMode === 'why_this_phrase'
          ? 'why_this_phrase'
          : 'insights'

  const passage = params.selectedPassage.trim()

  if (!passage) {
    return `Unfold derived (${modeLabel})`.slice(0, 500)
  }

  return `Unfold derived (${modeLabel}) — preserved passage: ${passage}`.slice(0, 500)
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const selectedPassage = String(body.selectedPassage ?? '').trim()
    const sourceMode = normalizeSourceMode(body.sourceMode)
    const rawOptions = Array.isArray(body.options) ? body.options : []

    if (!id || !reference || !selectedPassage || rawOptions.length === 0) {
      return NextResponse.json(
        {
          error: 'id, reference, selectedPassage, and options are required.',
        },
        { status: 400 }
      )
    }

    const parsedRef = parseReference(reference)

    if (!parsedRef) {
      return NextResponse.json(
        { error: 'Could not parse reference for candidate intake.' },
        { status: 400 }
      )
    }

    const options = dedupeOptions(rawOptions)

    if (!options.length) {
      return NextResponse.json(
        { error: 'No valid options to save as candidates.' },
        { status: 400 }
      )
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
      return NextResponse.json(
        {
          error: `Failed to load existing candidates: ${existingError.message}`,
        },
        { status: 500 }
      )
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

    const freshItems = options.filter((item) => {
      const key = buildCandidateSignature(item.title, item.text)
      return !existingKeys.has(key)
    })

    let insertedCount = 0

    if (freshItems.length > 0) {
      const angleNote = buildAngleNote({
        sourceMode,
        selectedPassage,
      })

      const insertPayload = freshItems.map((item) => ({
        verse_ref: parsedRef.verse_ref,
        book: parsedRef.book,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        source_type: 'unfold_derived',
        candidate_status: 'new',
        title_ru: item.title,
        text_ru: item.text,
        angle_note: angleNote,
        review_note: `Derived from unfold ${id}`,
      }))

      const { error: insertError } = await supabase
        .schema('private')
        .from('generated_candidates')
        .insert(insertPayload)

      if (insertError) {
        return NextResponse.json(
          {
            error: `Failed to save unfold-derived candidates: ${insertError.message}`,
          },
          { status: 500 }
        )
      }

      insertedCount = insertPayload.length
    }

    const { error: updateError } = await supabase
      .schema('private')
      .from('unfold_events')
      .update({
        review_status: 'reviewed',
      })
      .eq('id', id)
      .in('review_status', ['new', 'reviewed'])

    if (updateError) {
      return NextResponse.json(
        {
          error: `Candidates saved, but failed to update unfold status: ${updateError.message}`,
        },
        { status: 500 }
      )
    }

    const reviewHref = `/moderator/review/${parsedRef.bookSlug}/${parsedRef.chapter}/${parsedRef.verse}`

    revalidatePath('/moderator')
    revalidatePath(reviewHref)
    revalidatePath('/moderator/unfolds')
    revalidatePath(`/moderator/unfolds/${id}`)

    return NextResponse.json({
      ok: true,
      insertedCount,
      reviewHref,
    })
  } catch (error) {
    console.error('Save unfold candidates API error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while saving unfold candidates.',
      },
      { status: 500 }
    )
  }
}
