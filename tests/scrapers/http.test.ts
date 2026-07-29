import assert from "node:assert/strict";
import test from "node:test";
import { clearRateSourceHttpCachesForTests, fetchPublicHtml } from "../../lib/scrapers/http";
import { ScraperFetchError } from "../../lib/scrapers/errors";

const agent = "RateStack tests (+https://ratestack.in/contact-us)";
const html = "<html><body><h1>Gold Rate in Trichy</h1></body></html>";
const headers = { "content-type": "text/html; charset=UTF-8" };

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) =>
    handler(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, init)) as typeof fetch;
}

function withRobots(pageHandler: (url: string, init?: RequestInit) => Promise<Response>) {
  return mockFetch(async (url, init) =>
    url.endsWith("/robots.txt")
      ? new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } })
      : pageHandler(url, init));
}

test("accepts a 200 HTML response and requests gzip/deflate compatibility", async () => {
  clearRateSourceHttpCachesForTests();
  let acceptEncoding = "";
  const response = await fetchPublicHtml("https://rates.example/gold", agent, 1000, {
    fetchImpl: withRobots(async (_url, init) => {
      acceptEncoding = new Headers(init?.headers).get("accept-encoding") ?? "";
      return new Response(html, { status: 200, headers });
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.responseSize, Buffer.byteLength(html));
  assert.equal(acceptEncoding, "gzip, deflate");
});

test("follows ordinary 301 and 302 HTTPS redirects and records the chain", async () => {
  clearRateSourceHttpCachesForTests();
  const response = await fetchPublicHtml("https://rates.example/start", agent, 1000, {
    fetchImpl: withRobots(async (url) => {
      if (url.endsWith("/start")) return new Response("", { status: 301, headers: { location: "/middle" } });
      if (url.endsWith("/middle")) return new Response("", { status: 302, headers: { location: "/final" } });
      return new Response(html, { status: 200, headers });
    }),
  });
  assert.equal(response.responseUrl, "https://rates.example/final");
  assert.deepEqual(response.redirectChain?.map((item) => item.status), [301, 302]);
});

for (const status of [403, 404]) {
  test(`rejects HTTP ${status} without returning provider HTML`, async () => {
    clearRateSourceHttpCachesForTests();
    await assert.rejects(
      () => fetchPublicHtml(`https://rates.example/status-${status}`, agent, 1000, {
        fetchImpl: withRobots(async () => new Response("provider error page", { status, headers })),
        wait: async () => {},
      }),
      (error: unknown) => error instanceof ScraperFetchError && error.message.includes(String(status)),
    );
  });
}

test("retries transient timeouts with exponential backoff and then fails safely", async () => {
  clearRateSourceHttpCachesForTests();
  let pageCalls = 0;
  const waits: number[] = [];
  await assert.rejects(
    () => fetchPublicHtml("https://rates.example/timeout", agent, 10, {
      fetchImpl: withRobots(async () => {
        pageCalls += 1;
        throw new DOMException("timed out", "AbortError");
      }),
      wait: async (delay) => { waits.push(delay); },
    }),
    /timed out/i,
  );
  assert.equal(pageCalls, 3);
  assert.deepEqual(waits, [500, 1000]);
});

test("reuses the last successful response inside the cache window", async () => {
  clearRateSourceHttpCachesForTests();
  let pageCalls = 0;
  const fetchImpl = withRobots(async () => {
    pageCalls += 1;
    return new Response(html, { status: 200, headers });
  });
  const first = await fetchPublicHtml("https://rates.example/cached", agent, 1000, { fetchImpl });
  const second = await fetchPublicHtml("https://rates.example/cached", agent, 1000, { fetchImpl });
  assert.equal(first.fromCache, false);
  assert.equal(second.fromCache, true);
  assert.equal(pageCalls, 1);
});
