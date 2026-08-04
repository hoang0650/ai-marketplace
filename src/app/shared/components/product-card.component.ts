import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/product', product.slug]" class="ct-card group">
      <div class="ct-card__media">
        <img [src]="product.coverUrl || placeholder" [alt]="product.name" loading="lazy" width="480" height="480" />
        <button type="button" class="ct-card__heart" aria-label="Save" (click)="onHeart($event)">♡</button>
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
  `,
  styles: [
    `
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
        transition: transform 0.35s ease;
      }
      .ct-card:hover .ct-card__media img {
        transform: scale(1.03);
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
        color: #444;
        cursor: pointer;
        font-size: 0.95rem;
        line-height: 1;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
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
        display: flex;
        align-items: center;
        gap: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  readonly placeholder =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="22">AI</text></svg>`,
    );

  get label(): string {
    return categoryLabel(this.product.category);
  }

  get priceLabel(): string {
    const p = this.product.pricing;
    if (p.model === 'free') return 'Free';
    if (p.model === 'usage') return `$${p.usageRate}/${p.usageUnit || '1K tokens'}`;
    if (p.model === 'subscription') return `$${p.price}/${p.interval}`;
    return `$${p.price}`;
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
