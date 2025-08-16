import { ChunkItem } from "./types";

export interface UpsertDocumentInput {
  tenantId: string;
  sourceId?: string;
  url: string;
  canonicalUrl?: string;
  urlHash: string;
  title?: string;
  lang?: string;
  htmlRaw?: string;
  markdown: string;
  fetchedAt?: string;            // ISO
  etag?: string;
  lastModified?: string;
}

export interface UpsertChunksInput {
  tenantId: string;
  documentId: string;
  chunks: Array<{
    item: ChunkItem;
    embedding?: number[];        // можно отдельным шагом
    model?: string;
    dim?: number;
  }>;
}

export interface DocumentStore {
  upsertDocument(doc: UpsertDocumentInput): Promise<{ documentId: string }>;
  upsertChunks(input: UpsertChunksInput): Promise<{ count: number }>;
}