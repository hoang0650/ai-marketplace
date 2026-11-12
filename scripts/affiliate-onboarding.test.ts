import assert from 'node:assert/strict';
import test from 'node:test';
import { postAuthPath, readAffiliateOnboarding } from '../src/app/features/auth/affiliate-onboarding.ts';

test('affiliate sign-up lands on the affiliate page and does not receive a code', () => {
  assert.equal(postAuthPath('affiliate'), '/affiliate');
  assert.equal(postAuthPath('Affiliate'), '/affiliate');
  assert.equal(postAuthPath('buyer'), null);
  const status = readAffiliateOnboarding({
    role: 'affiliate',
    affiliateOnboarding: {
      intent: true,
      canSell: false,
      canBuy: true,
      readyForCode: false,
      codeIssued: true,
      electronicIdentity: 'not_implemented',
      steps: {
        emailVerified: { done: false },
        internalKyc: { done: false },
        statutoryElectronicIdentity: { done: false, status: 'not_implemented' },
      },
    },
  });
  assert.equal(status.intent, true);
  assert.equal(status.emailVerified, false);
  assert.equal(status.ekycVerified, false);
  assert.equal(status.codeIssued, false);
  assert.equal(status.readyForCode, false);
  assert.equal(status.canSell, false);
  assert.equal(status.canBuy, true);
  assert.equal(status.electronicIdentity, 'not_implemented');
});

test('verified internal eKYC still does not issue a code while electronic identity is closed', () => {
  const status = readAffiliateOnboarding({
    role: 'affiliate',
    kycStatus: 'verified',
    affiliateOnboarding: {
      intent: true,
      readyForCode: false,
      steps: {
        internalKyc: { done: true },
        taxCode: { done: true },
        policyAccepted: { done: true, version: 'quy-che-affiliate-2026-10' },
        statutoryElectronicIdentity: { done: false, status: 'not_implemented' },
      },
    },
  });
  assert.equal(status.ekycVerified, true);
  assert.equal(status.taxApproved, true);
  assert.equal(status.policyAccepted, true);
  assert.equal(status.policyVersion, 'quy-che-affiliate-2026-10');
  assert.equal(status.codeIssued, false);
  assert.equal(status.readyForCode, false);
});

test('profile.affiliateOnboarding public view is accepted', () => {
  const status = readAffiliateOnboarding({
    profile: {
      affiliateOnboarding: {
        intent: true,
        steps: {
          emailVerified: { done: true },
          internalKyc: { done: false },
        },
      },
    },
  });
  assert.equal(status.emailVerified, true);
  assert.equal(status.ekycVerified, false);
  assert.equal(status.codeIssued, false);
});
