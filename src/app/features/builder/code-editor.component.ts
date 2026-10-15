import { Component, ElementRef, OnDestroy, PLATFORM_ID, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TPipe } from '../../i18n/t.pipe';
import type { CmEditor, CmProblem } from './code-editor.cm';

const DARK_KEY = 'aim.builder.editorDark';

/** VS Code–style editor for the Builder Code tab (CodeMirror 6, lazy-loaded). */
@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="ce" [class.ce--dark]="dark()">
      <div class="ce__bar">
        <span class="ce__lang">{{ lang() }}</span>
        <span class="ce__status" [class.ce__status--err]="problems().length">
          {{ problems().length ? ('⛔ ' + problems().length + ' ') : '✓ ' }}{{ 'builder.editor.problems' | t }}
        </span>
        <button type="button" class="ce__btn" (click)="toggleDark()" [attr.aria-pressed]="dark()">{{ dark() ? '☀️' : '🌙' }} {{ (dark() ? 'builder.editor.light' : 'builder.editor.dark') | t }}</button>
      </div>
      <div class="ce__host" #host>
        @if (!ready()) { <textarea class="ce__fallback" spellcheck="false" [value]="value()" [readOnly]="readOnly()" (input)="changed.emit($any($event.target).value)"></textarea> }
      </div>
      @if (problems().length) {
        <ul class="ce__problems" [attr.aria-label]="'builder.editor.problems' | t">
          @for (p of problems(); track $index) {
            <li><button type="button" (click)="editor?.goTo(p.from)"><b>{{ p.severity === 'error' ? '⛔' : '⚠️' }}</b> {{ p.message }} <small>[{{ p.line }}:{{ p.col }}]</small></button></li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; min-height: 0; flex: 1; }
    .ce { display: flex; flex-direction: column; flex: 1; min-height: 0; border: 1px solid rgba(127,127,127,.3); border-radius: 10px; overflow: hidden; background: #fff; color: #1f2328; }
    .ce--dark { background: #282c34; color: #abb2bf; }
    .ce__bar { display: flex; align-items: center; gap: .6rem; padding: .25rem .6rem; font-size: .72rem; border-bottom: 1px solid rgba(127,127,127,.25); }
    .ce__lang { font-weight: 700; text-transform: uppercase; opacity: .7; }
    .ce__status { opacity: .75; } .ce__status--err { color: #e5534b; opacity: 1; font-weight: 600; }
    .ce__btn { margin-left: auto; border: 1px solid rgba(127,127,127,.35); border-radius: 6px; padding: .1rem .5rem; background: transparent; color: inherit; cursor: pointer; }
    .ce__host { flex: 1; min-height: 12rem; overflow: hidden; display: flex; }
    .ce__host > :first-child { flex: 1; }
    .ce__fallback { flex: 1; resize: none; border: 0; padding: .5rem; font: 12px ui-monospace, monospace; background: transparent; color: inherit; }
    .ce__problems { margin: 0; padding: .25rem 0; list-style: none; max-height: 7.5rem; overflow: auto; border-top: 1px solid rgba(127,127,127,.25); font: 12px ui-monospace, monospace; }
    .ce__problems button { width: 100%; text-align: left; padding: .15rem .6rem; background: none; border: 0; color: inherit; cursor: pointer; }
    .ce__problems button:hover { background: rgba(127,127,127,.15); }
    .ce__problems small { opacity: .6; }
  `],
})
export class CodeEditorComponent implements OnDestroy {
  readonly value = input('');
  readonly path = input('');
  readonly readOnly = input(false);
  readonly changed = output<string>();
  readonly save = output<void>();

  readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  readonly ready = signal(false);
  readonly problems = signal<CmProblem[]>([]);
  readonly dark = signal(false);
  editor: CmEditor | null = null;
  private loadedPath = '';
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  lang(): string {
    const e = (this.path().split('.').pop() || '').toLowerCase();
    return ({ tsx: 'TypeScript JSX', ts: 'TypeScript', jsx: 'JavaScript JSX', js: 'JavaScript', json: 'JSON', md: 'Markdown' } as Record<string, string>)[e] || e || 'text';
  }

  constructor() {
    if (this.browser) {
      try { this.dark.set(localStorage.getItem(DARK_KEY) !== '0'); } catch { this.dark.set(true); }
      void this.boot();
    }
    effect(() => {
      const v = this.value(), p = this.path();
      const ed = this.editor;
      if (!ed || !this.ready()) return;
      if (p !== this.loadedPath || v !== ed.getDoc()) { this.loadedPath = p; untracked(() => ed.setDoc(v, p)); }
    });
    effect(() => { const r = this.readOnly(); if (this.ready()) this.editor?.setReadOnly(r); });
  }

  private async boot(): Promise<void> {
    const cm = await import('./code-editor.cm');
    const host = this.host().nativeElement;
    this.ready.set(true);
    await Promise.resolve();
    host.innerHTML = '';
    this.loadedPath = this.path();
    this.editor = cm.createEditor(host, this.value(), this.path(), this.dark(), this.readOnly(), {
      onChange: (d) => this.changed.emit(d),
      onSave: () => this.save.emit(),
      onProblems: (p) => this.problems.set(p),
    });
  }

  toggleDark(): void {
    const d = !this.dark();
    this.dark.set(d);
    this.editor?.setDark(d);
    try { localStorage.setItem(DARK_KEY, d ? '1' : '0'); } catch { /* ignore */ }
  }

  ngOnDestroy(): void { this.editor?.destroy(); }
}
