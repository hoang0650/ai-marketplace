import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
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
      <p class="crumb"><a [routerLink]="backLink()">{{ 'od.back' | t }}</a></p>
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
          <dd>{{ 'bhub.order.status.' + d.order.status | t }}</dd>
          <dt>{{ 'od.date' | t }}</dt>
          <dd>{{ d.order.createdAt | date: 'medium' }}</dd>
        </dl>
        @if (d.order.status === 'paid' || d.order.status === 'refunded') {
          <app-invoice-choice [orderId]="d.order.id" />
        }
        @if (d.order.status === 'paid' && dispute() === 'none') {
          <p class="od-actions">
            <a class="btn btn-outline" routerLink="/complaints/new" [queryParams]="{ orderId: d.order.id, kind: 'buyer_seller' }">{{ 'bhub.order.complain' | t }}</a>
            <a class="btn btn-outline" routerLink="/complaints/new" [queryParams]="{ orderId: d.order.id, kind: 'buyer_seller', intent: 'refund' }">{{ 'bhub.order.refund' | t }}</a>
          </p>
        } @else if (dispute() !== 'none') {
          <p class="od-actions"><a class="btn btn-outline" routerLink="/account/console" [queryParams]="{ tab: 'complaints' }">{{ 'bhub.order.dispute.' + dispute() | t }}</a></p>
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
    .od-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.25rem; }
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly api = inject(InvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly data = signal<OrderInvoiceResponse | null>(null);
  private readonly authSvc = inject(AuthService);
  private readonly http = inject(HttpClient);
  /** Dispute state from /orders/disputes (the invoice payload does not carry it). */
  readonly dispute = signal<string>('none');
  backLink(): string {
    return this.authSvc.isSeller() || this.authSvc.isAdmin() ? '/dashboard/orders' : '/account/console';
  }
  readonly error = signal('');

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('od.title') });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.http.get<Array<{ id: string; disputeStatus?: string }>>(`${environment.apiUrl}/orders/disputes`).subscribe({
      next: (rows) => this.dispute.set((rows || []).find((o) => o.id === id)?.disputeStatus || 'none'),
      error: () => this.dispute.set('none'),
    });
    this.api.get(id).subscribe({
      next: (r) => this.data.set(r),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('inv.err')),
    });
  }
}
