import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@core/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const hasSUPABASE_URL = !!process.env.SUPABASE_URL;
    const hasSUPABASE_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_KEY;
    const hasGOOGLE_API_KEY = !!process.env.GOOGLE_API_KEY;

    let supabaseOk = false;
    try {
      if (hasSUPABASE_URL && hasSUPABASE_SERVICE_KEY) {
        getSupabaseAdmin(); // только инициализация
        supabaseOk = true;
      }
    } catch {}

    let geminiOk = false;
    try {
      if (hasGOOGLE_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        void genAI; // заглушка, чтобы не ругался линтер
        geminiOk = true;
      }
    } catch {}

    return NextResponse.json({
      env: {
        SUPABASE_URL: hasSUPABASE_URL,
        SUPABASE_SERVICE_KEY: hasSUPABASE_SERVICE_KEY,
        GOOGLE_API_KEY: hasGOOGLE_API_KEY,
      },
      supabaseOk,
      geminiOk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
