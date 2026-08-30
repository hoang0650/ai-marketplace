import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product, ProductCategory } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-category-hub',
  standalone: true,
  imports: [ProductCardComponent],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">{{ title() }}</h1>
      <p class="mt-2 max-w-2xl text-muted">{{ subtitle() }}</p>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of products(); track p.id) {
          <app-product-card [product]="p" />
        }
      </div>
    </section>
  `,
})
export class CategoryHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly products = signal<Product[]>([]);
  readonly title = signal('Category');
  readonly subtitle = signal('');

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const category = (data['category'] as ProductCategory) || 'text-to-text';
      const title = (data['title'] as string) || this.i18n.catLabel(category);
      this.title.set(this.i18n.catLabel(category) || title);
      this.subtitle.set(this.i18n.t('hub.subtitle', { title: this.title() }));
      this.seo.set({ title, description: this.subtitle() });
      this.productsApi.list({ category }).subscribe((items) => this.products.set(items));
    });
  }
}
