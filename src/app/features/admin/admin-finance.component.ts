import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { WalletTx } from '../../models/marketplace.models';

type FinanceTab = 'deposit' | 'withdraw';
type StatusFilter = '' | 'pending' | 'completed' | 'failed' | 'cancelled';

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TPipe],
  templateUrl: './admin-finance.component.html',
  styleUrl: './admin-finance.component.scss',
})
export class AdminFinanceComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly tab = signal<FinanceTab>('withdraw');
  readonly status = signal<StatusFilter>('pending');
  readonly items = signal<WalletTx[]>([]);
  readonly pendingDeposits = signal(0);
  readonly pendingWithdraws = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly msg = signal('');
  readonly busyId = signal('');
  readonly statusFilters: StatusFilter[] = ['', 'pending', 'completed', 'failed', 'cancelled'];
  q = '';
  note = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.finance.title') });
    this.reload();
  }

  setTab(tab: FinanceTab): void {
    this.tab.set(tab);
    this.msg.set('');
    this.reload();
  }

  setStatus(status: StatusFilter): void {
    this.status.set(status);
    this.reload();
  }

  search(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .adminWalletTxs({
        type: this.tab(),
        status: this.status() || undefined,
        q: this.q.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items || []);
          this.pendingDeposits.set(res.pendingDeposits || 0);
          this.pendingWithdraws.set(res.pendingWithdraws || 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || this.i18n.t('admin.finance.err'));
          this.loading.set(false);
        },
      });
  }

  statusKey(status?: string): string {
    return `wallet.status.${status || 'completed'}`;
  }

  filterKey(status: StatusFilter): string {
    return status ? `wallet.status.${status}` : 'admin.finance.filter.all';
  }

  review(row: WalletTx, status: 'completed' | 'cancelled'): void {
    if (this.busyId()) return;
    this.busyId.set(row.id);
    this.error.set('');
    this.api.reviewWalletTx(row.id, status, this.note.trim()).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.msg.set(this.i18n.t('admin.finance.ok'));
        this.busyId.set('');
        this.note = '';
        this.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('admin.finance.err'));
        this.busyId.set('');
      },
    });
  }
}
