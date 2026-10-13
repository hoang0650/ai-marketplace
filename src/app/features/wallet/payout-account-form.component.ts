import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { PayoutAccountInfo } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

/**
 * Own payout bank account (any eKYC-verified user, buyer or seller; no seller profile needed).
 * Unverified users get the eKYC prompt.
 */
@Component({
  selector: 'app-payout-account-form',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <div class="pa">
      <h2>{{ 'payacc.title' | t }}</h2>
      @if (!loaded()) {
        <p class="muted">{{ 'wallet.wd.loading' | t }}</p>
      } @else if (!canEdit()) {
        <div class="pa-kyc">
          <p>{{ 'payacc.kycNeeded' | t }}</p>
          <p class="pa-kyc__status">{{ ('kyc.status.' + (kycStatus() || 'none')) | t }}</p>
          <a routerLink="/settings/kyc" class="pa-btn">{{ 'kyc.goVerify' | t }}</a>
        </div>
      } @else {
        <p class="muted">{{ 'payacc.desc' | t }}</p>
        @if (saved(); as s) {
          <p class="pa-saved">{{ 'payacc.current' | t }}: <strong>{{ s.bankName }} · {{ s.accountNumberMasked }} · {{ s.accountName }}</strong></p>
        }
        <form (ngSubmit)="save()" class="pa-form">
          <label>
            <span>{{ 'wallet.wd.bankName' | t }}</span>
            <input name="bankName" [(ngModel)]="bankName" maxlength="100" autocomplete="off" required />
          </label>
          <label>
            <span>{{ 'wallet.wd.accountNumber' | t }}</span>
            <input name="accountNumber" [(ngModel)]="accountNumber" inputmode="numeric" maxlength="24" autocomplete="off" required />
          </label>
          <label>
            <span>{{ 'wallet.wd.accountName' | t }}</span>
            <input name="accountName" [(ngModel)]="accountName" maxlength="100" autocomplete="off" required />
            @if (holderName()) {
              <small class="muted">{{ 'payacc.holderHint' | t: { name: holderName() } }}</small>
            }
          </label>
          <button type="submit" class="pa-btn" [disabled]="busy() || !valid()">
            {{ busy() ? ('wallet.wd.sending' | t) : ('payacc.save' | t) }}
          </button>
          @if (msg()) {
            <p [class.err]="err()" [class.ok]="!err()">{{ msg() }}</p>
          }
        </form>
      }
    </div>
  `,
  styles: `
    .pa { max-width: 560px; margin: 1.5rem auto; background: #fff; border: 1px solid #ececec; border-radius: 16px; padding: 1.5rem; }
    h2 { margin: 0 0 .5rem; font-size: 1.15rem; }
    .muted { color: #666; font-size: .88rem; }
    .pa-form { display: grid; gap: .75rem; margin-top: .75rem; }
    label { display: grid; gap: .3rem; font-weight: 700; font-size: .85rem; }
    input { box-sizing: border-box; width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: .65rem .8rem; font: inherit; }
    .pa-btn { justify-self: start; display: inline-flex; align-items: center; min-height: 2.5rem; padding: 0 1.1rem; border: 0; border-radius: 10px; background: #171717; color: #fff; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
    .pa-btn:disabled { opacity: .5; cursor: not-allowed; }
    .pa-saved { font-size: .88rem; }
    .pa-kyc { background: #fff8e6; border: 1px solid #f0d78c; border-radius: 12px; padding: .9rem 1rem; }
    .pa-kyc p { margin: 0 0 .35rem; font-weight: 700; }
    .ok { color: #15803d; font-size: .88rem; }
    .err { color: #b42318; font-size: .88rem; }
  `,
})
export class PayoutAccountFormComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly i18n = inject(I18nService);
  @Output() readonly savedChange = new EventEmitter<PayoutAccountInfo>();

  readonly loaded = signal(false);
  readonly canEdit = signal(false);
  readonly kycStatus = signal('');
  readonly holderName = signal('');
  readonly saved = signal<PayoutAccountInfo | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly err = signal(false);
  bankName = '';
  accountNumber = '';
  accountName = '';

  ngOnInit(): void {
    this.api.payoutAccount().subscribe({
      next: (r) => {
        this.canEdit.set(r.canEdit);
        this.kycStatus.set(r.kycStatus);
        this.holderName.set(r.holderName || '');
        this.saved.set(r.account);
        if (r.account) {
          this.bankName = r.account.bankName;
          this.accountNumber = r.account.accountNumber;
          this.accountName = r.account.accountName;
        } else if (r.holderName) {
          this.accountName = r.holderName;
        }
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  valid(): boolean {
    return (
      this.bankName.trim().length >= 2 &&
      /^\d{6,20}$/.test(this.accountNumber.replace(/[\s.-]/g, '')) &&
      this.accountName.trim().length >= 2
    );
  }

  save(): void {
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    this.msg.set('');
    this.api
      .savePayoutAccount({
        bankName: this.bankName.trim(),
        accountNumber: this.accountNumber.replace(/[\s.-]/g, ''),
        accountName: this.accountName.trim(),
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.err.set(false);
          this.saved.set(r.account);
          this.msg.set(this.i18n.t('payacc.saved'));
          if (r.account) this.savedChange.emit(r.account);
        },
        error: (e) => {
          this.busy.set(false);
          this.err.set(true);
          this.msg.set(
            e?.error?.code === 'ACCOUNT_NAME_MISMATCH' ? this.i18n.t('payacc.nameMismatch') : e?.error?.message || this.i18n.t('payacc.fail'),
          );
        },
      });
  }
}
