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
    const body = await req.json()

    const titleRu = String(body.titleRu ?? '').trim()
    const returnTo = String(body.returnTo ?? '').trim()

    if (!id || !titleRu) {
      return NextResponse.json(
        { error: 'id and titleRu are required.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .schema('private')
      .from('generated_candidates')
      .update({
        title_ru: titleRu,
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update candidate title: ${error.message}` },
        { status: 500 }
      )
    }

    if (returnTo) {
      revalidatePath(returnTo)
    }

    revalidatePath('/moderator')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update candidate title API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while updating candidate title.' },
      { status: 500 }
    )
  }
}
