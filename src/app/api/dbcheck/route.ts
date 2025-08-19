import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@core/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getSupabaseAdmin();
  const out: any = {};
  try {
    const res = await sb
      .from("jobs")
      .select("id,tenant_id,url,url_hash,status,attempts,created_at")
      .limit(1);
    out.hasTable = !res.error;
    out.sample = res.data ?? [];
    if (res.error) {
      out.error = {
        message: res.error.message,
        details: res.error.details,
        hint: (res.error as any)?.hint,
        code: (res.error as any)?.code,
      };
    }
  } catch (e: any) {
    out.crash = e?.message ?? String(e);
  }
  return NextResponse.json(out);
}
