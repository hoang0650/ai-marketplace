import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LEGAL_POLICIES } from '../src/app/features/legal/legal-policies.catalog.ts';
import { renderLegalMarkdown } from '../src/app/features/legal/legal-markdown.ts';

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

const IAP_PAYOUT_WITH_FIGURES = `Công ty đã thiết lập nhận khoản chi trả từ Apple và Google về tài khoản ngân hàng đứng tên Công ty. Theo đối chiếu ngày 12/11/2026 trên App Store Connect, Thỏa thuận Paid Apps đang trạng thái Active (hiệu lực từ 26/10/2026 đến 08/07/2027); tài khoản ngân hàng gắn với thỏa thuận là Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank), số tài khoản 395951335, chủ tài khoản Công ty TNHH Giải pháp Công nghệ PHGroup, quốc gia Việt Nam, đồng tiền VND, trạng thái Active. Trên Google Play Console, phương thức nhận thanh toán chính là chuyển khoản ngân hàng đến tài khoản kết thúc bằng 335, đứng tên PHGROUP TECHNOLOGY SOLUTIONS COMPANY LIMITED (cùng pháp nhân). Các ảnh dưới đây minh họa việc đã thiết lập kênh nhận tiền; không phải chứng từ khoản chi trả đã phát sinh (tại thời điểm đối chiếu, Google Play Console hiển thị thu nhập 0,00 USD) và không phải chứng từ đã chi trả cho người bán.`;
const IAP_PAYOUT_AFTER = `Sau khi Công ty nhận được khoản Apple hoặc Google chi trả vào tài khoản nêu trên, Công ty thực hiện chi trả doanh thu hợp lệ cho người bán và hoa hồng affiliate theo Hợp đồng dịch vụ thương mại điện tử và quy trình đối soát tại Điều 7 (đối soát, tạm giữ 48 giờ, chi trả bằng VND trong 03 ngày làm việc). IAP vẫn chỉ là kênh nạp số dư nội bộ trong ứng dụng, không phải kênh thanh toán chung cho sản phẩm của người bán bên thứ ba. Việc đã thiết lập tài khoản nhận tiền không thay thế chứng từ đối soát và chứng từ chi trả thực tế.`;
const IAP_PAYOUT_CONTRACT = `Khoản Apple và Google chi trả cho Bên A từ giao dịch mua trong ứng dụng cũng được chuyển về tài khoản này sau khi Bên A đã thiết lập nhận thanh toán trên App Store Connect và Google Play Console (đối chiếu ngày 12/11/2026; thỏa thuận Paid Apps và tài khoản ngân hàng trạng thái Active; phương thức nhận trên Google Play là chuyển khoản đến tài khoản kết thúc 335 đứng tên pháp nhân Bên A). Sau khi nhận được khoản chi trả đó, Bên A chi trả doanh thu hợp lệ cho Bên B theo quy trình đối soát, tạm giữ và chi trả tại Điều này. Việc thiết lập tài khoản nhận tiền không phải chứng từ đã phát sinh khoản chi trả từ Apple/Google và không thay thế bảng đối soát, chứng từ chi trả thực tế.`;
const IAP_PAYOUT_NO_FIGURES = `Công ty đã thiết lập nhận khoản chi trả từ Apple và Google về tài khoản ngân hàng đứng tên Công ty. Theo đối chiếu ngày 12/11/2026 trên App Store Connect, Thỏa thuận Paid Apps đang trạng thái Active (hiệu lực từ 26/10/2026 đến 08/07/2027); tài khoản ngân hàng gắn với thỏa thuận là Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank), số tài khoản 395951335, chủ tài khoản Công ty TNHH Giải pháp Công nghệ PHGroup, quốc gia Việt Nam, đồng tiền VND, trạng thái Active. Trên Google Play Console, phương thức nhận thanh toán chính là chuyển khoản ngân hàng đến tài khoản kết thúc bằng 335, đứng tên PHGROUP TECHNOLOGY SOLUTIONS COMPANY LIMITED (cùng pháp nhân). Ảnh minh họa nằm tại Đề án (Hình 22–25). Các ảnh này minh họa việc đã thiết lập kênh nhận tiền; không phải chứng từ khoản chi trả đã phát sinh (tại thời điểm đối chiếu, Google Play Console hiển thị thu nhập 0,00 USD) và không phải chứng từ đã chi trả cho người bán.`;
const IAP_PAYOUT_DECLARATION = `Công ty đã thiết lập nhận khoản chi trả từ Apple và Google về cùng tài khoản VPBank 395951335 đứng tên Công ty (đối chiếu ngày 12/11/2026; minh họa tại Đề án). Sau khi nhận được khoản đó, Công ty chi trả người bán theo quy trình đối soát trong Hợp đồng. Đây là bằng chứng đã thiết lập kênh nhận tiền, không phải chứng từ đã phát sinh khoản chi trả hay đã chi trả cho người bán.`;

test('public legal pages use the approved Apple and Google payout wording', () => {
  const rules = readFileSync(new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url), 'utf8');
  const payment = readFileSync(new URL('../src/assets/legal/05-chinh-sach-thanh-toan-doi-soat.md', import.meta.url), 'utf8');
  const contract = readFileSync(new URL('../src/assets/legal/15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md', import.meta.url), 'utf8');
  for (const body of [rules, payment]) {
    assert.equal(body.split(IAP_PAYOUT_WITH_FIGURES).length - 1, 1);
    assert.equal(body.split(IAP_PAYOUT_AFTER).length - 1, 1);
    assert.equal(body.includes(IAP_PAYOUT_NO_FIGURES), false);
    assert.equal(body.includes('0,00 USD'), true);
  }
  assert.equal(contract.split(IAP_PAYOUT_CONTRACT).length - 1, 1);
  const contractGap = contract.indexOf(IAP_PAYOUT_CONTRACT);
  assert.ok(contractGap > 0);
  assert.equal(contract.slice(contractGap - 2, contractGap), '\n\n');
  assert.ok(contract.slice(contractGap + IAP_PAYOUT_CONTRACT.length).startsWith('\n\n2. Quy trình đối soát:'));
  assert.match(
    contract,
    /4\. Apple In-App Purchase\/Google Play Billing chỉ áp dụng cho nội dung số đủ điều kiện theo quy tắc kho ứng dụng\./,
  );
  for (const body of [rules, payment, contract]) {
    assert.equal(body.includes(IAP_PAYOUT_DECLARATION), false);
    for (const phrase of ['GPay', 'gpay', 'LTC', 'CO., LTC', 'W-8', 'hoàn toàn đáp ứng']) {
      assert.equal(body.includes(phrase), false, phrase);
    }
  }
  const html = renderLegalMarkdown(payment);
  assert.match(
    html,
    /<img src="\/assets\/legal\/img\/02-app-store-connect-edit-bank\.png" alt="Hình 2\. App Store Connect – thông tin tài khoản VPBank số 395951335 đứng tên Công ty \(12\/11\/2026\)"/,
  );
  assert.equal(html.includes('W-8'), false);
  assert.equal(html.includes('LTC'), false);
  assert.equal(html.includes('GPay'), false);
});
