import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@core/supabase';
import { GenericReadabilityExtractor } from '@adapters/extractors/genericReadability';
import { LangchainTextSplitter } from '@adapters/splitters/langchain';
import { GoogleEmbeddingsProvider } from '@adapters/embeddings/google';
import { SupabaseStore } from '@adapters/stores/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // оставим 60с для надёжности на Vercel

type JobRow = {
  id: string;
  tenant_id: string;
  url: string;
  attempts: number | null;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  payload?: any;
};

async function sha256(s: string) {
  const enc = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Обновление payload.stage с сохранением других ключей (берём из локальной переменной)
async function setStage(supabase: any, job: JobRow, stage: string) {
  const payload = { ...(job.payload ?? {}), stage };
  const { error } = await supabase.from('jobs').update({ payload }).eq('id', job.id);
  if (error) console.warn('[worker] stage update error:', error);
  else job.payload = payload;
}

// Воркера запускаем Cron-джобой как GET; можно и POST вручную
export async function GET() {
  return runWorker();
}
export async function POST() {
  return runWorker();
}

async function runWorker() {
  const startedAt = Date.now();
  const supabase = getSupabaseAdmin();

  // 1) Берём следующее queued (по приоритету и возрастанию created_at)
  const { data: job, error: selErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.error('[worker] select error:', selErr);
    return NextResponse.json({ ok: false, error: 'select_failed' }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ ok: true, processed: false, reason: 'no_job' });
  }

  // 2) Атомарно «захватываем» задание (если ещё queued)
  const { data: claimed, error: claimErr } = await supabase
    .from('jobs')
    .update({
      status: 'in_progress',
      attempts: (job.attempts ?? 0) + 1,
      error: null,
    })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select('id, attempts, payload')
    .single();

  if (claimErr || !claimed) {
    // Другой воркер его уже забрал — это нормально
    return NextResponse.json({ ok: true, processed: false, reason: 'race_lost', jobId: job.id });
  }

  // Локально синхронизируем attempts/payload
  job.attempts = claimed.attempts ?? job.attempts ?? 1;
  job.payload = claimed.payload ?? job.payload ?? {};

  try {
    await setStage(supabase, job, 'fetch');

    const extractor = new GenericReadabilityExtractor();
    const splitter = new LangchainTextSplitter();
    const embeddingsProvider = new GoogleEmbeddingsProvider(process.env.GOOGLE_API_KEY!);
    const store = new SupabaseStore(getSupabaseAdmin());

    const validatedUrl = new URL(job.url);
    const fetchedDoc = await extractor.fetch(validatedUrl, { timeoutMs: 25000, retries: 1 });

    await setStage(supabase, job, 'extract');
    const extractedDoc = await extractor.extract(fetchedDoc);

    const canonicalUrl = extractedDoc.canonicalUrl || fetchedDoc.finalUrl || validatedUrl.toString();
    const urlHash = await sha256(canonicalUrl);

    await setStage(supabase, job, 'upsert_document');
    const { documentId } = await store.upsertDocument({
      tenantId: job.tenant_id,
      url: validatedUrl.toString(),
      urlHash,
      canonicalUrl,
      title: extractedDoc.title ?? undefined,
      lang: extractedDoc.lang ?? undefined,
      markdown: extractedDoc.markdown ?? '',
      fetchedAt: new Date().toISOString(),
    });

    await setStage(supabase, job, 'split');
    const chunks = await splitter.split(extractedDoc.markdown ?? '');
    const chunkTexts: string[] = chunks.map((c: any) => (typeof c === 'string' ? c : c?.content ?? ''));

    await setStage(supabase, job, 'embed');
    const embeddingResponse = await embeddingsProvider.embed({ texts: chunkTexts });
    const chunksWithEmbeddings = chunks.map((chunk: any, index: number) => ({
      item: chunk,
      embedding: embeddingResponse.embeddings[index],
      model: embeddingResponse.model,
      dim: embeddingResponse.dim,
    }));

    await setStage(supabase, job, 'store');
    const { count } = await store.upsertChunks({
      tenantId: job.tenant_id,
      documentId,
      chunks: chunksWithEmbeddings,
    });

    const elapsed_ms = Date.now() - startedAt;

    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payload: {
          ...(job.payload ?? {}),
          stage: 'done',
          documentId,
          chunks: chunks.length,
          stored: count,
          url: canonicalUrl,
          elapsed_ms,
        },
      })
      .eq('id', job.id)
      .eq('status', 'in_progress');

    return NextResponse.json({
      ok: true,
      processed: true,
      jobId: job.id,
      documentId,
      chunks: chunks.length,
      stored: count,
      elapsed_ms,
    });
  } catch (e: any) {
    console.error('[worker] failed:', e?.message ?? e);
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: String(e?.message ?? e).slice(0, 1000),
        payload: { ...(job.payload ?? {}), stage: 'failed' },
      })
      .eq('id', job.id);

    return NextResponse.json({ ok: false, processed: false, jobId: job.id, error: String(e?.message ?? e) }, { status: 500 });
  }
}

