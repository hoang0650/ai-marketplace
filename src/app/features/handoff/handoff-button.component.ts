import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { HandoffCode, HandoffService, HandoffTarget } from '../../services/handoff.service';
import { SyncService } from '../../services/sync.service';

/** "Tiếp tục trên điện thoại": QR + short code that opens this same session on the user's phone. */
@Component({
  selector: 'app-handoff-button',
  standalone: true,
  imports: [TPipe, RouterLink],
  template: `
    <button type="button" class="hb__btn" [class.hb__btn--compact]="compact()" (click)="open()" [title]="'handoff.button' | t">
      📱<span class="hb__label">{{ 'handoff.button' | t }}</span>
    </button>
    @if (visible()) {
      <div class="hb__backdrop" (click)="close()"></div>
      <div class="hb__modal" role="dialog" aria-modal="true" [attr.aria-label]="'handoff.title' | t">
        <button type="button" class="hb__x" (click)="close()" aria-label="Close">✕</button>
        <h2>{{ 'handoff.title' | t }}</h2>
        @if (claimedBy()) {
          <p class="hb__ok">✅ {{ 'handoff.claimed' | t: { device: claimedBy() } }}</p>
        } @else if (code(); as c) {
          <p class="hb__sub">{{ 'handoff.scan' | t }}</p>
          <img class="hb__qr" [src]="qr()" width="220" height="220" [alt]="'handoff.qrAlt' | t" />
          <p class="hb__or">{{ 'handoff.orCode' | t }}</p>
          <p class="hb__code">{{ c.code }}</p>
          @if (left() > 0) {
            <p class="hb__muted">{{ 'handoff.expires' | t: { s: left() } }}</p>
          } @else {
            <p class="hb__muted">{{ 'handoff.expired' | t }}</p>
            <button type="button" class="hb__again" (click)="create()">{{ 'handoff.new' | t }}</button>
          }
          <ol class="hb__steps">
            <li>{{ 'handoff.step1' | t }}</li>
            <li>{{ 'handoff.step2' | t }}</li>
            <li>{{ 'handoff.step3' | t }}</li>
          </ol>
        } @else if (error()) {
          <p class="hb__err">{{ error() }}</p>
          <button type="button" class="hb__again" (click)="create()">{{ 'handoff.retry' | t }}</button>
        } @else {
          <p class="hb__muted">{{ 'handoff.creating' | t }}</p>
        }
        <a class="hb__devices" routerLink="/account/devices" (click)="close()">{{ 'handoff.devices' | t }} →</a>
      </div>
    }
  `,
  styles: `
    :host { display: inline-block; }
    .hb__btn { display: inline-flex; gap: .35rem; align-items: center; border: 1px solid rgba(127,127,127,.4); border-radius: 999px; padding: .3rem .8rem; background: transparent; color: inherit; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .hb__btn--compact .hb__label { display: none; }
    @media (min-width: 1024px) { .hb__btn--compact .hb__label { display: inline; } }
    .hb__backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; }
    .hb__modal { position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 23rem); max-height: 92vh; overflow: auto; background: var(--surface, #fff); color: var(--ink, #111); border-radius: 18px; padding: 1.3rem; display: grid; gap: .55rem; justify-items: center; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .hb__x { position: absolute; right: .7rem; top: .6rem; border: 0; background: none; font-size: 1rem; cursor: pointer; color: inherit; }
    h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
    .hb__sub, .hb__or { margin: 0; font-size: .85rem; opacity: .8; }
    .hb__qr { background: #fff; border-radius: 12px; padding: 6px; }
    .hb__code { margin: 0; font: 800 1.6rem/1 ui-monospace, monospace; letter-spacing: .12em; }
    .hb__muted { margin: 0; font-size: .78rem; opacity: .65; }
    .hb__err { margin: 0; color: #e53935; font-size: .85rem; }
    .hb__ok { margin: .6rem 0; font-weight: 700; }
    .hb__steps { text-align: left; margin: .2rem 0 0; padding-left: 1.1rem; font-size: .8rem; opacity: .85; display: grid; gap: .2rem; }
    .hb__again { border: 0; border-radius: 999px; padding: .4rem 1rem; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
    .hb__devices { font-size: .8rem; }
  `,
})
export class HandoffButtonComponent {
  private readonly api = inject(HandoffService);
  private readonly sync = inject(SyncService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly kind = input.required<HandoffTarget['kind']>();
  readonly targetId = input.required<string>();
  readonly compact = input(false);

  readonly visible = signal(false);
  readonly code = signal<HandoffCode | null>(null);
  readonly error = signal('');
  readonly left = signal(0);
  readonly claimedBy = signal('');
  readonly qr = computed(() => {
    const svg = this.code()?.qrSvg;
    return svg ? this.sanitizer.bypassSecurityTrustUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`) : '';
  });
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const sub = this.sync.events.subscribe((e) => {
      if (!this.visible()) return;
      const t = e.data?.target;
      if (e.type === 'device.linked' && t?.kind === this.kind() && t?.id === this.targetId()) {
        this.claimedBy.set(e.data.device?.name || e.data.device?.platform || '📱');
        this.stopTimer();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.stopTimer();
    });
  }

  open(): void {
    this.visible.set(true);
    this.claimedBy.set('');
    this.sync.start();
    this.create();
  }

  close(): void {
    const c = this.code();
    if (c && this.left() > 0 && !this.claimedBy()) this.api.cancel(c.code).subscribe({ error: () => {} });
    this.visible.set(false);
    this.code.set(null);
    this.stopTimer();
  }

  create(): void {
    this.error.set('');
    this.code.set(null);
    this.api.create(this.kind(), this.targetId()).subscribe({
      next: (c) => {
        this.code.set(c);
        const end = new Date(c.expiresAt).getTime();
        this.stopTimer();
        const tick = () => {
          const s = Math.max(0, Math.round((end - Date.now()) / 1000));
          this.left.set(s);
          if (!s) this.stopTimer();
        };
        tick();
        this.timer = setInterval(tick, 1000);
      },
      error: (e) => this.error.set(e?.error?.error?.message || 'Không tạo được mã.'),
    });
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
