import assert from 'node:assert/strict';
import test from 'node:test';
import { buyerTopupWithdrawDecision } from '../src/app/features/wallet/buyer-topup-withdraw.ts';
import { isSupplierTaxCode, supplierReviewDecision, supplierReviewView } from '../src/app/features/sell/supplier-review.ts';
import { readFileSync } from 'node:fs';

const open = {
  enabled: true,
  fundingSeparated: true,
  settlement: 'VND' as const,
  electronicIdentityStatus: 'verified',
  payableVnd: 150000,
  blockedSources: [],
};

test('withdrawal stays off even when the server reports a separated VND amount', () => {
  assert.equal(buyerTopupWithdrawDecision({ snapshot: null }).blocker, 'NOT_ACTIVATED');
  assert.equal(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150000 }).blocker, 'NOT_ACTIVATED');
});

test('closed withdrawal does not cash out app store, GPay or unknown balances', () => {
  for (const source of ['appstore', 'gpay', 'unknown']) {
    assert.equal(
      buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: [source] }, amountVnd: 1 }).blocker,
      'NOT_ACTIVATED',
    );
  }
});

test('manual tax review is not electronic identity and cannot publish by itself', () => {
  const view = supplierReviewView({
    verificationStatus: 'VERIFIED',
    manualStatus: 'approved',
    electronicIdentityStatus: 'pending',
    canPublish: false,
    sellerAgreementAcceptedAt: '2026-11-08T00:00:00Z',
  });
  assert.equal(view.manualStatus, 'approved');
  assert.equal(view.electronicIdentityStatus, 'pending');
  assert.equal(view.manualReviewCompletesEkyc, false);
  assert.equal(view.electronicIdentityVerified, false);
  assert.equal(view.serverCanPublish, false);
  assert.equal(view.contractAccepted, true);
});

test('admin review requires a role, a reason and a lookup attestation', () => {
  assert.equal(supplierReviewDecision({ action: 'approve', reason: 'MST khớp tên trên trang tra cứu', actorRole: 'seller', lookupAttested: true }).ok, false);
  assert.equal(supplierReviewDecision({ action: 'reject', reason: 'no', actorRole: 'admin' }).ok, false);
  assert.equal(supplierReviewDecision({ action: 'approve', reason: 'Đã đối chiếu MST', actorRole: 'admin', lookupAttested: false }).ok, false);
  const ok = supplierReviewDecision({ action: 'approve', reason: 'Đã đối chiếu MST', actorRole: 'admin', lookupAttested: true });
  assert.equal(ok.ok, true);
  assert.equal(isSupplierTaxCode('0312345678', 'enterprise'), true);
  assert.equal(isSupplierTaxCode('012345678901', 'enterprise'), false);
  assert.equal(isSupplierTaxCode('012345678901', 'individual'), true);
});

test('published quy che names GPay only as a direct contract still being completed', () => {
  const body = readFileSync(new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url), 'utf8');
  assert.match(body, /đang làm việc trực tiếp với GPay/);
  assert.match(body, /Hợp đồng cho AI Markets chưa hoàn tất/);
  assert.equal(body.includes('đối tác dự kiến'), false);
  assert.equal(body.includes('CẦN XÁC NHẬN'), false);
  assert.equal(/GP-NHNN|số giấy phép\s+\d/.test(body), false);
  assert.equal(/cổng của GPay|khi kênh được bật/.test(body), false);
  assert.match(body, /Người mua thông thường không/);
  assert.equal(/đã tích hợp VNeID/.test(body), false);
});
