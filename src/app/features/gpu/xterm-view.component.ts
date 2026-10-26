import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { ITheme, Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { ThemeService } from '../../services/theme.service';

const DARK: ITheme = {
  background: '#0b0f17',
  foreground: '#e5e7eb',
  cursor: '#34d399',
  cursorAccent: '#0b0f17',
  selectionBackground: '#34d39955',
  black: '#1f2937',
  red: '#f87171',
  green: '#34d399',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e5e7eb',
  brightBlack: '#6b7280',
  brightRed: '#fca5a5',
  brightGreen: '#6ee7b7',
  brightYellow: '#fcd34d',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
};

const LIGHT: ITheme = {
  background: '#fbfbfd',
  foreground: '#1f2937',
  cursor: '#047857',
  cursorAccent: '#fbfbfd',
  selectionBackground: '#04785733',
  black: '#1f2937',
  red: '#b91c1c',
  green: '#047857',
  yellow: '#a16207',
  blue: '#1d4ed8',
  magenta: '#7e22ce',
  cyan: '#0e7490',
  white: '#6b7280',
  brightBlack: '#4b5563',
  brightRed: '#dc2626',
  brightGreen: '#059669',
  brightYellow: '#ca8a04',
  brightBlue: '#2563eb',
  brightMagenta: '#9333ea',
  brightCyan: '#0891b2',
  brightWhite: '#111827',
};

/** xterm.js terminal: monospace, fits its box, follows the site theme, copy/paste shortcuts. */
@Component({
  selector: 'app-xterm-view',
  standalone: true,
  template: `<div #host class="xv-host" (contextmenu)="onContextMenu($event)"></div>`,
  styles: [
    `
      :host { display: block; position: relative; min-height: 0; height: 100%; }
      .xv-host { position: absolute; inset: 0; padding: 8px 0 4px 10px; }
      :host ::ng-deep .xterm { height: 100%; }
      :host ::ng-deep .xterm-viewport { overflow-y: auto; }
    `,
  ],
})
export class XtermViewComponent implements AfterViewInit, OnDestroy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly theme = inject(ThemeService);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  /** Keystrokes / pasted text typed by the user. */
  readonly data = output<string>();
  /** New size after a fit (rows × cols). */
  readonly resized = output<{ rows: number; cols: number }>();
  /** Emitted once the terminal is mounted. */
  readonly ready = output<void>();

  private term: Terminal | null = null;
  private fit: FitAddon | null = null;
  private observer: ResizeObserver | null = null;
  private pending: string[] = [];
  private destroyed = false;

  constructor() {
    effect(() => {
      const dark = this.theme.isDark();
      if (this.term) this.term.options.theme = dark ? DARK : LIGHT;
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.browser) return;
    // Both packages ship CommonJS/UMD: the classes may sit on the namespace or on `default`.
    const [xmod, fmod] = (await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')])) as unknown as [
      { Terminal?: typeof Terminal; default?: { Terminal: typeof Terminal } },
      { FitAddon?: typeof FitAddon; default?: { FitAddon: typeof FitAddon } },
    ];
    const TerminalCtor = xmod.Terminal ?? xmod.default!.Terminal;
    const FitCtor = fmod.FitAddon ?? fmod.default!.FitAddon;
    if (this.destroyed) return;
    const small = window.matchMedia('(max-width: 640px)').matches;
    const term = new TerminalCtor({
      cursorBlink: true,
      convertEol: false,
      scrollback: 5000,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: small ? 12 : 14,
      lineHeight: 1.15,
      allowProposedApi: false,
      theme: this.theme.isDark() ? DARK : LIGHT,
    });
    const fit = new FitCtor();
    term.loadAddon(fit);
    term.open(this.host().nativeElement);
    term.attachCustomKeyEventHandler((e) => this.shortcut(e));
    term.onData((d) => this.data.emit(d));
    term.onResize(({ rows, cols }) => this.resized.emit({ rows, cols }));
    this.term = term;
    this.fit = fit;
    this.refit();
    this.observer = new ResizeObserver(() => this.refit());
    this.observer.observe(this.host().nativeElement);
    for (const chunk of this.pending) term.write(chunk);
    this.pending = [];
    term.focus();
    this.ready.emit();
  }

  write(text: string): void {
    if (this.term) this.term.write(text);
    else this.pending.push(text);
  }

  clear(): void {
    this.term?.clear();
  }

  reset(): void {
    this.term?.reset();
  }

  focus(): void {
    this.term?.focus();
  }

  size(): { rows: number; cols: number } {
    return { rows: this.term?.rows ?? 24, cols: this.term?.cols ?? 80 };
  }

  refit(): void {
    try {
      this.fit?.fit();
    } catch {
      /* hidden element */
    }
  }

  selection(): string {
    return this.term?.getSelection() ?? '';
  }

  async copy(): Promise<boolean> {
    const text = this.selection();
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async paste(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text) this.term?.paste(text);
    } catch {
      /* clipboard permission denied; Ctrl/Cmd+V still works */
    }
    this.term?.focus();
  }

  /** Ctrl+Shift+C / Ctrl+Shift+V (Linux/Windows terminal convention); Ctrl+C stays SIGINT. */
  private shortcut(e: KeyboardEvent): boolean {
    if (e.type !== 'keydown' || !e.ctrlKey || !e.shiftKey) return true;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      void this.copy();
      e.preventDefault();
      return false;
    }
    if (k === 'v') {
      void this.paste();
      e.preventDefault();
      return false;
    }
    return true;
  }

  /** Right click copies the selection (like PuTTY/Windows Terminal) or pastes when nothing is selected. */
  onContextMenu(e: MouseEvent): void {
    if (!this.term) return;
    e.preventDefault();
    if (this.selection()) {
      void this.copy();
      this.term.clearSelection();
    } else void this.paste();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.term?.dispose();
    this.term = null;
  }
}
