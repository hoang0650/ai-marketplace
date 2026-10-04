import { Component, OnInit, inject } from '@angular/core';
import { WishlistService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [ProductCardComponent, TPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">{{ 'lux.wishlist' | t }}</h1>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of items(); track p.id) {
          <app-product-card [product]="p" />
        } @empty {
          <p class="text-muted">{{ 'wishlist.empty' | t }}</p>
        }
      </div>
    </section>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly api = inject(WishlistService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly items = this.api.items;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('lux.wishlist') });
    this.api.load();
  }
}
