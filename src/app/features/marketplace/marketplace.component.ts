import { canonicalCategory } from '../../models/categories';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest, catchError, of } from 'rxjs';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { CategoryMeta, Product } from '../../models/marketplace.models';
import { CATEGORY_META, VISIBLE_CATEGORIES } from '../../models/categories';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { I18nService } from '../../i18n/i18n.service';
import { AppCurrency, CurrencyService } from '../../i18n/currency.service';
import { TPipe } from '../../i18n/t.pipe';

type SortId = 'featured' | 'bestsellers' | 'price-asc' | 'price-desc' | 'newest';
type ChipId = 'cat' | 'q' | 'price';

function sortPrice(p: Product): number {
  const pr = p.pricing;
  if (pr.model === 'free') return 0;
  if (pr.model === 'usage') return Number(pr.usageRate) || 0;
  return Number(pr.price) || 0;
}

const SORTS = new Set<SortId>(['featured', 'bestsellers', 'price-asc', 'price-desc', 'newest']);
const BANNER_KEY = 'aimarkets.mktBannerDismissed';

/** Survives the /marketplace ↔ /marketplace/:category remount so a category click does not flash skeletons. */
let catalogCache: Product[] | null = null;

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
  readonly currencySvc = inject(CurrencyService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('filterToggle') filterToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('filterClose') filterClose?: ElementRef<HTMLButtonElement>;

  readonly categories = signal<CategoryMeta[]>(VISIBLE_CATEGORIES);
  readonly catalog = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly sort = signal<SortId>('featured');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly selectedCategory = signal('');
  readonly appliedQuery = signal('');
  readonly priceMinSig = signal(0);
  readonly priceMaxSig = signal(500);
  readonly page = signal(1);
  readonly filtersOpen = signal(false);
  readonly isMobile = signal(false);
  readonly bannerHidden = signal(false);
  readonly openGroups = signal<Record<string, boolean>>({
    generate: false,
    apis: false,
    platform: false,
    talent: false,
    price: true,
    currency: false,
  });

  readonly pageSize = 12;
  readonly skeletonSlots = [0, 1, 2, 3, 4, 5, 6, 7];

  /** Published listings per canonical category (api-endpoint folds into inference). */
  readonly counts = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.catalog()) {
      const id = canonicalCategory(p.category);
      m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  });
  /** Sidebar only lists categories that have listings (plus the one being viewed); all of them until the catalog loads. */
  private readonly listed = computed(() => {
    const counts = this.counts();
    const selected = this.selectedCategory();
    if (!this.catalog().length) return this.categories();
    return this.categories().filter((c) => (counts.get(c.id) || 0) > 0 || c.id === selected);
  });
  readonly apiCategories = computed(() => this.listed().filter((c) => c.navGroup === 'apis'));
  readonly generateCategories = computed(() => this.listed().filter((c) => c.navGroup === 'generate'));
  readonly platformCategories = computed(() => this.listed().filter((c) => c.navGroup === 'platform'));
  readonly talentCategories = computed(() => this.listed().filter((c) => c.navGroup === 'talent'));

  readonly sorts: Array<{ id: SortId; key: string }> = [
    { id: 'featured', key: 'mkt.sort.featured' },
    { id: 'bestsellers', key: 'mkt.sort.bestsellers' },
    { id: 'price-asc', key: 'mkt.sort.price-asc' },
    { id: 'price-desc', key: 'mkt.sort.price-desc' },
    { id: 'newest', key: 'mkt.sort.newest' },
  ];

  readonly priceCeiling = 500;

  filterQuery = '';
  priceMin = 0;
  priceMax = 500;
  currency: AppCurrency = 'USD';
  inStockOnly = true;

  private urlReady = false;
  private applyingUrl = false;
  /** Range inputs emit their minimum on init; ignore that until the user actually touches a price control. */
  private priceArmed = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private priceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly totalCount = computed(() => this.catalog().length);

  readonly displayed = computed(() => {
    let rows = [...this.catalog()];
    const cat = this.selectedCategory();
    const q = this.appliedQuery().trim().toLowerCase();
    const min = Math.min(this.priceMinSig(), this.priceMaxSig());
    const upper = Math.max(this.priceMinSig(), this.priceMaxSig());
    // Slider end = no upper limit (hire listings cost thousands).
    const max = upper >= this.priceCeiling ? Infinity : upper;

    if (cat) rows = rows.filter((p) => canonicalCategory(p.category) === cat);
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

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.displayed().length / this.pageSize)));
  readonly safePage = computed(() => Math.min(Math.max(1, this.page()), this.pageCount()));
  readonly paged = computed(() => {
    const start = (this.safePage() - 1) * this.pageSize;
    return this.displayed().slice(start, start + this.pageSize);
  });
  readonly pageList = computed(() => {
    const total = this.pageCount();
    const cur = this.safePage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const items: number[] = [1];
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    if (start > 2) items.push(-1);
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push(-1);
    items.push(total);
    return items;
  });

  readonly chips = computed(() => {
    this.i18n.lang();
    const out: Array<{ id: ChipId; label: string }> = [];
    const cat = this.selectedCategory();
    if (cat) out.push({ id: 'cat', label: this.i18n.catLabel(cat) });
    const q = this.appliedQuery().trim();
    if (q) out.push({ id: 'q', label: this.i18n.t('mkt.chipQuery', { q }) });
    const min = Math.min(this.priceMinSig(), this.priceMaxSig());
    const max = Math.max(this.priceMinSig(), this.priceMaxSig());
    if (min > 0 || max < this.priceCeiling) {
      out.push({
        id: 'price',
        label: this.i18n.t('mkt.chipPrice', { min, max: max >= this.priceCeiling ? `${this.priceCeiling}+` : max }),
      });
    }
    return out;
  });

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('nav.marketplace'),
      description: this.i18n.t('home.featuredSub'),
    });
    this.currency = this.currencySvc.currency();
    if (catalogCache) {
      this.catalog.set(catalogCache);
      this.loading.set(false);
    }
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, q]) => this.readRoute(params, q));

    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }

    this.bindViewport();
    this.bannerHidden.set(localStorage.getItem(BANNER_KEY) === '1');
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      if (this.priceTimer) clearTimeout(this.priceTimer);
      document.body.classList.remove('nav-lock');
    });

    this.productsApi
      .categories()
      .pipe(catchError(() => of([] as CategoryMeta[])))
      .subscribe((c) => {
        if (!c.length) return;
        const localIds = new Set(CATEGORY_META.map((x) => x.id));
        const extras = c.filter((x) => x?.id && !localIds.has(x.id));
        this.categories.set(extras.length ? [...VISIBLE_CATEGORIES, ...extras] : VISIBLE_CATEGORIES);
      });

    this.productsApi
      .list()
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of([] as Product[]);
        }),
      )
      .subscribe((items) => {
        catalogCache = items;
        this.catalog.set(items);
        this.loading.set(false);
        const max = Math.max(1, Math.ceil(this.displayed().length / this.pageSize));
        if (this.page() > max) {
          this.page.set(max);
          this.pushUrl();
        }
      });
  }

  categoryTitle(): string {
    const cat = this.selectedCategory();
    return cat ? this.i18n.catLabel(cat) : this.i18n.t('mkt.all');
  }

  categoryCount(id: string): number {
    return this.counts().get(id) || 0;
  }

  groupCount(rows: CategoryMeta[]): number {
    return rows.reduce((sum, c) => sum + this.categoryCount(c.id), 0);
  }

  isOpen(id: string): boolean {
    return !!this.openGroups()[id];
  }

  toggleGroup(id: string): void {
    this.openGroups.update((g) => ({ ...g, [id]: !g[id] }));
  }

  selectCategory(id: string): void {
    if (this.selectedCategory() === id) return;
    this.selectedCategory.set(id);
    this.revealCategory(id);
    this.page.set(1);
    this.pushUrl();
  }

  setSort(id: string): void {
    if (!SORTS.has(id as SortId) || this.sort() === id) return;
    this.sort.set(id as SortId);
    this.page.set(1);
    this.pushUrl();
  }

  setView(id: 'grid' | 'list'): void {
    if (this.view() === id) return;
    this.view.set(id);
    this.pushUrl();
  }

  onQueryDraft(value: string): void {
    this.filterQuery = value;
    if (!this.urlReady || this.applyingUrl) return;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.appliedQuery.set(this.filterQuery.trim());
      this.page.set(1);
      this.pushUrl();
    }, 280);
  }

  armPrice(): void {
    this.priceArmed = true;
  }

  onPriceInput(which: 'min' | 'max', event: Event): void {
    if (!this.priceArmed || !this.urlReady || this.applyingUrl) return;
    const raw = Number((event.target as HTMLInputElement).value);
    const value = Number.isFinite(raw) ? raw : which === 'min' ? 0 : this.priceCeiling;
    if (which === 'min') this.priceMin = value;
    else this.priceMax = value;
    if (this.priceTimer) clearTimeout(this.priceTimer);
    this.priceTimer = setTimeout(() => this.commitPrice(), 180);
  }

  onCurrency(code: AppCurrency): void {
    if (code !== 'USD' && code !== 'VND' && code !== 'CNY') return;
    this.currency = code;
    this.currencySvc.setCurrency(code);
    if (!this.urlReady || this.applyingUrl) return;
    this.pushUrl();
  }

  clearChip(id: ChipId): void {
    if (id === 'cat') this.selectedCategory.set('');
    if (id === 'q') {
      this.filterQuery = '';
      this.appliedQuery.set('');
    }
    if (id === 'price') {
      this.priceMin = 0;
      this.priceMax = this.priceCeiling;
      this.priceMinSig.set(0);
      this.priceMaxSig.set(this.priceCeiling);
    }
    this.page.set(1);
    this.pushUrl();
  }

  resetFilters(): void {
    this.filterQuery = '';
    this.priceMin = 0;
    this.priceMax = this.priceCeiling;
    this.currency = 'USD';
    this.currencySvc.setCurrency('USD');
    this.inStockOnly = true;
    this.appliedQuery.set('');
    this.selectedCategory.set('');
    this.priceMinSig.set(0);
    this.priceMaxSig.set(this.priceCeiling);
    this.sort.set('featured');
    this.view.set('grid');
    this.page.set(1);
    this.pushUrl();
    if (this.isMobile()) this.closeFilters();
  }

  goPage(n: number): void {
    const next = Math.min(Math.max(1, n), this.pageCount());
    if (next === this.safePage() && next === this.page()) return;
    this.page.set(next);
    this.pushUrl();
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('mkt-results')?.scrollIntoView({ block: 'start' });
    }
  }

  openFilters(): void {
    this.filtersOpen.set(true);
    if (isPlatformBrowser(this.platformId)) document.body.classList.add('nav-lock');
    setTimeout(() => this.filterClose?.nativeElement.focus());
  }

  closeFilters(): void {
    if (!this.filtersOpen()) return;
    this.filtersOpen.set(false);
    if (isPlatformBrowser(this.platformId)) document.body.classList.remove('nav-lock');
    this.filterToggle?.nativeElement.focus();
  }

  dismissBanner(): void {
    this.bannerHidden.set(true);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(BANNER_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filtersOpen() && this.isMobile()) this.closeFilters();
  }

  private readRoute(params: ParamMap, q: ParamMap): void {
    this.applyingUrl = true;
    const cat = canonicalCategory(params.get('category') || '');
    this.selectedCategory.set(cat);
    this.revealCategory(cat);
    const query = q.get('q') || '';
    this.filterQuery = query;
    this.appliedQuery.set(query);
    const sort = q.get('sort') as SortId | null;
    this.sort.set(sort && SORTS.has(sort) ? sort : 'featured');
    const min = this.clampPrice(q.get('min'), 0);
    const max = this.clampPrice(q.get('max'), this.priceCeiling);
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    this.priceMin = lo;
    this.priceMax = hi;
    this.priceMinSig.set(lo);
    this.priceMaxSig.set(hi);
    const view = q.get('view');
    this.view.set(view === 'list' ? 'list' : 'grid');
    const page = Math.max(1, Math.floor(Number(q.get('page')) || 1));
    this.page.set(Number.isFinite(page) ? page : 1);
    const cur = q.get('cur');
    if (cur === 'USD' || cur === 'VND' || cur === 'CNY') {
      this.currency = cur;
      this.currencySvc.setCurrency(cur);
    }
    this.applyingUrl = false;
    this.urlReady = true;
  }

  private commitPrice(): void {
    let min = this.clampPrice(this.priceMin, 0);
    let max = this.clampPrice(this.priceMax, this.priceCeiling);
    if (min > max) [min, max] = [max, min];
    this.priceMin = min;
    this.priceMax = max;
    if (min === this.priceMinSig() && max === this.priceMaxSig()) return;
    this.priceMinSig.set(min);
    this.priceMaxSig.set(max);
    this.page.set(1);
    this.pushUrl();
  }

  private clampPrice(value: unknown, fallback: number): number {
    // Number(null) is 0, so a missing query param must stay on the fallback.
    if (value == null || (typeof value === 'string' && value.trim() === '')) return fallback;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(this.priceCeiling, Math.max(0, n));
  }

  private revealCategory(cat: string): void {
    if (!cat) return;
    const meta = this.categories().find((c) => c.id === cat);
    const group = meta?.navGroup;
    if (!group) return;
    this.openGroups.update((g) => ({ ...g, [group]: true }));
  }

  private pushUrl(): void {
    if (!this.urlReady || this.applyingUrl || !isPlatformBrowser(this.platformId)) return;
    const cat = this.selectedCategory();
    const queryParams: Record<string, string> = {};
    const q = this.appliedQuery().trim();
    if (q) queryParams['q'] = q;
    if (this.sort() !== 'featured') queryParams['sort'] = this.sort();
    if (this.priceMinSig() > 0) queryParams['min'] = String(this.priceMinSig());
    if (this.priceMaxSig() < this.priceCeiling) queryParams['max'] = String(this.priceMaxSig());
    if (this.page() > 1) queryParams['page'] = String(this.page());
    if (this.view() === 'list') queryParams['view'] = 'list';
    if (this.currency !== 'USD') queryParams['cur'] = this.currency;
    const tree = this.router.createUrlTree(cat ? ['/marketplace', cat] : ['/marketplace'], { queryParams });
    if (this.router.serializeUrl(tree) === this.router.url) return;
    void this.router.navigateByUrl(tree);
  }

  private bindViewport(): void {
    const mq = window.matchMedia('(max-width: 959.98px)');
    const apply = () => {
      const mobile = mq.matches;
      this.isMobile.set(mobile);
      if (!mobile && this.filtersOpen()) {
        this.filtersOpen.set(false);
        document.body.classList.remove('nav-lock');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    this.destroyRef.onDestroy(() => mq.removeEventListener('change', apply));
  }
}
