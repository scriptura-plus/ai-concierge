import { Extractor, FetchResult, ExtractResult } from "@core/extractor";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

type FetchOpts = { timeoutMs?: number; retries?: number };

export class GenericReadabilityExtractor implements Extractor {
  canHandle(_url: URL, contentType?: string): boolean {
    return !contentType || contentType.includes("text/html");
  }

  private async fetchOnce(url: URL, timeoutMs: number): Promise<FetchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ru,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
      },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Fetch failed: ${res.status} ${res.statusText} ${txt?.slice(0,200)}`);
    }

    const htmlText = await res.text();
    const contentType = res.headers.get("content-type") ?? "";

    // ВАЖНО: возвращаем поле "content", а не "html"
    return {
      finalUrl: res.url || url.toString(),
      contentType,
      content: htmlText,
    } as unknown as FetchResult;
  }

  async fetch(url: URL, opts?: FetchOpts): Promise<FetchResult> {
    const retries = opts?.retries ?? 2;
    const timeoutMs = opts?.timeoutMs ?? 45_000;

    let lastErr: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.fetchOnce(url, timeoutMs);
      } catch (e) {
        lastErr = e;
        if (i < retries) {
          await new Promise((r) => setTimeout(r, (i + 1) * 1000));
        }
      }
    }
    throw lastErr;
  }

  async extract(doc: FetchResult): Promise<ExtractResult> {
    // Читаем HTML из doc.html ИЛИ doc.content (в зависимости от реализации типов)
    const rawHtml = (doc as any).html ?? (doc as any).content ?? "";
    const dom = new JSDOM(rawHtml, { url: (doc as any).finalUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const title = article?.title ?? dom.window.document.title ?? "";
    const lang =
      (article as any)?.lang ??
      dom.window.document.documentElement.getAttribute("lang") ??
      undefined;
    const textContent =
      article?.textContent ??
      dom.window.document.body?.textContent ??
      "";
    const markdown = textContent;

    const canonicalEl = dom.window.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const canonicalUrl = canonicalEl?.href ?? undefined;

    return {
      title,
      lang,
      markdown,
      text: textContent,
      canonicalUrl,
    };
  }
}
