/** Lightweight Markdown → HTML for policy pages. Input is escaped first. */
export function renderLegalMarkdown(source: string): string {
  const escaped = escapeHtml(source.replace(/\r\n/g, '\n').trim());
  const lines = escaped.split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];

  const flushPara = (buf: string[]) => {
    if (!buf.length) return;
    const soft = buf.map((l) => / {2}$/.test(l));
    const texts = buf.map((l) => l.replace(/\s+$/, ''));
    let joined = texts[0];
    for (let j = 1; j < texts.length; j++) {
      joined += soft[j - 1] ? '<br />' : ' ';
      joined += texts[j];
    }
    const html = joined.trim();
    if (html) out.push(`<p>${inline(html)}</p>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i += 1;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('---') && line.replace(/-/g, '') === '') {
      out.push('<hr />');
      i += 1;
      continue;
    }

    // Figure: ![caption](assets/legal/img/file.jpg) on its own line. Only local legal assets are allowed.
    const fig = /^!\[([^\]]*)\]\((assets\/legal\/img\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp))\)\s*$/.exec(line.trim());
    if (fig) {
      const cap = fig[1].replace(/"/g, '&quot;');
      out.push(`<figure class="legal-fig"><img src="/${fig[2]}" alt="${cap}" loading="lazy" /><figcaption>${inline(fig[1])}</figcaption></figure>`);
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      // Optional explicit anchor: "## Title {#online-license}" → <h2 id="online-license">
      const anchor = /\s*\{#([a-z0-9-]{1,64})\}\s*$/.exec(heading[2]);
      const text = anchor ? heading[2].slice(0, anchor.index) : heading[2];
      const id = anchor ? ` id="${anchor[1]}"` : '';
      out.push(`<h${level}${id}>${inline(emphasisHeading(text))}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith('&gt; ')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('&gt; ')) {
        quote.push(lines[i].slice(5));
        i += 1;
      }
      out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = splitTableRow(lines[i]);
        if (!cells.length || cells.every((c) => /^[-:]+$/.test(c))) {
          i += 1;
          continue;
        }
        rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        out.push(
          '<div class="legal-table-wrap"><table><thead><tr>' +
            head.map((c) => `<th>${inline(c)}</th>`).join('') +
            '</tr></thead><tbody>' +
            body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
            '</tbody></table></div>',
        );
      }
      continue;
    }

    // Blank lines stay inside a list when the next content line is the same kind.
    // A heading, paragraph, image, table, quote, rule, or fence ends the list.
    if (isOrderedItem(line) || isUnorderedItem(line)) {
      const ordered = isOrderedItem(line);
      const items: string[] = [];
      const startDigits = ordered ? orderedStartDigits(line) : '';
      while (i < lines.length) {
        if (!lines[i].trim()) {
          const next = nextNonEmpty(lines, i + 1);
          if (next >= lines.length) break;
          const same = ordered ? isOrderedItem(lines[next]) : isUnorderedItem(lines[next]);
          if (!same) break;
          i = next;
          continue;
        }
        const same = ordered ? isOrderedItem(lines[i]) : isUnorderedItem(lines[i]);
        if (!same) break;
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && !/^0*1$/.test(startDigits) ? ` start="${startDigits}"` : '';
      out.push(`<${tag}${startAttr}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Raw HTML in the source is escaped, so the company closing is wrapped here.
    const signatory = readSignatory(lines, i);
    if (signatory) {
      out.push(signatory.html);
      i = signatory.next;
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('&gt; ') &&
      !lines[i].trim().startsWith('![') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(lines[i].startsWith('---') && lines[i].replace(/-/g, '') === '')
    ) {
      para.push(lines[i]);
      i += 1;
    }
    flushPara(para);
  }

  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
  }

  return out.join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isOrderedItem(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line);
}

function isUnorderedItem(line: string): boolean {
  return /^\s*[-*]\s+/.test(line);
}

function orderedStartDigits(line: string): string {
  const match = /^\s*(\d+)\.\s+/.exec(line);
  return match ? match[1] : '1';
}

function nextNonEmpty(lines: string[], from: number): number {
  let j = from;
  while (j < lines.length && !lines[j].trim()) j += 1;
  return j;
}

function isSignatoryBarrier(line: string): boolean {
  const trimmed = line.trim();
  if (line.startsWith('```')) return true;
  if (trimmed.startsWith('---') && trimmed.replace(/-/g, '') === '') return true;
  if (/^#{1,4}\s+/.test(trimmed)) return true;
  if (line.startsWith('&gt; ')) return true;
  if (/^!\[([^\]]*)\]\((assets\/legal\/img\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp))\)\s*$/.test(trimmed)) {
    return true;
  }
  if (isOrderedItem(line) || isUnorderedItem(line)) return true;
  if (line.includes('|')) return true;
  return false;
}

/** Company closing only: title, wet-ink note, printed name, chức vụ. */
function readSignatory(lines: string[], start: number): { html: string; next: number } | null {
  if (lines[start].trim() !== 'ĐẠI DIỆN CÔNG TY') return null;
  const indexes = [start];
  let cursor = start;
  for (let n = 0; n < 3; n += 1) {
    const next = nextNonEmpty(lines, cursor + 1);
    if (next >= lines.length) return null;
    indexes.push(next);
    cursor = next;
  }
  const parts = indexes.map((index) => lines[index].trim());
  if (parts[1] !== '(Ký, ghi rõ họ tên và đóng dấu)') return null;
  if (isSignatoryBarrier(lines[indexes[2]])) return null;
  if (!parts[3].startsWith('Chức vụ:')) return null;
  if (!parts[3].slice('Chức vụ:'.length).trim()) return null;
  const html =
    '<div class="legal-signatory">' +
    parts.map((part) => `<p>${inline(part)}</p>`).join('') +
    '</div>';
  return { html, next: indexes[3] + 1 };
}

function splitTableRow(line: string): string[] {
  const parts = line.trim().split('|');
  if (parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts.map((c) => c.trim());
}

/** Ensure "Điều N." / numbered article labels render as bold even if MD omitted **. */
function emphasisHeading(title: string): string {
  if (/\*\*/.test(title)) return title;
  return title
    .replace(/^(Điều\s+\d+[.:]?)/i, '**$1**')
    .replace(/^(\d+\.\d+\.?)/, '**$1**');
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (_, label, file) => {
      const slug = String(file)
        .replace(/^\d+-/, '')
        .replace(/\.md$/, '');
      return `<a href="/legal/${slug}">${label}</a>`;
    });
}
