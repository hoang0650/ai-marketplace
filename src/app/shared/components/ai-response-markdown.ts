import { Marked, Tokens } from 'marked';

export type ResponseBlock = { kind: 'html'; html: string } | { kind: 'code'; text: string; language: string };

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const markdown = new Marked({ gfm: true, breaks: true, async: false, renderer: {
  // Model output is untrusted. Raw HTML is displayed as text; images never make
  // automatic network requests. Angular sanitizes the resulting HTML as well.
  html: ({ text }: Tokens.HTML | Tokens.Tag) => escape(text),
  image: ({ text }: Tokens.Image) => escape(text || ''),
  link({ href, tokens }: Tokens.Link) {
    const label = this.parser.parseInline(tokens);
    if (!/^(https?:\/\/|mailto:)/i.test(href) || /[\u0000-\u0020]/.test(href)) return label;
    return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
  },
} });

export function responseHtml(source: string): string {
  return markdown.parse(String(source || ''), { async: false });
}

/** Keep fenced code in Angular templates so code and clipboard text are identical. */
export function responseBlocks(source: string): ResponseBlock[] {
  const tokens = markdown.lexer(String(source || ''));
  const blocks: ResponseBlock[] = [];
  let prose: typeof tokens = Object.assign([], { links: tokens.links });
  const flush = () => {
    if (!prose.length) return;
    blocks.push({ kind: 'html', html: markdown.parser(prose) });
    prose = Object.assign([], { links: tokens.links });
  };
  for (const token of tokens) {
    if (token.type === 'code') {
      flush();
      const code = token as Tokens.Code;
      blocks.push({ kind: 'code', text: code.text, language: (code.lang || '').split(/\s/)[0].slice(0, 30) });
    } else prose.push(token);
  }
  flush();
  return blocks;
}

/** A partial file block must never spill generated source code into the chat. */
export function builderStreamView(source: string): { text: string; files: string[]; activeFile: string } {
  const files: string[] = [];
  const prose: string[] = [];
  const tags = /<(file|delete)\b/gi;
  let cursor = 0;
  let activeFile = '';
  let match: RegExpExecArray | null;
  while ((match = tags.exec(source))) {
    prose.push(source.slice(cursor, match.index));
    const end = source.indexOf('>', match.index);
    if (end < 0) return { text: prose.join('').trim(), files, activeFile };
    const path = /\bpath\s*=\s*["']([^"']+)["']/.exec(source.slice(match.index, end + 1))?.[1];
    const valid = path && path.length <= 120 && !path.startsWith('/') && !path.split(/[\\/]/).includes('..');
    if (valid && !files.includes(path)) files.push(path);
    if (match[1].toLowerCase() === 'file') {
      const close = source.indexOf('</file>', end + 1);
      if (close < 0) return { text: prose.join('').trim(), files, activeFile: valid ? path : '' };
      cursor = close + 7;
    } else cursor = end + 1;
    tags.lastIndex = cursor;
  }
  let tail = source.slice(cursor);
  const open = tail.lastIndexOf('<');
  if (open >= 0) {
    const partial = tail.slice(open).toLowerCase();
    if ('<file'.startsWith(partial) || '<delete'.startsWith(partial)) tail = tail.slice(0, open);
  }
  prose.push(tail);
  return { text: prose.join('').trim(), files, activeFile };
}
