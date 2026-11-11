import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listOffer,
  offerAmount,
  offerBadge,
  offerForTerm,
  offerPriceLabel,
  periodOffers,
  usageOffers,
} from '../src/app/features/usage/billing-display.ts';

const chatterbox = {
  listOfferId: 'usage_1k_characters',
  offers: [
    {
      id: 'usage_1k_characters',
      billingMode: 'usage' as const,
      status: 'priced' as const,
      unit: '1k_characters',
      labelVi: '1K ký tự',
      labelEn: '1K characters',
      rate: 0.0123,
      rateVnd: { amountVnd: 315, authoritative: true, code: null },
      priceVnd: null,
    },
    {
      id: 'period_1_day',
      billingMode: 'period' as const,
      status: 'priced' as const,
      unit: '1_day',
      labelVi: '1 ngày',
      labelEn: '1 day',
      price: 0.99,
      priceVnd: { amountVnd: 25352, authoritative: true, code: null },
    },
    {
      id: 'period_1_month',
      billingMode: 'period' as const,
      status: 'priced' as const,
      unit: '1_month',
      labelVi: '1 tháng',
      labelEn: '1 month',
      price: 4.9,
      priceVnd: { amountVnd: 125480, authoritative: true, code: null },
    },
    {
      id: 'period_1_year',
      billingMode: 'period' as const,
      status: 'priced' as const,
      unit: '1_year',
      labelVi: '1 năm',
      labelEn: '1 year',
      price: 39,
      priceVnd: { amountVnd: 998722, authoritative: true, code: null },
    },
  ],
};

test('the list card uses listOfferId and does not show the monthly pass as a character rate', () => {
  const card = listOffer(chatterbox);
  assert.equal(card?.id, 'usage_1k_characters');
  assert.equal(offerPriceLabel(card, 'vi'), '315 đ/1K ký tự');
  assert.equal(offerBadge(card, 'vi'), 'Theo ký tự');
  assert.equal(offerPriceLabel(offerForTerm(chatterbox, 'month'), 'vi'), '125.480 đ/1 tháng');
  assert.equal(offerAmount(offerForTerm(chatterbox, 'day')), 25352);
  assert.equal(offerAmount(offerForTerm(chatterbox, 'year')), 998722);
  assert.equal(usageOffers(chatterbox).length, 1);
  assert.equal(periodOffers(chatterbox).length, 3);
});

test('a needs_review offer has no price', () => {
  const offer = {
    id: 'period_1_week',
    billingMode: 'period' as const,
    status: 'needs_review' as const,
    unit: '1_week',
    labelVi: '1 tuần',
    labelEn: '1 week',
    price: null,
    priceVnd: null,
  };
  assert.equal(offerAmount(offer), null);
  assert.equal(offerPriceLabel(offer, 'vi'), null);
});
