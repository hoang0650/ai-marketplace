import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { LAUNCH_NOTICE_MESSAGES } from './launch-notice.messages';
import { LaunchNoticeService } from './launch-notice.service';

/** Rendered once in the app shell; shows the Launch / rent outcome as a modal. */
@Component({
  selector: 'app-launch-notice',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    @if (n(); as n) {
      <div class="ln-backdrop" (click)="svc.close()"></div>
      <div
        class="ln-modal"
        [class.ln-modal--error]="n.kind === 'error'"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ln-title"
        data-testid="launch-notice"
      >
        <div class="ln-icon" aria-hidden="true">{{ n.kind === 'success' ? '✓' : refund()?.refunded ? '↺' : '!' }}</div>
        <h2 id="ln-title">{{ title() | t: { brand: n.brand } }}</h2>
        <ul class="ln-lines">
          @if (rental(); as r) {
            @if (refund()?.refunded) {
              <li>{{ 'launchNotice.refunded' | t: { price: vnd(refund()?.feeVnd ?? r.chargedVnd) } }}</li>
            } @else if (refund()?.alreadyRefunded) {
              <li>{{ 'launchNotice.refundAlready' | t }}</li>
            } @else if (refund()?.failed) {
              <li class="ln-warn">{{ 'launchNotice.refundFailed' | t: { tx: r.walletTxId || '-' } }}</li>
            } @else {
              @if (r.charged) {
                <li>{{ 'launchNotice.charged' | t: { price: vnd(r.chargedVnd), days: r.periodDays } }}</li>
              } @else if (r.duplicate) {
                <li>{{ 'launchNotice.notCharged' | t }}</li>
              }
              @if (r.paidUntil) {
                <li>{{ 'launchNotice.paidUntil' | t: { date: date(r.paidUntil) } }}</li>
              }
              <li>{{ (r.autoRenew ? 'launchNotice.autoRenewOn' : 'launchNotice.autoRenewOff') | t }}</li>
            }
          }
          @if (n.kind === 'success') {
            <li>{{ 'launchNotice.next' | t }}</li>
          } @else if (n.result.message) {
            <li class="ln-reason">{{ 'launchNotice.reason' | t: { msg: n.result.message } }}</li>
          }
        </ul>
        <div class="ln-actions">
          @if (n.kind === 'success' && n.result.url) {
            <a class="ln-btn ln-btn--primary" [href]="n.result.url" target="_blank" rel="noopener" (click)="svc.close()">
              {{ 'launchNotice.open' | t: { brand: n.brand } }}
            </a>
          }
          @if (n.kind === 'error' && svc.canRetry()) {
            <button type="button" class="ln-btn ln-btn--primary" (click)="svc.retry()">{{ 'launchNotice.retry' | t }}</button>
          }
          <a class="ln-btn" [routerLink]="['/hire-agent', n.agentId, 'setup']" (click)="svc.close()">{{ 'launchNotice.setup' | t }}</a>
          <a class="ln-btn" [routerLink]="['/hire-agent', n.agentId]" (click)="svc.close()">{{ 'launchNotice.agentPage' | t }}</a>
          @if (rental()) {
            <a class="ln-btn" routerLink="/wallet" (click)="svc.close()">{{ 'launchNotice.wallet' | t }}</a>
          }
          <button type="button" class="ln-btn ln-btn--ghost" (click)="svc.close()">{{ 'launchNotice.close' | t }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .ln-backdrop { position: fixed; inset: 0; background: rgba(5, 8, 20, 0.6); z-index: 1000; }
    .ln-modal {
      position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(480px, calc(100vw - 32px)); padding: 24px; border-radius: 16px;
      background: #0f1424; color: #e8ecf8; border: 1px solid #2b8a5a; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      font-family: inherit;
    }
    .ln-modal--error { border-color: #b4493f; }
    .ln-icon {
      width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; font-weight: 700;
      background: #1f6f47; color: #fff; margin-bottom: 12px;
    }
    .ln-modal--error .ln-icon { background: #9b3a32; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    .ln-lines { margin: 0 0 18px; padding-left: 18px; line-height: 1.55; font-size: 14px; }
    .ln-lines li { margin-bottom: 4px; }
    .ln-warn { color: #ffb4a8; font-weight: 600; }
    .ln-reason { color: #c3c8d8; font-size: 13px; }
    .ln-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .ln-btn {
      display: inline-flex; align-items: center; padding: 8px 14px; border-radius: 10px; border: 1px solid #34405e;
      background: transparent; color: #e8ecf8; font-size: 14px; text-decoration: none; cursor: pointer;
    }
    .ln-btn--primary { background: #3b6cff; border-color: #3b6cff; color: #fff; font-weight: 600; }
    .ln-btn--ghost { border-color: transparent; color: #9aa3bd; }
  `,
})
export class LaunchNoticeComponent {
  readonly svc = inject(LaunchNoticeService);
  private readonly i18n = inject(I18nService);
  readonly n = this.svc.notice;
  readonly rental = computed(() => this.n()?.result.rental || null);
  readonly refund = computed(() => this.n()?.result.refund || null);
  readonly title = computed(() => {
    const n = this.n();
    if (!n) return '';
    if (n.kind === 'error') return n.result.refund?.refunded ? 'launchNotice.refundedTitle' : 'launchNotice.errorTitle';
    if (n.result.rental?.charged) return 'launchNotice.successTitle';
    if (n.result.rental?.duplicate) return 'launchNotice.duplicateTitle';
    return 'launchNotice.openedTitle';
  });

  constructor() {
    this.i18n.extend(LAUNCH_NOTICE_MESSAGES);
  }

  vnd(v?: number | null): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(v || 0))} ₫`;
  }

  date(iso: string): string {
    const locale = { vi: 'vi-VN', en: 'en-GB', zh: 'zh-CN' }[this.i18n.lang()] || 'vi-VN';
    try {
      return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  }
}
