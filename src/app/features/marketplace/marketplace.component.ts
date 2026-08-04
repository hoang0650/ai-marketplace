import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product, CategoryMeta } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent, ScrollingModule],
  templateUrl: './marketplace.component.html',
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        background: var(--color-surface);
        border: 1px solid var(--color-line);
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
        color: var(--color-ink);
      }
      .chip--on,
      .chip:hover {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #222;
      }
      .ct-mkt-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (min-width: 640px) {
        .ct-mkt-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (min-width: 900px) {
        .ct-mkt-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @media (min-width: 1200px) {
        .ct-mkt-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class MarketplaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<CategoryMeta[]>([]);
  selectedCategory = '';
  query = '';

  ngOnInit(): void {
    this.seo.set({ title: 'Marketplace', description: 'Browse AI models and hire marketing, SEO, creators, and agents.' });
    this.productsApi.categories().subscribe((c) => this.categories.set(c));
    this.route.paramMap.subscribe((params) => {
      this.selectedCategory = params.get('category') || '';
      this.load();
    });
    this.route.queryParamMap.subscribe((q) => {
      this.query = q.get('q') || this.query;
      this.load();
    });
  }

  load(): void {
    this.productsApi
      .list({
        category: this.selectedCategory || undefined,
        q: this.query || undefined,
      })
      .subscribe((items) => this.products.set(items));
  }

  onFilter(): void {
    this.load();
  }
}
