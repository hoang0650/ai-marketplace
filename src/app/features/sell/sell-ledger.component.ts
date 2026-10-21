import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';

export type LedgerType =
  | 'order_revenue'
  | 'usage_revenue'
  | 'platform_fee'
  | 'tax_withheld'
  | 'affiliate_commission'
  | 'refund'
  | 'withdrawal'
  | 'adjustment';

export interface LedgerEntry {
  date: string;
  type: LedgerType;
  orderId: string;
  orderRef: string;
  product?: string;
  currency: string;
  gross: number;
  fee: number;
  tax: number;
  net: number;
  rate: number | null;
  status: string;
  balance: number;
  counted: boolean;
  note?: string;
  calls?: number;
  holdUntil?: string;
}

export interface LedgerSummary {
  currency: string;
  grossRevenue: number;
  platformFees: number;
  taxWithheld: number;
  affiliatePaid: number;
  refunds: number;
  adjustments: number;
  netEarnings: number;
  onHold: number;
  withdrawn: number;
  withdrawPending: number;
  ledgerBalance: number;
  available: number | null;
}

export interface LedgerResponse {
  summary: LedgerSummary;
  types: LedgerType[];
  holdHours: number;
  total: number;
  entries: LedgerEntry[];
}

const L: Record<string, Record<string, string>> = {
  vi: {
    crumb: 'Tài chính / Sổ cái',
    title: 'Sổ cái người bán',
    intro: 'Mọi số liệu lấy từ bản chụp đối soát lưu tại thời điểm giao kết đơn hàng (phí sàn, thuế khấu trừ theo loại người bán, hoa hồng affiliate). Doanh thu được tạm giữ {{h}} giờ trước khi khả dụng.',
    from: 'Từ ngày', to: 'Đến ngày', type: 'Loại', all: 'Tất cả', apply: 'Lọc', reset: 'Xóa lọc', csv: 'Xuất CSV',
    grossRevenue: 'Doanh thu gộp', platformFees: 'Phí sàn', taxWithheld: 'Thuế đã khấu trừ', affiliatePaid: 'Hoa hồng affiliate',
    netEarnings: 'Thực nhận (ròng)', available: 'Khả dụng', onHold: 'Đang tạm giữ', withdrawn: 'Đã rút',
    refunds: 'Hoàn tiền / thu hồi', pending: 'đang xử lý',
    date: 'Ngày', ref: 'Mã đơn', gross: 'Gộp', fee: 'Phí', tax: 'Thuế', net: 'Ròng', status: 'Trạng thái', balance: 'Số dư',
    empty: 'Chưa có bút toán nào trong khoảng đã chọn.', loading: 'Đang tải sổ cái…', error: 'Không tải được sổ cái.',
    order_revenue: 'Doanh thu đơn hàng', usage_revenue: 'Doanh thu theo lượt dùng', platform_fee: 'Phí sàn', tax_withheld: 'Thuế khấu trừ',
    affiliate_commission: 'Hoa hồng affiliate', refund: 'Hoàn tiền / thu hồi', withdrawal: 'Rút tiền', adjustment: 'Điều chỉnh',
    s_holding: 'Tạm giữ', s_available: 'Khả dụng', s_paid: 'Đã chi trả', s_processing: 'Đang xử lý', s_settled: 'Đã ghi sổ',
    s_refunded: 'Đã hoàn', s_failed: 'Thất bại', s_cancelled: 'Đã hủy', calls: 'lượt', back: 'Về tổng quan', rows: 'bút toán',
  },
  en: {
    crumb: 'Finance / Ledger',
    title: 'Seller ledger',
    intro: 'Every figure comes from the settlement snapshot stored when the order was placed (platform fee, tax withheld by seller type, affiliate commission). Revenue is held {{h}} hours before it becomes available.',
    from: 'From', to: 'To', type: 'Type', all: 'All', apply: 'Filter', reset: 'Reset', csv: 'Export CSV',
    grossRevenue: 'Gross revenue', platformFees: 'Platform fees', taxWithheld: 'Tax withheld', affiliatePaid: 'Affiliate commission',
    netEarnings: 'Net earnings', available: 'Available', onHold: 'On hold', withdrawn: 'Withdrawn',
    refunds: 'Refunds / clawbacks', pending: 'processing',
    date: 'Date', ref: 'Order ref', gross: 'Gross', fee: 'Fee', tax: 'Tax', net: 'Net', status: 'Status', balance: 'Balance',
    empty: 'No entries in the selected range.', loading: 'Loading ledger…', error: 'Could not load the ledger.',
    order_revenue: 'Order revenue', usage_revenue: 'Usage revenue', platform_fee: 'Platform fee', tax_withheld: 'Tax withheld',
    affiliate_commission: 'Affiliate commission', refund: 'Refund / clawback', withdrawal: 'Withdrawal', adjustment: 'Adjustment',
    s_holding: 'On hold', s_available: 'Available', s_paid: 'Paid', s_processing: 'Processing', s_settled: 'Posted',
    s_refunded: 'Refunded', s_failed: 'Failed', s_cancelled: 'Cancelled', calls: 'calls', back: 'Back to overview', rows: 'entries',
  },
};

@Component({
  selector: 'app-sell-ledger',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <section class="lg">
      <p class="lg-crumb">{{ l('crumb') }}</p>
      <div class="lg-head">
        <h1>{{ l('title') }}</h1>
        <button type="button" class="lg-btn lg-btn--ghost" (click)="exportCsv()" [disabled]="!entries().length">{{ l('csv') }}</button>
      </div>
      <p class="lg-intro">{{ intro() }}</p>

      @if (summary(); as s) {
        <div class="lg-cards">
          <div class="lg-card"><span>{{ l('grossRevenue') }}</span><strong>{{ s.grossRevenue | currency: 'USD' }}</strong></div>
          <div class="lg-card"><span>{{ l('platformFees') }}</span><strong class="neg">-{{ s.platformFees | currency: 'USD' }}</strong></div>
          <div class="lg-card"><span>{{ l('taxWithheld') }}</span><strong class="neg">-{{ s.taxWithheld | currency: 'USD' }}</strong></div>
          <div class="lg-card"><span>{{ l('affiliatePaid') }}</span><strong class="neg">-{{ s.affiliatePaid | currency: 'USD' }}</strong></div>
          <div class="lg-card lg-card--net">
            <span>{{ l('netEarnings') }}</span><strong>{{ s.netEarnings | currency: 'USD' }}</strong>
            @if (s.refunds > 0) { <small>{{ l('refunds') }}: -{{ s.refunds | currency: 'USD' }}</small> }
          </div>
          <div class="lg-card lg-card--ok"><span>{{ l('available') }}</span><strong>{{ (s.available ?? 0) | currency: 'USD' }}</strong></div>
          <div class="lg-card lg-card--hold"><span>{{ l('onHold') }}</span><strong>{{ s.onHold | currency: 'USD' }}</strong></div>
          <div class="lg-card">
            <span>{{ l('withdrawn') }}</span><strong>{{ s.withdrawn | currency: 'USD' }}</strong>
            @if (s.withdrawPending > 0) { <small>+{{ s.withdrawPending | currency: 'USD' }} {{ l('pending') }}</small> }
          </div>
        </div>
      }

      <form class="lg-filters" (ngSubmit)="load()">
        <label><span>{{ l('from') }}</span><input type="date" [(ngModel)]="from" name="from" /></label>
        <label><span>{{ l('to') }}</span><input type="date" [(ngModel)]="to" name="to" /></label>
        <label>
          <span>{{ l('type') }}</span>
          <select [(ngModel)]="type" name="type">
            <option value="">{{ l('all') }}</option>
            @for (t of types; track t) { <option [value]="t">{{ l(t) }}</option> }
          </select>
        </label>
        <div class="lg-filter-actions">
          <button type="submit" class="lg-btn">{{ l('apply') }}</button>
          <button type="button" class="lg-btn lg-btn--ghost" (click)="reset()">{{ l('reset') }}</button>
        </div>
      </form>

      <div class="lg-table-wrap">
        @if (loading()) {
          <p class="lg-muted">{{ l('loading') }}</p>
        } @else if (error()) {
          <p class="lg-err">{{ l('error') }}</p>
        } @else if (!entries().length) {
          <p class="lg-muted">{{ l('empty') }}</p>
        } @else {
          <table class="lg-table">
            <thead>
              <tr>
                <th>{{ l('date') }}</th><th>{{ l('type') }}</th><th>{{ l('ref') }}</th>
                <th class="num">{{ l('gross') }}</th><th class="num">{{ l('fee') }}</th><th class="num">{{ l('tax') }}</th>
                <th class="num">{{ l('net') }}</th><th>{{ l('status') }}</th><th class="num">{{ l('balance') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entries(); track $index) {
                <tr [class.muted]="!e.counted">
                  <td class="nowrap">{{ e.date | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <span class="lg-type" [attr.data-t]="e.type">{{ l(e.type) }}</span>
                    @if (e.rate !== null && e.rate !== undefined) { <span class="lg-rate">{{ e.rate * 100 | number: '1.0-2' }}%</span> }
                    @if (e.product) { <div class="lg-sub">{{ e.product }}@if (e.calls) { · {{ e.calls }} {{ l('calls') }} }</div> }
                  </td>
                  <td class="mono">{{ e.orderRef || '—' }}</td>
                  <td class="num">{{ e.gross ? (e.gross | currency: 'USD') : '' }}</td>
                  <td class="num">{{ e.fee ? (e.fee | currency: 'USD') : '' }}</td>
                  <td class="num">{{ e.tax ? (e.tax | currency: 'USD') : '' }}</td>
                  <td class="num" [class.pos]="e.net > 0" [class.neg]="e.net < 0">{{ e.net > 0 ? '+' : '' }}{{ e.net | currency: 'USD' }}</td>
                  <td><span class="lg-badge" [attr.data-s]="e.status">{{ l('s_' + e.status) }}</span></td>
                  <td class="num strong">{{ e.balance | currency: 'USD' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p class="lg-muted lg-count">{{ total() }} {{ l('rows') }}</p>
        }
      </div>
      <a routerLink="/sell" class="lg-link">← {{ l('back') }}</a>
    </section>
  `,
  styles: `
    :host { display: block; }
    .lg { color: #141414; }
    .lg-crumb { margin: 0; color: #888; font-size: .8rem; }
    .lg-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .lg-head h1 { margin: .3rem 0 .4rem; font-size: 1.45rem; font-weight: 800; }
    .lg-intro { margin: 0 0 1.1rem; color: #666; font-size: .85rem; max-width: 820px; line-height: 1.5; }
    .lg-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; margin-bottom: 1.1rem; }
    .lg-card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: .85rem 1rem; display: grid; gap: .25rem; }
    .lg-card span { color: #777; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .lg-card strong { font-size: 1.2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .lg-card small { color: #888; font-size: .75rem; }
    .lg-card--net { background: #111; border-color: #111; }
    .lg-card--net span, .lg-card--net small { color: #bbb; }
    .lg-card--net strong { color: #fff; }
    .lg-card--ok strong { color: #15803d; }
    .lg-card--hold strong { color: #b45309; }
    .neg { color: #b42318; }
    .pos { color: #15803d; }
    .lg-filters { display: flex; flex-wrap: wrap; gap: .75rem; align-items: flex-end; background: #f7f7f5; border: 1px solid #ececec; border-radius: 14px; padding: .85rem 1rem; margin-bottom: 1rem; }
    .lg-filters label { display: grid; gap: .3rem; font-size: .75rem; font-weight: 700; color: #555; }
    .lg-filters input, .lg-filters select { border: 1px solid #e0e0e0; border-radius: 10px; padding: .5rem .65rem; font: inherit; font-size: .85rem; background: #fff; color: #141414; min-width: 150px; }
    .lg-filter-actions { display: flex; gap: .5rem; }
    .lg-btn { min-height: 2.3rem; border: 1px solid #111; border-radius: 10px; background: #111; color: #fff; font: inherit; font-size: .85rem; font-weight: 800; cursor: pointer; padding: 0 1rem; }
    .lg-btn--ghost { background: #fff; color: #111; border-color: #d9d9d9; }
    .lg-btn:disabled { opacity: .45; cursor: not-allowed; }
    .lg-table-wrap { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: .25rem; overflow-x: auto; }
    .lg-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .lg-table th { text-align: left; color: #777; font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; padding: .65rem .7rem; border-bottom: 1px solid #ececec; white-space: nowrap; }
    .lg-table td { padding: .6rem .7rem; border-bottom: 1px solid #f3f3f3; vertical-align: top; }
    .lg-table tr:last-child td { border-bottom: 0; }
    .lg-table tr.muted td { opacity: .5; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .strong { font-weight: 800; }
    .nowrap { white-space: nowrap; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .78rem; }
    .lg-type { font-weight: 700; }
    .lg-rate { margin-left: .35rem; font-size: .7rem; font-weight: 700; color: #555; background: #f1f1f1; border-radius: 999px; padding: .05rem .4rem; }
    .lg-sub { color: #888; font-size: .75rem; margin-top: .15rem; }
    .lg-badge { display: inline-block; font-size: .72rem; font-weight: 800; border-radius: 999px; padding: .15rem .55rem; border: 1px solid #e5e5e5; color: #555; background: #fafafa; white-space: nowrap; }
    .lg-badge[data-s='holding'] { color: #b45309; background: #fff7e6; border-color: #f5d79a; }
    .lg-badge[data-s='available'] { color: #15803d; background: #ecfdf3; border-color: #b7e4c7; }
    .lg-badge[data-s='paid'] { color: #1d4ed8; background: #eff4ff; border-color: #c7d7fe; }
    .lg-badge[data-s='processing'] { color: #6b21a8; background: #f6f0ff; border-color: #dcc8f7; }
    .lg-badge[data-s='failed'], .lg-badge[data-s='cancelled'], .lg-badge[data-s='refunded'] { color: #b42318; background: #fff3f3; border-color: #f3c6c6; }
    .lg-muted { color: #888; padding: 1rem; margin: 0; font-size: .85rem; }
    .lg-count { padding: .5rem .7rem; font-size: .75rem; }
    .lg-err { color: #b42318; padding: 1rem; margin: 0; }
    .lg-link { display: inline-block; margin-top: 1rem; color: #e53935; font-weight: 700; text-decoration: none; font-size: .85rem; }
    @media (max-width: 900px) { .lg-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class SellLedgerComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);

  readonly types: LedgerType[] = ['order_revenue', 'usage_revenue', 'platform_fee', 'tax_withheld', 'affiliate_commission', 'refund', 'withdrawal', 'adjustment'];
  readonly summary = signal<LedgerSummary | null>(null);
  readonly entries = signal<LedgerEntry[]>([]);
  readonly total = signal(0);
  readonly holdHours = signal(48);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly intro = computed(() => this.l('intro').replace('{{h}}', String(this.holdHours())));
  from = '';
  to = '';
  type = '';

  l(key: string): string {
    const lang = this.i18n.lang();
    return (L[lang] || L['en'])[key] ?? L['en'][key] ?? key;
  }

  ngOnInit(): void {
    this.seo.set({ title: this.l('title') });
    this.load();
  }

  load(): void {
    let params = new HttpParams();
    if (this.from) params = params.set('from', this.from);
    if (this.to) params = params.set('to', this.to);
    if (this.type) params = params.set('type', this.type);
    this.loading.set(true);
    this.error.set(false);
    this.http.get<LedgerResponse>(`${environment.apiUrl}/wallet/seller-ledger`, { params }).subscribe({
      next: (res) => {
        this.summary.set(res.summary);
        this.entries.set(res.entries || []);
        this.total.set(res.total ?? res.entries?.length ?? 0);
        if (res.holdHours) this.holdHours.set(res.holdHours);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.from = '';
    this.to = '';
    this.type = '';
    this.load();
  }

  exportCsv(): void {
    const head = ['date', 'type', 'order_ref', 'order_id', 'product', 'gross', 'fee', 'tax', 'net', 'rate', 'status', 'balance', 'currency', 'counted'];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [head.join(',')].concat(
      this.entries().map((e) =>
        [e.date, e.type, e.orderRef, e.orderId, e.product || '', e.gross, e.fee, e.tax, e.net, e.rate ?? '', e.status, e.balance, e.currency, e.counted]
          .map(esc)
          .join(','),
      ),
    );
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seller-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
