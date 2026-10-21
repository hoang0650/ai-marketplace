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
      out.push(`<h${level}>${inline(emphasisHeading(heading[2]))}</h${level}>`);
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

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
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
