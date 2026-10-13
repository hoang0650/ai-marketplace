import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InvoiceService } from '../../services/api.services';
import { AdminInvoiceList, OrderInvoice } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

/** /admin/invoices — per-order invoice records: mark issued, attach number/PDF. No e-invoice provider integration yet. */
@Component({
  selector: 'app-admin-invoices',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TPipe],
  template: `
    <section class="page ai">
      <p class="crumb"><a routerLink="/admin">{{ 'nav.admin' | t }}</a></p>
      <h1>{{ 'admin.inv.title' | t }}</h1>
      <p class="muted">{{ 'admin.inv.lede' | t }}</p>
      <form class="ai-filters" (ngSubmit)="reload()">
        <select name="status" [(ngModel)]="status" (ngModelChange)="reload()">
          <option value="">{{ 'admin.inv.all' | t }}</option>
          <option value="pending">{{ 'inv.status.pending' | t }}</option>
          <option value="issued">{{ 'inv.status.issued' | t }}</option>
          <option value="cancelled">{{ 'inv.status.cancelled' | t }}</option>
        </select>
        <select name="wants" [(ngModel)]="wants" (ngModelChange)="reload()">
          <option value="">{{ 'admin.inv.wantsAll' | t }}</option>
          <option value="yes">{{ 'admin.inv.wantsYes' | t }}</option>
          <option value="no">{{ 'admin.inv.wantsNo' | t }}</option>
        </select>
        <input name="q" [(ngModel)]="q" [placeholder]="'admin.inv.searchPh' | t" />
        <button type="submit">{{ 'admin.kyc.search' | t }}</button>
      </form>
      @if (data(); as d) {
        <p class="muted">
          {{ 'inv.status.pending' | t }}: {{ d.counts.pending }} ({{ 'admin.inv.wantsYes' | t }}: {{ d.counts.pendingWanted }}) ·
          {{ 'inv.status.issued' | t }}: {{ d.counts.issued }}
        </p>
      }
      @if (msg()) {
        <p [class.err]="err()" [class.ok]="!err()">{{ msg() }}</p>
      }
      <div class="ai-table">
        <table>
          <thead>
            <tr>
              <th>{{ 'admin.inv.col.order' | t }}</th>
              <th>{{ 'admin.inv.col.buyer' | t }}</th>
              <th>{{ 'admin.inv.col.invoiceTo' | t }}</th>
              <th>{{ 'admin.inv.col.amount' | t }}</th>
              <th>{{ 'admin.inv.col.status' | t }}</th>
              <th>{{ 'admin.inv.col.issue' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (r of data()?.items || []; track r.id) {
              <tr>
                <td>
                  <span class="mono">{{ r.orderId }}</span>
                  <small>{{ r.productName }} · {{ r.orderedAt | date: 'short' }}</small>
                </td>
                <td>{{ r.buyer?.name || '—' }}<small>{{ r.buyer?.email }}</small></td>
                <td>
                  <strong>{{ r.buyerName }}</strong>
                  @if (r.wantsInvoice) {
                    <small>{{ ('inv.type.' + r.buyerType) | t }}
                      @if (r.taxCode) { · MST {{ r.taxCode }} }
                      @if (r.personalId) { · {{ r.personalId }} }
                      @if (r.budgetUnitCode) { · {{ r.budgetUnitCode }} }
                    </small>
                    <small>{{ r.address }}</small>
                    <small>{{ r.email }}</small>
                  }
                </td>
                <td>{{ r.amount | currency: r.currency }}</td>
                <td>
                  <span class="pill" [attr.data-status]="r.status">{{ ('inv.status.' + r.status) | t }}</span>
                  @if (r.invoiceNumber) {
                    <small>{{ r.invoiceSeries }} {{ r.invoiceNumber }}</small>
                  }
                  @if (r.hasPdf) {
                    <small>PDF ✓</small>
                  }
                </td>
                <td class="issue">
                  @if (r.status !== 'issued') {
                    <input [name]="'s' + r.id" [(ngModel)]="series[r.id]" [placeholder]="'admin.inv.series' | t" />
                    <input [name]="'n' + r.id" [(ngModel)]="numbers[r.id]" [placeholder]="'admin.inv.number' | t" />
                    <label class="file">
                      <input type="file" accept="application/pdf,.pdf" (change)="upload(r, $event)" />
                      <span>{{ 'admin.inv.attachPdf' | t }}</span>
                    </label>
                    <button type="button" [disabled]="busyId() === r.id" (click)="markIssued(r)">{{ 'admin.inv.markIssued' | t }}</button>
                  } @else {
                    <button type="button" class="ghost" [disabled]="busyId() === r.id" (click)="setStatus(r, 'pending')">{{ 'admin.inv.reopen' | t }}</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">{{ 'admin.inv.empty' | t }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .ai { padding: 1.5rem 1rem; }
    .crumb a { color: #888; font-size: .85rem; text-decoration: none; }
    h1 { margin: .3rem 0 .4rem; font-size: 1.45rem; }
    .muted { color: #666; font-size: .88rem; }
    .ai-filters { display: flex; flex-wrap: wrap; gap: .5rem; margin: .75rem 0; }
    .ai-filters select, .ai-filters input, .issue input:not([type='file']) { border: 1px solid #e5e5e5; border-radius: 8px; padding: .45rem .6rem; font: inherit; }
    button { border: 0; border-radius: 8px; background: #171717; color: #fff; padding: .45rem .8rem; font: inherit; font-weight: 700; cursor: pointer; }
    button.ghost { background: #fff; color: #111; border: 1px solid #e5e5e5; }
    button:disabled { opacity: .5; }
    .ai-table { overflow-x: auto; border: 1px solid #ececec; border-radius: 12px; background: #fff; }
    table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: .85rem; }
    th, td { text-align: left; padding: .65rem .75rem; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    th { font-size: .72rem; text-transform: uppercase; color: #888; }
    small { display: block; color: #777; font-size: .75rem; }
    .mono { font-family: ui-monospace, monospace; font-size: .75rem; }
    .pill { display: inline-flex; border-radius: 999px; padding: .15rem .5rem; font-size: .72rem; font-weight: 700; background: #fff7ed; color: #c2410c; }
    .pill[data-status='issued'] { background: #e8f8ef; color: #15803d; }
    .issue { display: grid; gap: .35rem; min-width: 12rem; }
    .file { position: relative; display: inline-flex; font-size: .78rem; font-weight: 700; color: #e53935; cursor: pointer; }
    .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .ok { color: #15803d; }
    .err { color: #b42318; }
  `,
})
export class AdminInvoicesComponent implements OnInit {
  private readonly api = inject(InvoiceService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly data = signal<AdminInvoiceList | null>(null);
  readonly busyId = signal('');
  readonly msg = signal('');
  readonly err = signal(false);
  status = 'pending';
  wants = 'yes';
  q = '';
  numbers: Record<string, string> = {};
  series: Record<string, string> = {};

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.inv.title') });
    this.reload();
  }

  reload(): void {
    this.api.adminList({ status: this.status, wants: this.wants, q: this.q.trim() }).subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.fail(e),
    });
  }

  markIssued(r: OrderInvoice): void {
    const invoiceNumber = (this.numbers[r.id] || '').trim();
    if (!invoiceNumber && !r.hasPdf) {
      this.err.set(true);
      this.msg.set(this.i18n.t('admin.inv.needNumber'));
      return;
    }
    this.busyId.set(r.id);
    this.api.adminUpdate(r.id, { status: 'issued', invoiceNumber, invoiceSeries: (this.series[r.id] || '').trim() }).subscribe({
      next: () => this.done('admin.inv.issuedOk'),
      error: (e) => this.fail(e),
    });
  }

  setStatus(r: OrderInvoice, status: string): void {
    this.busyId.set(r.id);
    this.api.adminUpdate(r.id, { status }).subscribe({ next: () => this.done('admin.inv.updated'), error: (e) => this.fail(e) });
  }

  upload(r: OrderInvoice, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      this.err.set(true);
      this.msg.set(this.i18n.t('kyc.file.mustPdf'));
      return;
    }
    this.busyId.set(r.id);
    this.api.adminUploadPdf(r.id, file).subscribe({ next: () => this.done('admin.inv.pdfOk'), error: (e) => this.fail(e) });
  }

  private done(key: string): void {
    this.busyId.set('');
    this.err.set(false);
    this.msg.set(this.i18n.t(key));
    this.reload();
  }

  private fail(e: { error?: { message?: string } }): void {
    this.busyId.set('');
    this.err.set(true);
    this.msg.set(e?.error?.message || this.i18n.t('inv.err'));
  }
}
