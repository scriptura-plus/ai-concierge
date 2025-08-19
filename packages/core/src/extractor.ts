import type { FetchResult, ExtractResult, FetchOpts } from "./types";
export type { FetchResult, ExtractResult, FetchOpts } from "./types";

export interface Extractor {
  /** Подходит ли экстрактор для данного URL/контента */
  canHandle(url: URL, contentType?: string): boolean;

  /** Загрузка ресурса (можно переопределять для спец-источников) */
  fetch(url: URL, opts?: FetchOpts): Promise<FetchResult>;

  /** Извлечение основной статьи → markdown (+метаданные) */
  extract(doc: FetchResult, config?: Record<string, any>): Promise<ExtractResult>;
}
