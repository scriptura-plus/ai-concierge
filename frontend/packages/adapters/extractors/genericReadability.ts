import { Extractor, FetchResult, ExtractResult, FetchOpts } from '@core/extractor';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch';

export class GenericReadabilityExtractor implements Extractor {
  canHandle(url: URL) {
    return url.protocol.startsWith("http");
  }

  async fetch(url: URL, opts: FetchOpts = {}): Promise<FetchResult> {
    const userAgent = opts.userAgent ?? 'AI-ConciergeBot/1.0';
    const timeout = opts.timeoutMs ?? 15000; // Увеличим таймаут для надежности

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const body = await response.text();
    const finalUrl = response.url;
    const headers = Object.fromEntries(response.headers.entries());
    const contentType = response.headers.get('content-type') ?? undefined;

    return {
      url: url.toString(),
      finalUrl,
      status: response.status,
      headers,
      body,
      contentType,
    };
  }

  async extract(doc: FetchResult): Promise<ExtractResult> {
    const dom = new JSDOM(doc.body, {
      url: doc.finalUrl,
    });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to extract article using Readability.");
    }

    // Примечание: для простоты мы пока используем чистый текст (textContent) вместо
    // преобразования в Markdown. Позже мы можем добавить библиотеку для этого.
    return {
      title: article.title,
      lang: article.lang,
      markdown: article.textContent, // Используем textContent как замену для Markdown
      text: article.textContent,
    };
  }
}