import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@core/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

// sha256 для дедупликации
async function sha256(s: string) {
  const enc = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Быстрый GET: чтобы можно было проверить эндпоинт в браузере
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'Use POST with { url, tenantId } to enqueue job.'
  });
}

export async function POST(req: Request) {
  try {
    const { url, tenantId, priority = 0, source = 'manual' } = await req.json();
    if (!url || !tenantId) {
      return NextResponse.json({ error: 'url and tenantId are required' }, { status: 400 });
    }

    let validated: URL;
    try { validated = new URL(url); } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

    const supabase = getSupabaseAdmin();
    const urlHash = await sha256(validated.toString());

    // Проверка активных заданий (queued/in_progress)
    const { data: existing } = await supabase
      .from('jobs')
      .select('id,status,created_at')
      .eq('tenant_id', tenantId)
      .eq('url_hash', urlHash)
      .in('status', ['queued', 'in_progress'])
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        ok: true, deduped: true, jobId: existing.id, status: existing.status,
        url: validated.toString(), tenantId
      });
    }

    // Создаём новое задание
    const payload = { url: validated.toString(), tenantId, source };
    const { data: inserted, error: insErr } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        url: validated.toString(),
        url_hash: urlHash,
        status: 'queued',
        priority,
        attempts: 0,
        payload,
      })
      .select('id,status,created_at')
      .single();

    if (insErr || !inserted) {
      console.error('[ingest] insert error:', insErr);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      deduped: false,
      jobId: inserted.id,
      status: inserted.status,
      url: validated.toString(),
      tenantId,
    });
  } catch (e: any) {
    console.error('[ingest] error:', e);
    return NextResponse.json({ error: e?.message ?? 'Internal Server Error' }, { status: 500 });
  }
}
