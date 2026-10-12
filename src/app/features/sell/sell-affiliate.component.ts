import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AffiliateService } from '../../services/affiliate.service';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { SellerAffiliateStats } from '../../models/marketplace.models';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { CurrencyService } from '../../i18n/currency.service';

/** Percent typed by the seller (0–25) → API fraction; null for "use store default". */
export function percentToRate(raw: unknown, { allowEmpty = false } = {}): number | null | undefined {
  if (raw === '' || raw === null || raw === undefined) return allowEmpty ? null : undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 25) return undefined;
  return Math.round(n * 100) / 10000;
}

@Component({
  selector: 'app-sell-affiliate',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, TPipe],
  template: `
    <section>
      <p class="crumb">{{ 'sellAff.crumb' | t }}</p>
      <h1>{{ 'sellAff.title' | t }}</h1>
      <p class="lead">{{ 'sellAff.lead' | t }}</p>

      @if (data(); as d) {
        <div class="card">
          <h2>{{ 'sellAff.defaultTitle' | t }}</h2>
          <p class="meta">{{ 'sellAff.defaultHint' | t }}</p>
          <form class="row-form" (ngSubmit)="saveDefault()">
            <label>
              {{ 'sellAff.ratePct' | t }}
              <input class="in" type="number" min="0" max="25" step="0.5" name="defaultPct" [(ngModel)]="defaultPct" />
            </label>
            <button type="submit" class="btn btn-fill">{{ 'sellAff.save' | t }}</button>
          </form>
          <p class="formula">{{ 'sellAff.formula' | t }}</p>
          <p class="meta">{{ 'sellAff.example' | t }}</p>
        </div>

        <div class="card">
          <h2>{{ 'sellAff.stats' | t }}</h2>
          <p>
            {{ 'aff.clicks' | t }}: <strong>{{ d.clicks | number }}</strong> ·
            {{ 'aff.orders' | t }}: <strong>{{ d.orders | number }}</strong> ·
            {{ 'sellAff.sales' | t }}: <strong>{{ money(d.sales, d.currency) }}</strong> ·
            {{ 'sellAff.paid' | t }}: <strong>{{ money(d.commission, d.currency) }}</strong>
          </p>
        </div>

        <div class="card scroll">
          <h2>{{ 'sellAff.products' | t }}</h2>
          <p class="meta">{{ 'sellAff.productsHint' | t }}</p>
          <table>
            <thead>
              <tr>
                <th>{{ 'aff.col.product' | t }}</th>
                <th>{{ 'sellAff.productRate' | t }}</th>
                <th>{{ 'sellAff.effective' | t }}</th>
                <th>{{ 'aff.orders' | t }}</th>
                <th>{{ 'sellAff.paid' | t }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of d.products; track p.id) {
                <tr>
                  <td><a [routerLink]="['/product', p.slug]">{{ p.name }}</a></td>
                  <td>
                    <input class="in narrow" type="number" min="0" max="25" step="0.5" [name]="'r' + p.id"
                      [(ngModel)]="edits[p.id]" [placeholder]="'sellAff.inherit' | t" />
                  </td>
                  <td>{{ pct(p.effectiveRate) }}</td>
                  <td>{{ p.orders | number }}</td>
                  <td>{{ money(p.commission, d.currency) }}</td>
                  <td><button type="button" class="ghost" (click)="saveProduct(p.id)">{{ 'sellAff.save' | t }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (message()) {
          <p class="msg" role="status">{{ message() }}</p>
        }
        <a routerLink="/legal/chinh-sach-affiliate" class="link">{{ 'aff.policy' | t }}</a>
      }
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .25rem 0 .35rem; font-size: 1.45rem; font-weight: 800; }
    h2 { margin: 0 0 .5rem; font-size: 1rem; font-weight: 800; }
    .lead { color: #666; max-width: 40rem; line-height: 1.5; margin: 0 0 1.1rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.15rem; margin-bottom: 1rem; }
    .scroll { overflow-x: auto; }
    .meta { margin: .2rem 0 .5rem; color: #777; font-size: .85rem; }
    .formula { margin: .8rem 0 0; font-size: .9rem; font-weight: 600; }
    .row-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .6rem; }
    label { display: flex; flex-direction: column; gap: .3rem; font-size: .78rem; font-weight: 700; color: #555; }
    .in { min-height: 2.4rem; border: 1px solid #ddd; border-radius: 10px; padding: .45rem .7rem; font: inherit; }
    .in.narrow { width: 6.5rem; }
    .btn { min-height: 2.4rem; padding: .5rem 1.1rem; border: 0; border-radius: 10px; background: #e53935; color: #fff; font-weight: 800; cursor: pointer; }
    .ghost { border: 1px solid #ddd; background: #fff; border-radius: 10px; padding: .4rem .75rem; font-weight: 700; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    th, td { text-align: left; padding: .45rem .4rem; border-bottom: 1px solid #f0f0f0; }
    .msg { margin: .2rem 0 .8rem; color: #2e7d32; font-weight: 600; }
    .link { display: inline-block; color: #e53935; font-weight: 700; text-decoration: none; }
  `,
})
export class SellAffiliateComponent implements OnInit {
  private readonly api = inject(AffiliateService);
  private readonly products = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  readonly data = signal<SellerAffiliateStats | null>(null);
  readonly message = signal('');
  defaultPct: number | string = 0;
  edits: Record<string, number | string | null> = {};

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sellAff.title') });
    this.reload();
  }

  reload(): void {
    this.api.seller().subscribe((d) => {
      this.data.set(d);
      this.defaultPct = Math.round(d.defaultRate * 1000) / 10;
      this.edits = {};
      for (const p of d.products) this.edits[p.id] = p.affiliateRate === null ? '' : Math.round(p.affiliateRate * 1000) / 10;
    });
  }

  money(amount: number, currency = 'USD'): string {
    const n = Number(amount) || 0;
    if (String(currency).toUpperCase() === 'USD') return this.currency.formatFromUsd(n);
    return `${n.toLocaleString('vi-VN')} ${currency === 'VND' ? 'đ' : currency}`;
  }

  pct(rate: number): string {
    return `${Math.round((Number(rate) || 0) * 1000) / 10}%`;
  }

  saveDefault(): void {
    const rate = percentToRate(this.defaultPct);
    if (rate === undefined || rate === null) {
      this.message.set(this.i18n.t('sellAff.invalid'));
      return;
    }
    this.api.setDefaultRate(rate).subscribe({
      next: () => {
        this.message.set(this.i18n.t('sellAff.saved'));
        this.reload();
      },
      error: (err) => this.message.set(err?.error?.message || this.i18n.t('sellAff.invalid')),
    });
  }

  saveProduct(id: string): void {
    const rate = percentToRate(this.edits[id], { allowEmpty: true });
    if (rate === undefined) {
      this.message.set(this.i18n.t('sellAff.invalid'));
      return;
    }
    this.products.update(id, { affiliateRate: rate }).subscribe({
      next: () => {
        this.message.set(this.i18n.t('sellAff.saved'));
        this.reload();
      },
      error: (err) => this.message.set(err?.error?.message || this.i18n.t('sellAff.invalid')),
    });
  }
}
