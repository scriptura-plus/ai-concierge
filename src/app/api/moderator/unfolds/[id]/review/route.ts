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
    const formData = await req.formData()
    const returnTo = String(formData.get('returnTo') ?? '').trim()

    if (!id) {
      return NextResponse.json({ error: 'Missing unfold event id.' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('unfold_events')
      .update({ review_status: 'reviewed' })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update review status: ${error.message}` },
        { status: 500 }
      )
    }

    const redirectUrl = new URL(
      returnTo || `/moderator/unfolds/${id}`,
      req.url
    )

    return NextResponse.redirect(redirectUrl, { status: 303 })
  } catch (error) {
    console.error('Moderator review update error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while updating review status.' },
      { status: 500 }
    )
  }
}
