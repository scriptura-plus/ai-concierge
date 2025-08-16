export type TenantID = string;   // uuid
export type SourceID = string;   // uuid
export type DocumentID = string; // uuid
export type ChunkID = string;    // uuid

export interface FetchOpts {
  timeoutMs?: number;
  userAgent?: string;
  etag?: string;
  lastModified?: string;
}

export interface FetchResult {
  url: string;
  finalUrl: string;           // после редиректов
  status: number;
  headers: Record<string, string>;
  body: string;               // html или текст
  contentType?: string;
}

export interface ExtractResult {
  title?: string;
  lang?: string;
  canonicalUrl?: string;
  html?: string;               // опционально: очищенный html
  markdown: string;           // нормализованный markdown
  text?: string;               // плоский текст (если нужен)
  meta?: Record<string, any>;
}

export interface ChunkMeta {
  position: number;
  sectionTitle?: string;
  headingPath?: string[];      // ["H2 title", "H3 title", ...]
  tokens?: number;
}

export interface ChunkItem {
  content: string;
  meta: ChunkMeta;
}