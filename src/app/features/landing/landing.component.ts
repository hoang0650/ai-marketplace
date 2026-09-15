import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { CategoryMeta, Creator, HomeFeed, Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { environment } from '../../../environments/environment';
import { AI_CATEGORIES, categoriesByNavGroup } from '../../models/categories';
import { CategoryIconComponent, CategoryIconId } from '../../shared/components/category-icon.component';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../i18n/currency.service';

type CategoryTileStyle = { bg: string; accent: string; isNew?: boolean };

type HomeCategoryTile = {
  id: CategoryIconId;
  hubPath: string;
  bg: string;
  accent: string;
  count: number;
  isNew?: boolean;
};

const DEFAULT_TILE: CategoryTileStyle = {
  bg: 'linear-gradient(145deg, #1c1c1e 0%, #3a3a3c 55%, #2c2c2e 100%)',
  accent: 'rgba(255,255,255,0.08)',
};

const CATEGORY_TILE_STYLE: Partial<Record<CategoryIconId, CategoryTileStyle>> = {
  'text-to-text': {
    bg: 'linear-gradient(145deg, #1c1c1e 0%, #3a3a3c 55%, #2c2c2e 100%)',
    accent: 'rgba(255,255,255,0.08)',
  },
  'text-to-image': {
    bg: 'linear-gradient(145deg, #2a2318 0%, #4a3d2e 55%, #352a20 100%)',
    accent: 'rgba(201,169,97,0.12)',
  },
  'image-to-image': {
    bg: 'linear-gradient(145deg, #1c1814 0%, #3a3024 55%, #2a241c 100%)',
    accent: 'rgba(220,180,120,0.12)',
  },
  'text-to-video': {
    bg: 'linear-gradient(145deg, #141c28 0%, #243a52 55%, #1a2838 100%)',
    accent: 'rgba(120,180,255,0.14)',
    isNew: true,
  },
  'image-to-video': {
    bg: 'linear-gradient(145deg, #221830 0%, #3d2a52 55%, #2a1f3a 100%)',
    accent: 'rgba(180,140,255,0.12)',
  },
  'voice-clone': {
    bg: 'linear-gradient(145deg, #1c1424 0%, #3a2450 55%, #241830 100%)',
    accent: 'rgba(200,140,255,0.14)',
    isNew: true,
  },
  'voice-preset': {
    bg: 'linear-gradient(145deg, #141c24 0%, #243848 55%, #182028 100%)',
    accent: 'rgba(120,200,255,0.14)',
    isNew: true,
  },
  'ai-film-series': {
    bg: 'linear-gradient(145deg, #1a1410 0%, #4a2a18 55%, #2a1c14 100%)',
    accent: 'rgba(255,140,80,0.14)',
    isNew: true,
  },
  'story-book': {
    bg: 'linear-gradient(145deg, #14181c 0%, #243848 55%, #182028 100%)',
    accent: 'rgba(120,200,255,0.12)',
    isNew: true,
  },
  'skill-pack': {
    bg: 'linear-gradient(145deg, #281e14 0%, #4a3520 55%, #352618 100%)',
    accent: 'rgba(255,180,100,0.1)',
    isNew: true,
  },
  dataset: {
    bg: 'linear-gradient(145deg, #14201c 0%, #1e3a32 55%, #182824 100%)',
    accent: 'rgba(80,200,160,0.12)',
    isNew: true,
  },
};

const EXTRA_HOME_TILES: Array<{
  id: CategoryIconId;
  hubPath: string;
  bg: string;
  accent: string;
  isNew?: boolean;
}> = [
  {
    id: 'inference',
    hubPath: '/inference',
    bg: 'linear-gradient(145deg, #142018 0%, #1f3d2a 55%, #182820 100%)',
    accent: 'rgba(100,220,160,0.12)',
  },
  {
    id: 'api-endpoint',
    hubPath: '/api-endpoint',
    bg: 'linear-gradient(145deg, #121e28 0%, #1e3a52 55%, #162430 100%)',
    accent: 'rgba(80,180,255,0.12)',
  },
  {
    id: 'hire-agent',
    hubPath: '/hire-agent',
    bg: 'linear-gradient(145deg, #222018 0%, #3d3820 55%, #2a2818 100%)',
    accent: 'rgba(201,169,97,0.14)',
    isNew: true,
  },
];

function buildHomeTiles(counts: Record<string, number> = {}): HomeCategoryTile[] {
  const generate = categoriesByNavGroup('generate').map((c) => {
    const style = CATEGORY_TILE_STYLE[c.id as CategoryIconId] || DEFAULT_TILE;
    return {
      id: c.id as CategoryIconId,
      hubPath: c.hubPath,
      bg: style.bg,
      accent: style.accent,
      count: counts[c.id] || 0,
      isNew: style.isNew,
    };
  });
  const extra = EXTRA_HOME_TILES.map((c) => ({
    ...c,
    count: counts[c.id] || 0,
  }));
  return [...generate, ...extra];
}

const HERO_SLIDES = [
  {
    id: 1,
    titleKey: 'lux.slide1',
    bg: 'linear-gradient(135deg, #1a1a1a 0%, #3d3528 50%, #2a2a2a 100%)',
  },
  {
    id: 2,
    titleKey: 'lux.slide2',
    bg: 'linear-gradient(135deg, #1a2332 0%, #2d3f5c 50%, #111 100%)',
  },
  {
    id: 3,
    titleKey: 'lux.slide3',
    bg: 'linear-gradient(135deg, #2a2a1a 0%, #4a4530 50%, #1a1a1a 100%)',
  },
];

function emptyHome(): HomeFeed {
  return { shops: [], newArrivals: [], promoted: [], bestsellers: [] };
}

function shopsFromProducts(items: Product[]): Creator[] {
  const map = new Map<string, Creator>();
  for (const p of items) {
    const slug = p.creatorSlug || p.sellerSlug || '';
    if (!slug) continue;
    const cur = map.get(slug) || {
      id: p.creatorId || p.sellerId || slug,
      slug,
      name: p.creatorName || p.sellerName || slug,
      bio: '',
      avatarUrl: '',
      coverUrl: p.coverUrl || '',
      verified: !!p.soldByPlatform,
      productCount: 0,
      rating: 0,
      totalSales: 0,
      revenue: 0,
    };
    cur.productCount += 1;
    cur.totalSales += Number(p.salesCount) || 0;
    cur.rating = Math.max(cur.rating, Number(p.rating) || 0);
    if (!cur.coverUrl && p.coverUrl) cur.coverUrl = p.coverUrl;
    map.set(slug, cur);
  }
  return [...map.values()]
    .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0) || b.productCount - a.productCount)
    .slice(0, 8);
}

function homeFromCatalog(items: Product[]): HomeFeed {
  const byNew = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const bySales = [...items].sort(
    (a, b) => (b.salesCount || 0) - (a.salesCount || 0) || (b.rating || 0) - (a.rating || 0),
  );
  const promoted = items.filter((p) => !!p.featured).slice(0, 8);
  return {
    shops: shopsFromProducts(items),
    newArrivals: byNew.slice(0, 8),
    promoted,
    bestsellers: bySales.slice(0, 8),
  };
}

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent, TPipe, CategoryIconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currencySvc = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly reload$ = new Subject<void>();

  readonly brand = environment.brandName;
  readonly aiCategories = AI_CATEGORIES;
  readonly slides = HERO_SLIDES;
  readonly skeletonSlots = Array.from({ length: 8 }, (_, i) => i);

  readonly categoryIcons = signal<HomeCategoryTile[]>(buildHomeTiles());
  readonly loadState = signal<LoadState>('loading');
  readonly shops = signal<Creator[]>([]);
  readonly newArrivals = signal<Product[]>([]);
  readonly promoted = signal<Product[]>([]);
  readonly bestsellers = signal<Product[]>([]);
  readonly recentTags = signal(['inference', 'api-endpoint', 'text-to-image', 'gpu']);
  readonly heroIndex = signal(0);

  get hasRails(): boolean {
    return !!(
      this.shops().length ||
      this.newArrivals().length ||
      this.promoted().length ||
      this.bestsellers().length
    );
  }

  private heroTimer: ReturnType<typeof setInterval> | null = null;

  query = '';
  selectedCategory = '';

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('mkt.home'),
      description: this.i18n.t('home.slogan'),
    });

    this.startHeroAutoplay();

    if (!isPlatformBrowser(this.platformId)) return;

    this.reload$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loadState.set('loading');
          return forkJoin({
            feed: this.productsApi.home().pipe(
              catchError(() =>
                this.productsApi.list({ limit: 48 }).pipe(
                  map((items) => homeFromCatalog(items)),
                  catchError(() => {
                    this.loadState.set('error');
                    return of(emptyHome());
                  }),
                ),
              ),
            ),
            categories: this.productsApi.categories().pipe(catchError(() => of([] as CategoryMeta[]))),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ feed, categories }) => {
        const counts: Record<string, number> = {};
        for (const c of categories) {
          counts[c.id] = Number(c.productCount) || 0;
        }
        this.categoryIcons.set(buildHomeTiles(counts));

        if (this.loadState() === 'error') {
          this.shops.set([]);
          this.newArrivals.set([]);
          this.promoted.set([]);
          this.bestsellers.set([]);
          return;
        }

        this.shops.set(feed.shops || []);
        this.newArrivals.set(feed.newArrivals || []);
        this.promoted.set(feed.promoted || []);
        this.bestsellers.set(feed.bestsellers || []);
        this.loadState.set('ready');
      });
  }

  ngOnDestroy(): void {
    this.stopHeroAutoplay();
  }

  startHeroAutoplay(): void {
    this.stopHeroAutoplay();
    this.heroTimer = setInterval(() => this.nextSlide(), 6000);
  }

  stopHeroAutoplay(): void {
    if (this.heroTimer) {
      clearInterval(this.heroTimer);
      this.heroTimer = null;
    }
  }

  nextSlide(): void {
    this.heroIndex.update((i) => (i + 1) % HERO_SLIDES.length);
  }

  prevSlide(): void {
    this.heroIndex.update((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    this.startHeroAutoplay();
  }

  goSlide(index: number): void {
    this.heroIndex.set(index);
    this.startHeroAutoplay();
  }

  loadCatalog(): void {
    this.reload$.next();
  }

  search(): void {
    const q = this.query.trim();
    const cat = this.selectedCategory;
    void this.router.navigate(cat ? ['/marketplace', cat] : ['/marketplace'], {
      queryParams: q ? { q } : {},
    });
  }

  searchTag(tag: string): void {
    this.query = tag;
    this.search();
  }

  dismissTag(tag: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.recentTags.update((tags) => tags.filter((t) => t !== tag));
  }

  shopInitial(shop: Creator): string {
    const ch = (shop.name || shop.slug || '?').trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  shopRevenue(shop: Creator): string {
    return this.currencySvc.formatFromUsd(Number(shop.revenue) || 0);
  }
}
