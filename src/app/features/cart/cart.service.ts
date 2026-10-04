import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';

export interface CartLine {
  product: Product;
  qty: number;
  selected: boolean;
}

interface CartResponse {
  items: Array<{ product: Product; qty: number }>;
  count: number;
}

/** Server-side cart (`/v1/cart`), shared with the mobile app; independent of the wishlist. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/cart`;
  private readonly linesSignal = signal<CartLine[]>([]);
  private readonly unselected = new Set<string>();

  readonly lines = this.linesSignal.asReadonly();
  readonly count = computed(() => this.linesSignal().reduce((s, l) => s + l.qty, 0));
  readonly ids = computed(() => new Set(this.linesSignal().map((l) => l.product.id)));
  readonly selectedLines = computed(() => this.linesSignal().filter((l) => l.selected));
  readonly subtotal = computed(() =>
    this.selectedLines().reduce((s, l) => s + this.unitPrice(l.product) * l.qty, 0),
  );
  readonly currency = computed(() => this.linesSignal()[0]?.product.pricing.currency || 'USD');

  has(productId?: string | null): boolean {
    return !!productId && this.ids().has(productId);
  }

  load(): void {
    if (!this.auth.isAuthenticated()) {
      this.linesSignal.set([]);
      return;
    }
    this.http
      .get<CartResponse>(this.base)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => res && this.apply(res));
  }

  add(productId: string, qty = 1): Observable<CartLine[]> {
    return this.sync(this.http.post<CartResponse>(`${this.base}/items`, { productId, qty }));
  }

  unitPrice(p: Product): number {
    if (p.pricing.model === 'usage') return p.pricing.usageRate || 0;
    return p.pricing.price || 0;
  }

  setQty(productId: string, qty: number): void {
    const nextQty = Math.max(1, Math.min(99, Math.floor(qty) || 1));
    this.linesSignal.update((list) =>
      list.map((l) => (l.product.id === productId ? { ...l, qty: nextQty } : l)),
    );
    this.sync(
      this.http.patch<CartResponse>(`${this.base}/items/${encodeURIComponent(productId)}`, { qty: nextQty }),
    ).subscribe({ error: () => this.load() });
  }

  toggleSelected(productId: string): void {
    if (this.unselected.has(productId)) this.unselected.delete(productId);
    else this.unselected.add(productId);
    this.linesSignal.update((list) =>
      list.map((l) => (l.product.id === productId ? { ...l, selected: !l.selected } : l)),
    );
  }

  toggleAll(selected: boolean): void {
    this.unselected.clear();
    if (!selected) this.linesSignal().forEach((l) => this.unselected.add(l.product.id));
    this.linesSignal.update((list) => list.map((l) => ({ ...l, selected })));
  }

  remove(productId: string): void {
    this.linesSignal.update((list) => list.filter((l) => l.product.id !== productId));
    this.sync(this.http.delete<CartResponse>(`${this.base}/items/${encodeURIComponent(productId)}`)).subscribe({
      error: () => this.load(),
    });
  }

  removeSelected(): void {
    const productIds = this.selectedLines().map((l) => l.product.id);
    if (!productIds.length) return;
    this.linesSignal.update((list) => list.filter((l) => !l.selected));
    this.sync(this.http.post<CartResponse>(`${this.base}/remove`, { productIds })).subscribe({
      error: () => this.load(),
    });
  }

  private sync(req: Observable<CartResponse>): Observable<CartLine[]> {
    return req.pipe(
      tap((res) => this.apply(res)),
      map(() => this.linesSignal()),
    );
  }

  private apply(res: CartResponse): void {
    this.linesSignal.set(
      (res.items || []).map((it) => ({
        product: it.product,
        qty: it.qty,
        selected: !this.unselected.has(it.product.id),
      })),
    );
  }
}
