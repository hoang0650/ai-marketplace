import { Component, DestroyRef, ElementRef, OnInit, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GpuRental, GpuRentalService } from '../../services/api.services';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { SeoService } from '../../services/seo.service';
import { XtermViewComponent } from './xterm-view.component';
import { GPU_TERMINAL_MESSAGES } from './gpu-terminal.messages';

type Conn = 'idle' | 'connecting' | 'open' | 'closed';

/**
 * Real shell on a rented GPU pod: xterm.js ⇄ API proxy ⇄ Jupyter terminal (terminado) on the pod.
 * Billing is the rental's per-minute billing; Stop is the same action as on the rental page.
 */
@Component({
  selector: 'app-gpu-rental-terminal',
  standalone: true,
  imports: [RouterLink, TPipe, XtermViewComponent],
  template: `
    <section class="mx-auto max-w-7xl px-3 py-4 sm:px-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs uppercase text-muted">{{ 'gterm.title' | t }}</p>
          <h1 class="truncate font-display text-2xl">{{ rental()?.name || '…' }}</h1>
          <p class="mt-1 text-xs text-muted">{{ 'gterm.realNote' | t }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (live()) {
            <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">● {{ 'gterm.live' | t }}</span>
          } @else if (conn() === 'connecting') {
            <span class="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-500">{{ 'gterm.connecting' | t }}</span>
          } @else if (conn() === 'closed') {
            <span class="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-muted">{{ 'gterm.disconnected' | t }}</span>
          }
          @if (rental()?.status === 'running') {
            @if (conn() === 'closed') {
              <button type="button" class="btn btn-fill text-xs" (click)="connect()">{{ 'gterm.reconnect' | t }}</button>
            }
            <button type="button" class="btn btn-outline text-xs" (click)="openLab()">{{ 'gterm.jupyter' | t }}</button>
            <button type="button" class="btn btn-outline text-xs" (click)="fullscreen()">{{ 'gterm.fullscreen' | t }}</button>
            <button type="button" class="btn btn-outline text-xs text-red-400" (click)="stop()">{{ 'gterm.stop' | t }}</button>
          }
          <a class="btn btn-outline text-xs" routerLink="/training/gpu">{{ 'gterm.back' | t }}</a>
        </div>
      </header>

      @if (error()) {
        <p class="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">{{ error() }}</p>
      }
      @if (rental(); as r) {
        @if (r.status !== 'running') {
          <p class="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
            {{ (r.status === 'creating' ? 'gterm.booting' : 'gterm.notRunning') | t }}
          </p>
        } @else if (!r.ready) {
          <p class="mt-3 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm">{{ 'gterm.booting' | t }}</p>
        }
      }

      <div #wrap class="gt-wrap mt-3 flex flex-col overflow-hidden rounded-xl border border-line bg-[#fbfbfd] dark:bg-[#0b0f17]">
        <div class="bg-surface flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-xs">
          <span class="truncate font-mono text-muted">root&#64;{{ rental()?.live?.podId || 'gpu' }}:/workspace</span>
          <span class="flex gap-1">
            <button type="button" class="gt-tool" (click)="copy()">{{ 'gterm.copy' | t }}</button>
            <button type="button" class="gt-tool" (click)="term()?.paste()">{{ 'gterm.paste' | t }}</button>
          </span>
        </div>
        <app-xterm-view class="gt-term" (data)="send($event)" (resized)="onResize($event)" (ready)="onTermReady()" />
        @if (rental(); as r) {
          <div class="gt-status bg-surface grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line px-3 py-2 font-mono text-[11px] sm:grid-cols-4 lg:grid-cols-8">
            <span class="truncate"><b>{{ 'gterm.gpu' | t }}</b>{{ r.gpu.count > 1 ? r.gpu.count + '× ' : '' }}{{ r.gpu.name }}</span>
            <span><b>{{ 'gterm.vram' | t }}</b>{{ r.gpu.memoryGb * (r.gpu.count || 1) }} GB</span>
            <span><b>{{ 'gterm.usage' | t }}</b>{{ usage() }}</span>
            <span class="truncate"><b>{{ 'gterm.podId' | t }}</b>{{ r.live?.podId || '—' }}</span>
            <span><b>{{ 'gterm.region' | t }}</b>{{ r.live?.dataCenterId || '—' }}</span>
            <span><b>{{ 'gterm.uptime' | t }}</b>{{ uptime() }}</span>
            <span><b>{{ 'gterm.cost' | t }}</b>{{ perMinute() }}</span>
            <span><b>{{ 'gterm.billed' | t }}</b>{{ money(r.billedTotal) }} · {{ 'gterm.session' | t }} {{ sessionElapsed() }}</span>
          </div>
        }
      </div>
      <p class="mt-2 text-xs text-muted">{{ 'gterm.clipHint' | t }}</p>
    </section>
  `,
  styles: [
    `
      .gt-wrap { height: calc(100dvh - 14rem); min-height: 380px; }
      .gt-wrap:fullscreen { height: 100dvh; border-radius: 0; }
      .gt-term { flex: 1 1 auto; min-height: 0; }
      .gt-status b { font-weight: 600; opacity: 0.65; margin-right: 0.35rem; }
      .gt-tool { border: 1px solid var(--color-line); border-radius: 0.4rem; padding: 0.1rem 0.5rem; }
      .gt-tool:hover { border-color: currentColor; }
      @media (max-width: 640px) {
        .gt-wrap { height: calc(100dvh - 17rem); min-height: 320px; }
      }
    `,
  ],
})
export class GpuRentalTerminalComponent implements OnInit {
  private readonly api = inject(GpuRentalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly wrap = viewChild<ElementRef<HTMLDivElement>>('wrap');
  readonly term = viewChild(XtermViewComponent);

  readonly rental = signal<GpuRental | null>(null);
  readonly conn = signal<Conn>('idle');
  readonly error = signal('');
  private readonly now = signal(Date.now());
  private readonly fetchedAt = signal(Date.now());
  private readonly openedAt = signal(0);
  readonly live = computed(() => this.conn() === 'open' && this.rental()?.status === 'running');

  readonly usage = computed(() => {
    const l = this.rental()?.live;
    if (!l || l.gpuUtilPercent === null || l.gpuUtilPercent === undefined) return '—';
    return this.i18n.t('gterm.util', { gpu: Math.round(l.gpuUtilPercent), mem: Math.round(l.memoryUtilPercent ?? 0) });
  });
  readonly uptime = computed(() => {
    const l = this.rental()?.live;
    if (!l || !l.uptimeSeconds) return '—';
    return fmt(l.uptimeSeconds + Math.max(0, Math.floor((this.now() - this.fetchedAt()) / 1000)));
  });
  readonly sessionElapsed = computed(() =>
    this.openedAt() ? fmt(Math.max(0, Math.floor((this.now() - this.openedAt()) / 1000))) : '00:00'
  );
  readonly perMinute = computed(() => {
    const r = this.rental();
    if (!r) return '—';
    const hourly = r.status === 'stopped' ? r.stoppedPricePerHour : r.pricePerHour;
    const min = this.currency.formatRateFromUsd(Math.round(((hourly || 0) / 60) * 1e6) / 1e6);
    return `${this.i18n.t('gterm.perMin', { amount: min })} (${this.i18n.t('gterm.perHour', { amount: this.money(hourly) })})`;
  });

  private id = '';
  private ws: WebSocket | null = null;
  private termReady = false;
  private wantConnect = false;

  ngOnInit(): void {
    this.i18n.extend(GPU_TERMINAL_MESSAGES);
    this.seo.set({ title: this.i18n.t('gterm.title') });
    this.id = this.route.snapshot.paramMap.get('id') || '';
    if (!this.browser) return;
    this.load(true);
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    const poll = setInterval(() => this.load(false), 15_000);
    this.destroyRef.onDestroy(() => {
      clearInterval(clock);
      clearInterval(poll);
      this.closeWs();
    });
  }

  money(usd: number): string {
    return this.currency.formatFromUsd(Number(usd) || 0);
  }

  onTermReady(): void {
    this.termReady = true;
    if (this.wantConnect) this.connect();
  }

  private load(first: boolean): void {
    this.api.get(this.id).subscribe({
      next: ({ rental }) => {
        this.rental.set(rental);
        this.fetchedAt.set(Date.now());
        const ready = rental.status === 'running' && rental.ready;
        if (ready && (this.conn() === 'idle' || (first && this.conn() !== 'open'))) this.connect();
        if (!ready && this.conn() === 'open' && rental.status !== 'running') this.closeWs();
      },
      error: (e) => this.fail(e),
    });
  }

  connect(): void {
    if (!this.termReady) {
      this.wantConnect = true;
      return;
    }
    if (this.conn() === 'connecting') return;
    this.closeWs();
    this.conn.set('connecting');
    this.error.set('');
    this.api.terminal(this.id).subscribe({
      next: (t) => {
        const ws = new WebSocket(this.api.wsUrl(t));
        this.ws = ws;
        ws.onopen = () => {
          this.conn.set('open');
          if (!this.openedAt()) this.openedAt.set(Date.now());
          const { rows, cols } = this.term()?.size() ?? { rows: 24, cols: 80 };
          ws.send(JSON.stringify(['set_size', rows, cols]));
          this.term()?.focus();
        };
        ws.onmessage = (ev) => {
          let msg: unknown;
          try {
            msg = JSON.parse(String(ev.data));
          } catch {
            return;
          }
          if (!Array.isArray(msg)) return;
          if (msg[0] === 'stdout') this.term()?.write(String(msg[1] ?? ''));
          else if (msg[0] === 'disconnect') this.conn.set('closed');
        };
        ws.onclose = () => {
          if (this.ws === ws) {
            this.ws = null;
            this.conn.set('closed');
            this.term()?.write(`\r\n\x1b[33m[${this.i18n.t('gterm.disconnected')}]\x1b[0m\r\n`);
          }
        };
      },
      error: (e) => {
        this.conn.set('closed');
        this.fail(e);
      },
    });
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(['stdin', data]));
  }

  onResize(s: { rows: number; cols: number }): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(['set_size', s.rows, s.cols]));
  }

  copy(): void {
    void this.term()?.copy();
  }

  fullscreen(): void {
    const el = this.wrap()?.nativeElement;
    if (el?.requestFullscreen) void el.requestFullscreen().then(() => this.term()?.refit()).catch(() => undefined);
  }

  openLab(): void {
    const win = window.open('about:blank', '_blank');
    this.api.open(this.id, 'lab').subscribe({
      next: (res) => {
        const url = this.api.absoluteUrl(res.path);
        if (win) win.location.href = url;
        else window.location.href = url;
      },
      error: (e) => {
        win?.close();
        this.fail(e);
      },
    });
  }

  stop(): void {
    if (!confirm(this.i18n.t('gterm.confirmStop'))) return;
    this.closeWs();
    this.api.stop(this.id).subscribe({
      next: ({ rental }) => {
        this.rental.set(rental);
        void this.router.navigateByUrl('/training/gpu');
      },
      error: (e) => this.fail(e),
    });
  }

  private closeWs(): void {
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    if (this.conn() !== 'idle') this.conn.set('closed');
  }

  private fail(e: { error?: { code?: string; message?: string } }): void {
    const code = e?.error?.code;
    const key = code ? `gpu.err.${code}` : '';
    const translated = key ? this.i18n.t(key) : '';
    this.error.set(translated && translated !== key ? translated : e?.error?.message || this.i18n.t('gpu.err.PROVIDER_ERROR'));
  }
}

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
