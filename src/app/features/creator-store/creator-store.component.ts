import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatorService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Creator, Product, ProductCategory } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';

type SortId = 'newest' | 'bestsellers' | 'price-asc' | 'price-desc' | 'rating';

function priceValue(p: Product): number {
  const pr = p.pricing;
  if (pr.model === 'free') return 0;
  if (pr.model === 'usage') return Number(pr.usageRate) || 0;
  return Number(pr.price) || 0;
}

@Component({
  selector: 'app-creator-store',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './creator-store.component.html',
  styleUrl: './creator-store.component.scss',
})
export class CreatorStoreComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly creatorsApi = inject(CreatorService);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly creator = signal<Creator | null>(null);
  readonly products = signal<Product[]>([]);
  readonly filtered = signal<Product[]>([]);
  readonly view = signal<'grid' | 'list'>('grid');
  readonly followed = signal(false);
  readonly statusMsg = signal('');
  readonly categoryLabel = categoryLabel;

  sort: SortId = 'newest';
  query = '';
  category = '';
  priceMin: number | null = null;
  priceMax: number | null = null;
  filterAuto = false;
  filterStock = true;
  filterWarranty = false;
  filterBest = false;
  filterHighRating = false;
  showPolicy = false;

  readonly shopCategories = computed(() => {
    const set = new Set(this.products().map((p) => p.category));
    return [...set];
  });

  readonly reviewCount = computed(() => {
    const list = this.products();
    return list.reduce((s, p) => s + (p.reviewCount || 0), 0);
  });

  readonly followers = computed(() => {
    const c = this.creator();
    if (!c) return 0;
    return Math.max(6, Math.round((c.totalSales || 0) * 0.4) + c.productCount * 2);
  });

  readonly orders30d = computed(() => {
    const c = this.creator();
    return Math.max(c?.totalSales || 0, Math.min(99, (c?.productCount || 0) * 3));
  });

  readonly completionRate = computed(() => {
    const c = this.creator();
    if (!c) return 0;
    return Math.min(100, 25 + Math.round((c.totalSales || 0) * 5));
  });

  readonly joinedLabel = '2026';

  readonly placeholderCover =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#333"/><stop offset="1" stop-color="#111"/></linearGradient></defs><rect fill="url(#g)" width="100%" height="100%"/></svg>`,
    );

  readonly placeholderAvatar =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="54%" text-anchor="middle" fill="#999" font-size="48" font-family="sans-serif">S</text></svg>`,
    );

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('creatorSlug') || '';
      this.creatorsApi.bySlug(slug).subscribe((c) => {
        this.creator.set(c);
        this.seo.set({ title: `${c.name} · Shop`, description: c.bio, image: c.coverUrl });
      });
      this.productsApi.list({ creatorSlug: slug }).subscribe((items) => {
        this.products.set(items);
        this.applyLocal();
      });
    });
  }

  setCategory(cat: string): void {
    this.category = cat;
    this.applyLocal();
  }

  applyLocal(): void {
    let rows = [...this.products()];
    const q = this.query.trim().toLowerCase();
    if (this.category) rows = rows.filter((p) => p.category === this.category);
    if (q) {
      rows = rows.filter((p) =>
        `${p.name} ${p.tagline} ${p.tags.join(' ')}`.toLowerCase().includes(q),
      );
    }
    if (this.priceMin != null && this.priceMin > 0) {
      rows = rows.filter((p) => priceValue(p) >= this.priceMin!);
    }
    if (this.priceMax != null && this.priceMax > 0) {
      rows = rows.filter((p) => priceValue(p) <= this.priceMax!);
    }
    if (this.filterBest) rows = rows.filter((p) => !!p.featured || p.installCount > 20);
    if (this.filterHighRating) rows = rows.filter((p) => (p.rating || 0) >= 4);
    // filterStock / filterAuto / filterWarranty are display badges for digital goods — keep all when on
    if (this.filterAuto) rows = rows.filter((p) => !!p.runtime?.serverlessEndpoint || !!p.runtime?.publicEndpoint);

    switch (this.sort) {
      case 'bestsellers':
        rows.sort((a, b) => (b.installCount || 0) - (a.installCount || 0));
        break;
      case 'price-asc':
        rows.sort((a, b) => priceValue(a) - priceValue(b));
        break;
      case 'price-desc':
        rows.sort((a, b) => priceValue(b) - priceValue(a));
        break;
      case 'rating':
        rows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      default:
        rows.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
        break;
    }
    this.filtered.set(rows);
  }

  priceOf(p: Product): string {
    const pr = p.pricing;
    if (pr.model === 'free') return 'Free';
    if (pr.model === 'usage') return `$${pr.usageRate}/${pr.usageUnit || 'unit'}`;
    if (pr.model === 'subscription') return `$${pr.price}/${pr.interval}`;
    return `$${pr.price}`;
  }

  toggleFollow(): void {
    this.followed.update((v) => !v);
    this.statusMsg.set(this.followed() ? 'Following this shop.' : 'Unfollowed.');
    setTimeout(() => this.statusMsg.set(''), 2200);
  }

  share(): void {
    const url = typeof location !== 'undefined' ? location.href : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      void navigator.clipboard.writeText(url);
      this.statusMsg.set('Shop link copied.');
    } else {
      this.statusMsg.set('Share this page URL with buyers.');
    }
    setTimeout(() => this.statusMsg.set(''), 2200);
  }

  // expose for template typing
  asCategory(cat: string): ProductCategory {
    return cat as ProductCategory;
  }
}
