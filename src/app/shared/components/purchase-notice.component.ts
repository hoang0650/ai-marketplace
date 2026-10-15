import { Component, HostListener, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TPipe } from '../../i18n/t.pipe';

export interface PurchaseNotice {
  state: 'loading' | 'success' | 'already' | 'error';
  productName: string;
  amount?: number;
  currency?: string;
  /** Available wallet balance after the purchase. */
  available?: number;
  orderId?: string;
  licenseKey?: string;
  emailTo?: string | null;
  message?: string;
  /** template-web / template-app: offer "Open in Builder" + download. */
  template?: boolean;
  /** Error code from the API (INSUFFICIENT_FUNDS, CHECKOUT_IN_PROGRESS…). */
  code?: string;
}

/** Modal shown for every wallet purchase on the product page: loading → success / error. */
@Component({
  selector: 'app-purchase-notice',
  standalone: true,
  imports: [TPipe, CurrencyPipe],
  template: `
    @if (notice(); as n) {
      <div class="pn-backdrop" (click)="n.state !== 'loading' && closed.emit()"></div>
      <div class="pn" role="dialog" aria-modal="true" [attr.aria-busy]="n.state === 'loading'" [class]="'pn pn--' + n.state">
        @switch (n.state) {
          @case ('loading') {
            <div class="pn__spin" aria-hidden="true"></div>
            <h2>{{ 'buy.notice.loading' | t }}</h2>
            <p>{{ n.productName }}</p>
          }
          @case ('error') {
            <div class="pn__icon">!</div>
            <h2>{{ 'buy.notice.errorTitle' | t }}</h2>
            <p>{{ n.message || ('buy.notice.errorBody' | t) }}</p>
            <p class="pn__small">{{ 'buy.notice.errorSafe' | t }}</p>
            <div class="pn__actions">
              @if (n.code === 'INSUFFICIENT_FUNDS' || n.code === 'INSUFFICIENT_AVAILABLE') {
                <button type="button" class="btn btn-fill" (click)="topUp.emit()">{{ 'buy.notice.topUp' | t }}</button>
              } @else {
                <button type="button" class="btn btn-fill" (click)="retry.emit()">{{ 'buy.notice.retry' | t }}</button>
              }
              <button type="button" class="btn btn-outline" (click)="closed.emit()">{{ 'buy.notice.close' | t }}</button>
            </div>
          }
          @default {
            <div class="pn__icon pn__icon--ok">✓</div>
            <h2>{{ (n.state === 'already' ? 'buy.notice.alreadyTitle' : 'buy.notice.okTitle') | t }}</h2>
            <dl class="pn__rows">
              <div><dt>{{ 'buy.notice.product' | t }}</dt><dd>{{ n.productName }}</dd></div>
              @if (n.state === 'success' && n.amount !== undefined) {
                <div><dt>{{ 'buy.notice.charged' | t }}</dt><dd>{{ n.amount | currency: (n.currency || 'USD'): 'symbol-narrow': '1.2-2' }}</dd></div>
              }
              @if (n.available !== undefined) {
                <div><dt>{{ 'wallet.available' | t }}</dt><dd>{{ n.available | currency: 'USD': 'symbol-narrow': '1.2-2' }}</dd></div>
              }
              @if (n.orderId) {
                <div><dt>{{ 'buy.notice.order' | t }}</dt><dd class="pn__mono">#{{ n.orderId.slice(-8) }}</dd></div>
              }
              @if (n.licenseKey) {
                <div><dt>{{ 'buy.notice.license' | t }}</dt><dd class="pn__mono">{{ n.licenseKey }}</dd></div>
              }
            </dl>
            @if (n.emailTo) {
              <p class="pn__small">{{ 'cart.successEmail' | t: { email: n.emailTo } }}</p>
            }
            <p class="pn__next">{{ (n.template ? 'buy.notice.nextTemplate' : 'buy.notice.next') | t }}</p>
            <div class="pn__actions">
              @if (n.template) {
                <button type="button" class="btn btn-fill" (click)="openBuilder.emit()">{{ 'buy.notice.openBuilder' | t }}</button>
                <button type="button" class="btn btn-outline" (click)="download.emit()">{{ 'buy.notice.download' | t }}</button>
              } @else {
                <button type="button" class="btn btn-fill" (click)="closed.emit()">{{ 'buy.notice.continue' | t }}</button>
              }
              <button type="button" class="btn btn-ghost" (click)="orders.emit()">{{ 'buy.notice.orders' | t }}</button>
            </div>
          }
        }
      </div>
    }
  `,
  styles: `
    .pn-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; }
    .pn { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1001; width: min(440px, calc(100vw - 2rem));
      background: var(--surface, #fff); color: inherit; border-radius: 18px; padding: 1.4rem 1.4rem 1.2rem; box-shadow: 0 20px 60px rgba(0,0,0,.3);
      display: grid; gap: .6rem; justify-items: center; text-align: center; }
    .pn h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
    .pn p { margin: 0; }
    .pn__icon { width: 3rem; height: 3rem; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 1.4rem; background: #fdecea; color: #c62828; }
    .pn__icon--ok { background: #e7f6ec; color: #1b8a3a; }
    .pn__spin { width: 2.6rem; height: 2.6rem; border-radius: 50%; border: 3px solid rgba(127,127,127,.25); border-top-color: currentColor; animation: pnspin .8s linear infinite; }
    @keyframes pnspin { to { transform: rotate(360deg); } }
    .pn__rows { width: 100%; margin: .3rem 0 0; display: grid; gap: .35rem; text-align: left; font-size: .9rem; }
    .pn__rows div { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px dashed rgba(127,127,127,.25); padding-bottom: .3rem; }
    .pn__rows dt { opacity: .7; }
    .pn__rows dd { margin: 0; font-weight: 700; text-align: right; word-break: break-all; }
    .pn__mono { font-family: ui-monospace, monospace; font-size: .8rem; }
    .pn__small { font-size: .8rem; opacity: .7; }
    .pn__next { font-size: .88rem; }
    .pn__actions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin-top: .3rem; }
  `,
})
export class PurchaseNoticeComponent {
  readonly notice = input<PurchaseNotice | null>(null);
  readonly closed = output<void>();
  readonly retry = output<void>();
  readonly topUp = output<void>();
  readonly openBuilder = output<void>();
  readonly download = output<void>();
  readonly orders = output<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.notice() && this.notice()!.state !== 'loading') this.closed.emit();
  }
}
