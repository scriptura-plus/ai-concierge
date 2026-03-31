import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    text: 'TEST API LIVE',
  })
}
