import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function redirectWithFlash(
  path: string,
  req: Request,
  flashType: 'success' | 'error',
  flashMessage: string
) {
  const url = new URL(path, req.url)
  url.searchParams.set('flash', flashType)
  url.searchParams.set('message', flashMessage)
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
      .from('generated_candidates')
      .select('id, title_ru, candidate_status')
      .eq('id', id)
      .maybeSingle()

    if (currentError || !current) {
      return redirectWithFlash(returnTo, req, 'error', 'Не удалось найти кандидат.')
    }

    const { error: updateError } = await supabase
      .schema('private')
      .from('generated_candidates')
      .update({
        candidate_status: 'trashed',
        review_note: 'Rejected by moderator',
      })
      .eq('id', id)

    if (updateError) {
      return redirectWithFlash(returnTo, req, 'error', 'Не удалось отклонить кандидат.')
    }

    revalidatePath('/moderator')
    revalidatePath(returnTo)

    return redirectWithFlash(returnTo, req, 'success', 'Кандидат отклонён.')
  } catch {
    return redirectWithFlash(returnTo, req, 'error', 'Не удалось отклонить кандидат.')
  }
}
