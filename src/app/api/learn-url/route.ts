import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@core/supabase';
import { GenericReadabilityExtractor } from '@adapters/extractors/genericReadability';
import { LangchainTextSplitter } from '@adapters/splitters/langchain';
import { GoogleEmbeddingsProvider } from '@adapters/embeddings/google';
import { SupabaseStore } from '@adapters/stores/supabase';

async function sha256(s: string) {
  const enc = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function POST(req: Request) {
  try {
    const { url, tenantId } = await req.json();
    if (!url || !tenantId) {
      return NextResponse.json({ error: 'URL and tenantId are required' }, { status: 400 });
    }
    const validatedUrl = new URL(url);

    const extractor = new GenericReadabilityExtractor();
    const splitter = new LangchainTextSplitter();
    const embeddingsProvider = new GoogleEmbeddingsProvider(process.env.GOOGLE_API_KEY!);
    const store = new SupabaseStore(supabaseAdmin);

    console.log(`[Pipeline] Fetching content from ${validatedUrl}...`);
    const fetchedDoc = await extractor.fetch(validatedUrl);
    const extractedDoc = await extractor.extract(fetchedDoc);
    console.log(`[Pipeline] Extracted title: ${extractedDoc.title}`);

    const canonicalUrl = extractedDoc.canonicalUrl || fetchedDoc.finalUrl;
    const urlHash = await sha256(canonicalUrl);

    const { documentId } = await store.upsertDocument({
      tenantId,
      url: validatedUrl.toString(),
      urlHash,
      canonicalUrl,
      title: extractedDoc.title,
      lang: extractedDoc.lang,
      markdown: extractedDoc.markdown,
      fetchedAt: new Date().toISOString(),
    });
    console.log(`[Pipeline] Document record upserted with ID: ${documentId}`);

    const chunks = await splitter.split(extractedDoc.markdown);
    console.log(`[Pipeline] Split content into ${chunks.length} chunks.`);

    // --- ВОТ ЭТИХ ЧАСТЕЙ НЕ ХВАТАЛО ---
    console.log('[Pipeline] Generating embeddings...');
    const contentForEmbedding = chunks.map(chunk => chunk.content);
    const embeddingResponse = await embeddingsProvider.embed({ texts: contentForEmbedding });
    console.log(`[Pipeline] Embeddings generated with model ${embeddingResponse.model}.`);

    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        item: chunk,
        embedding: embeddingResponse.embeddings[index],
        model: embeddingResponse.model,
        dim: embeddingResponse.dim
    }));

    console.log('[Pipeline] Storing chunks in the database...');
    const { count } = await store.upsertChunks({
        tenantId,
        documentId,
        chunks: chunksWithEmbeddings,
    });
    console.log(`[Pipeline] Successfully stored ${count} chunks.`);
    // --- КОНЕЦ НЕДОСТАЮЩИХ ЧАСТЕЙ ---

    return NextResponse.json({ ok: true, documentId, chunksStored: count });

  } catch (error: any) {
    console.error('[Pipeline] Ingestion pipeline failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}