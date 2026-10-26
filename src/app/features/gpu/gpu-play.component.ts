import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameHeartbeat, GpuGatewayService, StreamProfile } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { XtermViewComponent } from './xterm-view.component';
import { GPU_TERMINAL_MESSAGES } from './gpu-terminal.messages';

const STOP_REASONS = new Set(['idle', 'insufficient_funds', 'switched_device', 'slot_reclaimed', 'user']);

/** Web = PC stream flow: keyboard + mouse, high-quality profile. Mobile streams run in the app. */
@Component({
  selector: 'app-gpu-play',
  standalone: true,
  imports: [RouterLink, TPipe, XtermViewComponent],
  template: `
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          @if (isDemo()) {
            <p class="text-xs uppercase text-muted">{{ 'gterm.demoTitle' | t }}</p>
            <h2 class="font-display text-2xl">{{ title() }}</h2>
            <p class="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span class="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500">{{ 'gterm.demoBadge' | t }}</span>
            </p>
          } @else {
            <p class="text-xs uppercase text-muted">{{ (isTerminal() ? 'compute.play.kickerGpu' : 'compute.play.kicker') | t }}</p>
            <h2 class="font-display text-2xl">{{ title() }}</h2>
            <p class="mt-1 text-sm text-muted">{{ (isTerminal() ? 'compute.play.subGpu' : 'compute.play.sub') | t }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (!isTerminal()) {
            <span class="rounded-full border border-line px-2 py-0.5 text-xs">{{ 'compute.device.pc' | t }}</span>
          }
          @if (!isDemo() || status() === 'stopped') {
            <span class="text-xs uppercase">{{ statusLabel() }}</span>
          }
          @if (isDemo() && status() !== 'stopped') {
            <button type="button" class="btn btn-outline text-xs" (click)="fullscreen()">{{ 'gterm.fullscreen' | t }}</button>
            <button type="button" class="btn btn-outline text-xs" (click)="stop()">{{ 'gterm.stop' | t }}</button>
          } @else if (playerUrl()) {
            <button type="button" class="btn btn-outline text-xs" (click)="fullscreen()">{{ 'compute.play.fullscreen' | t }}</button>
            <button type="button" class="btn btn-outline text-xs" (click)="stop()">{{ 'compute.play.stop' | t }}</button>
          }
          @if (productSlug()) {
            <a class="btn btn-outline text-xs" [routerLink]="['/product', productSlug()]">{{ 'compute.play.backProduct' | t }}</a>
          } @else {
            <a class="btn btn-outline text-xs" routerLink="/dashboard/gpu">{{ 'compute.play.servers' | t }}</a>
          }
        </div>
      </div>

      @if (!isTerminal() && profile(); as pf) {
        <p class="mt-3 text-xs text-muted">
          {{ 'compute.play.profilePc' | t: { res: pf.maxHeight + 'p', fps: pf.fps } }}
          @if (bill(); as b) {
            @if (b.ratePerHour > 0) {
              · {{ 'compute.play.rate' | t: { rate: rate(b.ratePerHour / 60) } }}
              @if (status() === 'live' && b.usedMinutes !== undefined) {
                · {{ 'compute.play.running' | t: { amount: rate(b.usedCost ?? 0), minutes: b.usedMinutes, estimate: money(b.estimatedCharge ?? 0) } }}
              } @else {
                · {{ 'compute.play.billed' | t: { amount: money(b.billedCost), minutes: b.billedMinutes } }}
              }
              @if (b.minutesLeft !== undefined) {
                · {{ 'compute.play.minutesLeft' | t: { minutes: b.minutesLeft } }}
              }
            }
          }
        </p>
      }
      @if (touchDevice() && !isTerminal()) {
        <p class="mt-2 text-xs text-amber-400">{{ 'compute.play.useApp' | t }}</p>
      }
      @if (lowBalance()) {
        <p class="mt-2 text-sm text-amber-400">
          {{ 'compute.play.lowBalance' | t: { minutes: bill()?.minutesLeft ?? 0 } }}
          <a routerLink="/wallet" class="underline">{{ 'cart.topUp' | t }}</a>
        </p>
      }

      @if (error()) {
        <p class="mt-3 text-sm text-red-400">{{ error() }}</p>
        @if (mobileOnly()) {
          <a class="btn btn-outline text-xs mt-2" [routerLink]="['/product', productSlug()]">{{ 'compute.play.backProduct' | t }}</a>
        } @else {
          <button type="button" class="btn btn-outline text-xs mt-2" (click)="start()">{{ 'compute.play.retry' | t }}</button>
        }
      }
      @if (isDemo() && status() !== 'stopped') {
        <div #termWrap class="gt-wrap mt-4 flex flex-col overflow-hidden rounded-xl border border-line bg-[#fbfbfd] dark:bg-[#0b0f17]">
          <div class="gt-bar bg-surface flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-xs">
            <span class="font-mono text-muted">demo&#64;aimarkets:~ — {{ 'gterm.demoBadge' | t }}</span>
            <span class="flex gap-1">
              <button type="button" class="gt-tool" (click)="copy()">{{ 'gterm.copy' | t }}</button>
              <button type="button" class="gt-tool" (click)="xterm()?.paste()">{{ 'gterm.paste' | t }}</button>
            </span>
          </div>
          <app-xterm-view class="gt-term" (data)="demoInput($event)" (ready)="demoBanner()" />
          <div class="gt-status bg-surface grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line px-3 py-2 font-mono text-[11px] sm:grid-cols-5">
            <span><b>{{ 'gterm.gpu' | t }}</b> {{ 'gterm.none' | t }}</span>
            <span><b>{{ 'gterm.vram' | t }}</b> —</span>
            <span><b>{{ 'gterm.usage' | t }}</b> —</span>
            <span><b>{{ 'gterm.cost' | t }}</b> {{ demoCost() }}</span>
            <span><b>{{ 'gterm.elapsed' | t }}</b> {{ elapsed() }}</span>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p class="max-w-3xl">{{ 'gterm.demoNote' | t }}</p>
          <a class="btn btn-fill text-xs" routerLink="/training/gpu">{{ 'gterm.rentReal' | t }}</a>
        </div>
        <p class="mt-2 text-xs text-muted">{{ 'gterm.clipHint' | t }}</p>
      } @else if (playerUrl()) {
        <iframe
          #frame
          class="mt-4 h-[min(75vh,720px)] w-full rounded-xl border border-line bg-black"
          [src]="playerUrl()"
          title="GPU session"
          referrerpolicy="no-referrer"
          allow="fullscreen; autoplay; encrypted-media; clipboard-read; clipboard-write; gamepad; pointer-lock; keyboard-map"
          allowfullscreen
        ></iframe>
        @if (!isTerminal()) {
          <p class="mt-2 text-xs text-muted">{{ 'compute.play.pcControls' | t }}</p>
        }
      }
    </section>
  `,
  styles: [
    `
      .gt-wrap { height: calc(100dvh - 15rem); min-height: 360px; }
      .gt-wrap:fullscreen { height: 100dvh; border-radius: 0; }
      .gt-term { flex: 1 1 auto; min-height: 0; }
      .gt-status b { font-weight: 600; opacity: 0.65; margin-right: 0.35rem; }
      .gt-tool { border: 1px solid var(--color-line); border-radius: 0.4rem; padding: 0.1rem 0.5rem; }
      .gt-tool:hover { border-color: currentColor; }
      @media (max-width: 640px) {
        .gt-wrap { height: calc(100dvh - 19rem); min-height: 320px; }
      }
    `,
  ],
})
export class GpuPlayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly gpu = inject(GpuGatewayService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  private readonly termWrap = viewChild<ElementRef<HTMLDivElement>>('termWrap');
  readonly xterm = viewChild(XtermViewComponent);
  private readonly router = inject(Router);

  readonly status = signal('starting');
  readonly error = signal('');
  readonly playerUrl = signal<SafeResourceUrl | null>(null);
  readonly productSlug = signal('');
  readonly title = signal('');
  readonly isTerminal = signal(false);
  readonly mobileOnly = signal(false);
  readonly profile = signal<StreamProfile | null>(null);
  readonly bill = signal<GameHeartbeat | null>(null);
  readonly lowBalance = signal(false);
  readonly touchDevice = signal(false);
  /** Terminal sessions without a pod are a browser-simulated demo (no GPU attached). */
  readonly isDemo = signal(false);
  private readonly startedAt = signal(0);
  private readonly now = signal(Date.now());
  readonly elapsed = computed(() => {
    const s = this.startedAt() ? Math.max(0, Math.floor((this.now() - this.startedAt()) / 1000)) : 0;
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  });
  readonly demoCost = computed(() => {
    const rate = this.bill()?.ratePerHour ?? 0;
    return rate > 0 ? this.i18n.t('gterm.perMin', { amount: this.rate(rate / 60) }) : this.i18n.t('gterm.free');
  });
  readonly statusLabel = computed(() => {
    const st = this.status();
    if (this.isDemo()) return this.i18n.t(st === 'stopped' ? 'gterm.status.stopped' : 'gterm.status.demo');
    return st;
  });
  private clock: ReturnType<typeof setInterval> | null = null;
  private line = '';
  private history: string[] = [];
  private histIdx = 0;
  private sessionId = '';
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private dedicated = false;

  ngOnInit(): void {
    this.i18n.extend(GPU_TERMINAL_MESSAGES);
    const productSlug = this.route.snapshot.paramMap.get('productSlug') || '';
    this.productSlug.set(productSlug);
    this.title.set(productSlug ? productSlug : this.i18n.t('compute.play.gameServer'));
    this.seo.set({ title: this.i18n.t('compute.play.seo') });
    if (!this.browser) return;
    this.touchDevice.set(matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820);
    this.start();
  }

  money(usd: number): string {
    return this.currency.formatFromUsd(Number(usd) || 0);
  }

  /** Sub-cent rates/amounts with the same rounding as the product page and the server player. */
  rate(usd: number): string {
    return this.currency.formatRateFromUsd(Math.round((Number(usd) || 0) * 1e6) / 1e6);
  }

  start(): void {
    const productSlug = this.route.snapshot.paramMap.get('productSlug') || '';
    const serverId = this.route.snapshot.paramMap.get('serverId') || '';
    this.stopHeartbeat();
    this.error.set('');
    this.mobileOnly.set(false);
    this.playerUrl.set(null);
    this.bill.set(null);
    this.lowBalance.set(false);
    this.status.set('starting');
    this.isTerminal.set(false);
    this.isDemo.set(false);

    const req = productSlug
      ? this.gpu.createGameSession({ productSlug })
      : serverId
        ? this.gpu.createGameSession(serverId)
        : null;

    if (!req) {
      this.status.set('error');
      this.error.set(this.i18n.t('compute.play.missingTarget'));
      return;
    }

    req.subscribe({
      next: (sess) => {
        this.sessionId = sess.sessionId;
        this.dedicated = !!sess.dedicated;
        this.status.set(sess.status);
        this.profile.set(sess.profile || null);
        if (sess.productSlug) this.productSlug.set(sess.productSlug);
        const terminal = sess.playerMode === 'terminal' || sess.streamKind === 'terminal';
        this.isTerminal.set(terminal);
        if (terminal) this.seo.set({ title: this.i18n.t('compute.play.seoGpu') });
        if (terminal && sess.sandbox !== false) {
          // No pod behind this session: run the honest in-browser demo instead of the server player.
          this.isDemo.set(true);
          this.startClock();
          this.startHeartbeat(sess.heartbeatMs || 30_000);
          return;
        }
        const token = this.auth.token() || '';
        const url = `${sess.playerUrl}?access_token=${encodeURIComponent(token)}`;
        this.playerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.startHeartbeat(sess.heartbeatMs || 30_000);
      },
      error: (e) => {
        this.status.set('error');
        const code = e?.error?.code;
        if (code === 'CLIENT_NOT_SUPPORTED') {
          this.mobileOnly.set(true);
          this.error.set(this.i18n.t('compute.device.mobileOnly'));
          return;
        }
        if (e?.status === 402) {
          this.error.set(this.i18n.t('compute.play.needFunds'));
          return;
        }
        this.error.set(e?.error?.message || this.i18n.t('compute.play.startFailed'));
      },
    });
  }

  fullscreen(): void {
    const el = this.isDemo() ? this.termWrap()?.nativeElement : this.frame()?.nativeElement;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
  }

  stop(): void {
    this.stopHeartbeat();
    this.stopClock();
    const id = this.sessionId;
    this.sessionId = '';
    this.playerUrl.set(null);
    this.status.set('stopped');
    if (!id) return;
    this.gpu.closeGameSession(id).subscribe({
      // Show the final bill (the stop settles the last partial minute).
      next: (r) => {
        const prev = this.bill();
        this.bill.set({
          ratePerHour: prev?.ratePerHour ?? 0,
          currency: prev?.currency ?? 'USD',
          billedCost: Number(r.billedCost ?? prev?.billedCost ?? 0),
          billedMinutes: Number(r.billedMinutes ?? prev?.billedMinutes ?? 0),
        });
      },
      error: () => undefined,
    });
  }

  private startHeartbeat(everyMs: number): void {
    this.stopHeartbeat();
    const beat = () => {
      // Dedicated servers keep beating while the buyer is in the game client (tab in background).
      if (!this.sessionId || (document.visibilityState === 'hidden' && !this.dedicated)) return;
      this.gpu.heartbeatGameSession(this.sessionId).subscribe({
        next: (hb) => {
          this.bill.set(hb);
          // Dedicated servers go starting → live once the pod's port answers.
          if (hb.status) this.status.set(hb.status);
          this.lowBalance.set(hb.ratePerHour > 0 && hb.minutesLeft !== undefined && hb.minutesLeft <= 5);
        },
        error: (e) => {
          if (e?.status !== 410 && e?.status !== 404) return;
          const reason = String(e?.error?.stopReason || '');
          this.stopHeartbeat();
          this.sessionId = '';
          this.playerUrl.set(null);
          this.status.set('stopped');
          this.error.set(this.i18n.t(`compute.play.stopped.${STOP_REASONS.has(reason) ? reason : 'user'}`));
        },
      });
    };
    beat();
    this.heartbeat = setInterval(beat, Math.max(10_000, everyMs));
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  copy(): void {
    void this.xterm()?.copy();
  }

  // ---------- demo shell (simulated; never pretends to have a GPU) ----------

  private prompt(): void {
    this.xterm()?.write('\x1b[32mdemo@aimarkets\x1b[0m:\x1b[34m~\x1b[0m$ ');
  }

  demoBanner(): void {
    const t = this.xterm();
    if (!t) return;
    t.write(`\x1b[33m${this.i18n.t('gterm.demo.banner1')}\x1b[0m\r\n${this.i18n.t('gterm.demo.banner2')}\r\n\r\n`);
    this.prompt();
  }

  demoInput(data: string): void {
    const t = this.xterm();
    if (!t) return;
    if (data === '\x1b[A' || data === '\x1b[B') {
      if (!this.history.length) return;
      this.histIdx = data === '\x1b[A' ? Math.max(0, this.histIdx - 1) : Math.min(this.history.length, this.histIdx + 1);
      const next = this.history[this.histIdx] ?? '';
      t.write('\b \b'.repeat(this.line.length) + next);
      this.line = next;
      return;
    }
    if (data.startsWith('\x1b')) return;
    for (const ch of data) {
      if (ch === '\r' || ch === '\n') {
        t.write('\r\n');
        this.runDemo(this.line);
        this.line = '';
        continue;
      }
      if (ch === '\x7f' || ch === '\b') {
        if (this.line.length) {
          this.line = this.line.slice(0, -1);
          t.write('\b \b');
        }
        continue;
      }
      if (ch === '\x03') {
        t.write('^C\r\n');
        this.line = '';
        this.prompt();
        continue;
      }
      if (ch === '\x0c') {
        t.clear();
        continue;
      }
      if (ch >= ' ') {
        this.line += ch;
        t.write(ch);
      }
    }
  }

  private runDemo(raw: string): void {
    const t = this.xterm();
    if (!t) return;
    const cmd = raw.trim();
    const out = (s: string) => t.write(s.replace(/\n/g, '\r\n') + '\r\n');
    if (cmd) {
      this.history.push(cmd);
      this.histIdx = this.history.length;
    }
    const [name] = cmd.split(/\s+/);
    switch (name) {
      case '':
        break;
      case 'help':
        out(this.i18n.t('gterm.demo.help'));
        break;
      case 'clear':
      case 'cls':
        t.clear();
        break;
      case 'whoami':
        out('demo');
        break;
      case 'hostname':
        out('aimarkets-demo');
        break;
      case 'pwd':
        out('/home/demo');
        break;
      case 'ls':
        out('README.txt');
        break;
      case 'cat':
        out(cmd === 'cat README.txt' ? this.i18n.t('gterm.demoNote') : this.i18n.t('gterm.demo.notFound', { cmd }));
        break;
      case 'date':
        out(new Date().toString());
        break;
      case 'echo':
        out(cmd.slice(5));
        break;
      case 'uname':
        out('Demo (browser simulation) — no GPU, no server');
        break;
      case 'nvidia-smi':
        out(`\x1b[33m${this.i18n.t('gterm.demo.noGpu')}\x1b[0m`);
        break;
      case 'rent':
        out(this.i18n.t('gterm.demo.rent'));
        void this.router.navigateByUrl('/training/gpu');
        return;
      default:
        out(this.i18n.t('gterm.demo.notFound', { cmd }));
    }
    this.prompt();
  }

  private startClock(): void {
    this.stopClock();
    this.startedAt.set(Date.now());
    this.now.set(Date.now());
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopClock(): void {
    if (this.clock) clearInterval(this.clock);
    this.clock = null;
  }

  ngOnDestroy(): void {
    this.stopClock();
    this.stopHeartbeat();
    if (this.sessionId) this.gpu.closeGameSession(this.sessionId).subscribe({ error: () => undefined });
    this.sessionId = '';
  }
}
