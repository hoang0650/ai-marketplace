import { Component, OnInit, inject, signal } from '@angular/core';
import { WishlistService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [ProductCardComponent],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Wishlist</h1>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of items(); track p.id) {
          <app-product-card [product]="p" />
        } @empty {
          <p class="text-muted">Your wishlist is empty.</p>
        }
      </div>
    </section>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly api = inject(WishlistService);
  private readonly seo = inject(SeoService);
  readonly items = signal<Product[]>([]);

  ngOnInit(): void {
    this.seo.set({ title: 'Wishlist' });
    this.api.list().subscribe((items) => this.items.set(items));
  }
}
