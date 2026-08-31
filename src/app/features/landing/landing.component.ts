import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { environment } from '../../../environments/environment';
import { AI_CATEGORIES } from '../../models/categories';
import { CategoryIconComponent, CategoryIconId } from '../../shared/components/category-icon.component';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

const CATEGORY_ICONS: Array<{
  id: CategoryIconId;
  label: string;
  hubPath: string;
  bg: string;
  accent: string;
  count: number;
  isNew?: boolean;
}> = [
  {
    id: 'text-to-text',
    label: 'Text→Text',
    hubPath: '/text-to-text',
    bg: 'linear-gradient(145deg, #1c1c1e 0%, #3a3a3c 55%, #2c2c2e 100%)',
    accent: 'rgba(255,255,255,0.08)',
    count: 1200,
  },
  {
    id: 'text-to-image',
    label: 'Text→Image',
    hubPath: '/text-to-image',
    bg: 'linear-gradient(145deg, #2a2318 0%, #4a3d2e 55%, #352a20 100%)',
    accent: 'rgba(201,169,97,0.12)',
    count: 890,
  },
  {
    id: 'text-to-video',
    label: 'Text→Video',
    hubPath: '/text-to-video',
    bg: 'linear-gradient(145deg, #141c28 0%, #243a52 55%, #1a2838 100%)',
    accent: 'rgba(120,180,255,0.14)',
    count: 456,
    isNew: true,
  },
  {
    id: 'image-to-video',
    label: 'Img→Video',
    hubPath: '/image-to-video',
    bg: 'linear-gradient(145deg, #221830 0%, #3d2a52 55%, #2a1f3a 100%)',
    accent: 'rgba(180,140,255,0.12)',
    count: 320,
  },
  {
    id: 'inference',
    label: 'Inference',
    hubPath: '/inference',
    bg: 'linear-gradient(145deg, #142018 0%, #1f3d2a 55%, #182820 100%)',
    accent: 'rgba(100,220,160,0.12)',
    count: 2100,
  },
  {
    id: 'api-endpoint',
    label: 'Sell API',
    hubPath: '/api-endpoint',
    bg: 'linear-gradient(145deg, #121e28 0%, #1e3a52 55%, #162430 100%)',
    accent: 'rgba(80,180,255,0.12)',
    count: 780,
  },
  {
    id: 'hire-agent',
    label: 'Agents',
    hubPath: '/hire-agent',
    bg: 'linear-gradient(145deg, #222018 0%, #3d3820 55%, #2a2818 100%)',
    accent: 'rgba(201,169,97,0.14)',
    count: 540,
    isNew: true,
  },
  {
    id: 'skill-pack',
    label: 'Skills',
    hubPath: '/skill-pack',
    bg: 'linear-gradient(145deg, #281e14 0%, #4a3520 55%, #352618 100%)',
    accent: 'rgba(255,180,100,0.1)',
    count: 650,
  },
];

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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly reload$ = new Subject<void>();

  readonly brand = environment.brandName;
  readonly aiCategories = AI_CATEGORIES;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly slides = HERO_SLIDES;
  readonly skeletonSlots = Array.from({ length: 8 }, (_, i) => i);

  readonly loadState = signal<LoadState>('loading');
  readonly featured = signal<Product[]>([]);
  readonly hireProducts = signal<Product[]>([]);
  readonly recentTags = signal(['inference', 'api-endpoint', 'text-to-image', 'gpu']);
  readonly heroIndex = signal(0);

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
          return this.productsApi.list({ limit: 48 }).pipe(
            catchError(() => {
              this.loadState.set('error');
              return of([] as Product[]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        if (this.loadState() === 'error' && !items.length) {
          this.featured.set([]);
          this.hireProducts.set([]);
          return;
        }

        const featured = items
          .filter((p) => !!p.featured)
          .sort(
            (a, b) =>
              (b.rating || 0) - (a.rating || 0) || (b.salesCount || 0) - (a.salesCount || 0),
          )
          .slice(0, 12);

        this.featured.set(featured.length ? featured : items.slice(0, 12));
        this.hireProducts.set(
          items
            .filter((p) => String(p.category).startsWith('hire-') || p.category === 'skill-pack')
            .slice(0, 8),
        );
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
}
