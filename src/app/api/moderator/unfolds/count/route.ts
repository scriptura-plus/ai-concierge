import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    const { count, error } = await supabase
      .schema('private')
      .from('unfold_events')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', 'new')

    if (error) {
      console.error('Failed to load pending unfold count:', error.message)

      return NextResponse.json({
        pendingCount: 0,
      })
    }

    return NextResponse.json({
      pendingCount: count ?? 0,
    })
  } catch (error) {
    console.error('Pending unfold count API error:', error)

    return NextResponse.json({
      pendingCount: 0,
    })
  }
}
