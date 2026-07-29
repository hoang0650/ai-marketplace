import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Product } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <a [routerLink]="['/product', product.slug]" class="product-card group block no-underline">
      <div class="media overflow-hidden">
        <img [src]="product.coverUrl" [alt]="product.name" loading="lazy" width="640" height="400" />
      </div>
      <div class="p-4">
        <p class="text-xs uppercase tracking-[0.18em] text-muted">{{ label }}</p>
        <h3 class="mt-1 font-display text-xl text-ink group-hover:text-accent">{{ product.name }}</h3>
        <p class="mt-1 line-clamp-2 text-sm text-muted">{{ product.tagline }}</p>
        <div class="mt-4 flex items-center justify-between text-sm">
          <span class="text-ink">{{ priceLabel }}</span>
          <span class="text-muted">★ {{ product.rating | number: '1.1-1' }}</span>
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      .product-card {
        border: 1px solid var(--color-line);
        border-radius: 1.25rem;
        background: color-mix(in srgb, var(--color-paper) 88%, var(--color-mist));
        overflow: hidden;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .product-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-line));
        transform: translateY(-2px);
      }
      .media {
        aspect-ratio: 16 / 10;
        background: var(--color-mist);
      }
      .media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  get label(): string {
    return categoryLabel(this.product.category);
  }

  get priceLabel(): string {
    const p = this.product.pricing;
    if (p.model === 'free') return 'Free';
    if (p.model === 'usage') return `$${p.usageRate}/${p.usageUnit}`;
    if (p.model === 'subscription') return `$${p.price}/${p.interval}`;
    return `$${p.price}`;
  }
}
