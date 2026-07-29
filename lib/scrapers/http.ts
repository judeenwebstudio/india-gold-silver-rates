import { ScraperFetchError, ScraperRejectedError } from "@/lib/scrapers/errors";
import https from "node:https";
import { gunzipSync, inflateSync } from "node:zlib";

const HTML_CACHE_TTL_MS = 15 * 60_000;
const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const TRANSIENT_ATTEMPTS = 3;

type CachedHtml = {
  html: string;
  fetchedAt: string;
  expiresAt: number;
};

type CachedRobots = {
  status: number;
  body: string;
  expiresAt: number;
};

const htmlCache = new Map<string, CachedHtml>();
const robotsCache = new Map<string, CachedRobots>();

const nodeHttpsFetch = ((input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return new Promise<Response>((resolve, reject) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const request = https.request(url, {
      method: init?.method ?? "GET",
      headers,
      signal: init?.signal ?? undefined,
    }, (response) => {
      const chunks: Buffer[] = [];
      let compressedBytes = 0;
      response.on("data", (chunk: Buffer) => {
        compressedBytes += chunk.length;
        if (compressedBytes > MAX_HTML_BYTES) {
          request.destroy(new Error("Response exceeded the safe compressed size limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        try {
          const compressed = Buffer.concat(chunks);
          const encoding = String(response.headers["content-encoding"] ?? "").toLowerCase();
          const body = encoding === "gzip"
            ? gunzipSync(compressed)
            : encoding === "deflate"
              ? inflateSync(compressed)
              : compressed;
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (value === undefined || name === "content-length" || name === "content-encoding") continue;
            for (const item of Array.isArray(value) ? value : [value]) responseHeaders.append(name, String(item));
          }
          if (encoding) responseHeaders.set("x-ratestack-original-content-encoding", encoding);
          responseHeaders.set("content-length", String(body.length));
          resolve(new Response(body, {
            status: response.statusCode ?? 500,
            statusText: response.statusMessage,
            headers: responseHeaders,
          }));
        } catch (error) {
          reject(error);
        }
      });
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end();
  });
}) as typeof fetch;

function createAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function fetchWithTimeout(
  url: string,
  userAgent: string,
  requestTimeoutMs: number,
  fetchImpl: typeof fetch = nodeHttpsFetch,
) {
  const redirectChain: Array<{ status: number; url: string; location: string }> = [];
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const abort = createAbortSignal(requestTimeoutMs);
    try {
      const response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "Accept-Language": "en-IN,en;q=0.8",
          // Undici's default Brotli negotiation receives a Cloudflare 403 from
          // GoodReturns. Standards-based gzip/deflate is accepted and decoded.
          "Accept-Encoding": "gzip, deflate",
          "User-Agent": userAgent,
        },
        signal: abort.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new ScraperRejectedError("The source returned a redirect without a Location header.");
        const nextUrl = new URL(location, currentUrl);
        if (nextUrl.protocol !== "https:") throw new ScraperRejectedError("The source redirected to a non-HTTPS address.");
        redirectChain.push({ status: response.status, url: currentUrl, location: nextUrl.toString() });
        currentUrl = nextUrl.toString();
        continue;
      }
      return { response, redirectChain, finalUrl: currentUrl };
    } catch (error) {
      if (error instanceof ScraperRejectedError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ScraperFetchError("The public rate source timed out.", { retryable: true, url: currentUrl });
      }
      throw new ScraperFetchError("The public rate source could not be reached.", {
        retryable: true,
        url: currentUrl,
        cause: error instanceof Error ? error.name : "UnknownError",
      });
    } finally {
      abort.clear();
    }
  }
  throw new ScraperRejectedError(`The source exceeded the ${MAX_REDIRECTS}-redirect limit.`);
}

function stripRobotsComment(line: string) {
  return line.split("#", 1)[0]?.trim() ?? "";
}

function robotsAllows(robotsText: string, userAgent: string, pathname: string) {
  type Group = { agents: string[]; rules: Array<{ allow: boolean; path: string }> };
  const groups: Group[] = [];
  let current: Group = { agents: [], rules: [] };

  const flush = () => {
    if (current.agents.length > 0) {
      groups.push(current);
    }
    current = { agents: [], rules: [] };
  };

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = stripRobotsComment(rawLine);
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator < 0) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (current.rules.length > 0) flush();
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current.agents.length > 0) {
      current.rules.push({ allow: field === "allow", path: value });
    }
  }
  flush();

  const productToken = userAgent.split(/[\s/]/, 1)[0]?.toLowerCase() ?? "";
  const matchingGroups = groups.filter(({ agents }) =>
    agents.some((agent) => agent === "*" || (agent && productToken.includes(agent))),
  );
  const matchingRules = matchingGroups
    .flatMap(({ rules }) => rules)
    .filter(({ path }) => path && pathname.startsWith(path))
    .sort((a, b) => b.path.length - a.path.length);

  return matchingRules[0]?.allow ?? true;
}

async function assertRobotsAllowed(
  sourceUrl: URL,
  userAgent: string,
  requestTimeoutMs: number,
  fetchImpl?: typeof fetch,
) {
  const robotsUrl = new URL("/robots.txt", sourceUrl.origin).toString();
  const cached = robotsCache.get(robotsUrl);
  let robots = cached && cached.expiresAt > Date.now() ? cached : null;

  if (!robots) {
    const result = await fetchWithTimeout(robotsUrl, userAgent, requestTimeoutMs, fetchImpl);
    const body = await result.response.text();
    robots = {
      status: result.response.status,
      body,
      expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS,
    };
    robotsCache.set(robotsUrl, robots);
  }

  if (robots.status === 404) return;

  if (robots.status !== 200) {
    throw new ScraperRejectedError(
      `The source robots policy could not be verified (HTTP ${robots.status}).`,
    );
  }

  if (!robotsAllows(robots.body, userAgent, sourceUrl.pathname)) {
    throw new ScraperRejectedError("The source robots policy disallows this request path.");
  }
}

function looksLikeAccessChallenge(html: string) {
  return [
    /<title>\s*just a moment/i,
    /cf-chl-/i,
    /challenge-platform/i,
    /id=["']challenge-form/i,
    /attention required[^<]*cloudflare/i,
  ].some((pattern) => pattern.test(html));
}

export async function fetchPublicHtml(
  url: string,
  userAgent: string,
  requestTimeoutMs: number,
  options: {
    fetchImpl?: typeof fetch;
    wait?: (delayMs: number) => Promise<void>;
    maxAttempts?: number;
  } = {},
) {
  const sourceUrl = new URL(url);
  const cached = htmlCache.get(sourceUrl.toString());

  if (cached && cached.expiresAt > Date.now()) {
    return {
      html: cached.html,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      status: null,
      responseUrl: sourceUrl.toString(),
    };
  }

  await assertRobotsAllowed(sourceUrl, userAgent, requestTimeoutMs, options.fetchImpl);
  const wait = options.wait ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const maxAttempts = Math.max(1, Math.min(TRANSIENT_ATTEMPTS, options.maxAttempts ?? TRANSIENT_ATTEMPTS));
  let fetchResult: Awaited<ReturnType<typeof fetchWithTimeout>> | null = null;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fetchResult = await fetchWithTimeout(
        sourceUrl.toString(), userAgent, requestTimeoutMs, options.fetchImpl,
      );
      if (fetchResult.response.status === 429 || fetchResult.response.status >= 500) {
        throw new ScraperFetchError(`The source returned transient HTTP ${fetchResult.response.status}.`, {
          retryable: true,
          status: fetchResult.response.status,
        });
      }
      break;
    } catch (error) {
      lastError = error;
      const retryable = error instanceof ScraperFetchError && error.details?.retryable === true;
      if (!retryable || attempt === maxAttempts) throw error;
      await wait(500 * 2 ** (attempt - 1));
    }
  }
  if (!fetchResult) throw lastError ?? new ScraperFetchError("The public rate source could not be reached.");
  const { response, redirectChain, finalUrl } = fetchResult;
  console.info("[rate-source] HTTP response", {
    sourceUrl: sourceUrl.toString(),
    redirectChain,
    finalUrl,
    status: response.status,
    contentType: response.headers.get("content-type") ?? null,
    contentEncoding: response.headers.get("x-ratestack-original-content-encoding") ?? response.headers.get("content-encoding") ?? null,
    declaredSize: response.headers.get("content-length") ?? null,
  });

  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new ScraperFetchError(
      `The source refused the public request (HTTP ${response.status}); no bypass was attempted.`,
      { status: response.status, redirectChain, finalUrl },
    );
  }

  if (!response.ok) {
    throw new ScraperFetchError(`The source returned HTTP ${response.status}.`);
  }

  if (new URL(finalUrl).protocol !== "https:") {
    throw new ScraperRejectedError("The source redirected to a non-HTTPS address.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new ScraperRejectedError("The source did not return an HTML document.");
  }

  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_HTML_BYTES) {
    throw new ScraperRejectedError("The source document exceeded the safe size limit.");
  }

  const html = await response.text();
  const responseSize = Buffer.byteLength(html, "utf8");
  if (responseSize > MAX_HTML_BYTES) {
    throw new ScraperRejectedError("The source document exceeded the safe size limit.");
  }

  if (looksLikeAccessChallenge(html)) {
    throw new ScraperFetchError(
      "The source returned an access challenge; no CAPTCHA or protection bypass was attempted.",
    );
  }

  const fetchedAt = new Date().toISOString();
  console.info("[rate-source] HTTP body accepted", {
    sourceUrl: sourceUrl.toString(),
    finalUrl,
    responseSize,
    contentType,
    redirectChain,
  });
  htmlCache.set(sourceUrl.toString(), {
    html,
    fetchedAt,
    expiresAt: Date.now() + HTML_CACHE_TTL_MS,
  });

  return {
    html,
    fetchedAt,
    fromCache: false,
    status: response.status,
    responseUrl: finalUrl,
    redirectChain,
    responseSize,
  };
}

export function clearRateSourceHttpCachesForTests() {
  htmlCache.clear();
  robotsCache.clear();
}
