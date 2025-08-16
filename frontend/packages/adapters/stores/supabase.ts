import { DocumentStore, UpsertDocumentInput, UpsertChunksInput } from '@core/store';
import { SupabaseClient } from '@supabase/supabase-js';

// Эта функция нужна для создания хэша, как вы и планировали
async function sha256(s: string) {
    const enc = new TextEncoder().encode(s);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export class SupabaseStore implements DocumentStore {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    if (!client) {
      throw new Error("Supabase client is required");
    }
    this.client = client;
  }

  async upsertDocument(doc: UpsertDocumentInput): Promise<{ documentId: string; }> {
    const { data, error } = await this.client
      .from('documents')
      .upsert({
        tenant_id: doc.tenantId,
        source_id: doc.sourceId,
        url: doc.url,
        canonical_url: doc.canonicalUrl,
        url_hash: doc.urlHash,
        title: doc.title,
        lang: doc.lang,
        markdown: doc.markdown,
        html_raw: doc.htmlRaw,
        fetched_at: doc.fetchedAt,
        etag: doc.etag,
        last_modified: doc.lastModified,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id, url_hash',
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error upserting document:", error);
      throw new Error(`Failed to upsert document: ${error.message}`);
    }

    if (!data) {
        throw new Error("Upsert operation did not return a document ID.");
    }

    return { documentId: data.id };
  }

  async upsertChunks(input: UpsertChunksInput): Promise<{ count: number; }> {
    // Преобразуем чанки в формат для базы данных и вычисляем хэш
    const recordsToUpsert = await Promise.all(input.chunks.map(async (chunk) => ({
        tenant_id: input.tenantId,
        document_id: input.documentId,
        position: chunk.item.meta.position,
        section_title: chunk.item.meta.sectionTitle,
        heading_path: chunk.item.meta.headingPath,
        content: chunk.item.content,
        content_sha256: await sha256(chunk.item.content),
        tokens: chunk.item.meta.tokens,
        embedding: chunk.embedding,
        embedding_model: chunk.model,
        embedding_dim: chunk.dim,
    })));

    const { count, error } = await this.client
      .from('chunks')
      .upsert(recordsToUpsert, {
        onConflict: 'tenant_id, document_id, position',
        ignoreDuplicates: false, // Важно для обновления существующих
      });

    if (error) {
        console.error("Error upserting chunks:", error);
        throw new Error(`Failed to upsert chunks: ${error.message}`);
    }

    return { count: count ?? recordsToUpsert.length };
  }
}