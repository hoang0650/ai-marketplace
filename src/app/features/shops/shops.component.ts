import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CreatorService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Creator, HomeFeed, Product } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../i18n/currency.service';

type ShopSort = 'revenue' | 'sales' | 'products' | 'rating' | 'name';
type LoadState = 'loading' | 'ready' | 'error';

const SORTS: ShopSort[] = ['revenue', 'sales', 'products', 'rating', 'name'];

const FALLBACK_PRODUCT_LIMIT = 500;

/**
 * Older APIs lack /home/shops: build shops from the catalogue, then take revenue,
 * avatar and verification from the home rail where available.
 */
function shopsFromCatalog(items: Product[], ranked: Creator[]): Creator[] {
  const known = new Map(ranked.map((s) => [s.slug, s]));
  const map = new Map<string, Creator>();
  for (const p of items) {
    const slug = p.creatorSlug || p.sellerSlug || '';
    if (!slug) continue;
    const top = known.get(slug);
    const cur = map.get(slug) || {
      id: top?.id || p.creatorId || p.sellerId || slug,
      slug,
      name: top?.name || p.creatorName || p.sellerName || slug,
      bio: top?.bio || '',
      avatarUrl: top?.avatarUrl || '',
      coverUrl: top?.coverUrl || p.coverUrl || '',
      verified: top ? top.verified : !!p.soldByPlatform,
      productCount: 0,
      rating: 0,
      totalSales: 0,
      revenue: top?.revenue || 0,
    };
    cur.productCount += 1;
    cur.totalSales += Number(p.salesCount) || 0;
    cur.rating = Math.max(cur.rating, Number(p.rating) || 0);
    if (!cur.coverUrl && p.coverUrl) cur.coverUrl = p.coverUrl;
    map.set(slug, cur);
  }
  return [...map.values()].sort(
    (a, b) =>
      (b.revenue || 0) - (a.revenue || 0) ||
      (b.totalSales || 0) - (a.totalSales || 0) ||
      b.productCount - a.productCount,
  );
}

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class ShopsComponent implements OnInit {
  private readonly creatorsApi = inject(CreatorService);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currencySvc = inject(CurrencyService);

  readonly sorts = SORTS;
  readonly coverFallback = 'linear-gradient(135deg, #1c1c1e 0%, #3a3a3c 100%)';
  readonly skeletonSlots = Array.from({ length: 8 }, (_, i) => i);

  readonly loadState = signal<LoadState>('loading');
  readonly shops = signal<Creator[]>([]);
  readonly hasRevenue = signal(true);
  readonly brokenAvatars = signal<ReadonlySet<string>>(new Set());
  readonly query = signal('');
  readonly sort = signal<ShopSort>('revenue');
  readonly verifiedOnly = signal(false);

  /** Rank is the revenue position from the API, independent of the chosen sort. */
  readonly rankById = computed(() => new Map(this.shops().map((s, i) => [s.id, i + 1])));

  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.shops().filter(
      (s) =>
        (!this.verifiedOnly() || s.verified) &&
        (!q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || (s.bio || '').toLowerCase().includes(q)),
    );
    const rank = this.rankById();
    switch (this.sort()) {
      case 'sales':
        return [...rows].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
      case 'products':
        return [...rows].sort((a, b) => b.productCount - a.productCount);
      case 'rating':
        return [...rows].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return [...rows].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return [...rows].sort((a, b) => (rank.get(a.id) || 0) - (rank.get(b.id) || 0));
    }
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('shops.title'), description: this.i18n.t('shops.desc') });
    this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.creatorsApi
      .ranked()
      .pipe(
        map((rows) => ({ rows, hasRevenue: true })),
        catchError(() =>
          forkJoin({
            feed: this.productsApi.home().pipe(catchError(() => of(null as HomeFeed | null))),
            items: this.productsApi.list({ limit: FALLBACK_PRODUCT_LIMIT }),
          }).pipe(
            map(({ feed, items }) => ({
              rows: shopsFromCatalog(items, feed?.shops || []),
              hasRevenue: !!feed,
            })),
          ),
        ),
        catchError(() => of(null)),
      )
      .subscribe((res) => {
        if (!res) {
          this.loadState.set('error');
          return;
        }
        this.shops.set(res.rows || []);
        this.hasRevenue.set(res.hasRevenue);
        if (!res.hasRevenue && this.sort() === 'revenue') this.sort.set('sales');
        this.loadState.set('ready');
      });
  }

  markAvatarBroken(id: string): void {
    this.brokenAvatars.update((s) => new Set(s).add(id));
  }

  shopInitial(shop: Creator): string {
    const ch = (shop.name || shop.slug || '?').trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  shopRevenue(shop: Creator): string {
    return this.currencySvc.formatFromUsd(Number(shop.revenue) || 0);
  }
}
