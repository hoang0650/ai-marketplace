import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { MESSAGES } from '../src/app/i18n/messages.ts';
import { MESSAGE_OVERRIDES } from '../src/app/i18n/messages.overrides.ts';
import type { AppLang } from '../src/app/i18n/messages.ts';

function shown(lang: AppLang, key: string): string {
  return MESSAGE_OVERRIDES[lang]?.[key] ?? MESSAGES[lang][key];
}

const RULE =
  'Hoa hồng affiliate không được dùng để mua hàng hoặc chuyển thành số dư nội bộ; chỉ được chi trả bằng VND về tài khoản ngân hàng đã đăng ký của chính người tiếp thị liên kết, sau đối soát, tạm giữ 48 giờ, trong 07 ngày làm việc (không tính thứ bảy, chủ nhật và ngày nghỉ lễ).';

const IAP_FEE =
  'Khi nạp số dư bằng mua trong ứng dụng (IAP) trên App Store hoặc Google Play, phí của Apple hoặc Google do người dùng chịu tại thời điểm nạp; giá trên kho ứng dụng đã bao gồm phí đó và số dư được ghi có bằng đúng giá trị tín dụng đã công bố của gói; phí này không được chuyển sang người bán.';

const LEGAL = [
  '20-chinh-sach-affiliate.md',
  '29-quy-trinh-tiep-thi-lien-ket.md',
  '01-quy-che-hoat-dong-san-tmdt.md',
  '05-chinh-sach-thanh-toan-doi-soat.md',
  '03-chinh-sach-nguoi-ban.md',
  '04-chinh-sach-nguoi-mua.md',
  '15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md',
  '25-quyen-va-nghia-vu-cac-ben.md',
];

test('affiliate payout labels are bank-only in VI, EN and ZH', () => {
  assert.equal(shown('vi', 'aff.withdraw'), 'Rút về tài khoản ngân hàng');
  assert.equal(shown('en', 'aff.withdraw'), 'Withdraw to bank account');
  assert.equal(shown('zh', 'aff.withdraw'), '提现至银行账户');
  assert.equal(shown('vi', 'aff.wd.title'), 'Rút về tài khoản ngân hàng');
  assert.equal(shown('en', 'aff.wd.title'), 'Withdraw to bank account');
  assert.equal(shown('zh', 'aff.wd.title'), '提现至银行账户');
  assert.equal(shown('vi', 'aff.wd.submit'), 'Rút về tài khoản ngân hàng');
  for (const lang of ['vi', 'en', 'zh'] as const) {
    const lead = shown(lang, 'aff.lead');
    const rule = shown(lang, 'aff.wd.rule');
    assert.equal(/ví|wallet|钱包/.test(lead), false, `${lang} lead`);
    assert.match(rule, /48/);
    assert.match(rule, /07/);
  }
  assert.equal(MESSAGES.vi['aff.withdraw'].includes('Rút về ví'), false);
  assert.equal(MESSAGES.en['aff.withdraw'].includes('Go to wallet'), false);
  assert.equal(MESSAGES.zh['aff.withdraw'].includes('前往钱包'), false);
});

test('affiliate screen does not link commission into the spendable wallet', () => {
  const ui = readFileSync(new URL('../src/app/features/affiliate/affiliate.component.ts', import.meta.url), 'utf8');
  assert.equal(ui.includes('routerLink="/wallet"'), false);
  assert.match(ui, /id="affiliate-payout"/);
  assert.match(ui, /payoutAccount\(\)/);
  assert.match(ui, /accountNumberMasked/);
  const api = readFileSync(new URL('../src/app/services/affiliate.service.ts', import.meta.url), 'utf8');
  assert.match(api, /\/wallet\/withdraw/);
  assert.match(api, /persona: 'affiliate'/);
  const checkout = readFileSync(new URL('../src/app/services/api.services.ts', import.meta.url), 'utf8');
  assert.match(checkout, /provider: 'wallet'/);
  assert.equal(checkout.includes('commission'), false);
});

test('legal pages state the bank-only commission rule and drop wallet credit wording', () => {
  for (const file of LEGAL) {
    const body = readFileSync(new URL(`../src/assets/legal/${file}`, import.meta.url), 'utf8');
    assert.equal(body.includes(RULE), true, file);
    for (const banned of ['ghi có vào ví', 'rút về ví', 'chuyển thành số dư khả dụng', 'trừ khỏi ví']) {
      assert.equal(body.includes(banned), false, `${file} ${banned}`);
    }
  }
  const payment = readFileSync(new URL('../src/assets/legal/05-chinh-sach-thanh-toan-doi-soat.md', import.meta.url), 'utf8');
  const rules = readFileSync(new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url), 'utf8');
  assert.equal(payment.includes(IAP_FEE), true);
  assert.equal(rules.includes(IAP_FEE), true);
  assert.match(payment, /Công ty không phải ví điện tử và không phải tổ chức cung ứng dịch vụ trung gian thanh toán được cấp phép theo Nghị định 52\/2024\/NĐ-CP/);
  assert.match(rules, /Công ty không phải ví điện tử và không phải tổ chức cung ứng dịch vụ trung gian thanh toán được cấp phép theo Nghị định 52\/2024\/NĐ-CP/);
});
