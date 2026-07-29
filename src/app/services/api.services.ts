import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AffiliateStats,
  AdminOverview,
  Creator,
  DashboardSummary,
  NotificationItem,
  Order,
  PaymentProvider,
  Product,
  Review,
  UsageStat,
  WalletTx,
} from '../models/marketplace.models';
import { CategoryMeta } from '../models/marketplace.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(filter: {
    category?: string;
    q?: string;
    featured?: boolean;
    creatorSlug?: string;
  } = {}): Observable<Product[]> {
    let params = new HttpParams();
    if (filter.category) params = params.set('category', filter.category);
    if (filter.q) params = params.set('q', filter.q);
    if (filter.featured) params = params.set('featured', 'true');
    if (filter.creatorSlug) params = params.set('creatorSlug', filter.creatorSlug);
    return this.http.get<Product[]>(`${this.base}/products`, { params });
  }

  bySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/${slug}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, product);
  }

  update(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, product);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/products/${id}`);
  }

  categories(): Observable<CategoryMeta[]> {
    return this.http.get<CategoryMeta[]>(`${this.base}/categories`);
  }
}

@Injectable({ providedIn: 'root' })
export class CreatorService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<Creator[]> {
    return this.http.get<Creator[]>(`${this.base}/creators`);
  }

  bySlug(slug: string): Observable<Creator> {
    return this.http.get<Creator>(`${this.base}/creators/${slug}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(productId?: string): Observable<Review[]> {
    let params = new HttpParams();
    if (productId) params = params.set('productId', productId);
    return this.http.get<Review[]>(`${this.base}/reviews`, { params });
  }

  create(review: Omit<Review, 'id' | 'createdAt'>): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews`, review);
  }
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/wishlist`);
  }

  toggle(productId: string): Observable<{ wishlist: Product[]; added: boolean }> {
    return this.http.post<{ wishlist: Product[]; added: boolean }>(`${this.base}/wishlist/toggle`, {
      productId,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`);
  }

  orders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/orders`);
  }

  usage(): Observable<UsageStat[]> {
    return this.http.get<UsageStat[]>(`${this.base}/usage`);
  }

  wallet(): Observable<WalletTx[]> {
    return this.http.get<WalletTx[]>(`${this.base}/wallet`);
  }

  withdraw(amount: number): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/withdraw`, { amount });
  }

  deposit(amount: number): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/deposit`, { amount });
  }

  affiliate(): Observable<AffiliateStats> {
    return this.http.get<AffiliateStats>(`${this.base}/affiliate`);
  }

  notifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.base}/notifications`);
  }

  readAllNotifications(): Observable<NotificationItem[]> {
    return this.http.post<NotificationItem[]>(`${this.base}/notifications/read-all`, {});
  }

  adminOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.base}/admin/overview`);
  }
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  checkout(input: {
    productId: string;
    provider: PaymentProvider;
  }): Observable<{ checkoutId: string; provider: string; status: string }> {
    return this.http.post<{ checkoutId: string; provider: string; status: string }>(
      `${this.base}/billing/checkout`,
      input,
    );
  }
}
