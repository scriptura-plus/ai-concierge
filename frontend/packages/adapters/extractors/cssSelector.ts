import { Extractor, FetchResult, ExtractResult, FetchOpts } from '@core/extractor';
import * as cheerio from 'cheerio';


export class CssSelectorExtractor implements Extractor {
  constructor(private readonly selectors: string[]) {}

  canHandle(url: URL) { 
    return url.protocol.startsWith("http"); 
  }

  async fetch(url: URL, opts: FetchOpts = {}): Promise<FetchResult> {
    const userAgent = opts.userAgent ?? 'AI-ConciergeBot/1.0';
    const timeout = opts.timeoutMs ?? 15000;

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
    const $ = cheerio.load(doc.body);

    // Удаляем ненужные элементы для очистки контента
    $('script, style, nav, aside, footer, header').remove();

    let content = '';

    // Пробуем найти контент по каждому селектору из списка
    for (const selector of this.selectors) {
      if ($(selector).length > 0) {
        content = $(selector).text();
        break; // Останавливаемся после первого успешного селектора
      }
    }

    if (!content) {
      throw new Error(`None of the provided selectors found content on the page.`);
    }

    // Простое очищение текста от лишних пробелов
    const cleanedContent = content.replace(/\s\s+/g, ' ').trim();

    return {
      markdown: cleanedContent,
      text: cleanedContent,
      title: $('title').text() || undefined,
    };
  }
}