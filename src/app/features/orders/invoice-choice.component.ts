import { DatePipe } from '@angular/common';
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/api.services';
import { OrderInvoice } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Buyer VAT invoice choice for one order (NĐ 123/2020 as amended by NĐ 70/2025).
 * Default: no invoice ("Người mua không lấy hóa đơn"). Editable until the end of the purchase day, locked once issued.
 */
@Component({
  selector: 'app-invoice-choice',
  standalone: true,
  imports: [FormsModule, DatePipe, TPipe],
  template: `
    <div class="inv" [class.inv--compact]="compact">
      <div class="inv-head">
        <strong>{{ 'inv.title' | t }}</strong>
        @if (invoice(); as inv) {
          <span class="inv-pill" [attr.data-status]="inv.status">{{ ('inv.status.' + inv.status) | t }}</span>
        }
      </div>
      @if (loading()) {
        <p class="muted">{{ 'inv.loading' | t }}</p>
      } @else if (invoice(); as inv) {
        <p class="inv-current">
          @if (inv.wantsInvoice) {
            {{ ('inv.type.' + inv.buyerType) | t }}: <strong>{{ inv.buyerName }}</strong>
            @if (inv.taxCode) { · {{ 'inv.taxCode' | t }} {{ inv.taxCode }} }
            · {{ inv.email }}
          } @else {
            {{ 'inv.none' | t }}
          }
        </p>
        @if (inv.status === 'issued') {
          <p class="inv-issued">
            {{ 'inv.issuedLine' | t: { number: inv.invoiceNumber || '—', series: inv.invoiceSeries || '' } }}
            @if (inv.hasPdf) {
              · <button type="button" class="inv-link" (click)="openPdf()">{{ 'inv.viewPdf' | t }}</button>
            }
          </p>
        } @else if (inv.editable) {
          @if (!open()) {
            <button type="button" class="inv-link" (click)="open.set(true)">
              {{ (inv.wantsInvoice ? 'inv.change' : 'inv.request') | t }}
            </button>
            @if (inv.editableUntil) {
              <span class="muted"> · {{ 'inv.until' | t: { time: (inv.editableUntil | date: 'HH:mm dd/MM/yyyy') || '' } }}</span>
            }
          } @else {
            <form class="inv-form" (ngSubmit)="save()">
              <div class="inv-choice" role="radiogroup">
                <label><input type="radio" name="wants" [value]="false" [(ngModel)]="wants" /> {{ 'inv.choice.no' | t }}</label>
                <label><input type="radio" name="wants" [value]="true" [(ngModel)]="wants" /> {{ 'inv.choice.yes' | t }}</label>
              </div>
              @if (wants) {
                <div class="inv-choice" role="radiogroup">
                  <label><input type="radio" name="btype" value="organization" [(ngModel)]="buyerType" /> {{ 'inv.type.organization' | t }}</label>
                  <label><input type="radio" name="btype" value="individual" [(ngModel)]="buyerType" /> {{ 'inv.type.individual' | t }}</label>
                </div>
                <label>
                  <span>{{ (buyerType === 'organization' ? 'inv.companyName' : 'inv.fullName') | t }} *</span>
                  <input name="buyerName" [(ngModel)]="buyerName" maxlength="300" required />
                </label>
                @if (buyerType === 'organization') {
                  <label>
                    <span>{{ 'inv.taxCode' | t }} *</span>
                    <input name="taxCode" [(ngModel)]="taxCode" maxlength="14" placeholder="0312345678 / 0312345678-001" required />
                  </label>
                  <label>
                    <span>{{ 'inv.budgetUnitCode' | t }}</span>
                    <input name="budgetUnitCode" [(ngModel)]="budgetUnitCode" maxlength="20" />
                  </label>
                } @else {
                  <label>
                    <span>{{ 'inv.personalId' | t }}</span>
                    <input name="personalId" [(ngModel)]="personalId" maxlength="12" inputmode="numeric" />
                  </label>
                }
                <label>
                  <span>{{ 'inv.address' | t }} *</span>
                  <input name="address" [(ngModel)]="address" maxlength="500" required />
                </label>
                <label>
                  <span>{{ 'inv.email' | t }} *</span>
                  <input name="email" type="email" [(ngModel)]="email" maxlength="200" required />
                </label>
                <label class="inv-check">
                  <input type="checkbox" name="saveProfile" [(ngModel)]="saveProfile" />
                  <span>{{ 'inv.saveProfile' | t }}</span>
                </label>
              } @else {
                <p class="muted">{{ 'inv.noneHint' | t }}</p>
              }
              <div class="inv-actions">
                <button type="submit" class="inv-btn" [disabled]="busy()">{{ busy() ? ('inv.saving' | t) : ('inv.save' | t) }}</button>
                <button type="button" class="inv-link" (click)="open.set(false)">{{ 'inv.cancel' | t }}</button>
              </div>
            </form>
          }
        } @else {
          <p class="muted">{{ 'inv.locked' | t }}</p>
        }
        @if (msg()) {
          <p [class.err]="err()" [class.ok]="!err()">{{ msg() }}</p>
        }
      } @else if (msg()) {
        <p class="err">{{ msg() }}</p>
      }
    </div>
  `,
  styles: `
    .inv { border: 1px solid #ececec; border-radius: 12px; padding: .85rem 1rem; background: #fff; text-align: left; margin-top: .75rem; }
    .inv-head { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
    .inv-pill { font-size: .72rem; font-weight: 700; border-radius: 999px; padding: .15rem .55rem; background: #fff7ed; color: #c2410c; }
    .inv-pill[data-status='issued'] { background: #e8f8ef; color: #15803d; }
    .inv-pill[data-status='cancelled'] { background: #f3f4f6; color: #666; }
    .inv-current, .inv-issued { margin: .45rem 0; font-size: .88rem; }
    .muted { color: #666; font-size: .82rem; }
    .inv-form { display: grid; gap: .6rem; margin-top: .5rem; }
    .inv-form label { display: grid; gap: .25rem; font-size: .85rem; font-weight: 700; }
    .inv-form input:not([type='radio']):not([type='checkbox']) { box-sizing: border-box; width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: .55rem .7rem; font: inherit; }
    .inv-choice { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; }
    .inv-choice label, .inv-check { display: flex !important; align-items: center; gap: .4rem; font-weight: 600 !important; }
    .inv-actions { display: flex; align-items: center; gap: .85rem; }
    .inv-btn { min-height: 2.3rem; padding: 0 1rem; border: 0; border-radius: 10px; background: #171717; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    .inv-btn:disabled { opacity: .5; }
    .inv-link { border: 0; background: none; padding: 0; color: #e53935; font: inherit; font-weight: 700; cursor: pointer; }
    .ok { color: #15803d; font-size: .85rem; }
    .err { color: #b42318; font-size: .85rem; }
  `,
})
export class InvoiceChoiceComponent implements OnChanges {
  private readonly api = inject(InvoiceService);
  private readonly i18n = inject(I18nService);
  @Input({ required: true }) orderId = '';
  /** Compact = success screens; full = order detail. */
  @Input() compact = false;

  readonly invoice = signal<OrderInvoice | null>(null);
  readonly loading = signal(true);
  readonly open = signal(false);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly err = signal(false);

  wants = false;
  buyerType: 'organization' | 'individual' = 'individual';
  buyerName = '';
  taxCode = '';
  personalId = '';
  address = '';
  email = '';
  budgetUnitCode = '';
  saveProfile = false;

  ngOnChanges(): void {
    if (!this.orderId) return;
    this.loading.set(true);
    this.api.get(this.orderId).subscribe({
      next: (r) => {
        this.invoice.set(r.invoice);
        const inv = r.invoice;
        const p = r.prefill;
        const useInv = inv && inv.wantsInvoice;
        this.wants = !!useInv;
        this.buyerType = useInv && inv.buyerType !== 'none' ? inv.buyerType : p.buyerType;
        this.buyerName = useInv ? inv.buyerName : p.buyerName;
        this.taxCode = useInv ? inv.taxCode : p.taxCode;
        this.personalId = useInv ? inv.personalId : p.personalId;
        this.address = useInv ? inv.address : p.address;
        this.email = useInv ? inv.email : p.email;
        this.budgetUnitCode = useInv ? inv.budgetUnitCode : p.budgetUnitCode;
        this.saveProfile = !r.hasSavedProfile;
        this.open.set(false);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.msg.set(e?.error?.message || this.i18n.t('inv.err'));
      },
    });
  }

  save(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.msg.set('');
    const body = this.wants
      ? {
          wantsInvoice: true,
          buyerType: this.buyerType,
          buyerName: this.buyerName,
          taxCode: this.buyerType === 'organization' ? this.taxCode : '',
          personalId: this.buyerType === 'individual' ? this.personalId : '',
          address: this.address,
          email: this.email,
          budgetUnitCode: this.buyerType === 'organization' ? this.budgetUnitCode : '',
          saveProfile: this.saveProfile,
        }
      : { wantsInvoice: false };
    this.api.save(this.orderId, body).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.err.set(false);
        this.invoice.set(r.invoice);
        this.open.set(false);
        this.msg.set(this.i18n.t('inv.saved'));
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(true);
        if (e?.error?.invoice) this.invoice.set(e.error.invoice);
        const code = e?.error?.code as string | undefined;
        const key = code ? `inv.err.${code}` : '';
        const translated = key ? this.i18n.t(key) : '';
        this.msg.set(translated && translated !== key ? translated : e?.error?.message || this.i18n.t('inv.err'));
      },
    });
  }

  openPdf(): void {
    this.api.pdfUrl(this.orderId).subscribe({
      next: (r) => window.open(r.url, '_blank', 'noopener'),
      error: () => this.msg.set(this.i18n.t('inv.err')),
    });
  }
}
