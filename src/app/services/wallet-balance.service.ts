import { Injectable, inject, signal } from '@angular/core';
import { DashboardService } from './api.services';

/**
 * One source of truth for the wallet number shown across the site: the server's
 * `/wallet/summary.available` (completed credits − debits − 48h seller holds).
 * Summing `/wallet` client-side counted cancelled/failed deposits and ignored holds,
 * which is why /wallet and the product page disagreed.
 */
@Injectable({ providedIn: 'root' })
export class WalletBalanceService {
  private readonly api = inject(DashboardService);
  readonly available = signal(0);
  readonly balance = signal(0);
  readonly held = signal(0);
  readonly currency = signal('USD');
  readonly loaded = signal(false);

  refresh(): void {
    this.api.walletSummary().subscribe({
      next: (s) => this.apply(s),
      error: () => undefined,
    });
  }

  /** Server responses (checkout) can carry fresh numbers; avoid a round trip. */
  apply(s: { balance?: number; available?: number; held?: number; currency?: string }): void {
    if (typeof s.balance === 'number') this.balance.set(s.balance);
    if (typeof s.available === 'number') this.available.set(s.available);
    else if (typeof s.balance === 'number') this.available.set(Math.max(0, s.balance - this.held()));
    if (typeof s.held === 'number') this.held.set(s.held);
    if (s.currency) this.currency.set(s.currency);
    this.loaded.set(true);
  }

  reset(): void {
    this.available.set(0);
    this.balance.set(0);
    this.held.set(0);
    this.loaded.set(false);
  }
}
