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
  url.searchParams.set('flash', 'error')
  url.searchParams.set('message', message)
  return NextResponse.redirect(url, { status: 303 })
}

function withSuccess(path: string, message: string, req: Request) {
  const url = new URL(path, req.url)
  url.searchParams.set('flash', 'success')
  url.searchParams.set('message', message)
  return NextResponse.redirect(url, { status: 303 })
}

function getBookVariants(bookValue: string) {
  const raw = String(bookValue ?? '').trim().toLowerCase()
  const spaced = raw.replace(/-/g, ' ').trim()
  const collapsed = raw.replace(/[\s-]/g, '')
  return Array.from(new Set([raw, spaced, collapsed])).filter(Boolean)
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
    const bookVariants = getBookVariants(currentRow.book)

    const { count: featuredCount, error: countError } = await supabase
      .schema('private')
      .from('curated_insights')
      .select('id', { count: 'exact', head: true })
      .in('book', bookVariants)
      .eq('chapter', currentRow.chapter)
      .eq('verse', currentRow.verse)
      .eq('status', 'saved')
      .eq('bucket', 'featured')

    if (countError) {
      return withFlash(returnTo, 'Не удалось проверить лимит активных карточек.', req)
    }

    if ((featuredCount ?? 0) >= 12) {
      return withFlash(
        returnTo,
        'В активных уже 12 карточек. Сначала отправьте одну в запас.',
        req
      )
    }

    const { data: lastFeatured, error: lastFeaturedError } = await supabase
      .schema('private')
      .from('curated_insights')
      .select('display_order')
      .in('book', bookVariants)
      .eq('chapter', currentRow.chapter)
      .eq('verse', currentRow.verse)
      .eq('status', 'saved')
      .eq('bucket', 'featured')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastFeaturedError) {
      return withFlash(returnTo, 'Не удалось определить позицию активной карточки.', req)
    }

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

    return withSuccess(returnTo, 'Карточка возвращена в активные.', req)
  } catch {
    return withFlash(returnTo, 'Не удалось вернуть карточку в активные.', req)
  }
}
