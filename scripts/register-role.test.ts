import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AFFILIATE_POLICY_VERSION,
  API_SIGNUP_LABELS_VI,
  API_SIGNUP_ROLE_IDS,
  buildRegisterBody,
  fallbackSignupRoleIds,
  signupChoices,
} from '../src/app/features/auth/signup-roles.ts';

const vi = {
  buyer: 'Người mua',
  seller: 'Người bán',
  affiliate: 'Người tiếp thị liên kết',
};
const en = { buyer: 'Buyer', seller: 'Seller', affiliate: 'Affiliate' };

test('Vietnamese dropdown uses the API label Người tiếp thị liên kết', () => {
  assert.equal(API_SIGNUP_LABELS_VI.affiliate, 'Người tiếp thị liên kết');
  assert.equal(AFFILIATE_POLICY_VERSION, 'quy-che-affiliate-2026-10');
  const choices = signupChoices({
    apiRoles: [
      { id: 'buyer', label: 'Người mua' },
      { id: 'seller', label: 'Người bán' },
      { id: 'affiliate', label: 'Người tiếp thị liên kết' },
    ],
    workBoard: false,
    lang: 'vi',
    translate: (id) => vi[id as keyof typeof vi] || id,
  });
  assert.deepEqual(
    choices.map((c) => c.label),
    ['Người mua', 'Người bán', 'Người tiếp thị liên kết'],
  );
  assert.deepEqual(
    choices.map((c) => c.id),
    ['buyer', 'seller', 'affiliate'],
  );
});

test('the API role list wins over the local fallback and drops marketer', () => {
  const choices = signupChoices({
    apiRoles: [
      { id: 'Seller', label: 'Người bán' },
      { id: 'affiliate', label: 'Người tiếp thị liên kết' },
      { id: 'marketer', label: 'Người tiếp thị' },
      { id: 'admin', label: 'Quản trị' },
    ],
    workBoard: true,
    lang: 'en',
    translate: (id) => en[id as keyof typeof en] || id,
  });
  assert.deepEqual(
    choices.map((c) => c.id),
    ['seller', 'affiliate'],
  );
  assert.equal(choices[1].label, 'Affiliate');
  assert.equal(choices.some((c) => c.id === 'marketer' || c.id === 'talent'), false);
});

test('without the API list the form still offers buyer, seller and affiliate', () => {
  const choices = signupChoices({
    apiRoles: [],
    workBoard: false,
    lang: 'vi',
    translate: (id) => vi[id as keyof typeof vi] || id,
  });
  assert.deepEqual(fallbackSignupRoleIds(false), ['buyer', 'seller', 'affiliate']);
  assert.deepEqual(
    choices.map((c) => c.id),
    ['buyer', 'seller', 'affiliate'],
  );
  assert.equal(choices[2].label, 'Người tiếp thị liên kết');
});

test('register payload uses role affiliate and never marketer', () => {
  const google = buildRegisterBody({
    email: 'a@example.com',
    name: 'An',
    password: 'secret123',
    confirmPassword: 'secret123',
    role: 'Affiliate',
    googleSignupToken: 'tok',
    acceptAffiliatePolicy: true,
  });
  assert.equal(google.ok, true);
  if (!google.ok) return;
  assert.equal(google.body.role, 'affiliate');
  assert.equal(google.body.googleSignupToken, 'tok');
  assert.equal(google.body.acceptAffiliatePolicy, true);
  assert.equal('policyVersion' in google.body, false);
  assert.equal('marketer' in google.body, false);

  const plain = buildRegisterBody({
    email: 'a@example.com',
    name: 'An',
    password: 'secret123',
    role: 'affiliate',
    acceptAffiliatePolicy: false,
  });
  assert.equal(plain.ok, true);
  if (!plain.ok) return;
  assert.equal(plain.body.role, 'affiliate');
  assert.equal('acceptAffiliatePolicy' in plain.body, false);
  assert.equal('googleSignupToken' in plain.body, false);

  const buyerFlag = buildRegisterBody({
    email: 'a@example.com',
    name: 'An',
    password: 'secret123',
    role: 'buyer',
    acceptAffiliatePolicy: true,
  });
  assert.equal(buyerFlag.ok, true);
  if (!buyerFlag.ok) return;
  assert.equal('acceptAffiliatePolicy' in buyerFlag.body, false);
});

test('omitted role is buyer, creator and asCreator are seller, marketer is invalid', () => {
  const omitted = buildRegisterBody({ email: 'a@e.com', name: 'A', password: 'secret123' });
  assert.equal(omitted.ok, true);
  if (omitted.ok) assert.equal(omitted.body.role, 'buyer');

  const creator = buildRegisterBody({ email: 'a@e.com', name: 'A', password: 'secret123', role: 'creator' });
  assert.equal(creator.ok, true);
  if (creator.ok) assert.equal(creator.body.role, 'seller');

  const asCreator = buildRegisterBody({ email: 'a@e.com', name: 'A', password: 'secret123', asCreator: true });
  assert.equal(asCreator.ok, true);
  if (asCreator.ok) assert.equal(asCreator.body.role, 'seller');

  const bad = buildRegisterBody({ email: 'a@e.com', name: 'A', password: 'secret123', role: 'marketer' });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.code, 'INVALID_ROLE');
    assert.deepEqual(bad.roles, API_SIGNUP_ROLE_IDS);
  }
});
