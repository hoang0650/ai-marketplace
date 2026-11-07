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
  for (const [, caption] of figures) {
    assert.equal(/cccd/i.test(caption), false, caption);
    assert.equal(/\d{9,}/.test(caption), false, caption);
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
  assert.ok(figures > 0);
});
