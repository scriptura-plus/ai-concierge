import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@core/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "10");

  const sb = getSupabaseAdmin();
  let q = sb
    .from("jobs")
    .select("id,tenant_id,url,url_hash,status,attempts,error,created_at,updated_at,completed_at,payload")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (url) q = q.eq("url", url);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    url: row.url,
    status: row.status,
    attempts: row.attempts,
    stage: row?.payload?.stage ?? null,
    error: row.error ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  }));

  return NextResponse.json({ ok: true, rows });
}
