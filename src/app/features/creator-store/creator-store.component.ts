import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CreatorService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Creator, Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-creator-store',
  standalone: true,
  imports: [ProductCardComponent, DecimalPipe],
  template: `
    @if (creator(); as c) {
      <section class="route-enter">
        <div class="relative h-56 overflow-hidden border-b border-line md:h-72">
          <img [src]="c.coverUrl" [alt]="c.name + ' cover'" class="h-full w-full object-cover" />
        </div>
        <div class="page -mt-12">
          <div class="panel flex flex-col gap-4 sm:flex-row sm:items-end">
            <img [src]="c.avatarUrl" [alt]="c.name" class="h-24 w-24 rounded-2xl border border-line bg-mist" />
            <div class="flex-1">
              <h1 class="font-display text-4xl">{{ c.name }} @if (c.verified) { <span class="text-accent">✓</span> }</h1>
              <p class="mt-2 text-muted">{{ c.bio }}</p>
              <p class="mt-2 text-sm text-muted">★ {{ c.rating | number:'1.1-1' }} · {{ c.productCount }} products · {{ c.totalSales | number }} sales</p>
            </div>
          </div>
          <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (p of products(); track p.id) {
              <app-product-card [product]="p" />
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class CreatorStoreComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly creatorsApi = inject(CreatorService);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly creator = signal<Creator | null>(null);
  readonly products = signal<Product[]>([]);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('creatorSlug') || '';
      this.creatorsApi.bySlug(slug).subscribe((c) => {
        this.creator.set(c);
        this.seo.set({ title: c.name, description: c.bio, image: c.coverUrl });
      });
      this.productsApi.list({ creatorSlug: slug }).subscribe((items) => this.products.set(items));
    });
  }
}
