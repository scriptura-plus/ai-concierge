import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type InsightRow = {
  id: string
  book: string
  chapter: number
  verse: number
  bucket: 'featured' | 'reserve'
  display_order: number
  status: string
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
      .select('id, book, chapter, verse, bucket, display_order, status')
      .eq('id', id)
      .maybeSingle()

    if (currentError || !current) {
      return withFlash(returnTo, 'Не удалось вернуть карточку в активные.', req)
    }

    const currentRow = current as InsightRow

    const { data: lastFeatured } = await supabase
      .schema('private')
      .from('curated_insights')
      .select('display_order')
      .eq('book', currentRow.book)
      .eq('chapter', currentRow.chapter)
      .eq('verse', currentRow.verse)
      .eq('status', 'saved')
      .eq('bucket', 'featured')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = Number(lastFeatured?.display_order ?? 0) + 10

    const { error: updateError } = await supabase
      .schema('private')
      .from('curated_insights')
      .update({
        bucket: 'featured',
        display_order: nextOrder,
      })
      .eq('id', id)

    if (updateError) {
      return withFlash(returnTo, 'Не удалось вернуть карточку в активные.', req)
    }

    revalidatePath('/moderator')
    revalidatePath(returnTo)

    return withFlash(returnTo, 'Карточка возвращена в активные.', req)
  } catch {
    return withFlash(returnTo, 'Не удалось вернуть карточку в активные.', req)
  }
}
