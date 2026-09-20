import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, CreatorService, ProductService, ReviewService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { Creator, Product, Review } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';

type SortId = 'newest' | 'bestsellers' | 'price-asc' | 'price-desc' | 'rating';

function priceValue(p: Product): number {
  const pr = p.pricing;
  if (!pr || pr.model === 'free') return 0;
  if (pr.model === 'usage') return Number(pr.usageRate) || 0;
  return Number(pr.price) || 0;
}

@Component({
  selector: 'app-creator-store',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe, TPipe, ProductCardComponent],
  templateUrl: './creator-store.component.html',
  styleUrl: './creator-store.component.scss',
})
export class CreatorStoreComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly creatorsApi = inject(CreatorService);
  private readonly productsApi = inject(ProductService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly chatApi = inject(ChatService);
  private readonly seo = inject(SeoService);
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  readonly creator = signal<Creator | null>(null);
  readonly products = signal<Product[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly filtered = signal<Product[]>([]);
  readonly view = signal<'grid' | 'list'>('grid');
  readonly statusMsg = signal('');
  readonly chatStarting = signal(false);

  sort: SortId = 'newest';
  query = '';
  category = '';
  showPolicy = false;

  readonly shopCategories = computed(() => {
    const set = new Set(this.products().map((p) => p.category));
    return [...set];
  });

  readonly reviewCount = computed(() => this.reviews().length || Number(this.creator()?.reviewCount) || 0);

  readonly ratingBars = computed(() => {
    const rows = this.reviews();
    const total = rows.length || 1;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = rows.filter((r) => Math.round(r.rating) === star).length;
      return { star, count, pct: Math.round((count / total) * 100) };
    });
  });

  readonly isOwner = computed(() => {
    const c = this.creator();
    const u = this.auth.user();
    if (!c || !u) return false;
    return String(u.id) === String(c.id) || (!!u.creatorSlug && u.creatorSlug === c.slug);
  });

  readonly joinedYear = computed(() => {
    const raw = this.creator()?.joinedAt;
    if (!raw) return '';
    const y = new Date(raw).getFullYear();
    return Number.isFinite(y) ? String(y) : '';
  });

  readonly placeholderCover =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a1a1a"/><stop offset="1" stop-color="#111"/></linearGradient></defs><rect fill="url(#g)" width="100%" height="100%"/></svg>`,
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
      this.reviewsApi.list(undefined, slug).subscribe((rows) => this.reviews.set(rows));
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
      rows = rows.filter((p) => `${p.name} ${p.tagline || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q));
    }
    switch (this.sort) {
      case 'bestsellers':
        rows.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
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
      default:
        rows.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
        break;
    }
    this.filtered.set(rows);
  }

  catKey(cat: string): string {
    const key = `cat.${cat}.label`;
    const label = this.i18n.t(key);
    return label === key ? categoryLabel(cat) : label;
  }

  stars(n: number): string {
    const v = Math.max(0, Math.min(5, Math.round(n)));
    return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
  }

  share(): void {
    const url = typeof location !== 'undefined' ? location.href : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      void navigator.clipboard.writeText(url);
      this.statusMsg.set(this.i18n.t('shop.copied'));
    } else {
      this.statusMsg.set(this.i18n.t('shop.shareHint'));
    }
    setTimeout(() => this.statusMsg.set(''), 2200);
  }

  openSellerChat(): void {
    const c = this.creator();
    if (!c) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.isOwner()) {
      this.statusMsg.set(this.i18n.t('chat.self'));
      setTimeout(() => this.statusMsg.set(''), 2200);
      return;
    }
    const top = [...this.products()].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))[0];
    if (!top) {
      this.statusMsg.set(this.i18n.t('shop.noProducts'));
      setTimeout(() => this.statusMsg.set(''), 2200);
      return;
    }
    this.chatStarting.set(true);
    this.chatApi.start({ productId: top.id }).subscribe({
      next: (convo) => {
        this.chatStarting.set(false);
        void this.router.navigate(['/messages', convo.id]);
      },
      error: (err) => {
        this.chatStarting.set(false);
        this.statusMsg.set(err?.error?.message || this.i18n.t('chat.err.send'));
        setTimeout(() => this.statusMsg.set(''), 2800);
      },
    });
  }
}
