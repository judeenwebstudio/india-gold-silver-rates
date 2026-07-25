import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inrToPaise,
  paiseToInrNumber,
  formatPaiseToInr,
  gramsToMilligrams,
  milligramsToGrams,
  formatMilligramsToGrams,
  calculatePercentagePaise,
  calculateMetalValuePaise,
} from '../../lib/schemes/precision';

test('precision: inrToPaise and paiseToInrNumber conversion', () => {
  assert.equal(inrToPaise(1000), 100000n);
  assert.equal(inrToPaise('250.50'), 25050n);
  assert.equal(paiseToInrNumber(100000n), 1000);
  assert.equal(formatPaiseToInr(125050n), '₹1,250.50');
});

test('precision: gramsToMilligrams and milligramsToGrams conversion', () => {
  assert.equal(gramsToMilligrams(1.0), 1000n);
  assert.equal(gramsToMilligrams('0.5'), 500n);
  assert.equal(milligramsToGrams(1000n), 1.0);
  assert.equal(formatMilligramsToGrams(8000n), '8.0 g');
});

test('precision: basis points percentage calculation', () => {
  // 300 basis points = 3.00%
  const baseAmountPaise = 100000n; // ₹1,000
  const gstPaise = calculatePercentagePaise(baseAmountPaise, 300);
  assert.equal(gstPaise, 3000n); // ₹30.00
});

test('precision: metal value calculation', () => {
  // Rate: ₹7,500 per gram = 750,000 paise per gram
  // Weight: 8 grams = 8,000 milligrams
  const ratePaise = 750000n;
  const weightMg = 8000n;
  const metalVal = calculateMetalValuePaise(ratePaise, weightMg);
  assert.equal(metalVal, 6000000n); // ₹60,000.00
});
