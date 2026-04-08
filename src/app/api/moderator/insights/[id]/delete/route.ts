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
    const formData = await req.formData()
    const returnTo = String(formData.get('returnTo') ?? '').trim()

    if (!id) {
      return NextResponse.json({ error: 'Missing curated insight id.' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .schema('private')
      .from('curated_insights')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete curated insight: ${error.message}` },
        { status: 500 }
      )
    }

    revalidatePath('/moderator/insights')
    revalidatePath(`/moderator/insights/${id}`)
    revalidatePath('/')

    const redirectUrl = new URL(returnTo || '/moderator/insights', req.url)
    return NextResponse.redirect(redirectUrl, { status: 303 })
  } catch (error) {
    console.error('Curated insight delete error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while deleting the curated insight.' },
      { status: 500 }
    )
  }
}
