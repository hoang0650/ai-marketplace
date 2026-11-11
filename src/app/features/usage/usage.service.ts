import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { UsageUnitCatalog } from './usage-contract';
import type { VndQuote } from './billing-display';

export interface UsageAccessPurchase {
  orderId: string;
  amount: number;
  currency: string;
  unit: string;
  period: string;
  startsAt: string;
  expiresAt: string;
}

export interface UsageAccessView {
  active: boolean;
  expiresAt: string | null;
  unit: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsageCatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  readonly catalog = signal<UsageUnitCatalog | null>(null);
  readonly loadError = signal('');

  load(): void {
    this.http.get<UsageUnitCatalog>(`${this.base}/usage/units`).subscribe({
      next: (body) => {
        this.catalog.set(body);
        this.loadError.set('');
      },
      error: () => this.loadError.set('USAGE_UNITS_UNAVAILABLE'),
    });
  }

  ensure(): Observable<UsageUnitCatalog> {
    return this.http.get<UsageUnitCatalog>(`${this.base}/usage/units`).pipe(
      tap((body) => {
        this.catalog.set(body);
        this.loadError.set('');
      }),
    );
  }

  /** Server VND for a stored amount. The server ignores any client rate. */
  quote(amount: number, currency: string): Observable<VndQuote> {
    const params = new HttpParams().set('amount', String(amount)).set('currency', currency || 'USD');
    return this.http.get<VndQuote>(`${this.base}/exchange-rates/quote`, { params });
  }

  buyAccess(productId: string): Observable<UsageAccessPurchase> {
    return this.http.post<UsageAccessPurchase>(`${this.base}/usage/access`, { productId });
  }

  access(productId: string): Observable<UsageAccessView> {
    const params = new HttpParams().set('productId', productId);
    return this.http.get<UsageAccessView>(`${this.base}/usage/access`, { params });
  }
}
