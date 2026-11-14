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

const FOOTER_LINKS: { path: string; key: string; vi: string; en: string; zh: string }[] = [
  { path: '/legal/thong-tin-chu-quan-nen-tang', key: 'footer.decree248.d4', vi: 'Thông tin chủ quản nền tảng', en: 'Platform operator information', zh: '平台运营方信息' },
  { path: '/legal/chinh-sach-bao-mat-va-du-lieu', key: 'footer.decree248.d5', vi: 'Chính sách bảo mật và dữ liệu', en: 'Privacy and personal data', zh: '隐私与个人数据' },
  { path: '/legal/quyen-va-nghia-vu-cac-ben', key: 'footer.decree248.d6', vi: 'Quyền và nghĩa vụ của các bên', en: 'Rights and obligations of the parties', zh: '各方权利与义务' },
  { path: '/legal/chinh-sach-khieu-nai-tranh-chap', key: 'footer.decree248.d7', vi: 'Chính sách khiếu nại, tranh chấp', en: 'Complaints and disputes', zh: '投诉与争议' },
  { path: '/complaints/new', key: 'complaint.cta.file', vi: 'Gửi khiếu nại', en: 'File a complaint', zh: '提交投诉' },
  { path: '/legal/chinh-sach-gia-ca', key: 'footer.decree248.d8', vi: 'Chính sách giá cả', en: 'Pricing policy', zh: '价格政策' },
  { path: '/legal/dieu-kien-va-han-che-cung-cap', key: 'footer.decree248.d9', vi: 'Điều kiện và hạn chế cung cấp dịch vụ', en: 'Conditions and limits of supply', zh: '服务提供条件与限制' },
  { path: '/legal/chinh-sach-thanh-toan-doi-soat', key: 'footer.decree248.d10', vi: 'Chính sách thanh toán, đối soát', en: 'Payment and reconciliation', zh: '支付与对账' },
  { path: '/legal/chinh-sach-xep-hang-uu-tien-hien-thi', key: 'footer.decree248.d11', vi: 'Chính sách xếp hạng, ưu tiên hiển thị', en: 'Ranking and display priority', zh: '排名与展示优先级' },
  { path: '/legal/quy-che-livestream-ban-hang', key: 'footer.decree248.d12', vi: 'Quy chế livestream bán hàng', en: 'Livestream sales rules', zh: '直播销售规则' },
  { path: '/legal/chinh-sach-giao-nhan-san-pham-so', key: 'footer.decree248.d13', vi: 'Chính sách giao nhận sản phẩm số', en: 'Delivery of digital products', zh: '数字产品交付' },
  { path: '/legal/chinh-sach-hoan-tien', key: 'footer.decree248.d14', vi: 'Chính sách hoàn tiền', en: 'Refund policy', zh: '退款政策' },
  { path: '/legal/phuong-thuc-cung-cap-va-cham-dut-dich-vu', key: 'footer.decree248.d15', vi: 'Phương thức cung cấp và chấm dứt dịch vụ', en: 'How the service is provided and ended', zh: '服务提供方式与终止服务' },
  { path: '/legal/quy-che-hoat-dong-san-tmdt', key: 'footer.marketplaceRules', vi: 'Quy chế sàn', en: 'Marketplace rules', zh: '平台规则' },
  { path: '/legal/quy-trinh-tiep-thi-lien-ket', key: 'footer.affiliateProcess', vi: 'Quy trình tiếp thị liên kết', en: 'Affiliate process', zh: '联盟推广流程' },
  { path: '/legal/dieu-khoan-su-dung', key: 'footer.terms', vi: 'Thỏa thuận sử dụng', en: 'Terms of use', zh: '使用条款' },
  { path: '/legal', key: 'footer.publicPolicies', vi: 'Chính sách công khai', en: 'Public policies', zh: '公开政策' },
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

test('homepage footer publishes Điều 4–16 once each, without article prefixes', () => {
  const html = readFileSync(new URL('../src/app/layout/shell.component.html', import.meta.url), 'utf8');
  const ts = readFileSync(new URL('../src/app/layout/shell.component.ts', import.meta.url), 'utf8');
  const scss = readFileSync(new URL('../src/app/layout/shell.component.scss', import.meta.url), 'utf8');
  assert.equal(html.includes('footer-decree'), false);
  assert.equal(html.includes('footer-terms-subhead'), false);
  assert.equal(html.includes('footer.decree248.title'), false);
  assert.equal(scss.includes('footer-decree'), false);
  assert.equal(scss.includes('footer-terms-subhead'), false);
  assert.equal(scss.includes('#f3d48a'), false);
  const blockStart = ts.indexOf('readonly footerTerms');
  const blockEnd = ts.indexOf('readonly quickLinks');
  assert.equal(blockStart > -1 && blockEnd > blockStart, true);
  const block = ts.slice(blockStart, blockEnd);
  const paths = [...block.matchAll(/path: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(paths.length, FOOTER_LINKS.length);
  assert.equal(new Set(paths).size, paths.length, `duplicate footer hrefs: ${paths.join(', ')}`);
  assert.equal(block.includes('fragment:'), false);
  paths.forEach((path, index) => assert.equal(path, FOOTER_LINKS[index].path));
  for (const item of FOOTER_LINKS) {
    assert.equal(block.includes(item.key), true, item.key);
    assert.equal(MESSAGES.vi[item.key], item.vi);
    assert.equal(MESSAGES.en[item.key], item.en);
    assert.equal(MESSAGES.zh[item.key], item.zh);
    for (const lang of ['vi', 'en', 'zh'] as const) {
      assert.equal(/^Điều \d+\./.test(MESSAGES[lang][item.key]), false, `${lang} ${item.key}`);
    }
  }
  for (const key of ['footer.decree248.title', 'footer.decree248.d16', 'footer.privacy', 'footer.paymentPolicy', 'footer.disputePolicy']) {
    for (const lang of ['vi', 'en', 'zh'] as const) {
      assert.equal(MESSAGES[lang][key], undefined, `${lang} ${key}`);
    }
  }
  const termination = readFileSync(new URL('../src/assets/legal/27-phuong-thuc-cung-cap-va-cham-dut-dich-vu.md', import.meta.url), 'utf8');
  assert.match(termination, /\{#dieu-16\}/);
  assert.equal(paths.filter((path) => path === '/legal/phuong-thuc-cung-cap-va-cham-dut-dich-vu').length, 1);
  assert.match(html, /footerTerms/);
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
