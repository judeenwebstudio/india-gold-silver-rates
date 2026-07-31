import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSilverPerGram, SILVER_WEIGHT_STORAGE_KEY, silverValuePaise } from "../lib/silver-rate-calculation";

test("10g source normalizes to 1g",()=>assert.equal(normalizeSilverPerGram("1234.50"),123.45));
for (const [grams,paise] of [[1,12345n],[10,123450n],[100,1234500n],[500,6172500n],[1000,12345000n]] as const) test(`${grams}g silver calculation`,()=>assert.equal(silverValuePaise("123.45",grams),paise));
test("decimal values round to the nearest paise",()=>assert.equal(silverValuePaise("123.4567",1),12346n));
test("invalid source values are rejected",()=>{assert.equal(normalizeSilverPerGram("bad"),null);assert.equal(silverValuePaise(-1,10),null)});
test("website preference uses a stable localStorage key",()=>assert.equal(SILVER_WEIGHT_STORAGE_KEY,"ratestack_silver_weight_grams"));
