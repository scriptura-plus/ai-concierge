import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type SourceType = 'user_request' | 'background_fill' | 'repair' | 'unfold_derived' | 'manual_workspace'

function normalizeSourceType(value: unknown): SourceType {
  return value === 'user_request' ||
    value === 'background_fill' ||
    value === 'repair' ||
    value === 'unfold_derived'
    ? value
    : 'manual_workspace'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const book = String(body.book ?? '').trim().toLowerCase()
    const chapter = Number(body.chapter)
    const verse = Number(body.verse)

    const mode = String(body.mode ?? 'insights').trim() || 'insights'
    const sourceType = normalizeSourceType(body.sourceType)

    const titleRu = String(body.titleRu ?? '').trim()
    const textRu = String(body.textRu ?? '').trim()

    const angleNote =
      typeof body.angleNote === 'string' && body.angleNote.trim()
        ? body.angleNote.trim()
        : null

    const reviewNote =
      typeof body.reviewNote === 'string' && body.reviewNote.trim()
        ? body.reviewNote.trim()
        : null

    const sourceUnfoldId =
      typeof body.sourceUnfoldId === 'string' && body.sourceUnfoldId.trim()
        ? body.sourceUnfoldId.trim()
        : null

    const sourceInsightId =
      typeof body.sourceInsightId === 'string' && body.sourceInsightId.trim()
        ? body.sourceInsightId.trim()
        : null

    const generationProvider =
      typeof body.generationProvider === 'string' && body.generationProvider.trim()
        ? body.generationProvider.trim()
        : null

    const generationModel =
      typeof body.generationModel === 'string' && body.generationModel.trim()
        ? body.generationModel.trim()
        : null

    if (!reference || !book || !Number.isInteger(chapter) || !Number.isInteger(verse) || !titleRu || !textRu) {
      return NextResponse.json(
        {
          error:
            'reference, book, chapter, verse, titleRu, and textRu are required.',
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    const insertPayload = {
      verse_ref: reference,
      book,
      chapter,
      verse,
      mode,
      source_type: sourceType,
      candidate_status: 'new',
      title_ru: titleRu,
      text_ru: textRu,
      angle_note: angleNote,
      source_unfold_id: sourceUnfoldId,
      source_insight_id: sourceInsightId,
      generation_provider: generationProvider,
      generation_model: generationModel,
      review_note: reviewNote,
    }

    const { data, error } = await supabase
      .schema('private')
      .from('generated_candidates')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Failed to save candidate: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      candidateId: data?.id ?? null,
    })
  } catch (error) {
    console.error('Save candidate API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while saving the candidate.' },
      { status: 500 }
    )
  }
}
