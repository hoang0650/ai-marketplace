import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderLegalMarkdown } from '../src/app/features/legal/legal-markdown.ts';

function olOpens(html: string): string[] {
  return html.match(/<ol\b[^>]*>/g) ?? [];
}

function assertStart(open: string, expected: number) {
  const match = /\bstart="(\d+)"/.exec(open);
  if (expected === 1) {
    assert.ok(match === null || match[1] === '1', open);
    return;
  }
  assert.equal(match?.[1], String(expected), open);
}

test('blank lines keep one ordered list and numbers 1 through 4', () => {
  const html = renderLegalMarkdown('1. one\n\n2. two\n\n3. three\n\n4. four');
  const opens = olOpens(html);
  assert.equal(opens.length, 1);
  assertStart(opens[0], 1);
  assert.deepEqual(html.match(/<li>[\s\S]*?<\/li>/g), [
    '<li>one</li>',
    '<li>two</li>',
    '<li>three</li>',
    '<li>four</li>',
  ]);
  assert.equal((html.match(/<ol\b/g) ?? []).length, 1);
});

test('an ordered list keeps its explicit starting number', () => {
  const html = renderLegalMarkdown('2. two\n\n3. three');
  const opens = olOpens(html);
  assert.equal(opens.length, 1);
  assertStart(opens[0], 2);
  assert.equal(html, '<ol start="2"><li>two</li><li>three</li></ol>');
});

test('a paragraph or heading between numbered items keeps two lists', () => {
  const paragraph = renderLegalMarkdown('1. one\n\nNot a list.\n\n2. two');
  const paragraphOpens = olOpens(paragraph);
  assert.equal(paragraphOpens.length, 2);
  assertStart(paragraphOpens[0], 1);
  assertStart(paragraphOpens[1], 2);
  assert.match(paragraph, /<p>Not a list\.<\/p>/);

  const heading = renderLegalMarkdown('1. one\n\n## Next\n\n2. two');
  const headingOpens = olOpens(heading);
  assert.equal(headingOpens.length, 2);
  assertStart(headingOpens[0], 1);
  assertStart(headingOpens[1], 2);
  assert.match(heading, /<h2>Next<\/h2>/);
});

test('images, tables, quotes, rules, and fences split lists', () => {
  const figure = renderLegalMarkdown('1. one\n\n2. two\n\n![Cap](assets/legal/img/shot.png)\n\n3. three');
  const figureOpens = olOpens(figure);
  assert.equal(figureOpens.length, 2);
  assertStart(figureOpens[0], 1);
  assertStart(figureOpens[1], 3);
  assert.match(figure, /<figure class="legal-fig">/);
  assert.ok(figure.indexOf('</ol>') < figure.indexOf('<figure'));
  assert.ok(figure.indexOf('</figure>') < figure.lastIndexOf('<ol'));

  const table = renderLegalMarkdown('1. one\n\n| H |\n| - |\n| c |\n\n2. two');
  assert.equal(olOpens(table).length, 2);
  assertStart(olOpens(table)[1], 2);
  assert.match(table, /<table>/);

  const quote = renderLegalMarkdown('1. one\n\n> note\n\n2. two');
  assert.equal(olOpens(quote).length, 2);
  assert.match(quote, /<blockquote>note<\/blockquote>/);

  const rule = renderLegalMarkdown('1. one\n\n---\n\n2. two');
  assert.equal(olOpens(rule).length, 2);
  assert.match(rule, /<hr \/>/);

  const fence = renderLegalMarkdown('1. one\n\n```\ncode\n```\n\n2. two');
  assert.equal(olOpens(fence).length, 2);
  assert.match(fence, /<pre><code>code<\/code><\/pre>/);
});

test('blank lines keep one unordered list', () => {
  const html = renderLegalMarkdown('- a\n\n- b\n\n* c');
  assert.equal(html, '<ul><li>a</li><li>b</li><li>c</li></ul>');
});

test('a different list kind ends the current list', () => {
  const html = renderLegalMarkdown('1. a\n\n- b\n\n2. c');
  assert.equal(olOpens(html).length, 2);
  assert.equal((html.match(/<ul>/g) ?? []).length, 1);
  assertStart(olOpens(html)[1], 2);
});

test('company signatory is one right-aligned block with the printed name', () => {
  const html = renderLegalMarkdown(
    'ĐẠI DIỆN CÔNG TY\n\n(Ký, ghi rõ họ tên và đóng dấu)\n\nPhan Huy Hoàng\n\nChức vụ: Giám đốc',
  );
  assert.equal(
    html,
    '<div class="legal-signatory"><p>ĐẠI DIỆN CÔNG TY</p><p>(Ký, ghi rõ họ tên và đóng dấu)</p><p>Phan Huy Hoàng</p><p>Chức vụ: Giám đốc</p></div>',
  );
  assert.equal(html.includes('<img'), false);
});

test('raw signatory markup in the source stays escaped', () => {
  const html = renderLegalMarkdown('<div class="legal-signatory">nope</div>');
  assert.equal(html.includes('<div class="legal-signatory">nope'), false);
  assert.match(html, /&lt;div class="legal-signatory"&gt;nope&lt;\/div&gt;/);
});

test('a broken signatory stays ordinary paragraphs', () => {
  const html = renderLegalMarkdown('ĐẠI DIỆN CÔNG TY\n\nNot the closing.\n\n## Next');
  assert.equal(html.includes('legal-signatory'), false);
  assert.match(html, /<p>ĐẠI DIỆN CÔNG TY<\/p>/);
  assert.match(html, /<p>Not the closing\.<\/p>/);
  assert.match(html, /<h2>Next<\/h2>/);
});

test('Quy chế Mục XXV is one list and the closing names the director', () => {
  const markdown = readFileSync(
    new URL('../src/assets/legal/01-quy-che-hoat-dong-san-tmdt.md', import.meta.url),
    'utf8',
  );
  assert.equal(markdown.includes('……………………'), false);
  assert.match(markdown, /Phan Huy Hoàng\n\nChức vụ: Giám đốc\n?$/);
  assert.match(markdown, /Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Hồ Chí Minh/);

  const html = renderLegalMarkdown(markdown);
  const xxv = html.split('<h2>XXV. ĐIỀU KHOẢN ÁP DỤNG</h2>')[1]?.split('<h2>XXVI.')[0];
  assert.ok(xxv);
  const lists = xxv.match(/<ol\b[^>]*>[\s\S]*?<\/ol>/g) ?? [];
  assert.equal(lists.length, 1);
  assertStart(lists[0].slice(0, 24), 1);
  const items = lists[0].match(/<li>[\s\S]*?<\/li>/g) ?? [];
  assert.equal(items.length, 4);
  assert.match(items[0], /^<li>Quy chế, Điều khoản sử dụng/);
  assert.match(items[1], /<strong>ít nhất 30 ngày<\/strong>/);
  assert.match(items[2], /^<li>Người dùng tiếp tục sử dụng/);
  assert.match(items[3], /^<li>Đơn hàng đã giao kết/);
  assert.ok(xxv.indexOf('</ol>') < xxv.indexOf('<figure class="legal-fig">'));

  const signatory =
    '<div class="legal-signatory"><p>ĐẠI DIỆN CÔNG TY</p><p>(Ký, ghi rõ họ tên và đóng dấu)</p><p>Phan Huy Hoàng</p><p>Chức vụ: Giám đốc</p></div>';
  assert.equal(html.split(signatory).length - 1, 1);
  const block = html.slice(html.indexOf('<div class="legal-signatory">'), html.indexOf('</div>', html.indexOf('legal-signatory')) + 6);
  assert.equal(block.includes('<img'), false);
  assert.equal(html.includes('GPay'), false);
});

test('signatory stylesheet keeps a right-side block inside the column', () => {
  const scss = readFileSync(
    new URL('../src/app/features/legal/legal-policy-page.component.scss', import.meta.url),
    'utf8',
  );
  assert.match(scss, /\.legal-doc__body \.legal-signatory \{/);
  assert.match(scss, /width: fit-content;/);
  assert.match(scss, /max-width: min\(22rem, 100%\);/);
  assert.match(scss, /margin: 2rem 0 0\.25rem auto;/);
  assert.match(scss, /text-align: right;/);
});
