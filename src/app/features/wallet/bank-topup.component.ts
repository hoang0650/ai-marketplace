import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';

export interface BankTopupConfig {
  enabled: boolean;
  bankName: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  vndPerUsd: number;
  minVnd: number;
  maxVnd: number;
  expireHours: number;
}

export interface BankDeposit {
  id: string;
  status: 'pending' | 'credited' | 'expired' | 'cancelled';
  amountUsd: number;
  amountVnd: number;
  vndPerUsd: number;
  content: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string | null;
  createdAt: string | null;
  creditedAt: string | null;
  qrPayload: string;
  qrImage: string;
}

const TXT = {
  vi: {
    title: 'Nạp tiền bằng chuyển khoản ngân hàng (VietQR)',
    lede: 'Nhập số tiền, quét mã VietQR bằng ứng dụng ngân hàng và giữ nguyên nội dung chuyển khoản.',
    amount: 'Số tiền',
    rate: 'Tỷ giá',
    create: 'Tạo mã chuyển khoản',
    bank: 'Ngân hàng',
    accNo: 'Số tài khoản',
    accName: 'Chủ tài khoản',
    amt: 'Số tiền',
    content: 'Nội dung chuyển khoản',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    credit: 'Số dư ví sẽ được cộng',
    note: 'Sau khi chuyển khoản, vui lòng giữ biên lai. Ví được cộng trong vài phút đến vài giờ làm việc sau khi chúng tôi xác nhận.',
    contentWarn: 'Vui lòng nhập ĐÚNG nội dung chuyển khoản để chúng tôi đối soát.',
    newReq: 'Tạo yêu cầu khác',
    history: 'Yêu cầu chuyển khoản gần đây',
    st: { pending: 'Chờ xác nhận', credited: 'Đã cộng ví', expired: 'Hết hạn', cancelled: 'Đã huỷ' },
    off: 'Nạp tiền bằng chuyển khoản tạm thời chưa khả dụng. Vui lòng liên hệ support@aimarkets.vn.',
    err: 'Không tạo được yêu cầu. Vui lòng thử lại.',
  },
  en: {
    title: 'Top up by bank transfer (VietQR)',
    lede: 'Enter an amount, scan the VietQR code in your banking app and keep the transfer content unchanged.',
    amount: 'Amount',
    rate: 'Rate',
    create: 'Create transfer code',
    bank: 'Bank',
    accNo: 'Account number',
    accName: 'Account holder',
    amt: 'Amount',
    content: 'Transfer content',
    copy: 'Copy',
    copied: 'Copied',
    credit: 'Wallet credit',
    note: 'Sau khi chuyển khoản, vui lòng giữ biên lai. Ví được cộng trong vài phút đến vài giờ làm việc sau khi chúng tôi xác nhận. (Please keep your receipt; your wallet is credited within minutes to a few business hours after we confirm the transfer.)',
    contentWarn: 'Enter the transfer content EXACTLY so we can match your payment.',
    newReq: 'New request',
    history: 'Recent transfer requests',
    st: { pending: 'Awaiting confirmation', credited: 'Credited', expired: 'Expired', cancelled: 'Cancelled' },
    off: 'Bank transfer top-up is temporarily unavailable. Please contact support@aimarkets.vn.',
    err: 'Could not create the request. Please try again.',
  },
};

@Component({
  selector: 'app-bank-topup',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, DatePipe],
  template: `
    <div class="bt">
      <h3>{{ t().title }}</h3>
      @if (!cfg()) {
        <p class="hint">…</p>
      } @else if (!cfg()!.enabled) {
        <p class="offline">{{ t().off }}</p>
      } @else if (dep(); as d) {
        <div class="bt-box">
          @if (d.qrImage) {
            <img class="bt-qr" [src]="d.qrImage" alt="VietQR" />
          }
          <dl class="bt-info">
            <dt>{{ t().bank }}</dt>
            <dd>{{ d.bankName }}</dd>
            <dt>{{ t().accNo }}</dt>
            <dd><code>{{ d.accountNumber }}</code> <button type="button" (click)="copy(d.accountNumber, 'acc')">{{ copied() === 'acc' ? t().copied : t().copy }}</button></dd>
            <dt>{{ t().accName }}</dt>
            <dd>{{ d.accountName }}</dd>
            <dt>{{ t().amt }}</dt>
            <dd><strong>{{ d.amountVnd | number: '1.0-0' }} ₫</strong> <button type="button" (click)="copy('' + d.amountVnd, 'amt')">{{ copied() === 'amt' ? t().copied : t().copy }}</button></dd>
            <dt>{{ t().content }}</dt>
            <dd><code class="bt-memo">{{ d.content }}</code> <button type="button" (click)="copy(d.content, 'memo')">{{ copied() === 'memo' ? t().copied : t().copy }}</button></dd>
            <dt>{{ t().credit }}</dt>
            <dd>{{ d.amountUsd | currency: 'USD': 'symbol-narrow': '1.2-2' }} ({{ t().rate }} {{ d.vndPerUsd | number: '1.0-0' }} ₫/USD)</dd>
          </dl>
        </div>
        <p class="bt-warn">{{ t().contentWarn }}</p>
        <p class="bt-note">{{ t().note }}</p>
        <button type="button" class="btn-outline" (click)="dep.set(null)">{{ t().newReq }}</button>
      } @else {
        <p class="hint">{{ t().lede }}</p>
        <div class="amount-row">
          <label>
            <span>{{ t().amount }}</span>
            <input type="number" min="1" [(ngModel)]="amount" name="btAmount" />
          </label>
          <label>
            <span>&nbsp;</span>
            <select [(ngModel)]="currency" name="btCurrency">
              <option value="USD">USD</option>
              <option value="VND">VND</option>
            </select>
          </label>
        </div>
        <p class="note">
          ≈ {{ estVnd() | number: '1.0-0' }} ₫ ≈ {{ estUsd() | currency: 'USD': 'symbol-narrow': '1.2-2' }}
          · {{ t().rate }} {{ cfg()!.vndPerUsd | number: '1.0-0' }} ₫/USD
        </p>
        <div class="actions">
          <button type="button" class="btn-dark" [disabled]="busy()" (click)="create()">{{ t().create }}</button>
        </div>
      }
      @if (err()) {
        <p class="msg msg--err">{{ err() }}</p>
      }
      @if (history().length) {
        <h4>{{ t().history }}</h4>
        <ul class="bt-hist">
          @for (h of history(); track h.id) {
            <li>
              <code>{{ h.content }}</code> · {{ h.amountVnd | number: '1.0-0' }} ₫ ({{ h.amountUsd | currency: 'USD': 'symbol-narrow': '1.2-2' }})
              · <span [class]="'st st--' + h.status">{{ t().st[h.status] }}</span>
              · {{ h.createdAt | date: 'short' }}
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .bt-box { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start; margin: 1rem 0; }
      .bt-qr { width: 240px; height: 240px; background: #fff; border-radius: 12px; padding: 6px; border: 1px solid #e5e7eb; }
      .bt-info { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; margin: 0; }
      .bt-info dt { color: #6b7280; }
      .bt-info dd { margin: 0; }
      .bt-info button { margin-left: 0.5rem; font-size: 0.8rem; padding: 2px 8px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
      .bt-memo { font-weight: 700; letter-spacing: 0.05em; }
      .bt-warn { color: #b45309; font-weight: 600; }
      .bt-note { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.75rem 1rem; border-radius: 8px; }
      .bt-hist { list-style: none; padding: 0; font-size: 0.9rem; }
      .bt-hist li { padding: 0.35rem 0; border-bottom: 1px solid #f3f4f6; }
      .st--credited { color: #15803d; } .st--pending { color: #b45309; } .st--expired, .st--cancelled { color: #6b7280; }
    `,
  ],
})
export class BankTopupComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = `${environment.apiUrl}/wallet/bank-transfer`;

  readonly cfg = signal<BankTopupConfig | null>(null);
  readonly dep = signal<BankDeposit | null>(null);
  readonly history = signal<BankDeposit[]>([]);
  readonly busy = signal(false);
  readonly err = signal('');
  readonly copied = signal('');
  readonly t = computed(() => (this.i18n.lang() === 'vi' ? TXT.vi : TXT.en));

  amount = 10;
  currency: 'USD' | 'VND' = 'USD';

  /** Mirrors API convertAmount: no rounding to 1,000đ. USD input → VND = cents * rate. */
  estVnd(): number {
    const rate = this.cfg()?.vndPerUsd || 26500;
    const n = Number(this.amount) || 0;
    if (this.currency === 'VND') return Math.round(n);
    return Math.round((Math.round(n * 100) * rate) / 100);
  }

  estUsd(): number {
    const rate = this.cfg()?.vndPerUsd || 26500;
    const n = Number(this.amount) || 0;
    if (this.currency === 'USD') return Math.round(n * 100) / 100;
    return Math.round((Math.round(n) / rate) * 100) / 100;
  }

  ngOnInit(): void {
    if (this.i18n.lang() === 'vi') {
      this.currency = 'VND';
      this.amount = 265000;
    }
    this.http.get<BankTopupConfig>(`${this.base}/config`).subscribe({
      next: (c) => this.cfg.set(c),
      error: () => this.cfg.set({ enabled: false } as BankTopupConfig),
    });
    this.loadHistory();
  }

  loadHistory(): void {
    this.http.get<{ items: BankDeposit[] }>(this.base).subscribe({
      next: (r) => this.history.set(r.items || []),
      error: () => undefined,
    });
  }

  create(): void {
    this.err.set('');
    this.busy.set(true);
    this.http.post<BankDeposit>(this.base, { amount: Number(this.amount), currency: this.currency }).subscribe({
      next: (d) => {
        this.busy.set(false);
        this.dep.set(d);
        this.loadHistory();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e?.error?.message || this.t().err);
      },
    });
  }

  copy(text: string, key: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(key);
      setTimeout(() => this.copied.set(''), 1500);
    });
  }
}
