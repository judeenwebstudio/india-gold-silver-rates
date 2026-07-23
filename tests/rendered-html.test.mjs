import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the RateStack homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /RateStack/);
  assert.match(html, /Indicative city rates/);
  assert.match(html, /Gold price calculator/);
  assert.match(html, /Rates in major cities/);
  assert.match(html, /Know your gold hallmark/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("includes the bespoke social sharing card", async () => {
  await access(new URL("../public/og.png", import.meta.url));
});
