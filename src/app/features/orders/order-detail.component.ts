import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService, InvoiceService } from '../../services/api.services';
import { DisputeMessage, OrderInvoiceResponse } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { InvoiceChoiceComponent } from './invoice-choice.component';
import { DisputeThreadComponent } from './dispute-thread.component';
import { ADMIN_DISPUTE_MESSAGES } from '../admin/admin-disputes.messages';
import { adminHttpError } from '../admin/admin-http';

/** /orders/:id — buyer order detail with the VAT invoice choice. */
@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, TPipe, InvoiceChoiceComponent, DisputeThreadComponent],
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
        @if (showThread()) {
          <div class="od-thread">
            <app-dispute-thread
              [messages]="messages()"
              [canReply]="dispute() === 'open'"
              [busy]="sending()"
              hint="party"
              [closedNote]="dispute() !== 'none' && dispute() !== 'open'"
              [error]="threadError()"
              [viewerId]="authSvc.user()?.id || ''"
              (send)="send($event)"
            />
          </div>
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
    .od-thread { margin-top: 1.25rem; padding: 1rem; border: 1px solid var(--color-line, #e5e0d8); border-radius: 16px; background: var(--color-surface, #fff); }
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly api = inject(InvoiceService);
  private readonly orders = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly data = signal<OrderInvoiceResponse | null>(null);
  readonly authSvc = inject(AuthService);
  private readonly http = inject(HttpClient);
  @ViewChild(DisputeThreadComponent) thread?: DisputeThreadComponent;
  readonly messages = signal<DisputeMessage[]>([]);
  readonly sending = signal(false);
  readonly threadError = signal('');
  readonly threadLoaded = signal(false);
  /** Dispute state from /orders/disputes (the invoice payload does not carry it). */
  readonly dispute = signal<string>('none');
  backLink(): string {
    return this.authSvc.isSeller() || this.authSvc.isAdmin() ? '/dashboard/orders' : '/account/console';
  }
  readonly error = signal('');
  readonly showThread = () => this.dispute() !== 'none' || this.messages().length > 0 || this.threadLoaded();

  constructor() {
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('od.title') });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.http.get<Array<{ id: string; disputeStatus?: string }>>(`${environment.apiUrl}/orders/disputes`).subscribe({
      next: (rows) => {
        const status = (rows || []).find((o) => o.id === id)?.disputeStatus || 'none';
        this.dispute.set(status);
        if (status !== 'none') this.loadMessages(id);
      },
      error: () => this.dispute.set('none'),
    });
    this.api.get(id).subscribe({
      next: (r) => this.data.set(r),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('inv.err')),
    });
  }

  private loadMessages(id: string): void {
    this.orders.disputeMessages(id).subscribe({
      next: (rows) => {
        this.messages.set(rows);
        this.threadLoaded.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.threadLoaded.set(true);
        if (err.status !== 404) this.threadError.set(adminHttpError(err, this.i18n.t('dispute.thread.loadErr')));
      },
    });
  }

  send(body: string): void {
    const id = this.data()?.order.id || this.route.snapshot.paramMap.get('id') || '';
    if (!id || this.sending()) return;
    this.sending.set(true);
    this.threadError.set('');
    this.orders.postDisputeMessage(id, body).subscribe({
      next: (message) => {
        this.sending.set(false);
        this.thread?.clear();
        if (message) this.messages.update((list) => [...list, message]);
        else {
          this.orders.disputeMessages(id).subscribe({
            next: (rows) => this.messages.set(rows),
            error: () => undefined,
          });
        }
        if (this.dispute() === 'none') this.dispute.set('open');
        this.threadLoaded.set(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.threadError.set(adminHttpError(err, this.i18n.t('dispute.thread.err')));
      },
    });
  }
}
