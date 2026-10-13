import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KycService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import {
  KycIdType,
  KycOrgType,
  KycProfile,
  KycSide,
  KycSubjectType,
  KycSubmitBody,
} from '../../models/marketplace.models';

/** Mirrors the API rules in ai-marketplace-api/src/utils/kyc.js. */
const PERSONAL_TAX_RE = /^(\d{10}|\d{12})$/;
const COMPANY_TAX_RE = /^\d{10}(-\d{3})?$/;
const HOUSEHOLD_TAX_RE = /^(\d{10}(-\d{3})?|\d{12})$/;
const normalizeTax = (v: string) => v.replace(/[\s.]/g, '');

@Component({
  selector: 'app-settings-kyc',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  templateUrl: './settings-kyc.component.html',
  styleUrl: './settings-kyc.component.scss',
})
export class SettingsKycComponent implements OnInit {
  private readonly api = inject(KycService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly kyc = signal<KycProfile | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly msg = signal('');
  readonly previews = signal<Partial<Record<KycSide, string>>>({});

  subjectType: KycSubjectType = 'individual';
  fullName = '';
  idType: KycIdType = 'cccd';
  idNumber = '';
  personalTaxCode = '';
  orgType: KycOrgType = 'household';
  orgName = '';
  orgTaxCode = '';
  orgAddress = '';

  readonly sides: KycSide[] = ['front', 'back'];
  /** Organizations (household business / company) also upload the business registration certificate. */
  get visibleSides(): KycSide[] {
    return this.isOrg ? [...this.sides, 'license'] : this.sides;
  }
  readonly idTypes: KycIdType[] = ['cccd', 'cmnd', 'passport', 'other'];
  readonly subjectTypes: KycSubjectType[] = ['individual', 'organization'];
  readonly orgTypes: KycOrgType[] = ['household', 'company'];

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('kyc.title') });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.me().subscribe({
      next: (k) => {
        this.kyc.set(k);
        this.subjectType = k.subjectType || 'individual';
        this.fullName = k.fullName || this.auth.user()?.name || '';
        this.idType = k.idType || 'cccd';
        this.idNumber = k.idNumber || '';
        this.personalTaxCode = k.personalTaxCode || '';
        this.orgType = k.orgType || 'household';
        this.orgName = k.orgName || '';
        this.orgTaxCode = k.orgTaxCode || '';
        this.orgAddress = k.orgAddress || '';
        this.loading.set(false);
        for (const side of ['front', 'back', 'license'] as KycSide[]) {
          const has = side === 'front' ? k.hasFront : side === 'back' ? k.hasBack : !!k.hasLicense;
          if (has) this.loadPreview(side);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('kyc.err.load'));
        this.loading.set(false);
      },
    });
  }

  loadPreview(side: KycSide): void {
    this.api.documentUrl(side).subscribe({
      next: (r) => this.previews.update((m) => ({ ...m, [side]: r.url })),
      error: () => undefined,
    });
  }

  fileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  onFile(side: KycSide, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (side === 'license') {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        this.error.set(this.i18n.t('kyc.file.mustPdf'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.error.set(this.i18n.t('kyc.file.tooLarge'));
        return;
      }
    }
    this.busy.set(true);
    this.error.set('');
    this.api.uploadDocument(side, file).subscribe({
      next: (res) => {
        this.kyc.set(res.kyc);
        if (res.previewUrl) this.previews.update((m) => ({ ...m, [side]: res.previewUrl! }));
        else this.loadPreview(side);
        this.msg.set(this.i18n.t('kyc.uploaded'));
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('kyc.err.upload'));
        this.busy.set(false);
      },
    });
  }

  get isOrg(): boolean {
    return this.subjectType === 'organization';
  }

  /** Since 01/07/2025 the 12-digit personal ID number doubles as the personal tax code. */
  useIdAsTaxCode(): void {
    this.personalTaxCode = this.idNumber.replace(/\s+/g, '');
  }

  private validationError(): string {
    if (this.fullName.trim().length < 2) return this.i18n.t(this.isOrg ? 'kyc.err.repName' : 'kyc.err.name');
    if (this.idNumber.replace(/\s+/g, '').length < 6) return this.i18n.t('kyc.err.idNumber');
    if (!this.isOrg) {
      return PERSONAL_TAX_RE.test(normalizeTax(this.personalTaxCode)) ? '' : this.i18n.t('kyc.err.personalTax');
    }
    if (this.orgName.trim().length < 3) return this.i18n.t('kyc.err.orgName');
    const taxRe = this.orgType === 'company' ? COMPANY_TAX_RE : HOUSEHOLD_TAX_RE;
    if (!taxRe.test(normalizeTax(this.orgTaxCode))) {
      return this.i18n.t(this.orgType === 'company' ? 'kyc.err.companyTax' : 'kyc.err.householdTax');
    }
    if (this.orgAddress.trim().length < 10) return this.i18n.t('kyc.err.orgAddress');
    return '';
  }

  submit(): void {
    const invalid = this.validationError();
    this.msg.set('');
    this.error.set(invalid);
    if (invalid) return;

    const body: KycSubmitBody = {
      subjectType: this.subjectType,
      fullName: this.fullName.trim(),
      idType: this.idType,
      idNumber: this.idNumber.trim(),
    };
    if (this.isOrg) {
      Object.assign(body, {
        orgType: this.orgType,
        orgName: this.orgName.trim(),
        orgTaxCode: normalizeTax(this.orgTaxCode),
        orgAddress: this.orgAddress.trim(),
      });
    } else {
      body.personalTaxCode = normalizeTax(this.personalTaxCode);
    }

    this.busy.set(true);
    this.api.submit(body).subscribe({
      next: (res) => {
        this.kyc.set(res.kyc);
        this.msg.set(this.i18n.t('kyc.submitted'));
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('kyc.err.submit'));
        this.busy.set(false);
      },
    });
  }

  statusKey(status: string): string {
    return `kyc.status.${status || 'none'}`;
  }

  sideKey(side: KycSide): string {
    return `kyc.side.${side}`;
  }
}
