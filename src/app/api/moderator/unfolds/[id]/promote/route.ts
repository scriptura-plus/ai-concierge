import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

function normalizeSourceMode(value: unknown): SourceMode {
  return value === 'word' ||
    value === 'tension' ||
    value === 'why_this_phrase'
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

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const title = String(body.title ?? '').trim()
    const text = String(body.text ?? '').trim()
    const selectedPassage = String(body.selectedPassage ?? '').trim()
    const sourceMode = normalizeSourceMode(body.sourceMode)

    if (!id || !reference || !title || !text) {
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

    const supabase = getSupabaseServerClient()

    const angleNote = selectedPassage
      ? `Preserved passage: ${selectedPassage}`.slice(0, 500)
      : 'Promoted from selected unfold passage.'

    const { data: inserted, error: insertError } = await supabase
      .from('curated_insights')
      .insert({
        verse_ref: parsedRef.verse_ref,
        book: parsedRef.book,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        mode: sourceMode,
        title,
        text,
        angle_note: angleNote,
        status: 'saved',
        unfold_count: 0,
        promoted_from_unfold: true,
      })
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
    revalidatePath('/')

    return NextResponse.json({
      ok: true,
      promotedInsightId,
    })
  } catch (error) {
    console.error('Promote insight API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while promoting the selected insight.' },
      { status: 500 }
    )
  }
}
