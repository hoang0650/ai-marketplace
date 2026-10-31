import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { CurrencyService } from '../../i18n/currency.service';
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
  qrPayload?: string;
  qrImage?: string;
}

const TXT = {
  vi: {
    title: 'Nạp tiền bằng chuyển khoản ngân hàng',
    lede: 'Nhập số tiền, quét mã VietQR bằng ứng dụng ngân hàng và giữ nguyên nội dung chuyển khoản.',
    amount: 'Số tiền',
    rate: 'Tỷ giá',
    willTransfer: 'Bạn sẽ chuyển',
    willCredit: 'Ví được cộng',
    create: 'Tạo mã chuyển khoản',
    creating: 'Đang tạo…',
    scan: 'Quét mã bằng ứng dụng ngân hàng',
    bank: 'Ngân hàng',
    accNo: 'Số tài khoản',
    accName: 'Chủ tài khoản',
    amt: 'Số tiền',
    content: 'Nội dung chuyển khoản',
    copy: 'Sao chép',
    copied: 'Đã chép',
    credit: 'Ví được cộng',
    status: 'Trạng thái',
    expires: 'Hết hạn',
    note: 'Sau khi chuyển khoản, vui lòng giữ biên lai. Ví được cộng trong vài phút đến vài giờ làm việc sau khi chúng tôi xác nhận.',
    contentWarn: 'Vui lòng nhập ĐÚNG nội dung chuyển khoản để chúng tôi đối soát.',
    newReq: 'Tạo yêu cầu khác',
    refresh: 'Kiểm tra trạng thái',
    history: 'Yêu cầu chuyển khoản gần đây',
    showQr: 'Xem mã QR',
    noQr: 'Không tải được ảnh QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.',
    st: { pending: 'Chờ xác nhận', credited: 'Đã cộng ví', expired: 'Hết hạn', cancelled: 'Đã huỷ' },
    off: 'Nạp tiền bằng chuyển khoản tạm thời chưa khả dụng. Vui lòng liên hệ support@aimarkets.vn.',
    err: 'Không tạo được yêu cầu. Vui lòng thử lại.',
    loading: 'Đang tải…',
  },
  en: {
    title: 'Top up by bank transfer',
    lede: 'Enter an amount, scan the VietQR code in your banking app and keep the transfer content unchanged.',
    amount: 'Amount',
    rate: 'Rate',
    willTransfer: 'You transfer',
    willCredit: 'Wallet credit',
    create: 'Create transfer code',
    creating: 'Creating…',
    scan: 'Scan with your banking app',
    bank: 'Bank',
    accNo: 'Account number',
    accName: 'Account holder',
    amt: 'Amount',
    content: 'Transfer content',
    copy: 'Copy',
    copied: 'Copied',
    credit: 'Wallet credit',
    status: 'Status',
    expires: 'Expires',
    note: 'Sau khi chuyển khoản, vui lòng giữ biên lai. Ví được cộng trong vài phút đến vài giờ làm việc sau khi chúng tôi xác nhận. (Please keep your receipt; your wallet is credited within minutes to a few business hours after we confirm the transfer.)',
    contentWarn: 'Enter the transfer content EXACTLY so we can match your payment.',
    newReq: 'New request',
    refresh: 'Check status',
    history: 'Recent transfer requests',
    showQr: 'Show QR',
    noQr: 'QR image unavailable. Please transfer manually using the details.',
    st: { pending: 'Awaiting confirmation', credited: 'Credited', expired: 'Expired', cancelled: 'Cancelled' },
    off: 'Bank transfer top-up is temporarily unavailable. Please contact support@aimarkets.vn.',
    err: 'Could not create the request. Please try again.',
    loading: 'Loading…',
  },
};

@Component({
  selector: 'app-bank-topup',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, DatePipe],
  template: `
    <section class="bt">
      <header class="bt-head">
        <h3>{{ t().title }}</h3>
        <span class="bt-pill">VietQR</span>
      </header>

      @if (!cfg()) {
        <p class="bt-muted">{{ t().loading }}</p>
      } @else if (!cfg()!.enabled) {
        <p class="bt-alert">{{ t().off }}</p>
      } @else if (dep(); as d) {
        <div class="bt-card bt-pay">
          <div class="bt-qrwrap">
            @if (d.qrImage && !qrBroken()) {
              <img class="bt-qr" [src]="d.qrImage" alt="VietQR" (error)="qrBroken.set(true)" />
            } @else {
              <div class="bt-qr bt-qr--empty">{{ t().noQr }}</div>
            }
            <p class="bt-muted bt-center">{{ t().scan }}</p>
          </div>
          <div class="bt-details">
            <div class="bt-row">
              <span class="bt-k">{{ t().bank }}</span>
              <span class="bt-v">{{ d.bankName }}</span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().accNo }}</span>
              <span class="bt-v"><b class="bt-mono">{{ d.accountNumber }}</b>
                <button type="button" class="bt-copy" (click)="copy(d.accountNumber, 'acc')">{{ copied() === 'acc' ? t().copied : t().copy }}</button></span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().accName }}</span>
              <span class="bt-v">{{ d.accountName }}</span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().amt }}</span>
              <span class="bt-v"><b class="bt-amount">{{ d.amountVnd | number: '1.0-0' }} ₫</b>
                <button type="button" class="bt-copy" (click)="copy('' + d.amountVnd, 'amt')">{{ copied() === 'amt' ? t().copied : t().copy }}</button></span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().content }}</span>
              <span class="bt-v"><b class="bt-mono bt-memo">{{ d.content }}</b>
                <button type="button" class="bt-copy" (click)="copy(d.content, 'memo')">{{ copied() === 'memo' ? t().copied : t().copy }}</button></span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().credit }}</span>
              <span class="bt-v">{{ d.amountUsd | currency: 'USD': 'symbol-narrow': '1.2-2' }}
                <small class="bt-muted">({{ t().rate }} {{ d.vndPerUsd | number: '1.0-0' }} ₫/USD)</small></span>
            </div>
            <div class="bt-row">
              <span class="bt-k">{{ t().status }}</span>
              <span class="bt-v"><span [class]="'bt-badge bt-badge--' + d.status">{{ t().st[d.status] }}</span>
                @if (d.expiresAt && d.status === 'pending') {
                  <small class="bt-muted">· {{ t().expires }} {{ d.expiresAt | date: 'dd/MM HH:mm' }}</small>
                }</span>
            </div>
            <p class="bt-warn">{{ t().contentWarn }}</p>
          </div>
        </div>
        <p class="bt-note">{{ t().note }}</p>
        <div class="bt-actions">
          <button type="button" class="bt-btn bt-btn--ghost" (click)="closeDeposit()">{{ t().newReq }}</button>
          @if (d.status === 'pending') {
            <button type="button" class="bt-btn bt-btn--ghost" [disabled]="busy()" (click)="refresh(d.id)">{{ t().refresh }}</button>
          }
        </div>
      } @else {
        <div class="bt-card">
          <p class="bt-muted bt-lede">{{ t().lede }}</p>
          <label class="bt-label" for="btAmount">{{ t().amount }}</label>
          <div class="bt-input">
            <input id="btAmount" type="number" inputmode="decimal" [min]="currency === 'VND' ? 1000 : 1"
              [step]="currency === 'VND' ? 1000 : 0.01" [ngModel]="shownAmount()" (ngModelChange)="setAmount($event)" name="btAmount" />
            <div class="bt-seg" role="group">
              <button type="button" [class.on]="currency === 'VND'" (click)="setCurrency('VND')">VND</button>
              <button type="button" [class.on]="currency === 'USD'" (click)="setCurrency('USD')">USD</button>
            </div>
          </div>
          <div class="bt-quick">
            @for (q of quick(); track q) {
              <button type="button" [class.on]="+shownAmount() === q" (click)="setAmount(q)">
                {{ currency === 'VND' ? (q | number: '1.0-0') + ' ₫' : '$' + q }}
              </button>
            }
          </div>
          <div class="bt-conv">
            <div><span class="bt-k">{{ t().willTransfer }}</span><b>{{ estVnd() | number: '1.0-0' }} ₫</b></div>
            <div><span class="bt-k">{{ t().willCredit }}</span><b>{{ estUsd() | currency: 'USD': 'symbol-narrow': '1.2-2' }}</b></div>
            <div><span class="bt-k">{{ t().rate }}</span><span>{{ fx.vndPerUsd() | number: '1.0-0' }} ₫/USD</span></div>
          </div>
          <button type="button" class="bt-btn bt-btn--primary" [disabled]="busy() || estVnd() <= 0" (click)="create()">
            {{ busy() ? t().creating : t().create }}
          </button>
        </div>
      }

      @if (err()) {
        <p class="bt-alert bt-alert--err">{{ err() }}</p>
      }

      @if (history().length) {
        <div class="bt-card bt-hist">
          <h4>{{ t().history }}</h4>
          <ul>
            @for (h of history(); track h.id) {
              <li [class.active]="dep()?.id === h.id">
                <div class="bt-hist-main">
                  <b class="bt-mono">{{ h.content }}</b>
                  <small class="bt-muted">{{ h.createdAt | date: 'dd/MM/yyyy HH:mm' }}</small>
                </div>
                <div class="bt-hist-amt">
                  <b>{{ h.amountVnd | number: '1.0-0' }} ₫</b>
                  <small class="bt-muted">{{ h.amountUsd | currency: 'USD': 'symbol-narrow': '1.2-2' }}</small>
                </div>
                <span [class]="'bt-badge bt-badge--' + h.status">{{ t().st[h.status] }}</span>
                @if (h.status === 'pending') {
                  <button type="button" class="bt-copy" (click)="open(h.id)">{{ t().showQr }}</button>
                } @else {
                  <span class="bt-spacer"></span>
                }
              </li>
            }
          </ul>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; text-align: left; }
      .bt { display: grid; gap: 1rem; }
      .bt-head { display: flex; align-items: center; gap: 0.6rem; }
      .bt-head h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #171717; }
      .bt-pill { font-size: 0.72rem; font-weight: 800; color: #e53935; background: #fff5f5; border: 1px solid #fecaca; border-radius: 999px; padding: 0.15rem 0.55rem; }
      .bt-card { background: #fff; border: 1px solid #ececec; border-radius: 16px; padding: 1.25rem 1.35rem; }
      .bt-muted { color: #777; font-size: 0.82rem; }
      .bt-center { text-align: center; margin: 0.5rem 0 0; }
      .bt-lede { margin: 0 0 1rem; }
      .bt-label { display: block; font-size: 0.82rem; font-weight: 700; color: #555; margin-bottom: 0.35rem; }
      .bt-input { display: flex; align-items: stretch; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fff; max-width: 420px; }
      .bt-input:focus-within { border-color: #171717; box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08); }
      .bt-input input { flex: 1; min-width: 0; border: 0; outline: 0; padding: 0.8rem 0.9rem; font: inherit; font-size: 1.1rem; font-weight: 800; background: transparent; color: #171717; }
      .bt-seg { display: flex; background: #f5f5f5; padding: 4px; gap: 4px; }
      .bt-seg button { border: 0; background: transparent; border-radius: 8px; padding: 0 0.8rem; font: inherit; font-weight: 800; font-size: 0.82rem; color: #777; cursor: pointer; }
      .bt-seg button.on { background: #fff; color: #171717; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
      .bt-quick { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0 0; }
      .bt-quick button { border: 1px solid #e5e5e5; background: #fff; border-radius: 999px; padding: 0.35rem 0.75rem; font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; color: #333; }
      .bt-quick button.on { border-color: #e53935; background: #fff5f5; color: #e53935; }
      .bt-conv { display: flex; flex-wrap: wrap; gap: 0.5rem 1.75rem; margin: 1rem 0 1.15rem; padding: 0.8rem 1rem; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 12px; }
      .bt-conv > div { display: grid; gap: 0.1rem; }
      .bt-conv b { font-size: 1rem; color: #171717; }
      .bt-k { color: #777; font-size: 0.78rem; font-weight: 600; }
      .bt-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; padding: 0.55rem 1.3rem; border-radius: 12px; font: inherit; font-weight: 800; font-size: 0.92rem; cursor: pointer; }
      .bt-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .bt-btn--primary { border: 0; background: #171717; color: #fff; }
      .bt-btn--primary:hover:not(:disabled) { background: #000; }
      .bt-btn--ghost { border: 1px solid #ddd; background: #fff; color: #333; }
      .bt-pay { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; align-items: start; }
      .bt-qrwrap { display: grid; justify-items: center; }
      .bt-qr { width: 260px; height: 260px; object-fit: contain; background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 8px; box-sizing: border-box; image-rendering: pixelated; }
      .bt-qr--empty { display: grid; place-items: center; text-align: center; font-size: 0.82rem; color: #777; padding: 1rem; image-rendering: auto; }
      .bt-details { display: grid; gap: 0; }
      .bt-row { display: grid; grid-template-columns: 150px 1fr; gap: 0.75rem; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f3f3f3; }
      .bt-row:last-of-type { border-bottom: 0; }
      .bt-v { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; color: #171717; font-size: 0.92rem; }
      .bt-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.03em; }
      .bt-memo { background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 0.15rem 0.5rem; color: #9a3412; }
      .bt-amount { font-size: 1.15rem; color: #e53935; }
      .bt-copy { border: 1px solid #e5e5e5; background: #fff; border-radius: 8px; padding: 0.2rem 0.6rem; font: inherit; font-size: 0.75rem; font-weight: 700; color: #333; cursor: pointer; }
      .bt-copy:hover { border-color: #171717; }
      .bt-warn { margin: 0.75rem 0 0; color: #b45309; font-weight: 700; font-size: 0.85rem; }
      .bt-note { margin: 0; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.88rem; line-height: 1.5; }
      .bt-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
      .bt-alert { margin: 0; padding: 0.8rem 1rem; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 0.88rem; }
      .bt-alert--err { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
      .bt-badge { display: inline-block; font-size: 0.72rem; font-weight: 800; border-radius: 999px; padding: 0.2rem 0.6rem; white-space: nowrap; }
      .bt-badge--pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
      .bt-badge--credited { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
      .bt-badge--expired, .bt-badge--cancelled { background: #f5f5f5; color: #6b7280; border: 1px solid #e5e5e5; }
      .bt-hist h4 { margin: 0 0 0.5rem; font-size: 0.95rem; font-weight: 800; }
      .bt-hist ul { list-style: none; margin: 0; padding: 0; }
      .bt-hist li { display: grid; grid-template-columns: 1fr auto 150px 90px; gap: 0.75rem; align-items: center; padding: 0.65rem 0.25rem; border-bottom: 1px solid #f3f3f3; }
      .bt-hist li:last-child { border-bottom: 0; }
      .bt-hist li.active { background: #fafafa; border-radius: 10px; }
      .bt-hist-main, .bt-hist-amt { display: grid; gap: 0.1rem; }
      .bt-hist-amt { text-align: right; }
      .bt-hist li .bt-badge { justify-self: start; }
      .bt-spacer { display: block; }
      @media (max-width: 720px) {
        .bt-pay { grid-template-columns: 1fr; }
        .bt-qrwrap { justify-self: center; }
        .bt-row { grid-template-columns: 1fr; gap: 0.2rem; }
        .bt-hist li { grid-template-columns: 1fr auto; }
      }
    `,
  ],
})
export class BankTopupComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  readonly fx = inject(CurrencyService);
  private readonly base = `${environment.apiUrl}/wallet/bank-transfer`;
  /** Vietnamese preset stays at 10 USD until the buyer edits the amount. */
  private amountTouched = false;

  readonly cfg = signal<BankTopupConfig | null>(null);
  readonly dep = signal<BankDeposit | null>(null);
  readonly history = signal<BankDeposit[]>([]);
  readonly busy = signal(false);
  readonly err = signal('');
  readonly copied = signal('');
  readonly qrBroken = signal(false);
  readonly t = computed(() => (this.i18n.lang() === 'vi' ? TXT.vi : TXT.en));

  amount = 10;
  currency: 'USD' | 'VND' = 'USD';

  /** Optional VND amount shared with sibling top-up methods (e.g. GPay). */
  @Input() initialVnd = 0;
  @Output() vndChange = new EventEmitter<number>();

  /**
   * Untouched Vietnamese preset is 10 USD at the live quote, so it moves when the
   * endpoint replaces the fallback. Editing or switching currency locks it.
   */
  shownAmount(): number {
    if (!this.amountTouched && this.initialVnd <= 0 && this.currency === 'VND' && this.i18n.lang() === 'vi') {
      return Math.round(10 * this.fx.vndPerUsd());
    }
    return Number(this.amount) || 0;
  }

  setAmount(v: number): void {
    this.amountTouched = true;
    this.amount = Number(v) || 0;
    this.vndChange.emit(this.estVnd());
  }

  quick(): number[] {
    if (this.currency !== 'VND') return [5, 10, 20, 50];
    const tenUsd = Math.round(10 * this.fx.vndPerUsd());
    return [...new Set([100_000, tenUsd, 500_000, 1_000_000])];
  }

  setCurrency(c: 'USD' | 'VND'): void {
    if (c === this.currency) return;
    const current = this.shownAmount();
    const from = this.currency;
    const rate = this.fx.vndPerUsd();
    this.amountTouched = true;
    this.amount =
      c === 'VND'
        ? from === 'VND'
          ? Math.round(current)
          : Math.round((Math.round(current * 100) * rate) / 100)
        : from === 'USD'
          ? Math.round(current * 100) / 100
          : Math.round((Math.round(current) / rate) * 100) / 100;
    this.currency = c;
    this.vndChange.emit(this.estVnd());
  }

  /** Mirrors API convertAmount: no rounding to 1,000đ. USD input → VND = cents * rate. */
  estVnd(): number {
    const rate = this.fx.vndPerUsd();
    const n = this.shownAmount();
    if (this.currency === 'VND') return Math.round(n);
    return Math.round((Math.round(n * 100) * rate) / 100);
  }

  estUsd(): number {
    const rate = this.fx.vndPerUsd();
    const n = this.shownAmount();
    if (this.currency === 'USD') return Math.round(n * 100) / 100;
    return Math.round((Math.round(n) / rate) * 100) / 100;
  }

  ngOnInit(): void {
    if (this.initialVnd > 0) {
      this.currency = 'VND';
      this.amount = Math.round(this.initialVnd);
      this.amountTouched = true;
    } else if (this.i18n.lang() === 'vi') {
      this.currency = 'VND';
      this.amount = Math.round(10 * this.fx.vndPerUsd());
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

  private show(d: BankDeposit): void {
    this.qrBroken.set(false);
    this.dep.set(d);
  }

  create(): void {
    this.err.set('');
    this.busy.set(true);
    this.http.post<BankDeposit>(this.base, { amount: Number(this.amount), currency: this.currency }).subscribe({
      next: (d) => {
        this.busy.set(false);
        this.show(d);
        this.loadHistory();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e?.error?.message || this.t().err);
      },
    });
  }

  /** Reopen a pending request (GET /:id returns qrImage + payload). */
  open(id: string): void {
    this.err.set('');
    this.busy.set(true);
    this.http.get<BankDeposit>(`${this.base}/${id}`).subscribe({
      next: (d) => {
        this.busy.set(false);
        this.show(d);
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e?.error?.message || this.t().err);
      },
    });
  }

  refresh(id: string): void {
    this.open(id);
    this.loadHistory();
  }

  closeDeposit(): void {
    this.dep.set(null);
    this.loadHistory();
  }

  copy(text: string, key: string): void {
    const done = () => {
      this.copied.set(key);
      setTimeout(() => this.copied.set(''), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  }

  private fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  }
}
