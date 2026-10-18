import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { TPipe } from '../../i18n/t.pipe';
import { CodeEditorComponent } from './code-editor.component';
import type { CmProblem } from './code-editor.cm';

interface TreeRow { kind: 'dir' | 'file'; name: string; path: string; depth: number }

/** Builds a sorted folder/file tree (folders first) from flat project paths. */
export function fileTree(paths: string[], collapsed: Set<string>): TreeRow[] {
  const dirs = new Set<string>();
  for (const p of paths) { const parts = p.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/')); }
  const all: { kind: 'dir' | 'file'; path: string }[] = [...[...dirs].map((d) => ({ kind: 'dir' as const, path: d })), ...paths.map((p) => ({ kind: 'file' as const, path: p }))];
  const key = (r: { kind: string; path: string }) => r.path.split('/').map((seg, i, a) => (i === a.length - 1 && r.kind === 'file' ? '1' : '0') + seg.toLowerCase()).join('/');
  all.sort((a, b) => (key(a) < key(b) ? -1 : 1));
  return all
    .filter((r) => { const parts = r.path.split('/'); for (let i = 1; i < parts.length; i++) if (collapsed.has(parts.slice(0, i).join('/'))) return false; return true; })
    .map((r) => ({ kind: r.kind, path: r.path, name: r.path.split('/').pop() || r.path, depth: r.path.split('/').length - 1 }));
}

export function fileIcon(path: string): string {
  const e = (path.split('.').pop() || '').toLowerCase();
  return ({ tsx: '⚛', jsx: '⚛', ts: 'TS', js: 'JS', json: '{}', html: '<>', css: '#', md: 'M↓', svg: '◇', png: '▣', jpg: '▣' } as Record<string, string>)[e] || '·';
}

/**
 * Mobile (< lg) VS Code–style code view for the Builder: dark editor, explorer drawer,
 * open-file tabs, a key helper bar above the soft keyboard and a status bar.
 * Also renders the full-pane file explorer for the bottom "Files" tab (mode = 'files').
 */
@Component({
  selector: 'app-mobile-ide',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, TPipe, CodeEditorComponent],
  template: `
    @if (mode() === 'files') {
      <div class="mi mi--files" data-testid="mi-files">
        <div class="mi__head"><span>{{ 'builder.m.explorer' | t }}</span><small>{{ files().length }} {{ 'builder.m.files' | t }}</small></div>
        <ng-container *ngTemplateOutlet="tree" />
      </div>
    } @else {
      <div class="mi" data-testid="mobile-ide">
        <div class="mi__top">
          <button type="button" class="mi__icon" (click)="drawer.set(true)" [attr.aria-label]="'builder.m.explorer' | t" data-testid="mi-explorer-btn">☰</button>
          <div class="mi__tabs" role="tablist">
            @for (t of tabs(); track t) {
              <div class="mi__tab" role="tab" [class.on]="t === path()" [attr.aria-selected]="t === path()">
                <button type="button" class="mi__tabname" (click)="open.emit(t)"><span class="mi__fi">{{ icon(t) }}</span>{{ base(t) }}@if (t === path() && dirty()) {<span class="mi__dot" aria-label="unsaved">●</span>}</button>
                <button type="button" class="mi__tabx" (click)="closeTab.emit(t)" [attr.aria-label]="'builder.close' | t">✕</button>
              </div>
            }
          </div>
          <button type="button" class="mi__icon mi__save" [disabled]="!dirty() || generating()" (click)="save.emit()" [attr.aria-label]="'builder.saveFile' | t" data-testid="mi-save">💾</button>
          <button type="button" class="mi__icon" (click)="preview.emit()" [attr.aria-label]="'builder.tab.preview' | t" data-testid="mi-preview">▶</button>
        </div>
        @if (path()) {
          <div class="mi__crumb">{{ path().split('/').join(' › ') }}</div>
          <app-code-editor class="mi__ed" [mobile]="true" [showProblems]="showProblems()" [value]="draft()" [path]="path()" [readOnly]="generating()"
            (changed)="changed.emit($event)" (save)="save.emit()" (cursor)="cur.set($event)" />
          <div class="mi__keys" role="toolbar" [attr.aria-label]="'builder.m.keys' | t" data-testid="mi-keys">
            <button type="button" (pointerdown)="$event.preventDefault()" (click)="ed()?.editor?.tab()" aria-label="Tab">⇥</button>
            @for (k of keys; track k) { <button type="button" (pointerdown)="$event.preventDefault()" (click)="ed()?.editor?.insert(k)">{{ k }}</button> }
            <button type="button" (pointerdown)="$event.preventDefault()" (click)="ed()?.editor?.undo()" [attr.aria-label]="'builder.m.undo' | t">↶</button>
            <button type="button" (pointerdown)="$event.preventDefault()" (click)="ed()?.editor?.redo()" [attr.aria-label]="'builder.m.redo' | t">↷</button>
            <button type="button" (pointerdown)="$event.preventDefault()" (click)="ed()?.editor?.find()" [attr.aria-label]="'builder.m.find' | t">🔍</button>
          </div>
        } @else {
          <div class="mi__empty"><p>{{ 'builder.pickFile' | t }}</p><button type="button" class="mi__btn" (click)="drawer.set(true)">☰ {{ 'builder.m.explorer' | t }}</button></div>
        }
        <div class="mi__status" data-testid="mi-status">
          <span>⎇ v{{ version() }}</span>
          <button type="button" class="mi__prob" [class.err]="problems().length" (click)="showProblems.set(!showProblems())">⛔ {{ errors() }} ⚠ {{ problems().length - errors() }}</button>
          <span class="mi__grow"></span>
          @if (path()) {
            <span>Ln {{ cur().line }}, Col {{ cur().col }}</span>
            <span class="mi__hide-xs">{{ lang() }}</span>
            <span>{{ generating() ? ('builder.m.aiWriting' | t) : dirty() ? ('builder.m.unsaved' | t) : ('builder.m.saved' | t) }}</span>
          }
        </div>
        @if (drawer()) {
          <div class="mi__backdrop" (click)="drawer.set(false)" aria-hidden="true"></div>
          <aside class="mi__drawer" role="dialog" aria-modal="true" [attr.aria-label]="'builder.m.explorer' | t" data-testid="mi-drawer">
            <div class="mi__head"><span>{{ 'builder.m.explorer' | t }}</span><button type="button" class="mi__icon" (click)="drawer.set(false)" [attr.aria-label]="'builder.close' | t">✕</button></div>
            <ng-container *ngTemplateOutlet="tree" />
          </aside>
        }
      </div>
    }

    <ng-template #tree>
      <ul class="mi__tree">
        @for (r of rows(); track r.path) {
          <li>
            <button type="button" class="mi__row" [class.on]="r.kind === 'file' && r.path === path()" [style.padding-left.px]="12 + r.depth * 14" (click)="pick(r)">
              @if (r.kind === 'dir') { <span class="mi__chev">{{ collapsed().has(r.path) ? '▸' : '▾' }}</span><span class="mi__fi">📁</span> }
              @else { <span class="mi__chev"></span><span class="mi__fi">{{ icon(r.path) }}</span> }
              <span class="mi__name">{{ r.name }}</span>
            </button>
          </li>
        }
      </ul>
      <form class="mi__new" (ngSubmit)="addFile()">
        <input name="np" [(ngModel)]="newPath" [placeholder]="kind() === 'app' ? 'components/Card.tsx' : 'about.html'" autocapitalize="off" autocomplete="off" spellcheck="false" [attr.aria-label]="'builder.m.newFile' | t" />
        <button type="submit" class="mi__btn" [disabled]="!newPath.trim()">+ {{ 'builder.m.newFile' | t }}</button>
      </form>
      @if (path() && mode() === 'code') {
        <button type="button" class="mi__del" [disabled]="generating()" (click)="drawer.set(false); remove.emit()">🗑 {{ 'builder.deleteFile' | t }} · {{ base(path()) }}</button>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; min-width: 0; }
    .mi { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; background: #1e1e1e; color: #cccccc; overflow: hidden; border-radius: 10px; }
    .mi--files { background: #181818; overflow-y: auto; }
    .mi__top { display: flex; align-items: stretch; background: #181818; border-bottom: 1px solid #2b2b2b; min-height: 44px; }
    .mi__icon { flex: none; width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 0; color: #cccccc; font-size: 17px; }
    .mi__icon:disabled { opacity: .35; }
    .mi__tabs { display: flex; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
    .mi__tabs::-webkit-scrollbar { display: none; }
    .mi__tab { flex: none; display: flex; align-items: center; max-width: 11rem; border-right: 1px solid #2b2b2b; background: #2d2d2d; color: #969696; }
    .mi__tab.on { background: #1e1e1e; color: #ffffff; box-shadow: inset 0 2px 0 #0078d4; }
    .mi__tabname { display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 4px 0 12px; background: none; border: 0; color: inherit; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mi__tabx { width: 32px; min-height: 44px; background: none; border: 0; color: inherit; opacity: .7; font-size: 12px; }
    .mi__dot { color: #e2c08d; font-size: 10px; }
    .mi__fi { display: inline-block; min-width: 1.2em; text-align: center; font: 700 10px ui-monospace, monospace; color: #519aba; }
    .mi__crumb { padding: 3px 12px; font-size: 12px; color: #8b8b8b; background: #1e1e1e; border-bottom: 1px solid #2b2b2b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mi__ed { flex: 1; min-height: 0; }
    .mi__keys { display: flex; gap: 4px; padding: 4px; overflow-x: auto; background: #252526; border-top: 1px solid #2b2b2b; scrollbar-width: none; }
    .mi__keys::-webkit-scrollbar { display: none; }
    .mi__keys button { flex: none; min-width: 44px; min-height: 44px; padding: 0 8px; border: 1px solid #3c3c3c; border-radius: 8px; background: #333333; color: #e7e7e7; font: 600 15px ui-monospace, monospace; touch-action: manipulation; }
    .mi__keys button:active { background: #0078d4; }
    .mi__status { display: flex; align-items: center; gap: 10px; min-height: 26px; padding: 0 10px; background: #0078d4; color: #fff; font-size: 12px; white-space: nowrap; overflow: hidden; }
    .mi__prob { position: relative; background: none; border: 0; color: inherit; font: inherit; min-height: 26px; padding: 0 2px; }
    .mi__prob::after { content: ''; position: absolute; inset: -9px -6px; } /* 44px hit area */
    .mi__prob.err { font-weight: 700; }
    .mi__grow { flex: 1; }
    @media (max-width: 380px) { .mi__hide-xs { display: none; } }
    .mi__empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #8b8b8b; font-size: 14px; padding: 24px; text-align: center; }
    .mi__btn { min-height: 44px; padding: 0 14px; border-radius: 8px; border: 1px solid #3c3c3c; background: #0e639c; color: #fff; font-size: 14px; white-space: nowrap; }
    .mi__btn:disabled { opacity: .45; }
    .mi__backdrop { position: absolute; inset: 0; z-index: 5; background: rgb(0 0 0 / .5); animation: mi-fade .15s ease-out; }
    .mi__drawer { position: absolute; top: 0; bottom: 0; left: 0; z-index: 6; width: min(85%, 320px); display: flex; flex-direction: column; background: #181818; border-right: 1px solid #2b2b2b; overflow-y: auto; animation: mi-slide .18s ease-out; box-shadow: 12px 0 30px rgb(0 0 0 / .45); }
    @keyframes mi-slide { from { transform: translateX(-100%); } to { transform: none; } }
    @keyframes mi-fade { from { opacity: 0; } }
    .mi__head { display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding-left: 12px; font-weight: 700; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #bbbbbb; }
    .mi__head small { padding-right: 12px; font-weight: 400; letter-spacing: 0; text-transform: none; color: #8b8b8b; }
    .mi__tree { list-style: none; margin: 0; padding: 0; }
    .mi__row { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 44px; padding-right: 12px; background: none; border: 0; color: #cccccc; font-size: 14px; text-align: left; }
    .mi__row.on { background: #37373d; color: #fff; }
    .mi__row:active { background: #2a2d2e; }
    .mi__chev { width: 14px; font-size: 11px; color: #8b8b8b; }
    .mi__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mi__new { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid #2b2b2b; }
    .mi__new input { flex: 1; min-width: 0; min-height: 44px; padding: 0 10px; border-radius: 8px; border: 1px solid #3c3c3c; background: #313131; color: #e7e7e7; font: 16px ui-monospace, monospace; }
    .mi__del { margin: 0 12px 12px; min-height: 44px; border-radius: 8px; border: 1px solid #5a1d1d; background: transparent; color: #f48771; font-size: 14px; text-align: left; padding: 0 12px; }
  `],
})
export class MobileIdeComponent {
  readonly mode = input<'code' | 'files'>('code');
  readonly files = input<string[]>([]);
  readonly tabs = input<string[]>([]);
  readonly path = input('');
  readonly draft = input('');
  readonly dirty = input(false);
  readonly generating = input(false);
  readonly kind = input<'web' | 'app'>('web');
  readonly version = input<number | string>(1);

  readonly open = output<string>();
  readonly closeTab = output<string>();
  readonly changed = output<string>();
  readonly save = output<void>();
  readonly remove = output<void>();
  readonly create = output<string>();
  readonly preview = output<void>();

  readonly ed = viewChild(CodeEditorComponent);
  readonly drawer = signal(false);
  readonly showProblems = signal(false);
  readonly cur = signal({ line: 1, col: 1 });
  readonly collapsed = signal(new Set<string>());
  readonly rows = computed(() => fileTree(this.files(), this.collapsed()));
  readonly problems = computed<CmProblem[]>(() => this.ed()?.problems() || []);
  readonly errors = computed(() => this.problems().filter((p) => p.severity === 'error').length);
  readonly keys = ['{}', '()', '[]', '<>', '""', "''", ';', ':', '=', '=>', '/', '.', ','];
  newPath = '';

  icon = fileIcon;
  base(p: string): string { return p.split('/').pop() || p; }
  lang(): string { return this.ed()?.lang() || ''; }

  pick(r: TreeRow): void {
    if (r.kind === 'dir') {
      const next = new Set(this.collapsed());
      if (next.has(r.path)) next.delete(r.path); else next.add(r.path);
      this.collapsed.set(next);
      return;
    }
    this.drawer.set(false);
    this.open.emit(r.path);
  }

  addFile(): void {
    const p = this.newPath.trim().replace(/^\/+/, '');
    if (!p) return;
    this.newPath = '';
    this.drawer.set(false);
    this.create.emit(p);
  }
}
