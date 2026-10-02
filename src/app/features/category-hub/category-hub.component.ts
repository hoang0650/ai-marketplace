import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product, ProductCategory } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

/** Hubs that also offer the self-serve AI builder (buyer's own provider key). */
const BUILDER_KIND: Partial<Record<ProductCategory, 'web' | 'app'>> = {
  'hire-build-web': 'web',
  'hire-build-app': 'app',
  'template-web': 'web',
  'template-app': 'app',
};

@Component({
  selector: 'app-category-hub',
  standalone: true,
  imports: [ProductCardComponent, RouterLink, TPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">{{ title() }}</h1>
      <p class="mt-2 max-w-2xl text-muted">{{ subtitle() }}</p>
      @if (builderKind(); as kind) {
        <div class="panel mt-6 flex flex-wrap items-center justify-between gap-4">
          <div class="max-w-2xl">
            <p class="font-display text-xl">{{ 'builder.cta.' + kind + '.title' | t }}</p>
            <p class="mt-1 text-sm text-muted">{{ 'builder.cta.' + kind + '.body' | t }}</p>
          </div>
          <a class="btn btn-fill" routerLink="/build" [queryParams]="{ kind }">{{ 'builder.cta.button' | t }}</a>
        </div>
      }
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
  readonly builderKind = signal<'web' | 'app' | null>(null);

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const category = (data['category'] as ProductCategory) || 'text-to-text';
      this.builderKind.set(BUILDER_KIND[category] ?? null);
      const title = (data['title'] as string) || this.i18n.catLabel(category);
      this.title.set(this.i18n.catLabel(category) || title);
      this.subtitle.set(this.i18n.catDesc(category) || this.i18n.t('hub.subtitle', { title: this.title() }));
      this.seo.set({ title, description: this.subtitle() });
      this.productsApi.list({ category }).subscribe((items) => this.products.set(items));
    });
  }
}
