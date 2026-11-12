import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legalDir = join(root, 'src/assets/legal');

function read(name: string): string {
  return readFileSync(join(legalDir, name), 'utf8');
}

function captionsOf(body: string): string[] {
  return [...body.matchAll(/^!\[([^\]]*)\]\((assets\/legal\/img\/[^)]+)\)/gm)].map((row) => row[1]);
}

const RULES_CAPTIONS = [
  'Hình 1. Trang chủ',
  'Hình 2. Màn hình đăng nhập',
  'Hình 3. Danh sách sản phẩm trên sàn',
  'Hình 4. Xem gói sản phẩm trước khi mua',
  'Hình 5. Danh sách đơn hàng của người mua',
  'Hình 6. Chi tiết đơn hàng',
  'Hình 7. Kênh bán hàng khi hồ sơ còn nháp',
  'Hình 8. Gian hàng nháp và xác thực bị từ chối',
  'Hình 9. Biểu mẫu hồ sơ người bán trước khi gửi',
  'Hình 10. Hồ sơ gian hàng ở trạng thái nháp',
  'Hình 11. Danh sách sản phẩm trong kênh bán hàng',
  'Hình 12. Danh sách đơn hàng trong kênh bán hàng',
  'Hình 13. Giỏ hàng',
  'Hình 14. Màn hình thanh toán khi chưa hoàn tất hồ sơ người bán',
  'Hình 15. Màn hình rút doanh thu khi xác thực bị từ chối',
  'Hình 16. Biểu mẫu xác minh người bán cá nhân',
  'Hình 17. Biểu mẫu thông tin người bán tổ chức',
  'Hình 18. Tài liệu đại diện và ô đính kèm đăng ký doanh nghiệp',
  'Hình 19. Danh sách yêu cầu khiếu nại',
  'Hình 20. Biểu mẫu gửi khiếu nại',
  'Hình 21. Trang khiếu nại của người bán',
  'Hình 22. Trung tâm pháp lý – bảng chính sách',
];

const GUIDE_CAPTIONS = [
  'Hình 1. Biểu mẫu xác minh người bán cá nhân',
  'Hình 2. Biểu mẫu thông tin người bán tổ chức',
  'Hình 3. Tài liệu đại diện và ô đính kèm đăng ký doanh nghiệp',
];

test('public legal figure captions restart at 1 and omit internal codes', () => {
  const banned = /Nguồn|aimarkets\.vn|Asia\/Bangkok|không chứng minh|theo yêu cầu chủ tài khoản|manifest|qc-\d+|\b(?:V|P|B|S|T|K)\d{2}\b|cccd|\d{9,}/i;
  for (const [file, expected] of [
    ['01-quy-che-hoat-dong-san-tmdt.md', RULES_CAPTIONS],
    ['13-quy-trinh-xac-minh-nguoi-ban.md', GUIDE_CAPTIONS],
  ] as const) {
    const captions = captionsOf(read(file));
    assert.deepEqual(captions, [...expected], file);
    captions.forEach((caption, index) => {
      assert.match(caption, new RegExp(`^Hình ${index + 1}\\. .+`), caption);
      assert.equal(banned.test(caption), false, `${file}: ${caption}`);
    });
  }
});

test('seller eKYC guide matches the individual and organization form', () => {
  const guide = read('13-quy-trinh-xac-minh-nguoi-ban.md');
  const rules = read('01-quy-che-hoat-dong-san-tmdt.md');
  const seller = read('03-chinh-sach-nguoi-ban.md');
  for (const body of [guide, rules, seller]) {
    assert.match(body, /https:\/\/aimarkets\.vn\/settings\/kyc/);
    assert.match(body, /Người mua thông thường không/);
    assert.equal(/đã tích hợp VNeID/.test(body), false);
    assert.equal(/VNeID đã hoàn tất/.test(body), false);
  }
  assert.match(guide, /không khẳng định VNeID đã được tích hợp/);
  assert.match(guide, /v7-k01-ho-so-ca-nhan\.png/);
  assert.match(guide, /v7-k02-ho-so-to-chuc\.png/);
  assert.match(guide, /v7-k03-giay-to-dai-dien\.png/);
  assert.match(seller, /13-quy-trinh-xac-minh-nguoi-ban\.md/);
  const figures = [...rules.matchAll(/^!\[([^\]]*)\]\((assets\/legal\/img\/v7-[^)]+)\)/gm)];
  assert.equal(figures.length, 22);
  const names = figures.map((row) => row[2]);
  assert.equal(new Set(names).size, 22);
  for (const [, caption] of figures) {
    assert.equal(/cccd/i.test(caption), false, caption);
    assert.equal(/\d{9,}/.test(caption), false, caption);
  }
  assert.deepEqual(
    figures.map((row) => row[1]),
    RULES_CAPTIONS,
  );
  assert.deepEqual(captionsOf(guide), GUIDE_CAPTIONS);
  for (const file of ['01-quy-che-hoat-dong-san-tmdt.md', '13-quy-trinh-xac-minh-nguoi-ban.md', '03-chinh-sach-nguoi-ban.md', '04-chinh-sach-nguoi-mua.md']) {
    const body = read(file);
    assert.equal(/assets\/legal\/img\/(?:qc-|h\d)/.test(body), false, file);
  }
});

test('published legal figures point at files that exist', () => {
  const catalog = readFileSync(join(root, 'src/app/features/legal/legal-policies.catalog.ts'), 'utf8');
  const markdownFiles = [...catalog.matchAll(/file: '([^']+\.md)'/g)].map((m) => m[1]);
  assert.ok(markdownFiles.includes('13-quy-trinh-xac-minh-nguoi-ban.md'));
  let figures = 0;
  for (const file of markdownFiles) {
    const body = read(file);
    for (const match of body.matchAll(/!\[[^\]]*\]\((assets\/legal\/img\/[^)]+)\)/g)) {
      figures += 1;
      const rel = match[1];
      assert.equal(/v6|placeholder|todo/i.test(rel), false, rel);
      assert.equal(existsSync(join(root, 'src', rel)), true, `${file} -> ${rel}`);
    }
  }
  assert.equal(figures, 25);
});
