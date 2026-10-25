import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppCurrency = 'USD' | 'VND' | 'CNY';

export const CURRENCIES: Array<{ id: AppCurrency; symbol: string }> = [
  { id: 'USD', symbol: '$' },
  { id: 'VND', symbol: '₫' },
  { id: 'CNY', symbol: '¥' },
];

/**
 * Display conversion from USD list prices (Quy chế 2.1: prices/balances shown in VND, USD or CNY).
 * VND is refreshed from the API top-up rate (`/v1/payments/gpay/config` → vndPerUsd) when known,
 * so the displayed VND matches what a GPay top-up credits.
 */
const RATE_FROM_USD: Record<AppCurrency, number> = {
  USD: 1,
  VND: 26_500,
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

  /** Align the VND display rate with the API top-up rate. Ignores invalid values. */
  setVndPerUsd(rate: number): void {
    const r = Number(rate);
    if (Number.isFinite(r) && r > 1000 && r < 100_000) RATE_FROM_USD.VND = r;
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

  /** VND → USD using the current display rate. */
  vndToUsd(vnd: number): number {
    return (Number(vnd) || 0) / RATE_FROM_USD.VND;
  }

  formatUsageFromUsd(usd: number, unit: string, target: AppCurrency = this.currency()): string {
    return `${this.formatRateFromUsd(usd, target)}/${unit}`;
  }

  /**
   * Like formatFromUsd, but keeps sub-cent unit rates readable ($0.00174 → $0.0017, not $0.00):
   * values under one cent (or one fen) show 2 significant digits.
   */
  formatRateFromUsd(usd: number, target: AppCurrency = this.currency()): string {
    const v = Number(usd) || 0;
    if (target === 'VND') {
      const vnd = v * RATE_FROM_USD.VND;
      if (vnd > 0 && vnd < 10) return `${vnd.toLocaleString('vi-VN', { maximumSignificantDigits: 2 })} đ`;
      return this.formatFromUsd(v, target);
    }
    const amount = target === 'CNY' ? v * RATE_FROM_USD.CNY : v;
    if (amount <= 0 || amount >= 0.01) return this.formatFromUsd(v, target);
    const digits = Math.min(8, Math.max(3, 1 - Math.floor(Math.log10(amount))));
    const text = amount.toLocaleString(target === 'CNY' ? 'zh-CN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    });
    return target === 'CNY' ? `¥${text}` : `$${text}`;
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
