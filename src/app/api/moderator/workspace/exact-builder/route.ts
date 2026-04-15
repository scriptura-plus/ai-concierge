import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'EXACT_BUILDER_LIVE_TEST_V1',
    },
    { status: 418 }
  )
}
