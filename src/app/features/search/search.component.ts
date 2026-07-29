import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, CreatorService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Creator, Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, ProductCardComponent, RouterLink],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Search</h1>
      <form class="mt-6 flex max-w-2xl gap-2" (ngSubmit)="run()">
        <input class="input" name="q" [(ngModel)]="q" placeholder="Text-to-text, video, image models..." aria-label="Search" />
        <button class="btn btn-fill" type="submit">Search</button>
      </form>
      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of products(); track p.id) {
          <app-product-card [product]="p" />
        }
      </div>
      @if (creators().length) {
        <h2 class="section-title mt-12 text-2xl">Creators</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (c of creators(); track c.id) {
            <a [routerLink]="['/store', c.slug]" class="panel block no-underline">
              <p class="font-display text-xl">{{ c.name }}</p>
              <p class="text-sm text-muted">{{ c.bio }}</p>
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class SearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsApi = inject(ProductService);
  private readonly creatorsApi = inject(CreatorService);
  private readonly seo = inject(SeoService);

  q = '';
  readonly products = signal<Product[]>([]);
  readonly creators = signal<Creator[]>([]);

  ngOnInit(): void {
    this.seo.set({ title: 'Search' });
    this.route.queryParamMap.subscribe((p) => {
      this.q = p.get('q') || '';
      this.run(false);
    });
  }

  run(push = true): void {
    if (push) {
      void this.router.navigate([], { queryParams: { q: this.q || null } });
    }
    this.productsApi.list({ q: this.q || undefined }).subscribe((items) => this.products.set(items));
    this.creatorsApi.list().subscribe((list) => {
      const q = this.q.toLowerCase();
      this.creators.set(q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list.slice(0, 3));
    });
  }
}
