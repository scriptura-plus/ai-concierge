import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    const { count, error } = await supabase
      .from('unfold_events')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'new')

    if (error) {
      return NextResponse.json(
        { error: `Failed to load pending unfold count: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pendingCount: count ?? 0,
    })
  } catch (error) {
    console.error('Pending unfold count API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while loading pending unfold count.' },
      { status: 500 }
    )
  }
}
