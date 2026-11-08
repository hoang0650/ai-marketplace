import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SellerService } from '../../services/api.services';
import { SellerProfile } from '../../models/marketplace.models';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { PUBLIC_TAX_LOOKUP_URL, supplierReviewDecision } from '../sell/supplier-review';

@Component({
  selector: 'app-admin-supplier-review',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="admin-supplier">
      <p><a routerLink="/admin">{{ 'admin.supplier.back' | t }}</a></p>
      <h1>{{ 'admin.supplier.title' | t }}</h1>
      <p class="lede">{{ 'admin.supplier.lede' | t }}</p>
      <p><a [href]="lookupUrl" target="_blank" rel="noopener noreferrer">{{ 'admin.supplier.lookup' | t }}</a></p>
      <p class="lede">{{ 'admin.supplier.notEkyc' | t }}</p>
      @if (error()) { <p class="err">{{ error() }}</p> }
      @if (msg()) { <p>{{ msg() }}</p> }
      @if (!rows().length) {
        <p>{{ 'admin.supplier.empty' | t }}</p>
      } @else {
        <ul>
          @for (row of rows(); track row.id) {
            <li>
              <strong>{{ row.legalName || row.displayName }}</strong>
              · {{ row.sellerType }} · MST {{ row.taxCode || '—' }}
              · {{ 'sell.review.manual.' + (row.manualTaxReview?.status || 'none') | t }}
              <span> · {{ 'admin.supplier.flagNote' | t }}: {{ row.identityVerificationStatus || 'none' }}</span>
              <label>
                {{ 'admin.supplier.reason' | t }}
                <input [(ngModel)]="reasons[row.id]" [name]="'reason-' + row.id" />
              </label>
              <label>
                <input type="checkbox" [(ngModel)]="attested[row.id]" [name]="'look-' + row.id" />
                {{ 'admin.supplier.attest' | t }}
              </label>
              <button type="button" (click)="decide(row, 'approve')" [disabled]="busy()">{{ 'admin.supplier.approve' | t }}</button>
              <button type="button" (click)="decide(row, 'reject')" [disabled]="busy()">{{ 'admin.supplier.reject' | t }}</button>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .admin-supplier { max-width: 46rem; }
    .lede { line-height: 1.5; }
    li { margin: 1rem 0; padding: 0.8rem; border: 1px solid var(--color-line, #ddd); border-radius: 12px; }
    label { display: block; margin: 0.4rem 0; }
    input[type='text'], input:not([type]) { width: 100%; }
    .err { color: #b42318; }
    button { margin-right: 0.5rem; }
  `,
})
export class AdminSupplierReviewComponent implements OnInit {
  private readonly sellers = inject(SellerService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  readonly lookupUrl = PUBLIC_TAX_LOOKUP_URL;
  readonly rows = signal<SellerProfile[]>([]);
  readonly error = signal('');
  readonly msg = signal('');
  readonly busy = signal(false);
  reasons: Record<string, string> = {};
  attested: Record<string, boolean> = {};

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.sellers.adminList().subscribe({
      next: (rows) => this.rows.set(rows || []),
      error: (err) => this.error.set(err?.error?.message || this.i18n.t('admin.supplier.err')),
    });
  }

  decide(row: SellerProfile, action: 'approve' | 'reject'): void {
    const decision = supplierReviewDecision({
      action,
      reason: this.reasons[row.id] || '',
      actorRole: this.auth.isAdmin() ? 'admin' : this.auth.user()?.role,
      lookupAttested: this.attested[row.id] === true,
    });
    if (!decision.ok) {
      this.error.set(this.i18n.t(`admin.supplier.err.${decision.code}`));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.sellers.manualReview(row.id, {
      status: decision.status,
      reason: decision.reason,
      lookupAttested: decision.lookupAttested,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set(this.i18n.t('admin.supplier.saved'));
        this.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || this.i18n.t('admin.supplier.err'));
      },
    });
  }
}
