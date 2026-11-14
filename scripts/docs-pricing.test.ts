import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DOCS_PRICING_MESSAGES } from '../src/app/features/docs/docs-pricing.messages.ts';
import { MESSAGES } from '../src/app/i18n/messages.ts';
import { interpolate } from '../src/app/i18n/interpolate.ts';

const apiBase = 'https://api.aimarkets.vn/v1';

test('pricing copy exists in Vietnamese, English, and Chinese', () => {
  const vi = Object.keys(DOCS_PRICING_MESSAGES.vi).sort();
  const en = Object.keys(DOCS_PRICING_MESSAGES.en).sort();
  const zh = Object.keys(DOCS_PRICING_MESSAGES.zh).sort();
  assert.deepEqual(en, vi);
  assert.deepEqual(zh, vi);
  assert.ok(vi.includes('docs.pricing.title'));
  for (const text of Object.values(DOCS_PRICING_MESSAGES.vi)) assert.ok(text.trim());
});

test('the quick-flow title interpolates the API base and prices one chosen unit', () => {
  const title = interpolate(MESSAGES.vi['docs.steps.s3.title'], { apiBase });
  assert.equal(title, 'Buyer gọi qua https://api.aimarkets.vn/v1');
  assert.equal(title.includes('{{'), false);
  assert.match(MESSAGES.vi['docs.steps.s1.body'], /usageUnit/);
  assert.equal(MESSAGES.vi['docs.steps.s1.body'].includes('theo token/giờ'), false);
  assert.match(MESSAGES.en['docs.steps.s1.body'], /not only per token or hour/);
  assert.match(MESSAGES.zh['docs.steps.s1.body'], /usageUnit/);
});

test('the docs hub passes apiBase into the step title', () => {
  const html = readFileSync('src/app/features/docs/docs-hub.component.html', 'utf8');
  assert.match(html, /s\.titleKey \| t: \{ apiBase, brand \}/);
  const sell = readFileSync('src/app/features/sell/sell-api-usage.component.html', 'utf8');
  assert.match(sell, /sellDocs\.setup\.l4' \| t: \{ apiBase \}/);
});
