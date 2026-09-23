import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KycService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { KycIdType, KycProfile, KycSide } from '../../models/marketplace.models';

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

  fullName = '';
  idType: KycIdType = 'cccd';
  idNumber = '';

  readonly sides: KycSide[] = ['front', 'back', 'selfie'];
  readonly idTypes: KycIdType[] = ['cccd', 'cmnd', 'passport', 'other'];

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
        this.fullName = k.fullName || this.auth.user()?.name || '';
        this.idType = k.idType || 'cccd';
        this.idNumber = k.idNumber || '';
        this.loading.set(false);
        for (const side of this.sides) {
          const has = side === 'front' ? k.hasFront : side === 'back' ? k.hasBack : k.hasSelfie;
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

  onFile(side: KycSide, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
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

  submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.api
      .submit({
        fullName: this.fullName.trim(),
        idType: this.idType,
        idNumber: this.idNumber.trim(),
      })
      .subscribe({
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
