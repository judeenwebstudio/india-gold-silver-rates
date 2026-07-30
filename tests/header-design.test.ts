import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync("components/Header.tsx", "utf8");

test("header has premium top and sticky scroll states without route changes", () => {
  assert.match(header, /window\.scrollY > 24/);
  assert.match(header, /bg-\[#171411\]\/92/);
  assert.match(header, /bg-\[#FAF7F2\]\/96/);
  assert.match(header, /sticky top-0 z-50/);
  assert.match(header, /border-amber-500\/70/);
  assert.match(header, /backdrop-blur-xl/);
  for (const route of ["/#rates", "/shop", "/#calculator"]) assert.match(header, new RegExp(route.replace("/", "\\/")));
  assert.doesNotMatch(header, /\/#cities/);
  assert.doesNotMatch(header, /label: "Cities"/);
});

test("navigation exposes active, hover, focus and reduced-motion states", () => {
  assert.match(header, /aria-current/);
  assert.match(header, /group-hover:scale-x-100/);
  assert.match(header, /focus-visible:outline-amber-400/);
  assert.match(header, /motion-reduce:transition-none/);
  assert.match(header, /motion-reduce:transform-none/);
});

test("login, registration, and accessible mobile menu remain available", () => {
  assert.match(header, /handleOpenAuth\("login"\)/);
  assert.match(header, /handleOpenAuth\("register"\)/);
  assert.match(header, /bg-gradient-to-br from-amber-300/);
  assert.match(header, /Close navigation menu/);
  assert.match(header, /Open navigation menu/);
  assert.match(header, /aria-expanded=\{open\}/);
  assert.match(header, /Mobile navigation/);
});
