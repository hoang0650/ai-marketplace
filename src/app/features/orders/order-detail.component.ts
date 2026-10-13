import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InvoiceService } from '../../services/api.services';
import { OrderInvoiceResponse } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { InvoiceChoiceComponent } from './invoice-choice.component';

/** /orders/:id — buyer order detail with the VAT invoice choice. */
@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, TPipe, InvoiceChoiceComponent],
  template: `
    <section class="page od">
      <p class="crumb"><a routerLink="/dashboard/orders">{{ 'od.back' | t }}</a></p>
      <h1>{{ 'od.title' | t }}</h1>
      @if (data(); as d) {
        <dl class="od-facts">
          <dt>{{ 'od.id' | t }}</dt>
          <dd class="mono">{{ d.order.id }}</dd>
          <dt>{{ 'od.product' | t }}</dt>
          <dd>{{ d.order.productName }}</dd>
          <dt>{{ 'od.amount' | t }}</dt>
          <dd>{{ d.order.amount | currency: d.order.currency }}</dd>
          <dt>{{ 'od.status' | t }}</dt>
          <dd>{{ d.order.status }}</dd>
          <dt>{{ 'od.date' | t }}</dt>
          <dd>{{ d.order.createdAt | date: 'medium' }}</dd>
        </dl>
        @if (d.order.status === 'paid' || d.order.status === 'refunded') {
          <app-invoice-choice [orderId]="d.order.id" />
        }
      } @else if (error()) {
        <p class="err">{{ error() }}</p>
      } @else {
        <p class="muted">{{ 'inv.loading' | t }}</p>
      }
    </section>
  `,
  styles: `
    .od { max-width: 720px; margin: 0 auto; padding: 1.5rem 1rem; }
    .crumb a { color: #888; font-size: .85rem; text-decoration: none; }
    h1 { font-size: 1.45rem; margin: .4rem 0 1rem; }
    .od-facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: .4rem 1rem; margin: 0; }
    .od-facts dt { color: #777; font-weight: 700; font-size: .85rem; }
    .od-facts dd { margin: 0; overflow-wrap: anywhere; }
    .mono { font-family: ui-monospace, monospace; font-size: .8rem; }
    .muted { color: #666; }
    .err { color: #b42318; }
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly api = inject(InvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly data = signal<OrderInvoiceResponse | null>(null);
  readonly error = signal('');

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('od.title') });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.get(id).subscribe({
      next: (r) => this.data.set(r),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('inv.err')),
    });
  }
}
