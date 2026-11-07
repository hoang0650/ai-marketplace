import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LEGAL_POLICIES } from '../src/app/features/legal/legal-policies.catalog.ts';

const REQUIRED = [
  'thong-tin-chu-quan-nen-tang',
  'chinh-sach-bao-mat-va-du-lieu',
  'quyen-va-nghia-vu-cac-ben',
  'chinh-sach-khieu-nai-tranh-chap',
  'chinh-sach-gia-ca',
  'dieu-kien-va-han-che-cung-cap',
  'chinh-sach-thanh-toan-doi-soat',
  'chinh-sach-xep-hang-uu-tien-hien-thi',
  'quy-che-livestream-ban-hang',
  'chinh-sach-giao-nhan-san-pham-so',
  'chinh-sach-hoan-tien',
  'phuong-thuc-cung-cap-va-cham-dut-dich-vu',
];

test('required public policies resolve to files', () => {
  for (const slug of REQUIRED) {
    const policy = LEGAL_POLICIES.find((item) => item.slug === slug);
    assert.ok(policy, slug);
    const body = readFileSync(new URL(`../src/assets/legal/${policy.file}`, import.meta.url), 'utf8');
    assert.ok(body.length > 80, policy.file);
  }
});

test('published payment and tax pages do not assert the removed claims', () => {
  const files = [
    '05-chinh-sach-thanh-toan-doi-soat.md',
    '18-chinh-sach-thue.md',
    '26-chinh-sach-gia-ca.md',
    '20-chinh-sach-affiliate.md',
    '28-dieu-kien-va-han-che-cung-cap.md',
  ];
  const banned = ['37/GP-NHNN', 'PCI DSS', 'Cấp độ 3', '[CẦN XÁC NHẬN]', '7%'];
  for (const file of files) {
    const body = readFileSync(new URL(`../src/assets/legal/${file}`, import.meta.url), 'utf8');
    for (const phrase of banned) {
      assert.equal(body.includes(phrase), false, `${file} contains ${phrase}`);
    }
  }
});
