import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n/i18n.service';

/** Minimal shape of the GPay dynamic-QR response used by this view. */
export interface GpayQrView {
  provider?: string;
  accountName?: string;
  accountNumber?: string;
  order: { amountVnd: number; requestId?: string };
}

const TXT = {
  vi: {
    title: 'Nạp tiền qua GPay',
    lede: 'Thanh toán qua cổng GPay (ATM, thẻ, chuyển khoản) hoặc mã VietQR động. Ví được cộng tự động khi GPay xác nhận.',
    amount: 'Số tiền (VND)',
    credit: 'Ví được cộng (ước tính)',
    rate: 'Tỷ giá',
    min: 'Tối thiểu',
    portal: 'Thanh toán qua cổng GPay',
    qr: 'Tạo mã VietQR động',
    portalHint: 'Bạn sẽ được chuyển sang trang thanh toán của GPay và quay lại sau khi hoàn tất.',
    off: 'GPay tạm thời chưa khả dụng. Vui lòng dùng Chuyển khoản VietQR.',
    scan: 'Quét mã bằng ứng dụng ngân hàng',
    waiting: 'Đang chờ GPay xác nhận thanh toán…',
    close: 'Đóng mã QR',
    accNo: 'Số tài khoản',
    accName: 'Chủ tài khoản',
    amt: 'Số tiền',
    copy: 'Sao chép',
    copied: 'Đã chép',
  },
  en: {
    title: 'Top up with GPay',
    lede: 'Pay through the GPay gateway (ATM, card, transfer) or a dynamic VietQR. Your wallet is credited automatically when GPay confirms.',
    amount: 'Amount (VND)',
    credit: 'Wallet credit (estimate)',
    rate: 'Rate',
    min: 'Minimum',
    portal: 'Pay with GPay gateway',
    qr: 'Create dynamic VietQR',
    portalHint: 'You will be redirected to GPay and brought back when done.',
    off: 'GPay is temporarily unavailable. Please use VietQR bank transfer.',
    scan: 'Scan with your banking app',
    waiting: 'Waiting for GPay to confirm the payment…',
    close: 'Close QR',
    accNo: 'Account number',
    accName: 'Account holder',
    amt: 'Amount',
    copy: 'Copy',
    copied: 'Copied',
  },
};

/** Presentational GPay top-up (logic stays in WalletComponent). Self-contained styles, same look as app-bank-topup. */
@Component({
  selector: 'app-gpay-topup',
  standalone: true,
  imports: [FormsModule, DecimalPipe, CurrencyPipe],
  template: `
    <section class="gp">
      <header class="gp-head">
        <h3>{{ t().title }}</h3>
        <span class="gp-pill">GPay</span>
      </header>

      @if (!enabled) {
        <p class="gp-alert">{{ t().off }}</p>
      } @else if (qr) {
        <div class="gp-card gp-pay">
          <div class="gp-qrwrap">
            @if (qrSrc) {
              <img class="gp-qr" [src]="qrSrc" alt="VietQR" />
            }
            <p class="gp-muted gp-center">{{ t().scan }}</p>
          </div>
          <div class="gp-details">
            @if (qr.accountNumber) {
              <div class="gp-row"><span class="gp-k">{{ qr.provider || 'GPay' }}</span><span class="gp-v">{{ qr.accountName }}</span></div>
              <div class="gp-row">
                <span class="gp-k">{{ t().accNo }}</span>
                <span class="gp-v"><b class="gp-mono">{{ qr.accountNumber }}</b>
                  <button type="button" class="gp-copy" (click)="copy(qr.accountNumber!)">{{ copied() ? t().copied : t().copy }}</button></span>
              </div>
            }
            <div class="gp-row"><span class="gp-k">{{ t().amt }}</span><span class="gp-v"><b class="gp-amount">{{ qr.order.amountVnd | number: '1.0-0' }} ₫</b></span></div>
            <p class="gp-wait"><span class="gp-dot"></span>{{ t().waiting }}</p>
            <div class="gp-actions">
              <button type="button" class="gp-btn gp-btn--ghost" (click)="closeQr.emit()">{{ t().close }}</button>
            </div>
          </div>
        </div>
      } @else {
        <div class="gp-card">
          <p class="gp-muted gp-lede">{{ t().lede }}</p>
          <label class="gp-label" for="gpAmount">{{ t().amount }}</label>
          <div class="gp-input">
            <input id="gpAmount" type="number" inputmode="numeric" min="1000" step="1000"
              [ngModel]="amountVnd" (ngModelChange)="setAmount($event)" name="gpAmount" />
            <span class="gp-suffix">₫</span>
          </div>
          <div class="gp-quick">
            @for (q of quickAmounts; track q) {
              <button type="button" [class.on]="amountVnd === q" (click)="setAmount(q)">{{ q | number: '1.0-0' }} ₫</button>
            }
          </div>
          <div class="gp-conv">
            <div><span class="gp-k">{{ t().credit }}</span><b>{{ estimateUsd() | currency: 'USD': 'symbol-narrow': '1.2-2' }}</b></div>
            <div><span class="gp-k">{{ t().rate }}</span><span>{{ vndPerUsd | number: '1.0-0' }} ₫/USD</span></div>
            @if (minVnd > 0) {
              <div><span class="gp-k">{{ t().min }}</span><span>{{ minVnd | number: '1.0-0' }} ₫</span></div>
            }
          </div>
          <div class="gp-actions">
            @if (portalEnabled) {
              <button type="button" class="gp-btn gp-btn--primary" [disabled]="busy || polling" (click)="checkout.emit()">{{ t().portal }}</button>
            }
            @if (qrEnabled) {
              <button type="button" class="gp-btn gp-btn--ghost" [disabled]="busy || polling" (click)="createQr.emit()">{{ t().qr }}</button>
            }
          </div>
          @if (portalEnabled) {
            <p class="gp-muted gp-hint">{{ t().portalHint }}</p>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; text-align: left; }
      .gp { display: grid; gap: 1rem; }
      .gp-head { display: flex; align-items: center; gap: 0.6rem; }
      .gp-head h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #171717; }
      .gp-pill { font-size: 0.72rem; font-weight: 800; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 999px; padding: 0.15rem 0.55rem; }
      .gp-card { background: #fff; border: 1px solid #ececec; border-radius: 16px; padding: 1.25rem 1.35rem; }
      .gp-muted { color: #777; font-size: 0.82rem; }
      .gp-center { text-align: center; margin: 0.5rem 0 0; }
      .gp-lede { margin: 0 0 1rem; }
      .gp-hint { margin: 0.75rem 0 0; }
      .gp-label { display: block; font-size: 0.82rem; font-weight: 700; color: #555; margin-bottom: 0.35rem; }
      .gp-input { display: flex; align-items: center; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff; max-width: 420px; padding-right: 0.9rem; }
      .gp-input:focus-within { border-color: #171717; box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08); }
      .gp-input input { flex: 1; min-width: 0; border: 0; outline: 0; padding: 0.8rem 0.9rem; font: inherit; font-size: 1.1rem; font-weight: 800; background: transparent; color: #171717; }
      .gp-suffix { color: #777; font-weight: 800; }
      .gp-quick { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0 0; }
      .gp-quick button { border: 1px solid #e5e5e5; background: #fff; border-radius: 999px; padding: 0.35rem 0.75rem; font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; color: #333; }
      .gp-quick button.on { border-color: #e53935; background: #fff5f5; color: #e53935; }
      .gp-conv { display: flex; flex-wrap: wrap; gap: 0.5rem 1.75rem; margin: 1rem 0 1.15rem; padding: 0.8rem 1rem; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 12px; }
      .gp-conv > div { display: grid; gap: 0.1rem; }
      .gp-conv b { font-size: 1rem; color: #171717; }
      .gp-k { color: #777; font-size: 0.78rem; font-weight: 600; }
      .gp-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
      .gp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; padding: 0.55rem 1.3rem; border-radius: 12px; font: inherit; font-weight: 800; font-size: 0.92rem; cursor: pointer; }
      .gp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .gp-btn--primary { border: 0; background: #171717; color: #fff; }
      .gp-btn--ghost { border: 1px solid #ddd; background: #fff; color: #333; }
      .gp-pay { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; align-items: start; }
      .gp-qrwrap { display: grid; justify-items: center; }
      .gp-qr { width: 260px; height: 260px; object-fit: contain; background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 8px; box-sizing: border-box; }
      .gp-row { display: grid; grid-template-columns: 150px 1fr; gap: 0.75rem; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f3f3f3; }
      .gp-v { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; color: #171717; font-size: 0.92rem; }
      .gp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.03em; }
      .gp-amount { font-size: 1.15rem; color: #e53935; }
      .gp-copy { border: 1px solid #e5e5e5; background: #fff; border-radius: 8px; padding: 0.2rem 0.6rem; font: inherit; font-size: 0.75rem; font-weight: 700; color: #333; cursor: pointer; }
      .gp-wait { display: flex; align-items: center; gap: 0.5rem; margin: 0.9rem 0; color: #b45309; font-weight: 700; font-size: 0.88rem; }
      .gp-dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; animation: gp-pulse 1.2s ease-in-out infinite; }
      @keyframes gp-pulse { 50% { opacity: 0.3; } }
      .gp-alert { margin: 0; padding: 0.8rem 1rem; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 0.88rem; }
      @media (max-width: 720px) {
        .gp-pay { grid-template-columns: 1fr; }
        .gp-row { grid-template-columns: 1fr; gap: 0.2rem; }
      }
    `,
  ],
})
export class GpayTopupComponent {
  private readonly i18n = inject(I18nService);
  readonly t = computed(() => (this.i18n.lang() === 'vi' ? TXT.vi : TXT.en));

  @Input() enabled = false;
  @Input() portalEnabled = false;
  @Input() qrEnabled = false;
  @Input() busy = false;
  @Input() polling = false;
  @Input() qr: GpayQrView | null = null;
  @Input() qrSrc = '';
  @Input() quickAmounts: number[] = [];
  @Input() vndPerUsd = 26500;
  @Input() minVnd = 0;
  @Input() amountVnd = 0;
  @Output() amountVndChange = new EventEmitter<number>();
  @Output() checkout = new EventEmitter<void>();
  @Output() createQr = new EventEmitter<void>();
  @Output() closeQr = new EventEmitter<void>();

  readonly copied = signal(false);

  estimateUsd(): number {
    const rate = this.vndPerUsd || 26500;
    return Math.round(((Number(this.amountVnd) || 0) / rate) * 100) / 100;
  }

  setAmount(v: number): void {
    this.amountVnd = Number(v) || 0;
    this.amountVndChange.emit(this.amountVnd);
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
