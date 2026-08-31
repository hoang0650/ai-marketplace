import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../models/marketplace.models';
import { I18nService } from '../../i18n/i18n.service';
import { AppCurrency, CurrencyService } from '../../i18n/currency.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe, TPipe],
  template: `
    @if (variant === 'luxury' && layout === 'list') {
      <a [routerLink]="['/product', product.slug]" class="lux-list">
        <div class="lux-list__thumb">
          <img
            [src]="product.coverUrl || placeholder"
            [alt]="product.name"
            loading="lazy"
            width="112"
            height="112"
          />
          @if (onSale) {
            <span class="lux-list__sale">Sale</span>
          }
        </div>
        <div class="lux-list__main">
          <div class="lux-list__tags">
            <span class="lux-list__cat">{{ label }}</span>
            @if (product.featured) {
              <span class="lux-list__feat">{{ 'card.featured' | t }}</span>
            }
          </div>
          <h3 class="lux-list__title">{{ product.name }}</h3>
          @if (product.tagline) {
            <p class="lux-list__tagline">{{ product.tagline }}</p>
          }
          <div class="lux-list__meta">
            <span class="lux-list__creator">{{ product.creatorName }}</span>
            <span class="lux-list__rating">★ {{ product.rating | number: '1.1-1' }}</span>
            <span>{{ 'card.sold' | t: { n: (product.salesCount || 0) } }}</span>
            <span class="lux-list__ago">{{ ago }}</span>
          </div>
        </div>
        <div class="lux-list__side">
          <p class="lux-list__price">
            @if (onSale) {
              <span class="lux-list__was">{{ wasPrice }}</span>
            }
            {{ shopPrice }}
          </p>
          <span class="lux-list__cta">{{ 'card.view' | t }} →</span>
        </div>
      </a>
    } @else if (variant === 'luxury') {
      <a [routerLink]="['/product', product.slug]" class="lux-card">
        <div class="lux-card__media">
          <img
            [src]="product.coverUrl || placeholder"
            [alt]="product.name"
            [attr.loading]="priority ? 'eager' : 'lazy'"
            [attr.fetchpriority]="priority ? 'high' : null"
            width="400"
            height="500"
          />
          @if (onSale) {
            <span class="lux-card__sale">Sale</span>
          }
          <div class="lux-card__actions">
            <button type="button" class="lux-card__btn" [attr.aria-label]="'card.addCart' | t" (click)="onHeart($event)">
              {{ 'card.addCart' | t }}
            </button>
            <button type="button" class="lux-card__wish" [attr.aria-label]="'card.wishlist' | t" (click)="onHeart($event)">♡</button>
          </div>
        </div>
        <div class="lux-card__body">
          <h3 class="lux-card__title">{{ product.name }}</h3>
          <p class="lux-card__price">
            @if (onSale) {
              <span class="lux-card__was">{{ wasPrice }}</span>
            }
            {{ shopPrice }}
          </p>
        </div>
      </a>
    } @else if (variant === 'shop') {
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
            <span>{{ 'card.stock' | t: { n: stockLabel } }}</span>
            <span>{{ 'card.sold' | t: { n: (product.salesCount || 0) } }}</span>
            <button type="button" class="shop-card__cart" [attr.aria-label]="'card.add' | t" (click)="onHeart($event)">🛒</button>
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
          <button type="button" class="ct-card__heart" [attr.aria-label]="'card.save' | t" (click)="onHeart($event)">♡</button>
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
            {{ label }} · {{ 'card.sold' | t: { n: (product.salesCount || 0) } }}
          </p>
        </div>
      </a>
    }
  `,
  styles: [
    `
      /* —— Luxury Shop style —— */
      .lux-card {
        display: block;
        text-decoration: none;
        color: inherit;
        background: var(--color-surface);
        overflow: hidden;
        transition: transform 0.2s ease;
      }
      .lux-card:hover {
        transform: translateY(-4px);
      }
      .lux-card__media {
        position: relative;
        aspect-ratio: 3 / 4;
        background: var(--color-mist);
        overflow: hidden;
      }
      .lux-card__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
      }
      .lux-card:hover .lux-card__media img {
        transform: scale(1.05);
      }
      .lux-card__sale {
        position: absolute;
        top: 0.65rem;
        left: 0.65rem;
        padding: 0.2rem 0.55rem;
        background: var(--color-lux-gold, #c9a961);
        color: #111;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        z-index: 1;
      }
      .lux-card__actions {
        position: absolute;
        inset: auto 0 0;
        display: flex;
        align-items: stretch;
        opacity: 0;
        transform: translateY(100%);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .lux-card:hover .lux-card__actions {
        opacity: 1;
        transform: translateY(0);
      }
      .lux-card__btn {
        flex: 1;
        appearance: none;
        border: 0;
        background: var(--color-lux-dark, #111);
        color: #fff;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 0.75rem 0.5rem;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .lux-card__btn:hover {
        background: var(--color-lux-gold, #c9a961);
        color: #111;
      }
      .lux-card__wish {
        appearance: none;
        border: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.15);
        background: var(--color-lux-dark, #111);
        color: #fff;
        width: 2.75rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .lux-card__wish:hover {
        background: var(--color-lux-gold, #c9a961);
        color: #111;
      }
      .lux-card__body {
        padding: 0.85rem 0.25rem 0.5rem;
        text-align: center;
      }
      .lux-card__title {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 400;
        letter-spacing: 0.02em;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.5em;
      }
      .lux-card__price {
        margin: 0.45rem 0 0;
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--color-ink);
        letter-spacing: 0.02em;
      }
      .lux-card__was {
        text-decoration: line-through;
        color: var(--color-muted);
        font-weight: 400;
        margin-right: 0.35rem;
        font-size: 0.82rem;
      }

      /* —— Luxury list row (marketplace) —— */
      .lux-list {
        display: grid;
        grid-template-columns: 5.5rem minmax(0, 1fr) auto;
        gap: 0.85rem 1rem;
        align-items: center;
        padding: 0.65rem 0.85rem;
        text-decoration: none;
        color: inherit;
        background: var(--color-surface);
        border: 1px solid var(--color-line);
        border-radius: 12px;
        transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
      }
      .lux-list:hover {
        border-color: var(--color-lux-gold, #c9a961);
        box-shadow: 0 4px 16px rgba(201, 169, 97, 0.12);
        transform: translateY(-1px);
      }
      .lux-list__thumb {
        position: relative;
        width: 5.5rem;
        height: 5.5rem;
        border-radius: 10px;
        overflow: hidden;
        background: var(--color-mist);
        flex-shrink: 0;
      }
      .lux-list__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .lux-list__sale {
        position: absolute;
        top: 0.35rem;
        left: 0.35rem;
        padding: 0.12rem 0.4rem;
        background: var(--color-lux-gold, #c9a961);
        color: #111;
        font-size: 0.58rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border-radius: 4px;
      }
      .lux-list__main {
        min-width: 0;
      }
      .lux-list__tags {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 0.2rem;
      }
      .lux-list__cat {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--color-lux-gold, #c9a961);
      }
      .lux-list__feat {
        font-size: 0.62rem;
        font-weight: 700;
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
        background: var(--color-mist);
        color: var(--color-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .lux-list__title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lux-list__tagline {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: var(--color-muted);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lux-list__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem 0.65rem;
        margin-top: 0.35rem;
        font-size: 0.72rem;
        color: var(--color-muted);
      }
      .lux-list__creator {
        font-weight: 600;
        color: var(--color-ink);
      }
      .lux-list__rating {
        color: #c9a227;
        font-weight: 600;
      }
      .lux-list__ago {
        margin-left: auto;
      }
      .lux-list__side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.35rem;
        text-align: right;
        flex-shrink: 0;
      }
      .lux-list__price {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--color-ink);
        white-space: nowrap;
      }
      .lux-list__was {
        display: block;
        text-decoration: line-through;
        color: var(--color-muted);
        font-weight: 400;
        font-size: 0.75rem;
        margin-bottom: 0.1rem;
      }
      .lux-list__cta {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--color-lux-gold, #c9a961);
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 0.18s ease, transform 0.18s ease;
      }
      .lux-list:hover .lux-list__cta {
        opacity: 1;
        transform: translateX(0);
      }
      @media (max-width: 640px) {
        .lux-list {
          grid-template-columns: 4.25rem minmax(0, 1fr);
          grid-template-rows: auto auto;
          gap: 0.35rem 0.65rem;
          padding: 0.55rem 0.65rem;
        }
        .lux-list__thumb {
          width: 4.25rem;
          height: 4.25rem;
          grid-row: 1 / span 2;
          align-self: start;
        }
        .lux-list__main {
          grid-column: 2;
          grid-row: 1;
        }
        .lux-list__tagline {
          display: none;
        }
        .lux-list__meta {
          margin-top: 0.25rem;
          gap: 0.3rem 0.5rem;
        }
        .lux-list__side {
          grid-column: 2;
          grid-row: 2;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding-top: 0.15rem;
          border-top: 1px solid var(--color-line);
        }
        .lux-list__meta .lux-list__ago {
          display: none;
        }
        .lux-list__price {
          font-size: 0.88rem;
        }
        .lux-list__was {
          display: inline;
          margin-right: 0.35rem;
          margin-bottom: 0;
        }
        .lux-list__cta {
          opacity: 1;
          transform: none;
          font-size: 0.68rem;
        }
      }

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
  private readonly i18n = inject(I18nService);
  private readonly currencySvc = inject(CurrencyService);
  @Input({ required: true }) product!: Product;
  @Input() variant: 'default' | 'shop' | 'luxury' = 'default';
  @Input() layout: 'grid' | 'list' = 'grid';
  @Input() currency: AppCurrency = 'USD';
  /** Eager-load cover for above-the-fold cards on home. */
  @Input() priority = false;

  readonly placeholder =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="22">AI</text></svg>`,
    );

  get label(): string {
    return this.i18n.catLabel(this.product.category);
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
    if (p.model === 'free') return this.i18n.t('card.free');
    if (p.model === 'usage') return `$${p.usageRate}/${p.usageUnit || '1K tokens'}`;
    if (p.model === 'subscription') return `$${p.price}/${p.interval}`;
    return `$${p.price}`;
  }

  get onSale(): boolean {
    return !!this.product.featured || (this.product.salesCount || 0) > 50;
  }

  get wasPrice(): string {
    const p = this.product.pricing;
    if (p.model === 'free') return '';
    const usd = p.model === 'usage' ? Number(p.usageRate) || 0 : Number(p.price) || 0;
    const inflated = Math.round(usd * 1.25 * 100) / 100;
    return this.currencySvc.formatFromUsd(inflated, this.currency);
  }

  get shopPrice(): string {
    const p = this.product.pricing;
    if (p.model === 'free') {
      return this.currency === 'VND' ? '0 đ' : this.i18n.t('card.free');
    }
    const usd = p.model === 'usage' ? Number(p.usageRate) || 0 : Number(p.price) || 0;
    if (p.model === 'usage') {
      return this.currencySvc.formatUsageFromUsd(usd, p.usageUnit || '1K tokens', this.currency);
    }
    if (p.model === 'subscription') {
      return `${this.currencySvc.formatFromUsd(usd, this.currency)}/${p.interval}`;
    }
    return this.currencySvc.formatFromUsd(usd, this.currency);
  }

  get stockLabel(): string {
    // Digital catalog — treat installs as demand signal; stock is always available.
    return '∞';
  }

  get ago(): string {
    const raw = this.product.publishedAt;
    if (!raw) return this.i18n.t('card.new');
    const ms = Date.now() - new Date(raw).getTime();
    const hours = Math.max(1, Math.floor(ms / 3_600_000));
    if (hours < 24) return this.i18n.t('card.agoH', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return this.i18n.t('card.agoD', { n: days });
    return this.i18n.t('card.agoM', { n: Math.floor(days / 30) });
  }

  onHeart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
