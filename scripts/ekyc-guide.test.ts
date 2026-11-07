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

test('seller eKYC guide matches the individual and organization form', () => {
  const guide = read('13-quy-trinh-xac-minh-nguoi-ban.md');
  const rules = read('01-quy-che-hoat-dong-san-tmdt.md');
  for (const body of [guide, rules]) {
    assert.match(body, /https:\/\/aimarkets\.vn\/settings\/kyc/);
    assert.match(body, /Cá nhân/);
    assert.match(body, /Tổ chức|Hộ kinh doanh/);
    assert.match(body, /PDF/);
    assert.match(body, /Người mua thông thường không/);
    assert.equal(/đã tích hợp VNeID/.test(body), false);
    assert.equal(/VNeID đã hoàn tất/.test(body), false);
  }
  assert.match(guide, /không khẳng định VNeID đã được tích hợp/);
  assert.match(guide, /https:\/\/aimarkets\.vn\/sell\/kyc/);
  assert.match(guide, /CMND/);
  assert.match(guide, /Dùng số CCCD/);
  assert.match(guide, /không phải quyết định đã duyệt người bán/);
  assert.equal(guide.includes('!['), false);
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
  assert.ok(figures > 0);
});
