import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteAffiliateWithdraw } from '../src/app/features/affiliate/affiliate-withdraw.ts';

const RATE = 25_000;

function quote(amountVnd: number, availableVnd: number, availableUsd = Math.round((availableVnd / RATE) * 100) / 100) {
  return quoteAffiliateWithdraw({ amountVnd, availableVnd, availableUsd, vndPerUsd: RATE });
}

test('below 2,000,000 VND is allowed when it is a positive available balance', () => {
  const result = quote(1_000_000, 1_500_000);
  assert.equal(result.ok, true);
  assert.equal(result.code, 'ok');
  assert.equal(result.amountVnd, 1_000_000);
  assert.equal(result.amountUsd, 40);
});

test('exactly 2,000,000 VND is allowed and is not a minimum', () => {
  const result = quote(2_000_000, 2_000_000);
  assert.equal(result.ok, true);
  assert.equal(result.amountUsd, 80);
  const partial = quote(2_000_000, 3_000_000);
  assert.equal(partial.ok, true);
  assert.equal(partial.amountUsd, 80);
});

test('zero and negative amounts are rejected', () => {
  assert.equal(quote(0, 2_000_000).code, 'not_positive');
  assert.equal(quote(-1, 2_000_000).code, 'not_positive');
  assert.equal(quote(-2_000_000, 5_000_000).code, 'not_positive');
});

test('non-finite amounts are rejected', () => {
  for (const amount of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(quote(amount, 2_000_000).code, 'nonfinite');
  }
  assert.equal(
    quoteAffiliateWithdraw({ amountVnd: 1000, availableVnd: 1000, availableUsd: Number.NaN, vndPerUsd: RATE }).code,
    'nonfinite',
  );
});

test('a request above the available balance is rejected', () => {
  const result = quote(3_000_000, 2_500_000);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'exceeds_available');
  assert.equal(result.amountUsd, 0);
});

test('the full available balance is paid in exact USD cents', () => {
  const result = quoteAffiliateWithdraw({
    amountVnd: 100_001,
    availableVnd: 100_001,
    availableUsd: 4.01,
    vndPerUsd: RATE,
  });
  assert.equal(result.ok, true);
  assert.equal(result.amountUsd, 4.01);
});

test('a VND amount that rounds to 0.00 USD is below precision', () => {
  const result = quote(1, 5_000_000);
  assert.equal(result.code, 'below_precision');
});
