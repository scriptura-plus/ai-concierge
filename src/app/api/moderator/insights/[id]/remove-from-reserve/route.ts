import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function withFlash(path: string, message: string, req: Request) {
  const url = new URL(path, req.url)
  url.searchParams.set('flash', message)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  const formData = await req.formData()
  const returnTo = String(formData.get('returnTo') || '/moderator')

  try {
    const supabase = getSupabaseServerClient()

    const { data: current, error: currentError } = await supabase
      .schema('private')
      .from('curated_insights')
      .select('id, status, bucket')
      .eq('id', id)
      .maybeSingle()

    if (currentError || !current) {
      return withFlash(returnTo, 'Не удалось убрать карточку из запаса.', req)
    }

    const { error: updateError } = await supabase
      .schema('private')
      .from('curated_insights')
      .update({
        status: 'hidden',
      })
      .eq('id', id)

    if (updateError) {
      return withFlash(returnTo, 'Не удалось убрать карточку из запаса.', req)
    }

    revalidatePath('/moderator')
    revalidatePath(returnTo)

    return withFlash(returnTo, 'Карточка убрана из запаса.', req)
  } catch {
    return withFlash(returnTo, 'Не удалось убрать карточку из запаса.', req)
  }
}
