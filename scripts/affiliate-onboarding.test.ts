import assert from 'node:assert/strict';
import test from 'node:test';
import { postAuthPath, readAffiliateOnboarding } from '../src/app/features/auth/affiliate-onboarding.ts';

test('affiliate sign-up lands on the affiliate page and does not receive a code', () => {
  assert.equal(postAuthPath('affiliate'), '/affiliate');
  assert.equal(postAuthPath('buyer'), null);
  const status = readAffiliateOnboarding({
    role: 'affiliate',
    affiliateOnboarding: {
      emailVerified: false,
      ekycStatus: 'none',
      taxCodeStatus: 'missing',
      electronicIdentity: 'not_implemented',
      codeIssued: true,
    },
  });
  assert.equal(status.emailVerified, false);
  assert.equal(status.codeIssued, false);
  assert.equal(status.electronicIdentity, 'not_implemented');
});

test('profile.affiliateOnboarding is accepted', () => {
  const status = readAffiliateOnboarding({
    profile: {
      affiliateOnboarding: {
        emailVerified: true,
        ekycStatus: 'verified',
        taxCodeStatus: 'checked',
        electronicIdentity: 'not_implemented',
        codeIssued: false,
      },
    },
  });
  assert.equal(status.ekycStatus, 'verified');
  assert.equal(status.taxCodeStatus, 'checked');
  assert.equal(status.codeIssued, false);
});
