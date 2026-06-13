export type WebSearchResult = {
  title: string;
  snippet: string;
};

export type WebSearchFetchResult = {
  contextBlock: string | null;
  errorMessage: string | null;
};

const DUCKDUCKGO_LITE_URL = "https://lite.duckduckgo.com/lite/";
const WEB_SEARCH_TIMEOUT_MS = 8000;
const MAX_SNIPPET_LENGTH = 200;
const MAX_TITLE_LENGTH = 120;
const MAX_RESULTS = 3;

const RESULT_LINK_PATTERN =
  /<a\b[^>]*\bresult-link\b[^>]*>([\s\S]*?)<\/a>/gi;
const RESULT_SNIPPET_PATTERN =
  /<[^>]*\bresult-snippet\b[^>]*>([\s\S]*?)<\/(?:td|span|a|div)>/gi;

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function cleanExtractedText(raw: string): string {
  return decodeHtmlEntities(stripHtmlTags(raw)).replace(/\s+/g, " ").trim();
}

function extractHtmlMatches(html: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  const expression = new RegExp(pattern.source, pattern.flags);

  for (const match of html.matchAll(expression)) {
    const value = cleanExtractedText(match[1] ?? "");
    if (value) {
      matches.push(value);
    }
  }

  return matches;
}

function addUniqueResult(
  results: WebSearchResult[],
  seen: Set<string>,
  title: string,
  snippet: string
): void {
  if (results.length >= MAX_RESULTS) {
    return;
  }

  const normalizedTitle = truncateText(title, MAX_TITLE_LENGTH);
  const normalizedSnippet = truncateText(snippet, MAX_SNIPPET_LENGTH);

  if (!normalizedTitle && !normalizedSnippet) {
    return;
  }

  const key = `${normalizedTitle}|${normalizedSnippet}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  results.push({
    title: normalizedTitle || "Result",
    snippet: normalizedSnippet || normalizedTitle,
  });
}

function parseLiteSearchResults(html: string): WebSearchResult[] {
  const titles = extractHtmlMatches(html, RESULT_LINK_PATTERN);
  const snippets = extractHtmlMatches(html, RESULT_SNIPPET_PATTERN);
  const results: WebSearchResult[] = [];
  const seen = new Set<string>();

  const pairCount = Math.min(MAX_RESULTS, titles.length, snippets.length);
  for (let index = 0; index < pairCount; index += 1) {
    addUniqueResult(results, seen, titles[index], snippets[index]);
  }

  if (results.length === 0 && titles.length > 0) {
    for (let index = 0; index < Math.min(MAX_RESULTS, titles.length); index += 1) {
      addUniqueResult(results, seen, titles[index], "");
    }
  }

  return results.slice(0, MAX_RESULTS);
}

export function formatWebSearchContext(results: WebSearchResult[]): string {
  const lines = results.map(
    (result, index) =>
      `${index + 1}. [${result.title}] - [${result.snippet}]`
  );

  return `Context from Web Search:\n${lines.join("\n")}`;
}

async function fetchWithTimeout(
  url: string,
  body: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
      body,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWebSearchContext(
  query: string
): Promise<WebSearchFetchResult> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        contextBlock: null,
        errorMessage: null,
      };
    }

    const body = `q=${encodeURIComponent(trimmedQuery)}`;
    const response = await fetchWithTimeout(
      DUCKDUCKGO_LITE_URL,
      body,
      WEB_SEARCH_TIMEOUT_MS
    );

    if (!response.ok) {
      return {
        contextBlock: null,
        errorMessage: "Web search failed. Answering from local knowledge.",
      };
    }

    const html = await response.text();
    const results = parseLiteSearchResults(html);

    if (results.length === 0) {
      return {
        contextBlock: null,
        errorMessage: null,
      };
    }

    return {
      contextBlock: formatWebSearchContext(results),
      errorMessage: null,
    };
  } catch (error) {
    console.error("Web search request failed:", error);
    return {
      contextBlock: null,
      errorMessage: "Web search failed. Answering from local knowledge.",
    };
  }
}
