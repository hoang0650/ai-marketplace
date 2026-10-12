import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { AdminDailyPoint, AdminGranularity, AdminOverview } from '../../models/marketplace.models';
import { DashboardService } from '../../services/api.services';

type RevenueKey = 'gross' | 'sellerNet' | 'platformFee';
type BarKey = 'orders' | 'deposits' | 'users';

const W = 640;
const H = 220;
const PAD = { l: 48, r: 12, t: 14, b: 26 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;
const R = 70;
const CIRC = 2 * Math.PI * R;

/** Round up to 1/2/2.5/5 × 10^n so axis ticks stay readable. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= v) || 10;
  return step * exp;
}

function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${+(v / 1_000).toFixed(1)}k`;
  return `${+v.toFixed(v < 10 && v % 1 ? 1 : 0)}`;
}

/** Overview charts for the admin dashboard — plain SVG, no chart library. */
@Component({
  selector: 'app-admin-overview-charts',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    @if (overview().series?.length) {
      <div class="period-bar mt-6">
        <span class="text-sm text-muted">Phân theo</span>
        <div class="chart-switch" role="tablist">
          @for (g of granularities; track g.key) {
            <button type="button" role="tab" [class.active]="granularity() === g.key" (click)="setGranularity(g.key)">{{ g.label }}</button>
          }
        </div>
        @if (loading()) {
          <span class="text-xs text-muted">Đang tải…</span>
        }
        @if (error()) {
          <span class="text-xs" style="color:#b91c1c">{{ error() }}</span>
        }
      </div>
      <div class="mt-4 grid gap-4 xl:grid-cols-3">
        <div class="panel xl:col-span-2">
          <div class="chart-head">
            <div>
              <h2 class="font-display text-xl">Doanh thu {{ gMeta().range }}</h2>
              <p class="text-xs text-muted">Đơn đã thanh toán theo {{ gMeta().unit }} (giờ Việt Nam)</p>
            </div>
            <div class="chart-legend">
              @for (l of revenueLines; track l.key) {
                <span><i [style.background]="l.color"></i>{{ l.label }} · {{ totals()[l.key] | currency: cur() : 'symbol-narrow' : '1.0-2' }}</span>
              }
            </div>
          </div>
          <div class="chart-box">
            <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="'Doanh thu ' + gMeta().range" (mouseleave)="hover.set(null)">
              @for (t of ticks(revMax()); track $index) {
                <line class="grid" [attr.x1]="PAD.l" [attr.x2]="W - PAD.r" [attr.y1]="y(t, revMax())" [attr.y2]="y(t, revMax())" />
                <text class="axis" [attr.x]="PAD.l - 6" [attr.y]="y(t, revMax()) + 3" text-anchor="end">{{ compact(t) }}</text>
              }
              @for (i of xLabelIdx(); track i) {
                <text class="axis" [attr.x]="x(i)" [attr.y]="H - 8" text-anchor="middle">{{ periodLabel(series()[i].date) }}</text>
              }
              <path class="area" [attr.d]="areaPath('gross')" />
              @for (l of revenueLines; track l.key) {
                <path class="line" [attr.d]="linePath(l.key)" [attr.stroke]="l.color" />
              }
              @if (hover() !== null) {
                <line class="guide" [attr.x1]="x(hover()!)" [attr.x2]="x(hover()!)" [attr.y1]="PAD.t" [attr.y2]="H - PAD.b" />
                @for (l of revenueLines; track l.key) {
                  <circle [attr.cx]="x(hover()!)" [attr.cy]="y(series()[hover()!][l.key], revMax())" r="3.5" [attr.fill]="l.color" />
                }
              }
              @for (p of series(); track p.date; let i = $index) {
                <rect class="hit" [attr.x]="x(i) - colW() / 2" [attr.y]="PAD.t" [attr.width]="colW()" [attr.height]="PLOT_H" (mouseenter)="hover.set(i)" />
              }
            </svg>
            @if (hoverPoint(); as p) {
              <div class="chart-tip" [style.left.%]="(x(hover()!) / W) * 100">
                <strong>{{ periodLabel(p.date, true) }}</strong>
                @for (l of revenueLines; track l.key) {
                  <span><i [style.background]="l.color"></i>{{ l.label }}: {{ p[l.key] | currency: cur() : 'symbol-narrow' : '1.0-2' }}</span>
                }
                <span>Đơn: {{ p.orders | number }}</span>
              </div>
            }
          </div>
        </div>

        <div class="panel">
          <h2 class="font-display text-xl">Cơ cấu GMV</h2>
          <p class="text-xs text-muted">Toàn thời gian · {{ overview().totalGrossRevenue | currency: cur() : 'symbol-narrow' : '1.0-2' }}</p>
          <div class="donut-wrap">
            <svg viewBox="0 0 200 200" role="img" aria-label="Cơ cấu GMV">
              <circle cx="100" cy="100" [attr.r]="R" class="donut-bg" />
              @for (s of donut(); track s.label) {
                <circle
                  cx="100"
                  cy="100"
                  [attr.r]="R"
                  class="donut-seg"
                  [attr.stroke]="s.color"
                  [attr.stroke-dasharray]="s.len + ' ' + (CIRC - s.len)"
                  [attr.stroke-dashoffset]="-s.offset"
                />
              }
              <text x="100" y="96" text-anchor="middle" class="donut-num">{{ feeShare() | number: '1.0-1' }}%</text>
              <text x="100" y="114" text-anchor="middle" class="axis">phí sàn / GMV</text>
            </svg>
          </div>
          <ul class="donut-legend">
            @for (s of donut(); track s.label) {
              <li>
                <span><i [style.background]="s.color"></i>{{ s.label }}</span>
                <span>{{ s.value | currency: cur() : 'symbol-narrow' : '1.0-2' }} · {{ s.pct | number: '1.0-1' }}%</span>
              </li>
            }
          </ul>
        </div>

        <div class="panel xl:col-span-3">
          <div class="chart-head">
            <div>
              <h2 class="font-display text-xl">Hoạt động {{ gMeta().range }}</h2>
              <p class="text-xs text-muted">
                Tổng: {{ barTotalLabel() }}
              </p>
            </div>
            <div class="chart-switch" role="tablist">
              @for (b of barMetrics; track b.key) {
                <button type="button" role="tab" [class.active]="bar() === b.key" (click)="bar.set(b.key)">{{ b.label }}</button>
              }
            </div>
          </div>
          <div class="chart-box">
            <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="barMeta().label">
              @for (t of ticks(barMax()); track $index) {
                <line class="grid" [attr.x1]="PAD.l" [attr.x2]="W - PAD.r" [attr.y1]="y(t, barMax())" [attr.y2]="y(t, barMax())" />
                <text class="axis" [attr.x]="PAD.l - 6" [attr.y]="y(t, barMax()) + 3" text-anchor="end">{{ compact(t) }}</text>
              }
              @for (i of xLabelIdx(); track i) {
                <text class="axis" [attr.x]="x(i)" [attr.y]="H - 8" text-anchor="middle">{{ periodLabel(series()[i].date) }}</text>
              }
              @for (p of series(); track p.date; let i = $index) {
                <rect
                  class="bar"
                  [attr.fill]="barMeta().color"
                  [attr.x]="x(i) - barW() / 2"
                  [attr.y]="y(p[bar()], barMax())"
                  [attr.width]="barW()"
                  [attr.height]="H - PAD.b - y(p[bar()], barMax())"
                >
                  <title>{{ periodLabel(p.date, true) }}: {{ barValue(p) }}</title>
                </rect>
              }
            </svg>
          </div>
        </div>

        <div class="panel xl:col-span-3">
          <h2 class="font-display text-xl">Doanh thu theo {{ gMeta().unit }}</h2>
          <p class="text-xs text-muted">Mới nhất ở trên · % so với {{ gMeta().unit }} trước</p>
          <div class="period-table mt-3">
            <table class="w-full min-w-[760px] text-left text-sm">
              <thead class="text-xs uppercase tracking-wider text-muted">
                <tr class="border-b border-line">
                  <th class="py-2 pr-3 font-medium">Kỳ</th>
                  <th class="py-2 pr-3 font-medium">Đơn</th>
                  <th class="py-2 pr-3 font-medium">GMV</th>
                  <th class="py-2 pr-3 font-medium">Phí sàn</th>
                  <th class="py-2 pr-3 font-medium">Seller payable</th>
                  <th class="py-2 pr-3 font-medium">Buyer nạp tiền</th>
                  <th class="py-2 font-medium">Người dùng mới</th>
                </tr>
              </thead>
              <tbody>
                @for (r of tableRows(); track r.p.date) {
                  <tr class="border-b border-line">
                    <td class="py-2 pr-3 font-medium">{{ periodLabel(r.p.date, true) }}</td>
                    <td class="py-2 pr-3">{{ r.p.orders | number }}</td>
                    <td class="py-2 pr-3">
                      {{ r.p.gross | currency: cur() : 'symbol-narrow' : '1.0-2' }}
                      @if (r.change !== null) {
                        <span class="delta" [class.up]="r.change > 0" [class.down]="r.change < 0">
                          {{ r.change > 0 ? '+' : '' }}{{ r.change | number: '1.0-0' }}%
                        </span>
                      }
                    </td>
                    <td class="py-2 pr-3">{{ r.p.platformFee | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                    <td class="py-2 pr-3">{{ r.p.sellerNet | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                    <td class="py-2 pr-3">{{ r.p.deposits | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                    <td class="py-2">{{ r.p.users | number }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="font-semibold">
                  <td class="py-2 pr-3">Tổng {{ gMeta().range }}</td>
                  <td class="py-2 pr-3">{{ totals().orders | number }}</td>
                  <td class="py-2 pr-3">{{ totals().gross | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                  <td class="py-2 pr-3">{{ totals().platformFee | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                  <td class="py-2 pr-3">{{ totals().sellerNet | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                  <td class="py-2 pr-3">{{ totals().deposits | currency: cur() : 'symbol-narrow' : '1.0-2' }}</td>
                  <td class="py-2">{{ totals().users | number }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .period-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
      .period-table { max-height: 26rem; overflow: auto; }
      .period-table tfoot td { border-top: 2px solid var(--color-line); }
      .delta { margin-left: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--color-muted); }
      .delta.up { color: #15803d; }
      .delta.down { color: #b91c1c; }
      .chart-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
      .chart-legend { display: flex; flex-wrap: wrap; gap: 0.35rem 0.9rem; font-size: 0.75rem; color: var(--color-muted); }
      .chart-legend i, .chart-tip i, .donut-legend i {
        display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 3px; margin-right: 0.35rem; vertical-align: middle;
      }
      .chart-box { position: relative; margin-top: 0.75rem; }
      .chart-box svg { display: block; width: 100%; height: auto; }
      .grid { stroke: var(--color-line); stroke-width: 1; }
      .axis { fill: var(--color-muted); font-size: 10px; }
      .area { fill: rgba(17, 24, 39, 0.06); }
      .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
      .guide { stroke: var(--color-muted); stroke-dasharray: 3 3; }
      .hit { fill: transparent; }
      .bar { opacity: 0.85; }
      .bar:hover { opacity: 1; }
      .chart-tip {
        position: absolute; top: 0; transform: translateX(-50%); pointer-events: none;
        display: grid; gap: 0.15rem; min-width: 9.5rem; padding: 0.5rem 0.65rem;
        border: 1px solid var(--color-line); border-radius: 10px; background: var(--color-surface);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08); font-size: 0.75rem; white-space: nowrap;
      }
      .chart-switch { display: flex; flex-wrap: wrap; gap: 0.35rem; }
      .chart-switch button {
        border: 1px solid var(--color-line); background: var(--color-surface); border-radius: 999px;
        padding: 0.25rem 0.75rem; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer;
      }
      .chart-switch button.active { background: var(--color-ink); border-color: var(--color-ink); color: #fff; }
      .donut-wrap { display: grid; place-items: center; margin: 0.75rem 0; }
      .donut-wrap svg { width: 100%; max-width: 13rem; height: auto; }
      .donut-bg { fill: none; stroke: var(--color-line); stroke-width: 22; }
      .donut-seg { fill: none; stroke-width: 22; transform: rotate(-90deg); transform-origin: 100px 100px; }
      .donut-num { font-size: 22px; font-weight: 800; fill: currentColor; }
      .donut-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; font-size: 0.8rem; }
      .donut-legend li { display: flex; justify-content: space-between; gap: 0.75rem; }
      .donut-legend li span:last-child { color: var(--color-muted); white-space: nowrap; }
    `,
  ],
})
export class AdminOverviewChartsComponent {
  private readonly api = inject(DashboardService);
  readonly overview = input.required<AdminOverview>();

  readonly W = W;
  readonly H = H;
  readonly PAD = PAD;
  readonly PLOT_H = PLOT_H;
  readonly R = R;
  readonly CIRC = CIRC;
  readonly compact = compact;

  readonly revenueLines: { key: RevenueKey; label: string; color: string }[] = [
    { key: 'gross', label: 'GMV', color: '#111827' },
    { key: 'sellerNet', label: 'Seller payable', color: '#0f766e' },
    { key: 'platformFee', label: 'Phí sàn', color: '#c08a2c' },
  ];
  readonly barMetrics: { key: BarKey; label: string; color: string; money: boolean }[] = [
    { key: 'orders', label: 'Đơn đã thanh toán', color: '#3730a3', money: false },
    { key: 'deposits', label: 'Buyer nạp tiền', color: '#0f766e', money: true },
    { key: 'users', label: 'Người dùng mới', color: '#c08a2c', money: false },
  ];

  readonly granularities: { key: AdminGranularity; label: string; range: string; unit: string }[] = [
    { key: 'day', label: 'Ngày', range: '30 ngày', unit: 'ngày' },
    { key: 'week', label: 'Tuần', range: '12 tuần', unit: 'tuần' },
    { key: 'month', label: 'Tháng', range: '12 tháng', unit: 'tháng' },
  ];

  readonly hover = signal<number | null>(null);
  readonly bar = signal<BarKey>('orders');
  readonly granularity = signal<AdminGranularity>('day');
  readonly loading = signal(false);
  readonly error = signal('');
  /** Week / month buckets fetched on demand; days come with the overview. */
  private readonly fetched = signal<Partial<Record<AdminGranularity, AdminDailyPoint[]>>>({});

  readonly gMeta = computed(() => this.granularities.find((g) => g.key === this.granularity())!);
  readonly series = computed<AdminDailyPoint[]>(() => {
    const g = this.granularity();
    return g === 'day' ? this.overview().series || [] : this.fetched()[g] || [];
  });
  readonly tableRows = computed(() =>
    this.series()
      .map((p, i, all) => {
        const prev = i > 0 ? all[i - 1].gross : null;
        return { p, change: prev ? ((p.gross - prev) / prev) * 100 : null };
      })
      .reverse(),
  );
  readonly cur = computed(() => this.overview().currency || 'USD');
  readonly hoverPoint = computed(() => {
    const i = this.hover();
    return i === null ? null : this.series()[i] || null;
  });

  readonly totals = computed(() => {
    const t = { gross: 0, sellerNet: 0, platformFee: 0, orders: 0, deposits: 0, users: 0 };
    for (const p of this.series()) {
      t.gross += p.gross;
      t.sellerNet += p.sellerNet;
      t.platformFee += p.platformFee;
      t.orders += p.orders;
      t.deposits += p.deposits;
      t.users += p.users;
    }
    return t;
  });

  readonly revMax = computed(() => niceMax(Math.max(0, ...this.series().map((p) => Math.max(p.gross, p.sellerNet, p.platformFee)))));
  readonly barMeta = computed(() => this.barMetrics.find((b) => b.key === this.bar())!);
  readonly barMax = computed(() => niceMax(Math.max(0, ...this.series().map((p) => p[this.bar()]))));
  readonly colW = computed(() => PLOT_W / Math.max(1, this.series().length));
  readonly barW = computed(() => Math.max(2, this.colW() * 0.65));
  readonly xLabelIdx = computed(() => {
    const n = this.series().length;
    const step = Math.max(1, Math.ceil(n / 6));
    const idx: number[] = [];
    for (let i = n - 1; i >= 0; i -= step) idx.unshift(i);
    return idx;
  });

  readonly donut = computed(() => {
    const o = this.overview();
    const gross = Math.max(0, o.totalGrossRevenue || 0);
    const parts = [
      { label: 'Phí sàn', value: o.platformFee || 0, color: '#c08a2c' },
      { label: 'Seller payable', value: o.sellerNet || 0, color: '#0f766e' },
    ];
    const used = parts.reduce((s, p) => s + p.value, 0);
    parts.push({ label: 'Còn lại (thuế, điều chỉnh…)', value: Math.max(0, gross - used), color: '#9ca3af' });
    const base = Math.max(gross, used) || 1;
    let offset = 0;
    return parts
      .filter((p) => p.value > 0)
      .map((p) => {
        const len = (p.value / base) * CIRC;
        const seg = { ...p, pct: (p.value / base) * 100, len, offset };
        offset += len;
        return seg;
      });
  });
  readonly feeShare = computed(() => {
    const o = this.overview();
    return o.totalGrossRevenue ? ((o.platformFee || 0) / o.totalGrossRevenue) * 100 : 0;
  });

  setGranularity(g: AdminGranularity): void {
    this.granularity.set(g);
    this.hover.set(null);
    this.error.set('');
    if (g === 'day' || this.fetched()[g]) return;
    this.loading.set(true);
    this.api.adminRevenueSeries(g).subscribe({
      next: (res) => {
        this.fetched.update((m) => ({ ...m, [g]: res.series || [] }));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Không tải được dữ liệu.');
        this.loading.set(false);
      },
    });
  }

  x(i: number): number {
    return PAD.l + this.colW() * (i + 0.5);
  }

  y(v: number, max: number): number {
    return PAD.t + PLOT_H * (1 - Math.min(v, max) / max);
  }

  ticks(max: number): number[] {
    return [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  }

  linePath(key: RevenueKey): string {
    const max = this.revMax();
    return this.series()
      .map((p, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)} ${this.y(p[key], max).toFixed(1)}`)
      .join(' ');
  }

  areaPath(key: RevenueKey): string {
    const n = this.series().length;
    if (!n) return '';
    const base = (H - PAD.b).toFixed(1);
    return `${this.linePath(key)} L${this.x(n - 1).toFixed(1)} ${base} L${this.x(0).toFixed(1)} ${base} Z`;
  }

  /** Axis (short) or tooltip/table (long) label for a bucket starting on `date`. */
  periodLabel(date: string, long = false): string {
    const [y, m, d] = date.split('-');
    const g = this.granularity();
    if (g === 'month') return long ? `Tháng ${m}/${y}` : `${m}/${y.slice(2)}`;
    if (g === 'week' && long) {
      const end = new Date(`${date}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      const [, em, ed] = end.toISOString().slice(0, 10).split('-');
      return `Tuần ${d}/${m} – ${ed}/${em}/${end.getUTCFullYear()}`;
    }
    return long ? `${d}/${m}/${y}` : `${d}/${m}`;
  }

  barValue(p: AdminDailyPoint): string {
    const v = p[this.bar()];
    return this.barMeta().money ? `${compact(v)} ${this.cur()}` : String(v);
  }

  barTotalLabel(): string {
    const t = this.totals()[this.bar()];
    const meta = this.barMeta();
    return meta.money ? `${t.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${this.cur()}` : t.toLocaleString('en-US');
  }
}
