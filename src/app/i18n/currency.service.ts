import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { ExchangeRateQuote } from '../models/marketplace.models';

export type AppCurrency = 'USD' | 'VND' | 'CNY';

export const CURRENCIES: Array<{ id: AppCurrency; symbol: string }> = [
  { id: 'USD', symbol: '$' },
  { id: 'VND', symbol: '₫' },
  { id: 'CNY', symbol: '¥' },
];

/**
 * Display conversion from USD list prices (Quy chế 2.1: prices/balances shown in VND, USD or CNY).
 * VND and CNY come from the public quote (`GET /v1/exchange-rates`). These two numbers are used
 * only until that response arrives, and again if the request fails and nothing is cached.
 */
export const FALLBACK_VND_PER_USD = 26_500;
export const FALLBACK_CNY_PER_USD = 7.25;

const STORAGE_KEY = 'aimarkets.currency';
const CACHE_KEY = 'aimarkets.exchange-rates';
/** Matches the API memory cache (EXCHANGE_RATE_TTL_MS, default 1 hour). */
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedExchangeRates extends ExchangeRateQuote {
  savedAt: number;
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

function asQuote(body: Partial<ExchangeRateQuote> | null | undefined): ExchangeRateQuote | null {
  if (!body) return null;
  const vnd = Number(body.vndPerUsd);
  const cny = Number(body.cnyPerUsd);
  if (!inRange(vnd, 1000, 100_000) || !inRange(cny, 1, 30)) return null;
  const updated = body.updatedAt;
  return {
    vndPerUsd: vnd,
    cnyPerUsd: cny,
    source: String(body.source || 'exchangerate-api'),
    updatedAt: typeof updated === 'string' && updated ? updated : null,
  };
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  readonly currency = signal<AppCurrency>(this.readInitial());
  /** Latest quote. Starts at the fallback and updates when the endpoint (or a fresh cache) is applied. */
  readonly quote = signal<ExchangeRateQuote>(this.fallbackQuote());
  private loadStarted = false;

  constructor() {
    const cached = this.readCache();
    if (cached) this.quote.set(cached);
    const fresh = cached != null && Date.now() - this.savedAt < CACHE_TTL_MS;
    if (fresh || !isPlatformBrowser(this.platformId)) return;
    // After construction, so the HTTP interceptors are not entered mid-injection.
    queueMicrotask(() => this.loadRates());
  }

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

  /** VND per 1 USD. Fallback until GET /v1/exchange-rates returns. */
  vndPerUsd(): number {
    return this.quote().vndPerUsd;
  }

  /** CNY per 1 USD. Fallback until GET /v1/exchange-rates returns. */
  cnyPerUsd(): number {
    return this.quote().cnyPerUsd;
  }

  /** Convert a USD amount to display currency. */
  convertFromUsd(usd: number, target: AppCurrency = this.currency()): number {
    return usd * this.rate(target);
  }

  formatFromUsd(usd: number, target: AppCurrency = this.currency()): string {
    if (target === 'VND') {
      return `${Math.round(usd * this.rate('VND')).toLocaleString('vi-VN')} đ`;
    }
    if (target === 'CNY') {
      const cny = usd * this.rate('CNY');
      return `¥${cny.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /** VND → USD using the current display rate. */
  vndToUsd(vnd: number): number {
    return (Number(vnd) || 0) / this.rate('VND');
  }

  /** Wallet amounts: whole đồng for VND; otherwise cents, with sub-cent amounts kept readable. */
  formatAmount(amount: number, currency: string): string {
    const v = Math.abs(Number(amount) || 0);
    const code = String(currency || 'USD').toUpperCase();
    if (code === 'VND') return `${Math.round(v).toLocaleString('vi-VN')} đ`;
    const digits = v > 0 && v < 0.01 ? Math.min(8, Math.max(3, 2 - Math.floor(Math.log10(v)))) : 2;
    const text = v.toLocaleString(code === 'CNY' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits });
    return code === 'CNY' ? `¥${text}` : code === 'USD' ? `$${text}` : `${text} ${code}`;
  }

  formatUsageFromUsd(usd: number, unit: string, target: AppCurrency = this.currency()): string {
    return `${this.formatRateFromUsd(usd, target)}/${unit}`;
  }

  /**
   * Like formatFromUsd, but keeps sub-cent amounts readable ($0.001763 → $0.00176, not $0.00):
   * values under one cent (or one fen, or 10 đ) show 3 significant digits. The API's game player
   * page uses the same rule, so a rate reads the same on the product page and while playing.
   */
  formatRateFromUsd(usd: number, target: AppCurrency = this.currency()): string {
    const v = Number(usd) || 0;
    if (target === 'VND') {
      const vnd = v * this.rate('VND');
      if (vnd > 0 && vnd < 10) return `${vnd.toLocaleString('vi-VN', { maximumSignificantDigits: 3 })} đ`;
      return this.formatFromUsd(v, target);
    }
    const amount = target === 'CNY' ? v * this.rate('CNY') : v;
    if (amount <= 0 || amount >= 0.01) return this.formatFromUsd(v, target);
    const digits = Math.min(8, Math.max(3, 2 - Math.floor(Math.log10(amount))));
    const text = amount.toLocaleString(target === 'CNY' ? 'zh-CN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    });
    return target === 'CNY' ? `¥${text}` : `$${text}`;
  }

  private fallbackQuote(): ExchangeRateQuote {
    return {
      vndPerUsd: FALLBACK_VND_PER_USD,
      cnyPerUsd: FALLBACK_CNY_PER_USD,
      source: 'fallback',
      updatedAt: null,
    };
  }

  /** Reads the quote signal so templates refresh when the endpoint responds. */
  private rate(target: AppCurrency): number {
    const q = this.quote();
    if (target === 'VND') return q.vndPerUsd;
    if (target === 'CNY') return q.cnyPerUsd;
    return 1;
  }

  private savedAt = 0;

  private readCache(): ExchangeRateQuote | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CachedExchangeRates>;
      const quote = asQuote(parsed);
      const savedAt = Number(parsed.savedAt);
      if (!quote || !Number.isFinite(savedAt) || savedAt <= 0) return null;
      this.savedAt = savedAt;
      return quote;
    } catch {
      return null;
    }
  }

  private writeCache(quote: ExchangeRateQuote): void {
    this.savedAt = Date.now();
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const row: CachedExchangeRates = { ...quote, savedAt: this.savedAt };
      localStorage.setItem(CACHE_KEY, JSON.stringify(row));
    } catch {
      /* ignore */
    }
  }

  private loadRates(): void {
    if (this.loadStarted) return;
    this.loadStarted = true;
    this.http.get<Partial<ExchangeRateQuote>>(`${environment.apiUrl}/exchange-rates`).subscribe({
      next: (body) => {
        const quote = asQuote(body);
        if (!quote) return;
        this.quote.set(quote);
        this.writeCache(quote);
      },
      error: () => {
        /* keep the fallback, or the last cached quote */
      },
    });
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
