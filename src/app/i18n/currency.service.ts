import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppCurrency = 'USD' | 'VND' | 'CNY';

export const CURRENCIES: Array<{ id: AppCurrency; symbol: string }> = [
  { id: 'USD', symbol: '$' },
  { id: 'VND', symbol: '₫' },
  { id: 'CNY', symbol: '¥' },
];

/** Display conversion from USD list prices. */
const RATE_FROM_USD: Record<AppCurrency, number> = {
  USD: 1,
  VND: 25_000,
  CNY: 7.25,
};

const STORAGE_KEY = 'aimarkets.currency';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly currency = signal<AppCurrency>(this.readInitial());

  setCurrency(code: AppCurrency): void {
    this.currency.set(code);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore */
      }
    }
  }

  /** Convert a USD amount to display currency. */
  convertFromUsd(usd: number, target: AppCurrency = this.currency()): number {
    return usd * RATE_FROM_USD[target];
  }

  formatFromUsd(usd: number, target: AppCurrency = this.currency()): string {
    if (target === 'VND') {
      return `${Math.round(usd * RATE_FROM_USD.VND).toLocaleString('vi-VN')} đ`;
    }
    if (target === 'CNY') {
      const cny = usd * RATE_FROM_USD.CNY;
      return `¥${cny.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatUsageFromUsd(usd: number, unit: string, target: AppCurrency = this.currency()): string {
    return `${this.formatFromUsd(usd, target)}/${unit}`;
  }

  private readInitial(): AppCurrency {
    if (!isPlatformBrowser(this.platformId)) return 'USD';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'USD' || saved === 'VND' || saved === 'CNY') return saved;
    } catch {
      /* ignore */
    }
    return 'USD';
  }
}
