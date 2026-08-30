import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WishlistService } from '../../services/api.services';
import { Product } from '../../models/marketplace.models';
import { AuthService } from '../../services/auth.service';
import { catchError, of, tap } from 'rxjs';

export interface CartLine {
  product: Product;
  qty: number;
  selected: boolean;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly wishlist = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly linesSignal = signal<CartLine[]>([]);
  private readonly qtyMap = signal<Record<string, number>>({});

  readonly lines = this.linesSignal.asReadonly();
  readonly count = computed(() => this.linesSignal().reduce((s, l) => s + l.qty, 0));
  readonly selectedLines = computed(() => this.linesSignal().filter((l) => l.selected));
  readonly subtotal = computed(() =>
    this.selectedLines().reduce((s, l) => s + this.unitPrice(l.product) * l.qty, 0),
  );
  readonly currency = computed(() => this.linesSignal()[0]?.product.pricing.currency || 'USD');

  private qtyKey(): string {
    return 'phai.cartQty';
  }

  load(): void {
    this.readQty();
    if (!this.auth.isAuthenticated()) {
      this.linesSignal.set([]);
      return;
    }
    this.wishlist
      .list()
      .pipe(catchError(() => of([] as Product[])))
      .subscribe((products) => {
        const qty = this.qtyMap();
        this.linesSignal.set(
          products.map((product) => ({
            product,
            qty: qty[product.id] || 1,
            selected: true,
          })),
        );
      });
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
    this.qtyMap.update((m) => ({ ...m, [productId]: nextQty }));
    this.persistQty();
  }

  toggleSelected(productId: string): void {
    this.linesSignal.update((list) =>
      list.map((l) => (l.product.id === productId ? { ...l, selected: !l.selected } : l)),
    );
  }

  toggleAll(selected: boolean): void {
    this.linesSignal.update((list) => list.map((l) => ({ ...l, selected })));
  }

  remove(productId: string): void {
    this.wishlist.toggle(productId).pipe(tap(() => this.load())).subscribe();
  }

  removeSelected(): void {
    const ids = this.selectedLines().map((l) => l.product.id);
    if (!ids.length) return;
    let left = ids.length;
    ids.forEach((id) => {
      this.wishlist.toggle(id).subscribe(() => {
        left -= 1;
        if (left <= 0) this.load();
      });
    });
  }

  private readQty(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(this.qtyKey());
      this.qtyMap.set(raw ? JSON.parse(raw) : {});
    } catch {
      this.qtyMap.set({});
    }
  }

  private persistQty(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.qtyKey(), JSON.stringify(this.qtyMap()));
  }
}
