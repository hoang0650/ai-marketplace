import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolate } from '../src/app/i18n/interpolate.ts';
import {
  IDENTITY_REQUIRED_FOR,
  buyerCashoutClosed,
  buyerPrepaidCashoutBlocked,
  cashoutErrorKind,
  earnedPayoutCap,
  hasEarnedPayoutPersona,
  payoutIdentityRequired,
} from '../src/app/features/wallet/buyer-credit.ts';

test('affiliate placeholders interpolate in VI, EN and ZH shape', () => {
  const vi = interpolate('Giữ {hours} giờ. Hoa hồng {rate}. Số dư {amount}. Trong {days} ngày.', {
    hours: 48,
    rate: '10%',
    amount: '1.000 đ',
    days: 30,
  });
  assert.equal(vi.includes('{'), false);
  assert.match(vi, /48/);
  assert.match(vi, /10%/);
  assert.match(vi, /1\.000 đ/);
  assert.match(vi, /30/);

  const en = interpolate('Held {{hours}} hours. Rate {{rate}}. Amount {{amount}}. {{days}} days.', {
    hours: 48,
    rate: '10%',
    amount: '$1.00',
    days: 30,
  });
  assert.equal(en.includes('{'), false);
  assert.match(en, /48/);
});

test('unknown braces stay literal', () => {
  assert.equal(interpolate('Keep {unpassed} and {{also}}.', { hours: 1 }), 'Keep {unpassed} and {{also}}.');
});

test('buyer prepaid cannot be cashed out; seller and affiliate personas can', () => {
  assert.equal(buyerPrepaidCashoutBlocked({ persona: 'buyer' }), true);
  assert.equal(buyerPrepaidCashoutBlocked({ persona: 'seller', policyPersona: 'buyer' }), true);
  assert.equal(buyerPrepaidCashoutBlocked({ persona: 'seller', policyPersona: 'seller' }), false);
  assert.equal(buyerPrepaidCashoutBlocked({ persona: 'affiliate', policyPersona: 'affiliate' }), false);
  assert.equal(buyerPrepaidCashoutBlocked({ persona: '' }), false);
});

test('role separation: buyers skip identity; sellers and affiliates keep it', () => {
  assert.equal(payoutIdentityRequired('buyer'), false);
  assert.equal(payoutIdentityRequired('member'), false);
  assert.equal(payoutIdentityRequired(undefined), false);
  assert.equal(payoutIdentityRequired('seller'), true);
  assert.equal(payoutIdentityRequired('talent'), true);
  assert.equal(payoutIdentityRequired('freelancer'), true);
  assert.equal(payoutIdentityRequired('employer'), true);
  assert.equal(payoutIdentityRequired('admin'), true);
  assert.equal(payoutIdentityRequired('affiliate'), true);
  assert.deepEqual(IDENTITY_REQUIRED_FOR, ['seller_approval', 'seller_payout', 'affiliate_link', 'affiliate_payout']);
});

test('wallet summary flags close buyer cash-out and cap prepaid', () => {
  assert.equal(buyerCashoutClosed({ role: 'buyer', buyerCashoutAllowed: false, prepaidWithdrawable: false, payableAmount: 0 }), true);
  assert.equal(buyerCashoutClosed({ role: 'buyer', persona: 'buyer', payableAmount: 50 }), true);
  assert.equal(hasEarnedPayoutPersona(['affiliate']), false);
  assert.equal(buyerCashoutClosed({ role: 'affiliate', persona: 'affiliate', buyerCashoutAllowed: false, payableAmount: 0 }), true);
  assert.equal(buyerCashoutClosed({ role: 'seller', personas: ['seller'], buyerCashoutAllowed: false, payableAmount: 12.5 }), false);
  assert.equal(buyerCashoutClosed({ persona: 'buyer', role: 'seller', personas: ['seller'], payableAmount: 12.5 }), true);
  assert.equal(earnedPayoutCap({ available: 40, payableAmount: 12.5, prepaidWithdrawable: false }), 12.5);
  assert.equal(earnedPayoutCap({ available: 40, prepaidWithdrawable: false }), 0);
  assert.equal(earnedPayoutCap({ available: 8, payableAmount: 20, prepaidWithdrawable: true }), 8);
});

test('API cash-out codes stay distinct from a bank refund', () => {
  assert.equal(cashoutErrorKind('BUYER_CREDIT_NON_WITHDRAWABLE'), 'buyer');
  assert.equal(cashoutErrorKind('PREPAID_NOT_WITHDRAWABLE'), 'prepaid_cap');
  assert.equal(cashoutErrorKind('KYC_REQUIRED'), 'kyc');
  assert.equal(cashoutErrorKind('AFFILIATE_INSUFFICIENT'), 'affiliate_short');
  assert.equal(cashoutErrorKind('OTHER'), null);
});
