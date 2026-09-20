import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { BuyerUsageFeed, BuyerUsageItem } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, TPipe],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.scss',
})
export class UsageComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly currency = signal('USD');
  readonly items = signal<BuyerUsageItem[]>([]);
  readonly summary = signal({
    requests: 0,
    totalCharged: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('usage.title') });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.myUsage().subscribe({
      next: (feed: BuyerUsageFeed) => {
        this.currency.set(feed.currency || 'USD');
        this.summary.set(feed.summary || this.summary());
        this.items.set(feed.items || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('usage.err.load'));
        this.loading.set(false);
      },
    });
  }

  sourceLabel(row: BuyerUsageItem): string {
    if (row.source === 'openclaw') return this.i18n.t('usage.source.openclaw');
    if (row.source === 'hermes') return this.i18n.t('usage.source.hermes');
    if (row.source === 'playground') return this.i18n.t('usage.source.playground');
    if (row.source === 'gateway') return this.i18n.t('usage.source.gateway');
    if (row.source === 'gpu' || row.source === 'training') return this.i18n.t('usage.source.compute');
    return this.i18n.t('usage.source.api');
  }

  titleFor(row: BuyerUsageItem): string {
    if (row.productName) return row.productName;
    if (row.model) return row.model;
    return this.sourceLabel(row);
  }
}
