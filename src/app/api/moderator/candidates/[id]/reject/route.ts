import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Candidate id is required.' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .schema('private')
      .from('generated_candidates')
      .update({
        candidate_status: 'trashed',
        review_note: 'Rejected by moderator',
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to reject candidate: ${error.message}` },
        { status: 500 }
      )
    }

    revalidatePath('/moderator')
    revalidatePath('/moderator/review/[book]/[chapter]/[verse]', 'page')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reject candidate API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while rejecting the candidate.' },
      { status: 500 }
    )
  }
}
