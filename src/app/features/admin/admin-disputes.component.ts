import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AdminDisputeListItem, AdminDisputePage } from '../../models/marketplace.models';
import { ADMIN_DISPUTE_MESSAGES } from './admin-disputes.messages';

type DisputeFilter = '' | 'open' | 'resolved';
const SIZES = [20, 50];

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, TPipe],
  templateUrl: './admin-disputes.component.html',
  styleUrl: './admin-disputes.component.scss',
})
export class AdminDisputesComponent implements OnDestroy {
  private readonly api = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly openCountChange = output<number>();
  readonly sizes = SIZES;
  readonly filters: DisputeFilter[] = ['', 'open', 'resolved'];
  readonly page = signal<AdminDisputePage | null>(null);
  readonly status = signal<DisputeFilter>('');
  readonly q = signal('');
  readonly pageNo = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);

  private debounce: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private lastKey = '';
  private sub = this.route.queryParamMap.subscribe((params) => this.fromUrl(params));

  constructor() {
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.debounce) clearTimeout(this.debounce);
  }

  filterKey(status: DisputeFilter): string {
    return 'admin.dispute.filter.' + (status || 'all');
  }

  heldLabel(row: AdminDisputeListItem): string {
    if (row.disputeStatus !== 'open' && !row.payoutHeld) return '';
    return this.i18n.t('admin.dispute.held', { amount: this.format(row.sellerNet, row.currency) });
  }

  statusLabel(status: string): string {
    const key = `admin.dispute.status.${status}`;
    const text = this.i18n.t(key);
    return text === key ? status : text;
  }

  rangeLabel(pg: AdminDisputePage): string {
    if (!pg.total) return this.i18n.t('admin.dispute.total', { total: 0 });
    const from = (pg.page - 1) * pg.limit + 1;
    const to = Math.min(pg.total, pg.page * pg.limit);
    return this.i18n.t('admin.dispute.range', { from, to, total: pg.total });
  }

  pageList(pg: AdminDisputePage): number[] {
    const n = pg.pages;
    const cur = pg.page;
    if (n <= 7) return Array.from({ length: Math.max(n, 1) }, (_, i) => i + 1);
    const out: number[] = [1];
    const lo = Math.max(2, cur - 1);
    const hi = Math.min(n - 1, cur + 1);
    if (lo > 2) out.push(0);
    for (let i = lo; i <= hi; i++) out.push(i);
    if (hi < n - 1) out.push(0);
    out.push(n);
    return out;
  }

  setStatus(status: DisputeFilter): void {
    this.navigate({ dst: status || null, dpage: null });
  }

  onSearch(value: string): void {
    this.q.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.debounce = null;
      this.navigate({ dq: value.trim() || null, dpage: null });
    }, 300);
  }

  setLimit(limit: number): void {
    this.navigate({ dlimit: limit === 20 ? null : limit, dpage: null });
  }

  go(page: number): void {
    this.navigate({ dpage: page > 1 ? page : null });
  }

  load(force = true): void {
    const params = {
      status: this.status(),
      q: this.q().trim(),
      page: this.pageNo(),
      limit: this.limit(),
    };
    const key = JSON.stringify(params);
    if (!force && key === this.lastKey && this.page()) return;
    this.lastKey = key;
    const mine = ++this.seq;
    this.loading.set(true);
    this.error.set(false);
    this.api.adminDisputes(params).subscribe({
      next: (pg) => {
        if (mine !== this.seq) return;
        this.page.set(pg);
        this.openCountChange.emit(pg.openCount);
        this.loading.set(false);
      },
      error: () => {
        if (mine !== this.seq) return;
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private format(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }

  private navigate(params: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private fromUrl(q: ParamMap): void {
    if (q.get('tab') && q.get('tab') !== 'disputes') return;
    const status = q.get('dst');
    this.status.set(status === 'open' || status === 'resolved' ? status : '');
    const query = q.get('dq') || '';
    if (this.debounce === null && query !== this.q().trim()) this.q.set(query);
    const page = Number.parseInt(q.get('dpage') || '', 10);
    this.pageNo.set(Number.isFinite(page) && page > 0 ? page : 1);
    const limit = Number.parseInt(q.get('dlimit') || '', 10);
    this.limit.set(SIZES.includes(limit) ? limit : 20);
    this.load(false);
  }
}
