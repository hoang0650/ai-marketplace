import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AffiliateService } from '../../services/affiliate.service';
import { SeoService } from '../../services/seo.service';
import { AffiliateLink, AffiliateStats } from '../../models/marketplace.models';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { CurrencyService } from '../../i18n/currency.service';

/** Parse a pasted product/store URL or slug into a link target. */
export function parseAffiliateTarget(raw: string): { productSlug?: string; storeSlug?: string } | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/\/(product|store)\/([^/?#]+)/);
  if (m) return m[1] === 'product' ? { productSlug: decodeURIComponent(m[2]) } : { storeSlug: decodeURIComponent(m[2]) };
  if (/^[a-z0-9][a-z0-9-]*$/i.test(s)) return { productSlug: s.toLowerCase() };
  return null;
}

@Component({
  selector: 'app-affiliate',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, TPipe],
  template: `
    <section class="page route-enter max-w-5xl">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted">{{ 'aff.nav' | t }}</p>
      <h1 class="section-title">{{ 'aff.title' | t }}</h1>
      <p class="mt-2 text-lg font-semibold">{{ 'aff.hero' | t }}</p>
      <p class="mt-2 max-w-3xl text-muted">{{ 'aff.lead' | t }}</p>

      @if (stats(); as s) {
        @if (s.kycRequired || !s.payoutReady) {
          <div class="panel mt-6 border-amber-400" role="status">
            <p>{{ 'aff.kycNotice' | t }} <a routerLink="/settings/kyc" class="underline">{{ 'aff.kycCta' | t }}</a></p>
          </div>
        }

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.code' | t }}</p>
            <p class="mt-2 font-mono text-xl">{{ s.code || '—' }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.clicks' | t }}</p>
            <p class="mt-2 font-display text-3xl">{{ s.clicks | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.orders' | t }}</p>
            <p class="mt-2 font-display text-3xl">{{ (s.orders ?? s.conversions) | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.pending' | t }}</p>
            <p class="mt-2 font-display text-2xl">{{ money(s.commission?.pending || 0, s.currency) }}</p>
            <p class="mt-1 text-xs text-muted">{{ 'aff.pendingHint' | t: { hours: s.config?.holdHours || 48 } }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.available' | t }}</p>
            <p class="mt-2 font-display text-2xl">{{ money(s.commission?.available ?? s.earnings, s.currency) }}</p>
            <a routerLink="/wallet" class="mt-1 inline-block text-xs underline">{{ 'aff.withdraw' | t }}</a>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">{{ 'aff.reversed' | t }}</p>
            <p class="mt-2 font-display text-2xl">{{ money(s.commission?.reversed || 0, s.currency) }}</p>
            @if (s.commission?.pitWithheld) {
              <p class="mt-1 text-xs text-muted">{{ 'aff.pitWithheld' | t: { amount: money(s.commission?.pitWithheld || 0, s.currency) } }}</p>
            }
          </div>
        </div>

        @if (!s.kycRequired) {
        <form class="panel mt-6" (ngSubmit)="makeLink()">
          <h2 class="font-display text-xl">{{ 'aff.linkTitle' | t }}</h2>
          <p class="mt-1 text-sm text-muted">{{ 'aff.linkHint' | t }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <input class="input flex-1" name="target" [(ngModel)]="target" [placeholder]="'aff.linkPh' | t" />
            <button type="submit" class="btn btn-fill" [disabled]="busy()">{{ 'aff.linkCreate' | t }}</button>
          </div>
          @if (linkError()) {
            <p class="mt-2 text-sm text-red-600" role="alert">{{ linkError() }}</p>
          }
          @if (link(); as l) {
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <code class="break-all">{{ l.url }}</code>
              <button type="button" class="btn" (click)="copy(l.url)">{{ (copied() ? 'aff.copied' : 'aff.copy') | t }}</button>
            </div>
            <p class="mt-1 text-sm" [class.text-muted]="!l.inProgram">
              {{ l.inProgram ? ('aff.linkRate' | t: { rate: pct(l.rate) }) : ('aff.linkNotInProgram' | t) }}
            </p>
          }
        </form>
        }

        <div class="panel mt-6 overflow-x-auto">
          <h2 class="font-display text-xl">{{ 'aff.recent' | t }}</h2>
          @if (s.recent?.length) {
            <table class="mt-3 w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th>{{ 'aff.col.date' | t }}</th>
                  <th>{{ 'aff.col.product' | t }}</th>
                  <th>{{ 'aff.col.order' | t }}</th>
                  <th>{{ 'aff.col.rate' | t }}</th>
                  <th>{{ 'aff.col.commission' | t }}</th>
                  <th>{{ 'aff.col.state' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of s.recent; track r.id) {
                  <tr>
                    <td>{{ r.createdAt | date: 'dd/MM/yyyy' }}</td>
                    <td>{{ r.productName }}</td>
                    <td>{{ money(r.baseAmount, r.currency) }}</td>
                    <td>{{ pct(r.rate) }}</td>
                    <td>
                      {{ money(r.netAmount - r.reversedAmount, r.currency) }}
                      @if (r.pitAmount) {
                        <span class="text-xs text-muted">({{ 'aff.pitShort' | t: { amount: money(r.pitAmount, r.currency) } }})</span>
                      }
                    </td>
                    <td>{{ 'aff.state.' + r.state | t }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="mt-2 text-muted">{{ 'aff.empty' | t }}</p>
          }
        </div>

        <div class="panel mt-6">
          <h2 class="font-display text-xl">{{ 'aff.rulesTitle' | t }}</h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{{ 'aff.rule.kyc' | t }}</li>
            <li>{{ 'aff.rule.rate' | t }}</li>
            <li>{{ 'aff.rule.window' | t: { days: s.config?.attributionDays || 30 } }}</li>
            <li>{{ 'aff.rule.self' | t }}</li>
            <li>{{ 'aff.rule.hold' | t: { hours: s.config?.holdHours || 48 } }}</li>
            <li>{{ 'aff.rule.refund' | t }}</li>
            <li>{{ 'aff.rule.pit' | t }}</li>
            <li>{{ 'aff.rule.banned' | t }}</li>
          </ul>
          <a routerLink="/legal/chinh-sach-affiliate" class="mt-3 inline-block underline">{{ 'aff.policy' | t }}</a>
        </div>
      }
    </section>
  `,
})
export class AffiliateComponent implements OnInit {
  private readonly api = inject(AffiliateService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  readonly stats = signal<AffiliateStats | null>(null);
  readonly link = signal<AffiliateLink | null>(null);
  readonly linkError = signal('');
  readonly busy = signal(false);
  readonly copied = signal(false);
  target = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('aff.title') });
    this.api.dashboard().subscribe((s) => this.stats.set(s));
  }

  money(amount: number, currency = 'USD'): string {
    const n = Number(amount) || 0;
    if (String(currency).toUpperCase() === 'USD') return this.currency.formatFromUsd(n);
    return `${n.toLocaleString('vi-VN')} ${currency === 'VND' ? 'đ' : currency}`;
  }

  pct(rate: number): string {
    return `${Math.round((Number(rate) || 0) * 1000) / 10}%`;
  }

  makeLink(): void {
    this.linkError.set('');
    this.link.set(null);
    this.copied.set(false);
    const t = parseAffiliateTarget(this.target);
    if (!t) {
      this.linkError.set(this.i18n.t('aff.linkInvalid'));
      return;
    }
    this.busy.set(true);
    this.api.link(t).subscribe({
      next: (l) => {
        this.link.set(l);
        this.busy.set(false);
      },
      error: (err) => {
        this.linkError.set(err?.error?.message || this.i18n.t('aff.linkInvalid'));
        this.busy.set(false);
      },
    });
  }

  copy(text: string): void {
    void navigator.clipboard?.writeText(text).then(() => this.copied.set(true));
  }
}
