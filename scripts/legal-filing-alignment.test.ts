import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { MESSAGES } from '../src/app/i18n/messages.ts';
import { MESSAGE_OVERRIDES } from '../src/app/i18n/messages.overrides.ts';
import { LEGAL_POLICIES } from '../src/app/features/legal/legal-policies.catalog.ts';
import { environment } from '../src/environments/environment.ts';
import { environment as production } from '../src/environments/environment.prod.ts';
import type { AppLang } from '../src/app/i18n/messages.ts';

function shown(lang: AppLang, key: string): string {
  return MESSAGE_OVERRIDES[lang]?.[key] ?? MESSAGES[lang][key];
}

const BUYER_VI =
  'Quyền, nghĩa vụ người mua. Số dư trả trước không được rút thành tiền và không được chuyển nhượng. Hoàn tiền hợp pháp theo chính sách hoàn tiền; không cam kết hoàn về phương thức thanh toán ban đầu.';
const BUYER_EN =
  'Buyer rights and duties. Prepaid balance cannot be withdrawn or transferred. Lawful refunds follow the refund policy and are not promised back to the original payment method.';
const BUYER_ZH =
  '买家权利与义务。预付余额不可提现，也不可转让。合法退款按退款政策处理，不承诺退回原支付方式。';

const PAYOUT_07 =
  '07 ngày làm việc (không tính các ngày thứ bảy, chủ nhật và các ngày nghỉ lễ)';

const FOOTER_LINKS: { path: string; fragment?: string; key: string; vi: string }[] = [
  { path: '/legal/thong-tin-chu-quan-nen-tang', key: 'footer.decree248.d4', vi: 'Điều 4. Thông tin chủ quản nền tảng' },
  { path: '/legal/chinh-sach-bao-mat-va-du-lieu', key: 'footer.decree248.d5', vi: 'Điều 5. Chính sách bảo mật và dữ liệu' },
  { path: '/legal/quyen-va-nghia-vu-cac-ben', key: 'footer.decree248.d6', vi: 'Điều 6. Quyền và nghĩa vụ của các bên' },
  { path: '/legal/chinh-sach-khieu-nai-tranh-chap', key: 'footer.decree248.d7', vi: 'Điều 7. Chính sách khiếu nại, tranh chấp' },
  { path: '/legal/chinh-sach-gia-ca', key: 'footer.decree248.d8', vi: 'Điều 8. Chính sách giá cả' },
  { path: '/legal/dieu-kien-va-han-che-cung-cap', key: 'footer.decree248.d9', vi: 'Điều 9. Điều kiện và hạn chế cung cấp dịch vụ' },
  { path: '/legal/chinh-sach-thanh-toan-doi-soat', key: 'footer.decree248.d10', vi: 'Điều 10. Chính sách thanh toán, đối soát' },
  { path: '/legal/chinh-sach-xep-hang-uu-tien-hien-thi', key: 'footer.decree248.d11', vi: 'Điều 11. Chính sách xếp hạng, ưu tiên hiển thị' },
  { path: '/legal/quy-che-livestream-ban-hang', key: 'footer.decree248.d12', vi: 'Điều 12. Quy chế livestream bán hàng' },
  { path: '/legal/chinh-sach-giao-nhan-san-pham-so', key: 'footer.decree248.d13', vi: 'Điều 13. Chính sách giao nhận sản phẩm số' },
  { path: '/legal/chinh-sach-hoan-tien', key: 'footer.decree248.d14', vi: 'Điều 14. Chính sách hoàn tiền' },
  { path: '/legal/phuong-thuc-cung-cap-va-cham-dut-dich-vu', key: 'footer.decree248.d15', vi: 'Điều 15. Phương thức cung cấp dịch vụ' },
  {
    path: '/legal/phuong-thuc-cung-cap-va-cham-dut-dich-vu',
    fragment: 'dieu-16',
    key: 'footer.decree248.d16',
    vi: 'Điều 16. Chấm dứt dịch vụ',
  },
];

test('buyer policy summaries match in VI, EN and ZH', () => {
  assert.equal(shown('vi', 'legal.policy.chinh-sach-nguoi-mua.summary'), BUYER_VI);
  assert.equal(shown('en', 'legal.policy.chinh-sach-nguoi-mua.summary'), BUYER_EN);
  assert.equal(shown('zh', 'legal.policy.chinh-sach-nguoi-mua.summary'), BUYER_ZH);
  assert.equal(LEGAL_POLICIES.find((p) => p.slug === 'chinh-sach-nguoi-mua')?.summary, BUYER_VI);
  assert.equal(MESSAGES.vi['legal.policy.chinh-sach-nguoi-mua.summary'], BUYER_VI);
  assert.equal(MESSAGES.en['legal.policy.chinh-sach-nguoi-mua.summary'], BUYER_EN);
  assert.equal(MESSAGES.zh['legal.policy.chinh-sach-nguoi-mua.summary'], BUYER_ZH);
});

test('published buyer copy does not offer a prepaid cash-out', () => {
  const blob = [
    JSON.stringify(MESSAGE_OVERRIDES),
    MESSAGES.vi['legal.policy.chinh-sach-nguoi-mua.summary'],
    MESSAGES.en['legal.policy.chinh-sach-nguoi-mua.summary'],
    MESSAGES.zh['legal.policy.chinh-sach-nguoi-mua.summary'],
    MESSAGES.en['aff.rule.hold'],
    MESSAGES.vi['aff.rule.hold'],
    readFileSync(new URL('../src/assets/legal/04-chinh-sach-nguoi-mua.md', import.meta.url), 'utf8'),
  ].join('\n');
  for (const phrase of [
    'withdrawn after eKYC',
    'can be withdrawn',
    'rút sau eKYC',
    'Lệnh rút số dư nạp đang tắt',
    'VietQR top-ups can be withdrawn',
  ]) {
    assert.equal(blob.includes(phrase), false, phrase);
  }
  assert.match(shown('vi', 'wallet.topupWithdraw.rule'), /không được rút thành tiền/);
  assert.match(shown('en', 'wallet.withdraw.lede'), /cannot be withdrawn or transferred/);
  assert.match(shown('zh', 'wallet.withdraw.lede'), /不可提现/);
});

test('homepage footer publishes Điều 4–16 with distinct labels', () => {
  const html = readFileSync(new URL('../src/app/layout/shell.component.html', import.meta.url), 'utf8');
  const ts = readFileSync(new URL('../src/app/layout/shell.component.ts', import.meta.url), 'utf8');
  const scss = readFileSync(new URL('../src/app/layout/shell.component.scss', import.meta.url), 'utf8');
  assert.equal(html.includes('footer-decree'), false);
  assert.equal(scss.includes('footer-decree'), false);
  assert.equal(scss.includes('#f3d48a'), false);
  const termsAt = html.indexOf('footer.col.terms');
  const legalAt = html.indexOf('footerLegal');
  const decreeAt = html.indexOf('footerDecreePolicies');
  assert.equal(termsAt > -1 && legalAt > termsAt && decreeAt > legalAt, true);
  assert.match(html.slice(termsAt, decreeAt), /footer-group-title footer-terms-subhead/);
  assert.equal(MESSAGES.vi['footer.decree248.title'], 'Theo Nghị định 248/2026/NĐ-CP');
  assert.equal(MESSAGES.en['footer.decree248.title'], 'Under Decree 248/2026/ND-CP');
  assert.equal(MESSAGES.zh['footer.decree248.title'], '依据第248/2026/NĐ-CP号法令');
  assert.equal(FOOTER_LINKS.length, 13);
  for (const item of FOOTER_LINKS) {
    assert.equal(ts.includes(item.path), true, item.path);
    assert.equal(ts.includes(item.key), true, item.key);
    assert.equal(MESSAGES.vi[item.key], item.vi);
    assert.match(MESSAGES.en[item.key], /^Điều \d+\. /);
    assert.match(MESSAGES.zh[item.key], /^Điều \d+\. /);
  }
  assert.match(ts, /fragment: 'dieu-16'/);
  const termination = readFileSync(new URL('../src/assets/legal/27-phuong-thuc-cung-cap-va-cham-dut-dich-vu.md', import.meta.url), 'utf8');
  assert.match(termination, /\{#dieu-16\}/);
  assert.match(html, /footer\.company\.(name|tax|address|phone|email)/);
});

test('complaint acknowledgement is 02 working days and support is not 24/7', () => {
  const complaint = readFileSync(new URL('../src/assets/legal/07-chinh-sach-khieu-nai-tranh-chap.md', import.meta.url), 'utf8');
  assert.match(complaint, /Trong \*\*02 ngày làm việc\*\*/);
  assert.equal(complaint.includes('24 giờ'), false);
  assert.match(shown('vi', 'legal.policy.chinh-sach-khieu-nai-tranh-chap.summary'), /Tiếp nhận trong 02 ngày làm việc/);
  assert.equal(shown('vi', 'legal.policy.chinh-sach-khieu-nai-tranh-chap.summary').includes('24 giờ'), false);
  assert.equal(shown('en', 'legal.policy.chinh-sach-khieu-nai-tranh-chap.summary').includes('24h'), false);
  for (const lang of ['vi', 'en', 'zh'] as const) {
    assert.equal(/24\/7/.test(shown(lang, 'lux.perks.support')), false, lang);
    assert.equal(/24\/7/.test(shown(lang, 'cart.trust.support')), false, lang);
    assert.equal(/24\/7|全天候/.test(shown(lang, 'support.promise.always')), false, lang);
  }
  assert.match(shown('vi', 'support.promise.always'), /0931 881 584/);
  const refund = readFileSync(new URL('../src/assets/legal/06-chinh-sach-hoan-tien.md', import.meta.url), 'utf8');
  assert.match(refund, /ra quyết định trong \*\*07 ngày làm việc\*\*/);
});

test('GPay stays off and the 07-day payout sentence is unchanged', () => {
  assert.equal(environment.gpayEnabled, false);
  assert.equal(production.gpayEnabled, false);
  const files = [
    '01-quy-che-hoat-dong-san-tmdt.md',
    '05-chinh-sach-thanh-toan-doi-soat.md',
    '15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md',
    '20-chinh-sach-affiliate.md',
  ];
  for (const file of files) {
    const body = readFileSync(new URL(`../src/assets/legal/${file}`, import.meta.url), 'utf8');
    assert.equal(/GPay|gpay/.test(body), false, file);
    assert.equal(body.includes(PAYOUT_07), true, file);
  }
  const payment = readFileSync(new URL('../src/assets/legal/05-chinh-sach-thanh-toan-doi-soat.md', import.meta.url), 'utf8');
  assert.match(
    payment,
    /chi trả bằng VND trong 07 ngày làm việc \(không tính các ngày thứ bảy, chủ nhật và các ngày nghỉ lễ\)/,
  );
  assert.equal(payment.includes('không phải kênh thanh toán chung'), false);
  assert.match(payment, /kể cả đơn của người bán/);
  assert.match(payment, /không khẳng định mô hình đã được cơ quan nhà nước chấp thuận/);
});

test('affiliate hub version, quy che date, rate and privacy hosts', () => {
  assert.match(shown('vi', 'legal.policy.chinh-sach-affiliate.summary'), /2026\.11\.05/);
  assert.equal(shown('vi', 'legal.policy.chinh-sach-affiliate.summary').includes('2026.10.12'), false);
  const affiliate = readFileSync(new URL('../src/assets/legal/20-chinh-sach-affiliate.md', import.meta.url), 'utf8');
  assert.match(affiliate, /\*\*Phiên bản:\*\* 2026\.11\.05/);
  const rules = readFileSync(new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url), 'utf8');
  assert.match(rules, /ngày 05 tháng 10 năm 2026/);
  assert.equal(rules.includes('ngày ……'), false);
  assert.match(rules, /Phan Huy Hoàng/);
  assert.match(rules, /Chức vụ: Giám đốc/);
  const privacy = readFileSync(new URL('../src/assets/legal/08-chinh-sach-bao-mat-va-du-lieu.md', import.meta.url), 'utf8');
  assert.equal(privacy.includes('72.62.72.165'), false);
  assert.equal(privacy.includes('103.97.127.39'), false);
  assert.match(privacy, /123HOST/);
  assert.match(privacy, /Hostinger/);
  assert.match(privacy, /Kuala Lumpur/);
  const price = readFileSync(new URL('../src/assets/legal/26-chinh-sach-gia-ca.md', import.meta.url), 'utf8');
  assert.match(price, /26\.500 VND\/USD/);
  assert.match(price, /không gỡ nút chọn USD\/CNY/);
  assert.match(rules, /cộng 25%/);
});
