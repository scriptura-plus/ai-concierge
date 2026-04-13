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
  created_at: string
  status: string
}

function redirectTo(path: string, req: Request) {
  const url = new URL(path, req.url)
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
      .select('id, book, chapter, verse, bucket, display_order, created_at, status')
      .eq('id', id)
      .maybeSingle()

    if (currentError || !current) {
      return redirectTo(returnTo, req)
    }

    const currentRow = current as InsightRow

    if (currentRow.status !== 'saved' || currentRow.bucket !== 'featured') {
      return redirectTo(returnTo, req)
    }

    const { data: nextRow, error: nextError } = await supabase
      .schema('private')
      .from('curated_insights')
      .select('id, display_order, created_at')
      .eq('book', currentRow.book)
      .eq('chapter', currentRow.chapter)
      .eq('verse', currentRow.verse)
      .eq('status', 'saved')
      .eq('bucket', 'featured')
      .gt('display_order', currentRow.display_order)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextError || !nextRow) {
      return redirectTo(returnTo, req)
    }

    const nextOrder = Number(nextRow.display_order)
    const currentOrder = Number(currentRow.display_order)
    const tempOrder = -999999

    await supabase
      .schema('private')
      .from('curated_insights')
      .update({ display_order: tempOrder })
      .eq('id', currentRow.id)

    await supabase
      .schema('private')
      .from('curated_insights')
      .update({ display_order: currentOrder })
      .eq('id', nextRow.id)

    await supabase
      .schema('private')
      .from('curated_insights')
      .update({ display_order: nextOrder })
      .eq('id', currentRow.id)

    revalidatePath('/moderator')
    revalidatePath(returnTo)

    return redirectTo(returnTo, req)
  } catch {
    return redirectTo(returnTo, req)
  }
}
