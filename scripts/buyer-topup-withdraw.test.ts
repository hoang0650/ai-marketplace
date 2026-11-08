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

test('VietQR withdrawal needs the server gate, eKYC and a whole VND amount', () => {
  assert.equal(buyerTopupWithdrawDecision({ snapshot: null }).blocker, 'SERVER_GATE_CLOSED');
  assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, enabled: false } }).blocker, 'SERVER_GATE_CLOSED');
  assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, electronicIdentityStatus: 'pending' } }).blocker, 'IDENTITY_REQUIRED');
  assert.deepEqual(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150000 }), { ok: true, amountVnd: 150000 });
  assert.equal(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150001 }).blocker, 'DEPOSIT_CAP');
});

test('app store, GPay and unknown balances are not cashed out', () => {
  assert.equal(
    buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['appstore'] }, amountVnd: 1 }).blocker,
    'APPSTORE_UNRESOLVED',
  );
  assert.equal(
    buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['gpay'] }, amountVnd: 1 }).blocker,
    'GPAY_REMOVED',
  );
  assert.equal(
    buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['unknown'] }, amountVnd: 1 }).blocker,
    'SOURCE_NOT_SEPARATED',
  );
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

test('published quy che no longer offers GPay and does not print draft markers', () => {
  const body = readFileSync(new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url), 'utf8');
  assert.equal(body.includes('GPay'), false);
  assert.equal(body.includes('CẦN XÁC NHẬN'), false);
  assert.match(body, /Người mua thông thường không/);
  assert.match(body, /sau khi máy chủ ghi nhận xác minh danh tính \(eKYC\) là đã duyệt/);
  assert.equal(/đã tích hợp VNeID/.test(body), false);
});
