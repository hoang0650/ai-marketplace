import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product, CategoryMeta } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

type SortId = 'featured' | 'bestsellers' | 'price-asc' | 'price-desc' | 'newest';

function sortPrice(p: Product): number {
  const pr = p.pricing;
  if (pr.model === 'free') return 0;
  if (pr.model === 'usage') return Number(pr.usageRate) || 0;
  return Number(pr.price) || 0;
}

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent, TPipe],
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.scss',
})
export class MarketplaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly categories = signal<CategoryMeta[]>([]);
  readonly catalog = signal<Product[]>([]);
  readonly sort = signal<SortId>('featured');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly selectedCategory = signal('');
  readonly appliedQuery = signal('');
  readonly priceMinSig = signal(0);
  readonly priceMaxSig = signal(500);

  readonly aiCategories = computed(() => this.categories().filter((c) => c.lane === 'ai'));
  readonly apiCategories = computed(() => this.categories().filter((c) => c.navGroup === 'apis'));
  readonly generateCategories = computed(() => this.categories().filter((c) => c.navGroup === 'generate'));
  readonly platformCategories = computed(() =>
    this.categories().filter((c) => c.navGroup === 'platform' || c.navGroup === 'talent'),
  );

  readonly sorts: Array<{ id: SortId; key: string }> = [
    { id: 'featured', key: 'mkt.sort.featured' },
    { id: 'bestsellers', key: 'mkt.sort.bestsellers' },
    { id: 'price-asc', key: 'mkt.sort.price-asc' },
    { id: 'price-desc', key: 'mkt.sort.price-desc' },
    { id: 'newest', key: 'mkt.sort.newest' },
  ];

  readonly priceCeiling = 500;

  /** Draft fields bound to the filter form (applied on button click). */
  draftCategory = '';
  filterQuery = '';
  priceMin = 0;
  priceMax = 500;
  currency: 'USD' | 'VND' = 'USD';
  inStockOnly = true;

  readonly totalCount = computed(() => this.catalog().length);

  readonly displayed = computed(() => {
    let rows = [...this.catalog()];
    const cat = this.selectedCategory();
    const q = this.appliedQuery().trim().toLowerCase();
    const min = Math.min(this.priceMinSig(), this.priceMaxSig());
    const max = Math.max(this.priceMinSig(), this.priceMaxSig());

    if (cat) rows = rows.filter((p) => p.category === cat);
    if (q) {
      rows = rows.filter((p) =>
        `${p.name} ${p.tagline} ${p.creatorName} ${p.tags.join(' ')}`.toLowerCase().includes(q),
      );
    }
    rows = rows.filter((p) => {
      const price = sortPrice(p);
      return price >= min && price <= max;
    });

    switch (this.sort()) {
      case 'bestsellers':
        rows.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
      case 'price-asc':
        rows.sort((a, b) => sortPrice(a) - sortPrice(b));
        break;
      case 'price-desc':
        rows.sort((a, b) => sortPrice(b) - sortPrice(a));
        break;
      case 'newest':
        rows.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
        break;
      case 'featured':
      default:
        rows.sort(
          (a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.rating || 0) - (a.rating || 0),
        );
        break;
    }
    return rows;
  });

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('nav.marketplace'),
      description: this.i18n.t('home.featuredSub'),
    });
    this.productsApi.categories().subscribe((c) => this.categories.set(c));
    this.productsApi.list().subscribe((items) => this.catalog.set(items));

    this.route.paramMap.subscribe((params) => {
      const cat = params.get('category') || '';
      this.selectedCategory.set(cat);
      this.draftCategory = cat;
    });
    this.route.queryParamMap.subscribe((q) => {
      const query = q.get('q') || '';
      this.filterQuery = query;
      this.appliedQuery.set(query);
    });
  }

  categoryTitle(): string {
    const cat = this.selectedCategory();
    return cat ? this.i18n.catLabel(cat) : this.i18n.t('mkt.all');
  }

  categoryCount(id: string): number {
    return this.catalog().filter((p) => p.category === id).length;
  }

  setSort(id: SortId): void {
    this.sort.set(id);
  }

  applyFilters(): void {
    this.appliedQuery.set(this.filterQuery);
    this.selectedCategory.set(this.draftCategory);
    this.priceMinSig.set(Number(this.priceMin) || 0);
    this.priceMaxSig.set(Number(this.priceMax) || this.priceCeiling);
    void this.router.navigate(this.draftCategory ? ['/marketplace', this.draftCategory] : ['/marketplace'], {
      queryParams: this.filterQuery.trim() ? { q: this.filterQuery.trim() } : {},
    });
  }

  resetFilters(): void {
    this.draftCategory = '';
    this.filterQuery = '';
    this.priceMin = 0;
    this.priceMax = this.priceCeiling;
    this.currency = 'USD';
    this.inStockOnly = true;
    this.appliedQuery.set('');
    this.selectedCategory.set('');
    this.priceMinSig.set(0);
    this.priceMaxSig.set(this.priceCeiling);
    this.sort.set('featured');
    void this.router.navigate(['/marketplace']);
  }
}
