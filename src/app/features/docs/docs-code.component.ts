import { Component, Input } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-docs-code',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="docs-codeblock">
      <button type="button" class="docs-codeblock__copy" (click)="copy()">
        {{ copied ? ('docsModels.copied' | t) : ('docsModels.copy' | t) }}
      </button>
      <pre class="docs-codeblock__pre">{{ text }}</pre>
    </div>
  `,
  styles: `
    .docs-codeblock {
      position: relative;
      margin: 0.35rem 0 0.85rem;
      max-width: 100%;
    }
    .docs-codeblock__copy {
      position: absolute;
      top: 0.45rem;
      right: 0.45rem;
      z-index: 1;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.08);
      color: #e8f0ff;
      border-radius: 8px;
      padding: 0.2rem 0.5rem;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
    }
    .docs-codeblock__pre {
      margin: 0;
      padding: 2rem 1rem 0.9rem;
      border-radius: 10px;
      background: #0b1220;
      color: #e8f0ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 100%;
    }
  `,
})
export class DocsCodeComponent {
  @Input({ required: true }) text = '';
  copied = false;

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 1600);
    } catch {
      this.copied = false;
    }
  }
}
