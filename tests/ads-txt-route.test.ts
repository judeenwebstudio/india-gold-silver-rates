import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../app/ads.txt/route";

const EXPECTED_ADS_TXT =
  "google.com, pub-1593649181553357, DIRECT, f08c47fec0942fa0";

test("ads.txt serves the configured AdSense publisher as plain text", async () => {
  const response = GET();
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(body, EXPECTED_ADS_TXT);
  assert.equal(body.split(EXPECTED_ADS_TXT).length - 1, 1);
});
