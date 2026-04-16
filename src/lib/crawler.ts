import * as cheerio from "cheerio";
import type { CrawlResult } from "@/types";

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5 MB

export class CrawlError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TIMEOUT"
      | "SIZE_LIMIT"
      | "HTTP_ERROR"
      | "INVALID_URL"
      | "NETWORK_ERROR"
  ) {
    super(message);
  }
}

function resolveUrl(base: string, rel: string): string {
  try {
    return new URL(rel, base).href;
  } catch {
    return rel;
  }
}

function getBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

function isInternal(href: string, baseUrl: string): boolean {
  try {
    const target = new URL(href);
    const base = new URL(baseUrl);
    return target.host === base.host;
  } catch {
    return href.startsWith("/") || !href.startsWith("http");
  }
}

export async function crawlPage(rawUrl: string): Promise<CrawlResult> {
  // Validate URL
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new CrawlError("Nur http:// und https:// URLs werden unterstützt.", "INVALID_URL");
    }
  } catch (e) {
    if (e instanceof CrawlError) throw e;
    throw new CrawlError(`Ungültige URL: ${rawUrl}`, "INVALID_URL");
  }

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(url.href, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UXAnalyzer/1.0; +https://ux-optimizer.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en;q=0.9",
      },
      redirect: "follow",
    });
  } catch (e: unknown) {
    const err = e as Error;
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new CrawlError(
        `Die Seite hat nicht innerhalb von ${FETCH_TIMEOUT_MS / 1000}s geantwortet.`,
        "TIMEOUT"
      );
    }
    throw new CrawlError(`Netzwerkfehler: ${err.message}`, "NETWORK_ERROR");
  }

  const loadTimeMs = Date.now() - startTime;

  if (!response.ok) {
    throw new CrawlError(
      `HTTP ${response.status}: ${response.statusText}`,
      "HTTP_ERROR"
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new CrawlError(
      `Die URL liefert keinen HTML-Inhalt (${contentType}).`,
      "HTTP_ERROR"
    );
  }

  const htmlBuffer = await response.arrayBuffer();
  if (htmlBuffer.byteLength > MAX_HTML_SIZE) {
    throw new CrawlError(
      `HTML zu groß: ${(htmlBuffer.byteLength / 1024 / 1024).toFixed(1)} MB (max 5 MB).`,
      "SIZE_LIMIT"
    );
  }

  const html = new TextDecoder().decode(htmlBuffer);
  const baseUrl = getBaseUrl(url.href);
  const finalUrl = response.url || url.href;

  const $ = cheerio.load(html);

  // ── Title & Meta ────────────────────────────────────────────────────────
  const title = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ?? "";
  const metaKeywords =
    $('meta[name="keywords"]').attr("content")?.trim() ?? "";
  const canonicalUrl =
    $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const langAttr = $("html").attr("lang");
  const hasLangAttribute = !!langAttr;
  const langValue = langAttr ?? "";

  // ── OG Tags ─────────────────────────────────────────────────────────────
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property") ?? "";
    const content = $(el).attr("content") ?? "";
    if (prop && content) ogTags[prop] = content;
  });

  // ── Headings ─────────────────────────────────────────────────────────────
  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName.replace("h", ""), 10);
    headings.push({ level, text: $(el).text().trim() });
  });

  // ── Images ──────────────────────────────────────────────────────────────
  const images: CrawlResult["images"] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const alt = $(el).attr("alt") ?? null;
    const width = parseInt($(el).attr("width") ?? "", 10) || undefined;
    const height = parseInt($(el).attr("height") ?? "", 10) || undefined;
    images.push({ src: resolveUrl(finalUrl, src), alt, width, height });
  });

  // ── Links ────────────────────────────────────────────────────────────────
  const links: CrawlResult["links"] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    const absoluteHref = resolveUrl(finalUrl, href);
    links.push({ href: absoluteHref, text, isInternal: isInternal(absoluteHref, baseUrl) });
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigation: { text: string; href: string }[] = [];
  $("nav a, [role='navigation'] a, header a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (text && href) {
      navigation.push({ text, href: resolveUrl(finalUrl, href) });
    }
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  const forms: CrawlResult["forms"] = [];
  $("form").each((_, form) => {
    const inputs: CrawlResult["forms"][0]["inputs"] = [];
    $(form)
      .find("input, textarea, select")
      .each((_, input) => {
        const id = $(input).attr("id") ?? "";
        const label = id
          ? $(`label[for="${id}"]`).first().text().trim() || null
          : null;
        inputs.push({
          type: $(input).attr("type") ?? input.tagName.toLowerCase(),
          name: $(input).attr("name") ?? "",
          id,
          label,
          placeholder: $(input).attr("placeholder") ?? "",
          required: $(input).attr("required") !== undefined,
        });
      });
    forms.push({
      action: $(form).attr("action") ?? "",
      method: $(form).attr("method") ?? "get",
      inputs,
    });
  });

  // ── CSS Files ─────────────────────────────────────────────────────────────
  const cssFiles: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) cssFiles.push(resolveUrl(finalUrl, href));
  });

  // ── Inline CSS ────────────────────────────────────────────────────────────
  const inlineCssBlocks: string[] = [];
  $("style").each((_, el) => {
    const content = $(el).html()?.trim() ?? "";
    if (content) inlineCssBlocks.push(content);
  });

  // ── Scripts ───────────────────────────────────────────────────────────────
  const scriptCount = $("script").length;

  // ── Skip link detection ───────────────────────────────────────────────────
  const hasSkipLink =
    $('[href="#main"], [href="#content"], [href="#main-content"], .skip-link, .skip-to-content').length > 0;

  return {
    url: finalUrl,
    baseUrl,
    html,
    statusCode: response.status,
    title,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogTags,
    headings,
    images,
    links,
    navigation,
    forms,
    cssFiles,
    inlineCssBlocks,
    scriptCount,
    hasViewportMeta,
    hasLangAttribute,
    langValue,
    hasSkipLink,
    htmlSizeBytes: htmlBuffer.byteLength,
    robotsAllowed: true,
    loadTimeMs,
  };
}
