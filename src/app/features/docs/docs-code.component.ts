import { Component, Input } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';

export interface DocsCodeSample {
  id: string;
  label: string;
  text: string;
  lang?: string;
}

interface Token {
  text: string;
  kind: string;
}

@Component({
  selector: 'app-docs-code',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="docs-codeblock">
      <div class="docs-codeblock__bar">
        @if (tabs.length > 1) {
          <div class="docs-codeblock__tabs" role="tablist">
            @for (tab of tabs; track tab.id) {
              <button type="button" role="tab" [class.is-on]="tab.id === activeId" (click)="activeId = tab.id">{{ tab.label }}</button>
            }
          </div>
        } @else {
          <span class="docs-codeblock__lang">{{ active.lang || lang || 'text' }}</span>
        }
        <button type="button" class="docs-codeblock__copy" (click)="copy()">
          {{ copied ? ('docsModels.copied' | t) : ('docsModels.copy' | t) }}
        </button>
      </div>
      <pre class="docs-codeblock__pre"><code>@for (tok of tokens; track $index) {<span [class]="'tok tok-' + tok.kind">{{ tok.text }}</span>}</code></pre>
    </div>
  `,
  styles: `
    .docs-codeblock {
      margin: 0.75rem 0 1rem;
      max-width: 100%;
      min-width: 0;
      border-radius: 12px;
      overflow: hidden;
      background: #0e1524;
      border: 1px solid #243044;
    }
    .docs-codeblock__bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.5rem 0.4rem 0.75rem;
      background: #162033;
      border-bottom: 1px solid #243044;
    }
    .docs-codeblock__tabs { display: flex; gap: 0.25rem; min-width: 0; overflow-x: auto; }
    .docs-codeblock__tabs button,
    .docs-codeblock__copy {
      border: 0;
      background: transparent;
      color: #c9d4e8;
      border-radius: 8px;
      padding: 0.28rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
    }
    .docs-codeblock__tabs button.is-on { background: #0e1524; color: #f4e4bf; }
    .docs-codeblock__copy { margin-left: auto; }
    .docs-codeblock__lang {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9fb0c9;
    }
    .docs-codeblock__pre {
      margin: 0;
      padding: 0.9rem 1rem 1rem;
      overflow-x: auto;
      max-width: 100%;
      min-width: 0;
      color: #e7eef8;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
      line-height: 1.6;
      white-space: pre;
    }
    .tok-key { color: #f0d48a; }
    .tok-str { color: #9ee0b0; }
    .tok-num { color: #f3b6a0; }
    .tok-flag { color: #9ec1ff; }
    .docs-codeblock button:focus-visible { outline: 2px solid #c9a961; outline-offset: 2px; }
  `,
})
export class DocsCodeComponent {
  @Input() text = '';
  @Input() lang = '';
  @Input() samples: DocsCodeSample[] | null = null;
  activeId = '';
  copied = false;

  get tabs(): DocsCodeSample[] {
    if (this.samples?.length) return this.samples;
    return [{ id: 'only', label: this.lang || 'text', text: this.text, lang: this.lang }];
  }

  get active(): DocsCodeSample {
    return this.tabs.find((tab) => tab.id === this.activeId) || this.tabs[0];
  }

  get tokens(): Token[] {
    return highlight(this.active?.text || '', this.active?.lang || this.lang);
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.active?.text || '');
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 1600);
    } catch {
      this.copied = false;
    }
  }
}

function highlight(source: string, lang: string): Token[] {
  const kind = (lang || '').toLowerCase();
  if (kind === 'json') return scan(source, /("(?:\\.|[^"\\])*")(\s*:)|("(?:\\.|[^"\\])*")|\b-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/gi, (m) => (m[1] ? 'key' : m[3] ? 'str' : 'num'));
  if (kind === 'bash' || kind === 'curl' || kind === 'sh') {
    return scan(source, /('(?:\\'|[^'])*'|"(?:\\.|[^"\\])*")|(^\s*-[A-Za-z][\w-]*)/gm, (m) => (m[1] ? 'str' : 'flag'));
  }
  return [{ text: source, kind: 'plain' }];
}

function scan(source: string, re: RegExp, kindOf: (match: RegExpExecArray) => string): Token[] {
  const out: Token[] = [];
  let last = 0;
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) out.push({ text: source.slice(last, match.index), kind: 'plain' });
    const tokenKind = kindOf(match);
    if (match[1] && tokenKind === 'key') {
      out.push({ text: match[1], kind: 'key' });
      out.push({ text: match[2] || '', kind: 'plain' });
    } else {
      out.push({ text: match[0], kind: tokenKind });
    }
    last = match.index + match[0].length;
    if (match[0].length === 0) re.lastIndex += 1;
  }
  if (last < source.length) out.push({ text: source.slice(last), kind: 'plain' });
  return out.length ? out : [{ text: source, kind: 'plain' }];
}
