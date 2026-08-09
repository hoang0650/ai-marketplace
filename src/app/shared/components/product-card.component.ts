import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    @if (variant === 'shop') {
      <a [routerLink]="['/product', product.slug]" class="shop-card">
        <div class="shop-card__media">
          <img
            [src]="product.coverUrl || placeholder"
            [alt]="product.name"
            [attr.loading]="priority ? 'eager' : 'lazy'"
            [attr.fetchpriority]="priority ? 'high' : null"
            width="400"
            height="400"
          />
          @if (isRunpod) {
            <span class="shop-card__badge">RunPod</span>
          }
        </div>
        <div class="shop-card__body">
          <h3 class="shop-card__title">{{ product.name }}</h3>
          <p class="shop-card__cat">{{ label }}</p>
          <p class="shop-card__price">{{ shopPrice }}</p>
          <div class="shop-card__stats">
            <span class="shop-card__stars">★ {{ product.rating | number: '1.1-1' }}</span>
            <span>Stock {{ stockLabel }}</span>
            <span>Sold {{ product.installCount | number }}</span>
            <button type="button" class="shop-card__cart" aria-label="Add" (click)="onHeart($event)">🛒</button>
          </div>
        </div>
      </a>
    } @else {
      <a [routerLink]="['/product', product.slug]" class="ct-card group">
        <div class="ct-card__media">
          <img
            [src]="product.coverUrl || placeholder"
            [alt]="product.name"
            [attr.loading]="priority ? 'eager' : 'lazy'"
            [attr.fetchpriority]="priority ? 'high' : null"
            width="480"
            height="480"
          />
          <button type="button" class="ct-card__heart" aria-label="Save" (click)="onHeart($event)">♡</button>
          @if (isRunpod) {
            <span class="ct-card__badge">RunPod</span>
          }
          <span class="ct-card__ago">{{ ago }}</span>
          @if (product.gallery.length) {
            <span class="ct-card__shots" aria-hidden="true">📷 {{ product.gallery.length }}</span>
          }
        </div>
        <div class="ct-card__body">
          <h3 class="ct-card__title">{{ product.name }}</h3>
          <p class="ct-card__price">{{ priceLabel }}</p>
          <p class="ct-card__meta">
            <span aria-hidden="true">◎</span>
            {{ label }} · {{ product.creatorName }}
          </p>
        </div>
      </a>
    }
  `,
  styles: [
    `
      /* —— Chợ Tốt style (landing) —— */
      .ct-card {
        display: block;
        text-decoration: none;
        color: inherit;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        overflow: hidden;
        box-shadow: var(--shadow-card);
        border: 1px solid var(--color-line);
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .ct-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
      }
      .ct-card__media {
        position: relative;
        aspect-ratio: 1 / 1;
        background: var(--color-mist);
        overflow: hidden;
      }
      .ct-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ct-card__heart {
        position: absolute;
        top: 0.45rem;
        right: 0.45rem;
        width: 1.85rem;
        height: 1.85rem;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      }
      .ct-card__badge,
      .shop-card__badge {
        position: absolute;
        top: 0.45rem;
        left: 0.45rem;
        padding: 0.18rem 0.45rem;
        border-radius: 999px;
        background: #b8860b;
        color: #1a1a1a;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        z-index: 1;
      }
      .ct-card__ago {
        position: absolute;
        left: 0.45rem;
        bottom: 0.45rem;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: rgba(34, 34, 34, 0.72);
        color: #fff;
        font-size: 0.68rem;
        font-weight: 600;
      }
      .ct-card__shots {
        position: absolute;
        right: 0.45rem;
        bottom: 0.45rem;
        padding: 0.18rem 0.45rem;
        border-radius: 999px;
        background: rgba(34, 34, 34, 0.55);
        color: #fff;
        font-size: 0.65rem;
      }
      .ct-card__body {
        padding: 0.7rem 0.75rem 0.85rem;
      }
      .ct-card__title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 500;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.4em;
      }
      .ct-card__price {
        margin: 0.4rem 0 0;
        color: var(--color-price);
        font-size: 0.98rem;
        font-weight: 700;
      }
      .ct-card__meta {
        margin: 0.35rem 0 0;
        color: var(--color-muted);
        font-size: 0.72rem;
      }

      /* —— GC MMO / shop marketplace style —— */
      .shop-card {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        background: var(--color-surface);
        border: 1px solid var(--color-line);
        border-radius: 12px;
        overflow: hidden;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        height: 100%;
      }
      .shop-card:hover {
        border-color: #ffc9c4;
        box-shadow: 0 6px 18px rgba(229, 57, 53, 0.1);
      }
      .shop-card__media {
        position: relative;
        aspect-ratio: 1 / 1;
        background: #f7f7f7;
        overflow: hidden;
      }
      .shop-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .shop-card__body {
        padding: 0.75rem 0.8rem 0.85rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .shop-card__title {
        margin: 0;
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.5em;
      }
      .shop-card__cat {
        margin: 0.3rem 0 0;
        font-size: 0.75rem;
        color: var(--color-muted);
      }
      .shop-card__price {
        margin: 0.45rem 0 0;
        color: #e53935;
        font-size: 1.05rem;
        font-weight: 800;
      }
      .shop-card__stats {
        margin-top: auto;
        padding-top: 0.55rem;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem 0.65rem;
        font-size: 0.7rem;
        color: var(--color-muted);
        position: relative;
        padding-right: 2.4rem;
      }
      .shop-card__stars {
        color: #f5a623;
        font-weight: 600;
      }
      .shop-card__cart {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: 1.5px solid #e53935;
        background: #fff;
        cursor: pointer;
        font-size: 0.85rem;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .shop-card__cart:hover {
        background: #ffe8e6;
      }
    `,
  ],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() variant: 'default' | 'shop' = 'default';
  @Input() currency: 'USD' | 'VND' = 'USD';
  /** Eager-load cover for above-the-fold cards on home. */
  @Input() priority = false;

  readonly placeholder =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="22">AI</text></svg>`,
    );

  get label(): string {
    return categoryLabel(this.product.category);
  }

  get isRunpod(): boolean {
    return (
      this.product.creatorSlug === 'runpod' ||
      this.product.creatorSlug === 'aimarkets' ||
      this.product.tags?.includes('public-endpoint') ||
      this.product.tags?.includes('aimarkets') ||
      this.product.slug?.startsWith('runpod-')
    );
  }

  get priceLabel(): string {
    const p = this.product.pricing;
    if (p.model === 'free') return 'Free';
    if (p.model === 'usage') return `$${p.usageRate}/${p.usageUnit || '1K tokens'}`;
    if (p.model === 'subscription') return `$${p.price}/${p.interval}`;
    return `$${p.price}`;
  }

  get shopPrice(): string {
    const p = this.product.pricing;
    if (p.model === 'free') return this.currency === 'VND' ? '0 đ' : 'Free';
    let usd = p.model === 'usage' ? Number(p.usageRate) || 0 : Number(p.price) || 0;
    if (this.currency === 'VND') {
      const vnd = Math.round(usd * 25_000);
      return `${vnd.toLocaleString('vi-VN')} đ`;
    }
    if (p.model === 'usage') return `$${usd}/${p.usageUnit || '1K tokens'}`;
    if (p.model === 'subscription') return `$${usd}/${p.interval}`;
    return `$${usd}`;
  }

  get stockLabel(): string {
    // Digital catalog — treat installs as demand signal; stock is always available.
    return '∞';
  }

  get ago(): string {
    const raw = this.product.publishedAt;
    if (!raw) return 'New';
    const ms = Date.now() - new Date(raw).getTime();
    const hours = Math.max(1, Math.floor(ms / 3_600_000));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  onHeart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
