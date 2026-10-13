import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AffiliateConfig,
  AffiliateLink,
  AffiliateStats,
  PitCommitment,
  SellerAffiliateStats,
} from '../models/marketplace.models';

const COOKIE = 'aim_aff';

/**
 * Affiliate program client. Tracks `?ref=CODE` visits on product/store pages (last click wins),
 * keeps the click id in a first-party cookie for the attribution window and hands it to checkout.
 */
@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly base = `${environment.apiUrl}/affiliate`;
  private started = false;

  /** Call once from the shell; safe on the server (no-op). */
  startTracking(): void {
    if (!this.browser || this.started) return;
    this.started = true;
    this.trackUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.trackUrl(e.urlAfterRedirects));
  }

  private trackUrl(url: string): void {
    const tree = this.router.parseUrl(url);
    const code = String(tree.queryParams['ref'] || '').trim();
    if (!code) return;
    const segs = tree.root.children['primary']?.segments.map((s) => s.path) || [];
    const body: Record<string, string> = { code, landing: url.slice(0, 500) };
    if (segs[0] === 'product' && segs[1]) body['productSlug'] = segs[1];
    else if (segs[0] === 'store' && segs[1]) body['storeSlug'] = segs[1];
    else return;
    this.http
      .post<{ ok: boolean; clickId?: string; attributionDays?: number; expiresAt?: string }>(`${this.base}/click`, body)
      .subscribe({
        next: (r) => {
          if (r.ok && r.clickId) this.saveClick(r.clickId, r.expiresAt, r.attributionDays || 30);
        },
        error: () => undefined,
      });
  }

  private saveClick(clickId: string, expiresAt: string | undefined, days: number): void {
    const maxAge = expiresAt
      ? Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      : days * 86400;
    document.cookie = `${COOKIE}=${encodeURIComponent(clickId)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${
      location.protocol === 'https:' ? '; Secure' : ''
    }`;
  }

  /** Last-click id for checkout (undefined when none or on the server). */
  currentClickId(): string | undefined {
    if (!this.browser) return undefined;
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : undefined;
  }

  dashboard(): Observable<AffiliateStats> {
    return this.http.get<AffiliateStats>(this.base);
  }

  config(): Observable<AffiliateConfig> {
    return this.http.get<AffiliateConfig>(`${this.base}/config`);
  }

  link(target: { productId?: string; productSlug?: string; storeSlug?: string }): Observable<AffiliateLink> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(target)) if (v) params[k] = v;
    return this.http.get<AffiliateLink>(`${this.base}/link`, { params });
  }

  seller(): Observable<SellerAffiliateStats> {
    return this.http.get<SellerAffiliateStats>(`${this.base}/seller`);
  }

  setDefaultRate(rate: number): Observable<{ defaultRate: number }> {
    return this.http.put<{ defaultRate: number }>(`${this.base}/seller/default-rate`, { rate });
  }

  /** Affiliate withdrawal (wallet currency, USD): min 2,000,000 VND, 10% PIT unless Mẫu 08 approved. */
  withdraw(amount: number): Observable<{ quote?: { gross: number; tax: number; net: number } }> {
    return this.http.post<{ quote?: { gross: number; tax: number; net: number } }>(`${environment.apiUrl.replace(/\/$/, '')}/wallet/withdraw`, {
      amount,
      persona: 'affiliate',
    });
  }

  /* Cam kết Mẫu 08/CK-TNCN (PIT commitment): upload -> submit -> admin approves. */
  pitCommitment(): Observable<PitCommitment> {
    return this.http.get<PitCommitment>(`${this.base}/pit-commitment`);
  }

  uploadPitCommitment(file: File): Observable<PitCommitment> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<PitCommitment>(`${this.base}/pit-commitment/document`, fd);
  }

  submitPitCommitment(body: { year: number; personalTaxCode: string }): Observable<PitCommitment> {
    return this.http.post<PitCommitment>(`${this.base}/pit-commitment/submit`, body);
  }

  pitCommitmentDocument(userId?: string): Observable<{ url: string; expiresIn: number }> {
    const params: Record<string, string> = userId ? { userId } : {};
    return this.http.get<{ url: string; expiresIn: number }>(`${this.base}/pit-commitment/document`, { params });
  }

  adminPitCommitments(status = 'pending'): Observable<PitCommitment[]> {
    return this.http.get<PitCommitment[]>(`${this.base}/admin/pit-commitments`, { params: { status } });
  }

  reviewPitCommitment(userId: string, decision: 'approved' | 'rejected', reason = ''): Observable<PitCommitment> {
    return this.http.post<PitCommitment>(`${this.base}/admin/pit-commitments/${encodeURIComponent(userId)}/review`, { decision, reason });
  }
}
