import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
    revalidatePath(returnTo)

    return NextResponse.redirect(new URL(returnTo, req.url))
  } catch (error) {
    console.error('Reject candidate API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while rejecting the candidate.' },
      { status: 500 }
    )
  }
}
