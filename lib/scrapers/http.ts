import { ScraperFetchError, ScraperRejectedError } from "@/lib/scrapers/errors";

const HTML_CACHE_TTL_MS = 60_000;
const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;

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

function createAbortSignal() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function fetchWithTimeout(url: string, userAgent: string) {
  const abort = createAbortSignal();

  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "Accept-Language": "en-IN,en;q=0.8",
        "User-Agent": userAgent,
      },
      signal: abort.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ScraperFetchError("The public rate source timed out.");
    }

    throw new ScraperFetchError("The public rate source could not be reached.");
  } finally {
    abort.clear();
  }
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

async function assertRobotsAllowed(sourceUrl: URL, userAgent: string) {
  const robotsUrl = new URL("/robots.txt", sourceUrl.origin).toString();
  const cached = robotsCache.get(robotsUrl);
  let robots = cached && cached.expiresAt > Date.now() ? cached : null;

  if (!robots) {
    const response = await fetchWithTimeout(robotsUrl, userAgent);
    const body = await response.text();
    robots = {
      status: response.status,
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

export async function fetchPublicHtml(url: string, userAgent: string) {
  const sourceUrl = new URL(url);
  const cached = htmlCache.get(sourceUrl.toString());

  if (cached && cached.expiresAt > Date.now()) {
    return { html: cached.html, fetchedAt: cached.fetchedAt, fromCache: true };
  }

  await assertRobotsAllowed(sourceUrl, userAgent);
  const response = await fetchWithTimeout(sourceUrl.toString(), userAgent);

  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new ScraperFetchError(
      `The source refused the public request (HTTP ${response.status}); no bypass was attempted.`,
    );
  }

  if (!response.ok) {
    throw new ScraperFetchError(`The source returned HTTP ${response.status}.`);
  }

  if (new URL(response.url).protocol !== "https:") {
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
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    throw new ScraperRejectedError("The source document exceeded the safe size limit.");
  }

  if (looksLikeAccessChallenge(html)) {
    throw new ScraperFetchError(
      "The source returned an access challenge; no CAPTCHA or protection bypass was attempted.",
    );
  }

  const fetchedAt = new Date().toISOString();
  htmlCache.set(sourceUrl.toString(), {
    html,
    fetchedAt,
    expiresAt: Date.now() + HTML_CACHE_TTL_MS,
  });

  return { html, fetchedAt, fromCache: false };
}
