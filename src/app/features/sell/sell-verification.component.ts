import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SellerService, LegalService } from '../../services/api.services';
import { SellerProfile, LegalDocumentMeta } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-sell-verification',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink, TPipe],
  template: `
    <div class="verify">
      <h1>{{ 'sell.verify.title' | t }}</h1>
      <p class="verify__lead">{{ 'sell.verify.lead' | t }}</p>
      <p class="verify__kyc">
        {{ 'sell.verify.kycHint' | t }}
        <a routerLink="/sell/kyc">{{ 'kyc.goVerify' | t }} ›</a>
      </p>

      <div class="verify__status" *ngIf="profile">
        <p>
          {{ 'sell.verify.status' | t }}:
          <strong>{{ statusText(profile.verificationStatus) }}</strong>
          · {{ 'sell.verify.canPublish' | t }}: {{ (profile.canPublish ? 'sell.verify.yes' : 'sell.verify.notYet') | t }}
        </p>
        <p *ngIf="profile.statusReason">{{ 'sell.verify.note' | t }}: {{ profile.statusReason }}</p>
      </div>

      <form class="verify__form" (ngSubmit)="submit()">
        <label>
          {{ 'sell.verify.sellerType' | t }}
          <select [(ngModel)]="form.sellerType" name="sellerType" required>
            <option value="" disabled>{{ 'sell.verify.type.choose' | t }}</option>
            <option value="individual">{{ 'sell.verify.type.individual' | t }}</option>
            <option value="household_business">{{ 'sell.verify.type.household_business' | t }}</option>
            <option value="enterprise">{{ 'sell.verify.type.company' | t }}</option>
          </select>
        </label>
        <p class="verify__tax" *ngIf="form.sellerType">{{ taxNoteKey() | t }}</p>
        <label>
          {{ 'sell.verify.legalName' | t }}
          <input [(ngModel)]="form.legalName" name="legalName" required />
        </label>
        <label>
          {{ 'sell.verify.displayName' | t }}
          <input [(ngModel)]="form.displayName" name="displayName" required />
        </label>
        <label>
          {{ 'sell.verify.taxCode' | t }}
          <input [(ngModel)]="form.taxCode" name="taxCode" required inputmode="numeric" />
          <small>{{ 'sell.verify.taxCodeHint' | t }}</small>
        </label>
        <label>
          {{ 'sell.verify.brn' | t }}
          <input [(ngModel)]="form.businessRegistrationNumber" name="brn" [required]="needsBrn()" />
        </label>
        <label>
          {{ 'sell.verify.address' | t }}
          <input [(ngModel)]="form.businessAddress" name="addr" />
        </label>
        <label>
          {{ 'sell.verify.email' | t }}
          <input [(ngModel)]="form.contactEmail" name="email" type="email" />
        </label>
        <label>
          {{ 'sell.verify.phone' | t }}
          <input [(ngModel)]="form.contactPhone" name="phone" />
        </label>
        <button type="submit" [disabled]="saving">{{ 'sell.verify.submit' | t }}</button>
      </form>

      <section class="verify__agreement" *ngIf="agreement">
        <h2>{{ agreement.title }} (v{{ agreement.version }})</h2>
        <pre>{{ agreement.content }}</pre>
        <button type="button" (click)="acceptAgreement()" [disabled]="saving">
          {{ 'sell.verify.accept' | t }}
        </button>
      </section>

      <p class="verify__msg" *ngIf="message">{{ message }}</p>
      <p><a routerLink="/legal/chinh-sach-nguoi-ban">{{ 'sell.verify.sellerPolicy' | t }}</a> ·
        <a routerLink="/legal/quy-che-hoat-dong-san-tmdt">{{ 'sell.verify.rules' | t }}</a> ·
        <a routerLink="/legal/mau-hop-dong-cung-cap-dich-vu-nguoi-ban">{{ 'sell.verify.agreement' | t }}</a></p>
    </div>
  `,
  styles: [
    `
      .verify {
        max-width: 40rem;
        padding: 0.5rem 0 2rem;
      }
      .verify__kyc {
        padding: 0.75rem 0.9rem;
        border-radius: 10px;
        background: #fff8e6;
        border: 1px solid #f0d78c;
        font-size: 0.9rem;
      }
      .verify__kyc a {
        font-weight: 800;
        color: inherit;
      }
      .verify__lead,
      .verify__status {
        line-height: 1.55;
        opacity: 0.85;
      }
      .verify__form {
        display: grid;
        gap: 0.85rem;
        margin: 1.5rem 0;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
      }
      input,
      select,
      button,
      pre {
        font: inherit;
      }
      input,
      select {
        padding: 0.55rem 0.7rem;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
        background: transparent;
      }
      button {
        padding: 0.65rem 1rem;
        border-radius: 999px;
        border: 0;
        background: #111;
        color: #fff;
        cursor: pointer;
        width: fit-content;
      }
      .verify__agreement pre {
        white-space: pre-wrap;
        max-height: 220px;
        overflow: auto;
        padding: 1rem;
        border-radius: 12px;
        background: color-mix(in srgb, currentColor 5%, transparent);
        font-size: 0.88rem;
      }
      .verify__tax {
        margin: -0.4rem 0 0;
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        background: color-mix(in srgb, currentColor 6%, transparent);
        font-size: 0.85rem;
        line-height: 1.5;
      }
      .verify__msg {
        margin-top: 1rem;
        color: #0f7b3a;
      }
    `,
  ],
})
export class SellVerificationComponent implements OnInit {
  private readonly sellers = inject(SellerService);
  private readonly legal = inject(LegalService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  profile: SellerProfile | null = null;
  agreement: LegalDocumentMeta | null = null;
  saving = false;
  message = '';

  form = {
    sellerType: '',
    legalName: '',
    displayName: '',
    taxCode: '',
    businessRegistrationNumber: '',
    businessAddress: '',
    contactEmail: '',
    contactPhone: '',
  };

  /** Registration offers three types; legacy 'organization'/COMPANY map to the company option. */
  uiType(t: string | undefined): string {
    const v = String(t || '').toLowerCase();
    if (v === 'household_business') return 'household_business';
    if (v === 'enterprise' || v === 'organization' || v === 'company') return 'enterprise';
    return v === 'individual' ? 'individual' : '';
  }

  needsBrn(): boolean {
    return this.form.sellerType === 'household_business' || this.form.sellerType === 'enterprise';
  }

  taxNoteKey(): string {
    return `sell.verify.taxNote.${this.form.sellerType || 'individual'}`;
  }

  private validTaxCode(): boolean {
    const v = this.form.taxCode.replace(/\s+/g, '');
    if (/^\d{10}(-\d{3})?$/.test(v)) return true;
    return this.form.sellerType !== 'enterprise' && /^\d{12}$/.test(v);
  }

  statusText(status: string): string {
    const key = `sell.verify.st.${status}`;
    const text = this.i18n.t(key);
    return text === key ? status : text;
  }

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('sell.nav.verification'),
      description: this.i18n.t('sell.verify.seoDesc'),
    });
    this.sellers.me().subscribe((p) => {
      this.profile = p;
      if (p) {
        this.form = {
          sellerType: p.sellerTypeDeclared ? this.uiType(p.sellerType) : '',
          legalName: p.legalName || '',
          displayName: p.displayName || '',
          taxCode: p.taxCode || '',
          businessRegistrationNumber: p.businessRegistrationNumber || '',
          businessAddress: p.businessAddress || '',
          contactEmail: p.contactEmail || '',
          contactPhone: p.contactPhone || '',
        };
      }
    });
    this.legal.get('seller-agreement').subscribe({
      next: (d) => (this.agreement = d),
      error: () => undefined,
    });
  }

  submit(): void {
    if (!this.form.sellerType) {
      this.message = this.i18n.t('sell.verify.err.type');
      return;
    }
    if (!this.validTaxCode()) {
      this.message = this.i18n.t('sell.verify.err.taxCode');
      return;
    }
    if (this.needsBrn() && !this.form.businessRegistrationNumber.trim()) {
      this.message = this.i18n.t('sell.verify.err.brn');
      return;
    }
    this.saving = true;
    this.sellers.apply(this.form).subscribe({
      next: (p) => {
        this.profile = p;
        this.message = this.i18n.t('sell.verify.sent');
        this.saving = false;
      },
      error: (err) => {
        this.message = err?.error?.message || this.i18n.t('sell.verify.sendFail');
        this.saving = false;
      },
    });
  }

  acceptAgreement(): void {
    this.saving = true;
    this.sellers.acceptAgreement().subscribe({
      next: (p) => {
        this.profile = p;
        this.message = this.i18n.t('sell.verify.accepted');
        this.saving = false;
      },
      error: (err) => {
        this.message = err?.error?.message || this.i18n.t('sell.verify.acceptFail');
        this.saving = false;
      },
    });
  }
}
