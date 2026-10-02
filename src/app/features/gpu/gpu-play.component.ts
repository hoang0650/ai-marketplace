import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameHeartbeat, GpuGatewayService, StreamProfile } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

const STOP_REASONS = new Set(['idle', 'insufficient_funds', 'switched_device', 'slot_reclaimed', 'user']);

/** Web = PC stream flow: keyboard + mouse, high-quality profile. Mobile streams run in the app. */
@Component({
  selector: 'app-gpu-play',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase text-muted">{{ (isTerminal() ? 'compute.play.kickerGpu' : 'compute.play.kicker') | t }}</p>
          <h2 class="font-display text-2xl">{{ title() }}</h2>
          <p class="mt-1 text-sm text-muted">{{ (isTerminal() ? 'compute.play.subGpu' : 'compute.play.sub') | t }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-line px-2 py-0.5 text-xs">{{ 'compute.device.pc' | t }}</span>
          <span class="text-xs uppercase">{{ status() }}</span>
          @if (playerUrl()) {
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

      @if (profile(); as pf) {
        <p class="mt-3 text-xs text-muted">
          {{ 'compute.play.profilePc' | t: { res: pf.maxHeight + 'p', fps: pf.fps } }}
          @if (bill(); as b) {
            @if (b.ratePerHour > 0) {
              · {{ 'compute.play.billed' | t: { amount: money(b.billedCost), minutes: b.billedMinutes } }}
              @if (b.minutesLeft !== undefined) {
                · {{ 'compute.play.minutesLeft' | t: { minutes: b.minutesLeft } }}
              }
            }
          }
        </p>
      }
      @if (touchDevice()) {
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
      @if (playerUrl()) {
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
  private sessionId = '';
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
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
        this.status.set(sess.status);
        this.profile.set(sess.profile || null);
        if (sess.productSlug) this.productSlug.set(sess.productSlug);
        const terminal = sess.playerMode === 'terminal' || sess.streamKind === 'terminal';
        this.isTerminal.set(terminal);
        if (terminal) this.seo.set({ title: this.i18n.t('compute.play.seoGpu') });
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
    const el = this.frame()?.nativeElement;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
  }

  stop(): void {
    this.stopHeartbeat();
    const id = this.sessionId;
    this.sessionId = '';
    this.playerUrl.set(null);
    this.status.set('stopped');
    if (id) this.gpu.closeGameSession(id).subscribe({ error: () => undefined });
  }

  private startHeartbeat(everyMs: number): void {
    this.stopHeartbeat();
    const beat = () => {
      if (!this.sessionId || document.visibilityState === 'hidden') return;
      this.gpu.heartbeatGameSession(this.sessionId).subscribe({
        next: (hb) => {
          this.bill.set(hb);
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

  ngOnDestroy(): void {
    this.stopHeartbeat();
    if (this.sessionId) this.gpu.closeGameSession(this.sessionId).subscribe({ error: () => undefined });
    this.sessionId = '';
  }
}
