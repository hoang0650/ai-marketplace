import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DOCS_COMPUTE_MESSAGES } from '../src/app/features/docs/docs-compute.messages.ts';
import { interpolate } from '../src/app/i18n/interpolate.ts';

const REQUIRED = [
  'docsCompute.pricingLink',
  'docsCompute.billing.p1',
  'docsCompute.billing.units',
  'docsCompute.billing.legacy',
  'docsCompute.billing.fx',
  'docsCompute.billing.minCharge',
  'docsCompute.billing.gateway',
  'docsCompute.billing.gpuIntro',
  'docsCompute.billing.gameIntro',
  'docsCompute.billing.dedicatedEx',
  'docsCompute.billing.row.second',
  'docsCompute.billing.row.minute',
  'docsCompute.billing.row.hour',
  'docsCompute.billing.row.request',
];

test('compute billing copy matches in Vietnamese, English and Chinese', () => {
  for (const key of REQUIRED) {
    assert.ok(DOCS_COMPUTE_MESSAGES.vi[key], key);
    assert.ok(DOCS_COMPUTE_MESSAGES.en[key], key);
    assert.ok(DOCS_COMPUTE_MESSAGES.zh[key], key);
  }
  const viKeys = Object.keys(DOCS_COMPUTE_MESSAGES.vi).sort();
  assert.deepEqual(Object.keys(DOCS_COMPUTE_MESSAGES.en).sort(), viKeys);
  assert.deepEqual(Object.keys(DOCS_COMPUTE_MESSAGES.zh).sort(), viKeys);
});

test('the session page states whole minutes and links the gateway pro-rata rule', () => {
  const apiBase = 'https://api.aimarkets.vn/v1';
  const units = interpolate(DOCS_COMPUTE_MESSAGES.vi['docsCompute.billing.units'], { apiBase });
  assert.match(units, /https:\/\/api\.aimarkets\.vn\/v1\/usage\/units/);
  assert.equal(units.includes('{{'), false);
  assert.match(DOCS_COMPUTE_MESSAGES.vi['docsCompute.billing.p1'], /exact_pro_rata_round6/);
  assert.match(DOCS_COMPUTE_MESSAGES.vi['docsCompute.billing.gpuIntro'], /0\.04/);
  assert.match(DOCS_COMPUTE_MESSAGES.vi['docsCompute.billing.gameIntro'], /0\.50/);
  assert.match(DOCS_COMPUTE_MESSAGES.vi['docsCompute.billing.dedicatedEx'], /0\.107408/);
  assert.match(DOCS_COMPUTE_MESSAGES.en['docsCompute.billing.minCharge'], /session ledger does not use minCharge/);
  assert.match(DOCS_COMPUTE_MESSAGES.zh['docsCompute.billing.gateway'], /exact_pro_rata_round6/);
});

test('the buyer example uses the 5-minute stream idle, not 10 minutes', () => {
  const source = readFileSync('src/app/features/docs/docs-compute.component.ts', 'utf8');
  assert.match(source, /idleTimeoutMs": 300000/);
  assert.equal(source.includes('600000'), false);
  assert.match(source, /billedCost": 0\.04/);
  assert.match(source, /billedMinutes": 2/);
});
