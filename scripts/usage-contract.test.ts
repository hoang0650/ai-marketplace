import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessUnitOf,
  isAccessUnit,
  optionalUsageAmount,
  readAuthoritativeVnd,
  servicePackagePayload,
  snapUsageUnit,
  unitAllowed,
  unitsFor,
  usageProductPricing,
  viPrice,
  type UsageUnitCatalog,
} from '../src/app/features/usage/usage-contract.ts';

const catalog: UsageUnitCatalog = {
  units: [
    { code: '1k_tokens', labelEn: '1K tokens', labelVi: '1K token', dimension: 'tokens', kind: 'metered', unitSize: 1000 },
    { code: '1m_tokens', labelEn: '1M tokens', labelVi: '1M token', dimension: 'tokens', kind: 'metered', unitSize: 1_000_000 },
    { code: '1_image', labelEn: '1 image', labelVi: '1 ảnh', dimension: 'images', kind: 'metered', unitSize: 1 },
    { code: '1_hour', labelEn: '1 hour', labelVi: '1 giờ', dimension: 'seconds', kind: 'metered', unitSize: 3600 },
    { code: '1_day', labelEn: '1 day', labelVi: '1 ngày', dimension: 'access_period', kind: 'entitlement', unitSize: 1, period: 'day' },
    { code: '1_year', labelEn: '1 year', labelVi: '1 năm', dimension: 'access_period', kind: 'entitlement', unitSize: 1, period: 'year' },
  ],
  allowedByCategory: {
    'text-to-text': ['1k_tokens', '1m_tokens', '1_day', '1_year'],
    'text-to-image': ['1_image', '1_day'],
    'gpu-compute': ['1_hour'],
  },
};

test('usage pricing keeps a zero cached rate and omits blank split rates', () => {
  const priced = usageProductPricing({
    usageUnit: '1k_tokens',
    usageRate: 0.5,
    currency: 'CNY',
    inputRate: '',
    outputRate: null,
    cachedInputRate: 0,
    minCharge: '0.01',
  });
  assert.equal(priced.currency, 'CNY');
  assert.equal(priced.usageRate, 0.5);
  assert.equal(priced.cachedInputRate, 0);
  assert.equal(priced.minCharge, 0.01);
  assert.equal('inputRate' in priced, false);
  assert.equal('outputRate' in priced, false);
  assert.equal(optionalUsageAmount(-1), undefined);
  assert.equal(usageProductPricing({ usageUnit: '1_image', usageRate: 0.04, currency: 'EUR' }).currency, 'USD');
});

test('the dropdown only lists units the server allows for the category', () => {
  assert.deepEqual(unitsFor(catalog, 'text-to-text').map((u) => u.code), ['1k_tokens', '1m_tokens', '1_day', '1_year']);
  assert.equal(unitAllowed(catalog, 'gpu-compute', '1_day'), false);
  assert.equal(unitAllowed(catalog, 'text-to-image', '1_image'), true);
  assert.deepEqual(unitsFor(catalog, 'hire-photographer'), []);
  assert.equal(snapUsageUnit(catalog, 'gpu-compute', '1_day'), '1_hour');
  assert.equal(snapUsageUnit(catalog, 'text-to-text', '1m_tokens'), '1m_tokens');
});

test('a USD amount is not shown as VND and a non-authoritative quote is refused', () => {
  assert.equal(viPrice({ amountVnd: 250000, authoritative: false, code: 'RATE_UNAVAILABLE' }), null);
  assert.equal(viPrice({ amountVnd: null, authoritative: false, code: 'AMOUNT_BELOW_VND_PRECISION' }), null);
  assert.equal(readAuthoritativeVnd({ amountVnd: 10.5, authoritative: true }).ok, false);
  assert.equal(viPrice({ amountVnd: 12500, authoritative: true }), '12.500 đ');
});

test('access periods are day, week, month and year codes only', () => {
  assert.equal(isAccessUnit('1_week'), true);
  assert.equal(isAccessUnit('1_hour'), false);
  assert.equal(accessUnitOf({ usageBilling: 'entitlement', usageUnitCode: '1_month', usagePeriod: 'month' }), '1_month');
  assert.equal(accessUnitOf({ usageUnit: '1_hour', usageBilling: 'metered' }), null);
});

test('package prices are sent as entered and are not converted', () => {
  const ok = servicePackagePayload([
    {
      code: 'wedding',
      name: 'Wedding',
      scope: 'Half day',
      deliverablesText: '40 photos\nOnline gallery',
      durationDays: 14,
      price: 1500,
      currency: 'VND',
    },
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.packages[0].price, 1500);
    assert.equal(ok.packages[0].currency, 'VND');
    assert.deepEqual(ok.packages[0].deliverables, ['40 photos', 'Online gallery']);
  }
  const overCap = servicePackagePayload([
    { code: 'wedding', name: 'Wedding', scope: 'Half day', deliverablesText: 'Photos', durationDays: 14, price: 2_500_000, currency: 'VND' },
  ]);
  assert.equal(overCap.ok, false);
  if (!overCap.ok) assert.equal(overCap.code, 'SERVICE_PACKAGE_PRICE');
  assert.equal(
    servicePackagePayload([
      { code: '', name: 'A', scope: 'B', deliverablesText: 'C', durationDays: 1, price: 10.5, currency: 'VND' },
    ]).ok,
    false,
  );
});
