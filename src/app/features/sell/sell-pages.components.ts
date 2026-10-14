import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService, KycService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import {
  KycProfile,
  Order,
  PayoutPersona,
  PayoutPolicy,
  PayoutQuote,
  Product,
  WalletSummary,
  WalletTx,
} from '../../models/marketplace.models';
import { categoryLabel, isTemplateCategory, sellerWorkspaceKind } from '../../models/categories';
import { ShopProfileService } from './shop-profile.service';
import { PayoutAccountFormComponent } from '../wallet/payout-account-form.component';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { PersonaToggleComponent } from './persona-toggle.component';

@Component({
  selector: 'app-sell-images',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="si">
      <p class="crumb">{{ 'sell.ws.seller.title' | t }} · {{ shop.statusLabel() }} · {{ 'sell.nav.images' | t }}</p>
      <h1>{{ 'sell.img.title' | t }}</h1>
      <div class="si-grid">
        <div class="si-main">
          <div class="card row">
            <div class="upload">
              <div class="upload__box upload__box--logo">
                @if (logoUrl) {
                  <img [src]="logoUrl" alt="Logo preview" />
                } @else {
                  <span>🏪</span>
                  <p>{{ 'sell.img.logoPreview' | t }}</p>
                }
              </div>
              <label class="btn">
                {{ 'sell.img.uploadLogo' | t }}
                <input type="file" accept="image/*" hidden (change)="onLogo($event)" />
              </label>
              <input class="url" [(ngModel)]="logoUrl" name="logoUrl" [placeholder]="'sell.img.logoUrl' | t" />
            </div>
            <div class="upload grow">
              <div class="upload__box upload__box--cover">
                @if (coverUrl) {
                  <img [src]="coverUrl" alt="Cover preview" />
                } @else {
                  <p>{{ 'sell.img.coverPreview' | t }}</p>
                }
              </div>
              <label class="btn">
                {{ 'sell.img.uploadCover' | t }}
                <input type="file" accept="image/*" hidden (change)="onCover($event)" />
              </label>
              <input class="url" [(ngModel)]="coverUrl" name="coverUrl" [placeholder]="'sell.img.coverUrl' | t" />
            </div>
          </div>
          <button type="button" class="save" (click)="save()">{{ 'sell.img.save' | t }}</button>
          @if (msg()) {
            <p class="ok">{{ msg() }}</p>
          }
        </div>
        <aside class="card">
          <h2>{{ 'sell.img.usage' | t }}</h2>
          <div class="mini-card">
            <p class="label">{{ 'sell.img.productCard' | t }}</p>
            <div class="mini-card__row">
              <div class="avatar">{{ initials }}</div>
              <div>
                <strong>{{ shop.profile().shopName || ('sell.img.shopName' | t) }}</strong>
                <span>{{ 'sell.img.seller' | t }}</span>
              </div>
            </div>
          </div>
          <div class="mini-card">
            <p class="label">{{ 'sell.img.shopHeader' | t }}</p>
            <div class="header-prev" [style.backgroundImage]="coverUrl ? 'url(' + coverUrl + ')' : null">
              <div class="avatar">{{ initials }}</div>
              <strong>{{ shop.profile().shopName || ('sell.img.shopName' | t) }}</strong>
            </div>
          </div>
          <a routerLink="/sell/profile" class="link">{{ 'sell.img.back' | t }} ›</a>
        </aside>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .35rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .si-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1rem; }
    .row { display: grid; grid-template-columns: 220px 1fr; gap: 1rem; }
    .upload { display: grid; gap: .65rem; align-content: start; }
    .upload.grow { min-width: 0; }
    .upload__box { border: 1px dashed #ddd; border-radius: 12px; background: #fafafa; display: grid; place-items: center; overflow: hidden; color: #888; text-align: center; }
    .upload__box--logo, .upload__box--cover { height: 180px; }
    .upload__box img { width: 100%; height: 100%; object-fit: cover; }
    .btn, .save { display: inline-flex; align-items: center; justify-content: center; min-height: 2.4rem; padding: .5rem .9rem; border-radius: 10px; border: 1px solid #e5e5e5; background: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .save { width: 100%; margin-top: .85rem; background: #f3f4f6; }
    .url { width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: .65rem .75rem; font: inherit; }
    .ok { color: #15803d; font-size: .85rem; }
    aside h2 { margin: 0 0 .85rem; font-size: .95rem; }
    .mini-card { border: 1px solid #f0f0f0; border-radius: 12px; padding: .75rem; margin-bottom: .75rem; }
    .label { margin: 0 0 .55rem; font-size: .72rem; color: #888; text-transform: uppercase; letter-spacing: .04em; }
    .mini-card__row, .header-prev { display: flex; align-items: center; gap: .6rem; }
    .header-prev { min-height: 88px; border-radius: 10px; background: #222 center/cover; color: #fff; padding: .75rem; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: .75rem; flex-shrink: 0; }
    .mini-card strong, .header-prev strong { display: block; font-size: .88rem; }
    .mini-card span { font-size: .75rem; color: #888; }
    .link { color: #e53935; text-decoration: none; font-weight: 700; font-size: .85rem; }
    @media (max-width: 960px) { .si-grid, .row { grid-template-columns: 1fr; } }
  `,
})
export class SellImagesComponent {
  readonly shop = inject(ShopProfileService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  logoUrl = '';
  coverUrl = '';
  readonly msg = signal('');
  initials = 'GH';

  constructor() {
    this.seo.set({ title: this.i18n.t('sell.img.title') });
    const p = this.shop.profile();
    this.logoUrl = p.logoUrl;
    this.coverUrl = p.coverUrl;
    this.initials = (p.shopName || 'GH').slice(0, 2).toUpperCase();
  }

  onLogo(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readFile(file, (url) => (this.logoUrl = url));
  }

  onCover(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readFile(file, (url) => (this.coverUrl = url));
  }

  save(): void {
    this.shop.patch({ logoUrl: this.logoUrl, coverUrl: this.coverUrl });
    this.msg.set(this.i18n.t('sell.img.saved'));
  }

  private readFile(file: File, cb: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ''));
    reader.readAsDataURL(file);
  }
}

@Component({
  selector: 'app-sell-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TPipe],
  template: `
    <section>
      <p class="crumb">{{ 'sell.nav.sales' | t }} / {{ 'sell.nav.orders' | t }}</p>
      <h1>{{ 'sell.nav.orders' | t }}</h1>
      <p class="lede">{{ 'sell.orders.lede' | t }}</p>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>{{ 'sell.orders.id' | t }}</th>
              <th>{{ 'sell.orders.product' | t }}</th>
              <th>{{ 'sell.orders.buyer' | t }}</th>
              <th>{{ 'sell.orders.amount' | t }}</th>
              <th>{{ 'sell.orders.status' | t }}</th>
              <th>{{ 'sell.orders.date' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o.id) {
              <tr>
                <td class="mono">{{ o.id }}</td>
                <td>{{ o.productName }}</td>
                <td>{{ o.buyerName }}</td>
                <td>{{ o.amount | currency: o.currency }}</td>
                <td>
                  <span class="pill" [class.paid]="o.status === 'paid'" [class.pending]="o.status === 'pending'">
                    {{ statusLabel(o.status) }}
                  </span>
                </td>
                <td>{{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">{{ 'sell.orders.empty' | t }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 0; font-size: 1.5rem; font-weight: 800; }
    .lede { margin: .35rem 0 1rem; color: #777; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 720px; }
    th, td { text-align: left; padding: .85rem 1rem; border-bottom: 1px solid #f0f0f0; font-size: .88rem; }
    th { color: #888; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
    .mono { font-family: ui-monospace, monospace; font-size: .78rem; }
    .pill { display: inline-flex; border-radius: 999px; padding: .2rem .55rem; font-size: .75rem; font-weight: 700; background: #f3f4f6; }
    .pill.paid { background: #e8f8ef; color: #15803d; }
    .pill.pending { background: #fff7ed; color: #c2410c; }
    .empty { text-align: center; color: #999; padding: 2rem 1rem !important; }
  `,
})
export class SellOrdersComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly orders = signal<Order[]>([]);

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sell.nav.orders') });
    this.api.orders().subscribe((list) => this.orders.set(list));
  }

  statusLabel(status: Order['status']): string {
    if (status === 'paid') return this.i18n.t('sell.orders.st.paid');
    if (status === 'pending') return this.i18n.t('sell.orders.st.pending');
    return this.i18n.t('sell.orders.st.refunded');
  }
}

@Component({
  selector: 'app-sell-payment',
  standalone: true,
  imports: [RouterLink, TPipe, PayoutAccountFormComponent],
  template: `
    <section class="pay">
      <p class="crumb">{{ 'sell.ws.seller.sub' | t }} · {{ shop.statusLabel() }} · {{ 'sell.nav.payment' | t }}</p>
      <h1>{{ 'sell.nav.payment' | t }}</h1>
      <!-- Any eKYC-verified user (buyer or seller) can save a payout account; unverified users see the eKYC prompt. -->
      <app-payout-account-form />
      @if (!isSeller()) {
        <p class="buyer-note">{{ 'payacc.buyerNote' | t }} <a routerLink="/wallet" [queryParams]="{ tab: 'withdraw' }" class="link">{{ 'wallet.wd.goWallet' | t }} ›</a></p>
      } @else if (!shop.started() || shop.profile().status === 'draft') {
        <div class="gate">
          <span class="gate__icon">ℹ</span>
          <h2>{{ 'sell.pay.gateTitle' | t }}</h2>
          <p>{{ 'sell.pay.gateDesc' | t }}</p>
          <a routerLink="/sell/profile" class="btn">{{ 'sell.pay.gateBtn' | t }}</a>
        </div>
      } @else {
        <div class="card">
          <h2>{{ 'sell.pay.setupTitle' | t }}</h2>
          <p>{{ 'sell.pay.setupDesc' | t: { status: shop.statusLabel() } }}</p>
          <a routerLink="/sell/withdraw" class="link">{{ 'sell.pay.goWithdraw' | t }} ›</a>
        </div>
      }
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .35rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .gate, .card { max-width: 560px; margin: 2rem auto; background: #fff; border: 1px solid #ececec; border-radius: 16px; padding: 2rem 1.5rem; text-align: center; }
    .gate__icon { width: 2.4rem; height: 2.4rem; border-radius: 999px; display: grid; place-items: center; margin: 0 auto .85rem; background: #f3f4f6; font-weight: 800; }
    h2 { margin: 0; font-size: 1.2rem; }
    p { color: #666; line-height: 1.5; }
    .btn { display: inline-flex; margin-top: .5rem; min-height: 2.5rem; padding: .55rem 1.1rem; border-radius: 10px; background: #171717; color: #fff; text-decoration: none; font-weight: 800; }
    .link { color: #e53935; font-weight: 700; text-decoration: none; }
    .buyer-note { max-width: 560px; margin: 0 auto; text-align: center; color: #666; font-size: .9rem; }
  `,
})
export class SellPaymentComponent {
  readonly shop = inject(ShopProfileService);
  private readonly auth = inject(AuthService);
  /** Seller onboarding gate only applies to seller accounts; buyers just manage their payout account. */
  readonly isSeller = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'seller' || role === 'admin' || this.shop.started();
  });
  constructor() {
    inject(SeoService).set({ title: inject(I18nService).t('sell.nav.payment') });
  }
}

@Component({
  selector: 'app-sell-withdraw',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, RouterLink, TPipe, PersonaToggleComponent],
  template: `
    <section>
      <p class="crumb">{{ 'sell.nav.finance' | t }} / {{ 'sell.nav.withdraw' | t }}</p>
      <h1>{{ 'wallet.withdraw.title' | t }}</h1>

      @if (personas().length > 1) {
        <app-persona-toggle [personas]="personas()" [value]="persona()" (valueChange)="setPersona($event)" />
      }

      @if (policy(); as pol) {
        @if (!pol.canWithdraw) {
          <div class="blocked">
            <p>{{ 'payout.buyerBlocked' | t }}</p>
            <p class="hint">{{ 'payout.buyerBlockedHint' | t }}</p>
            <a routerLink="/sell" class="link">{{ 'payout.goSeller' | t }} →</a>
          </div>
        } @else {
          <div class="policy">
            <p><strong>{{ ('payout.persona.' + persona()) | t }}</strong> · {{ 'payout.feeLine' | t }}</p>
            <ul>
              <li>{{ 'payout.platformFee' | t }}: <strong>{{ pol.platformFeeRate * 100 | number: '1.0-2' }}%</strong></li>
              @if (pol.taxRate > 0) {
                <li>{{ 'payout.tax' | t }}: <strong>{{ pol.taxRate * 100 | number: '1.0-2' }}%</strong></li>
              }
              <li>{{ 'payout.totalFee' | t }}: <strong>{{ pol.totalFeeRate * 100 | number: '1.0-2' }}%</strong></li>
              @if (!pol.chargeAtWithdraw) {
                <li class="note">{{ 'payout.netAtSource' | t }}</li>
              }
              @if (pol.holdHours > 0) {
                <li>{{ 'payout.hold' | t }}: <strong>{{ pol.holdHours }}h</strong></li>
              }
              @if (pol.minAmountVnd > 0) {
                <li>{{ 'payout.minBalance' | t }}: <strong>{{ pol.minAmountVnd | number }} VND</strong> (~{{ pol.minAmount | currency: pol.minAmountCurrency }})</li>
              }
            </ul>
          </div>
        }
      }

      @if (persona() === 'buyer') {
        <div class="policy">
          <p>{{ 'wallet.wd.buyerHere' | t }}</p>
          <a routerLink="/wallet" [queryParams]="{ tab: 'withdraw' }" class="link">{{ 'wallet.wd.goWallet' | t }} →</a>
        </div>
      }

      @if (kyc(); as k) {
        @if (!k.withdrawAllowed && auth.user()?.role !== 'admin') {
          <div class="kyc-block">
            <p>{{ 'kyc.withdrawBlocked' | t }}</p>
            <p class="status">{{ ('kyc.status.' + k.status) | t }}</p>
            <a routerLink="/sell/kyc" class="link">{{ 'kyc.goVerify' | t }} →</a>
          </div>
        }
      }

      <div class="grid">
        <form class="card" (ngSubmit)="withdraw()">
          @if (summary(); as s) {
            <p class="ok">{{ 'sell.wd.available' | t }}: {{ s.available | currency: s.currency }} · {{ 'sell.wd.held' | t }}: {{ s.held | currency: s.currency }}</p>
            @if (s.holds.length) {
              <ul>
                @for (h of s.holds; track h.orderId) {
                  <li>
                    <span>{{ h.productName }} · {{ (h.kind === 'dispute' ? 'sell.wd.holdDispute' : 'sell.wd.hold48') | t }}</span>
                    <strong>{{ h.amount | currency: h.currency }}</strong>
                  </li>
                }
              </ul>
            }
          }
          <label>
            <span>{{ 'sell.wd.amount' | t }}</span>
            <input type="number" min="1" [(ngModel)]="amount" name="amount" (ngModelChange)="refreshQuote()" />
          </label>

          @if (quote(); as quote) {
            <ul class="quote">
              <li><span>{{ 'payout.gross' | t }}</span><strong>{{ quote.gross | currency: 'USD' }}</strong></li>
              @if (quote.platformFee > 0) {
                <li><span>{{ 'payout.platformFee' | t }}</span><strong>−{{ quote.platformFee | currency: 'USD' }}</strong></li>
              }
              @if (quote.tax > 0) {
                <li><span>{{ 'payout.tax' | t }}</span><strong>−{{ quote.tax | currency: 'USD' }}</strong></li>
              }
              <li class="net"><span>{{ 'payout.net' | t }}</span><strong>{{ quote.net | currency: 'USD' }}</strong></li>
            </ul>
          }

          <button type="submit" [disabled]="!canWithdraw()">{{ 'sell.wd.submit' | t }}</button>
          @if (msg()) {
            <p [class.ok]="!isErr()" [class.err]="isErr()">{{ msg() }}</p>
          }
        </form>
        <div class="card">
          <h2>{{ 'sell.wd.history' | t }}</h2>
          <ul>
            @for (t of txs(); track t.id) {
              <li>
                <span>{{ t.type }} · {{ t.status || 'completed' }} · {{ t.note }}</span>
                <strong>{{ t.amount | currency: t.currency }}</strong>
              </li>
            } @empty {
              <li class="empty">{{ 'sell.wd.noTx' | t }}</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .policy { background: #f7f7f5; border: 1px solid #ececec; border-radius: 12px; padding: .85rem 1rem; margin-bottom: 1rem; }
    .policy p { margin: 0 0 .4rem; font-weight: 700; }
    .policy ul { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .policy ul li { border: 0; padding: 0; }
    .policy ul li.note { color: #666; font-size: .8rem; width: 100%; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1rem; }
    label { display: grid; gap: .35rem; font-weight: 700; font-size: .85rem; }
    input { border: 1px solid #e5e5e5; border-radius: 10px; padding: .7rem .8rem; font: inherit; }
    button { margin-top: .85rem; min-height: 2.45rem; border: 0; border-radius: 10px; background: #e53935; color: #fff; font: inherit; font-weight: 800; cursor: pointer; padding: 0 1rem; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    ul { list-style: none; margin: .75rem 0 0; padding: 0; display: grid; gap: .55rem; }
    li { display: flex; justify-content: space-between; gap: .75rem; font-size: .85rem; border-bottom: 1px solid #f0f0f0; padding-bottom: .55rem; }
    .quote .net { border-bottom: 0; }
    .quote .net strong { color: #15803d; }
    .ok { color: #15803d; font-size: .85rem; }
    .err { color: #b42318; font-size: .85rem; }
    .empty { color: #999; }
    .blocked { background: #fff3f3; border: 1px solid #f3c6c6; border-radius: 12px; padding: .9rem 1rem; margin-bottom: 1rem; }
    .blocked p { margin: 0 0 .35rem; font-weight: 700; }
    .blocked .hint { font-weight: 500; color: #666; font-size: .85rem; }
    .kyc-block { background: #fff8e6; border: 1px solid #f0d78c; border-radius: 12px; padding: .9rem 1rem; margin-bottom: 1rem; }
    .kyc-block .status { font-weight: 800; margin: .35rem 0; }
    .kyc-block .link, .blocked .link { font-weight: 800; color: #111; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SellWithdrawComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly kycApi = inject(KycService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly txs = signal<WalletTx[]>([]);
  readonly summary = signal<WalletSummary | null>(null);
  readonly kyc = signal<KycProfile | null>(null);
  readonly policy = signal<PayoutPolicy | null>(null);
  readonly personas = signal<PayoutPersona[]>([]);
  readonly persona = signal<PayoutPersona | ''>('');
  readonly quote = signal<PayoutQuote | null>(null);
  readonly msg = signal('');
  readonly errFlag = signal(false);
  amount = 100;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sell.nav.withdraw') });
    this.api.wallet().subscribe((t) => this.txs.set(t));
    this.api.walletSummary().subscribe((s) => this.summary.set(s));
    this.kycApi.me().subscribe({ next: (k) => this.kyc.set(k), error: () => undefined });
    this.api.payoutPolicy(undefined, this.amount).subscribe({
      next: (res) => {
        this.personas.set(res.personas || []);
        this.persona.set(res.persona);
        this.policy.set(res.policy);
        this.quote.set(res.quote);
      },
      error: () => undefined,
    });
  }

  setPersona(p: PayoutPersona): void {
    this.persona.set(p);
    this.refreshQuote();
  }

  refreshQuote(): void {
    const amount = Number(this.amount);
    this.api.payoutPolicy(this.persona() || undefined, Number.isFinite(amount) && amount > 0 ? amount : undefined).subscribe({
      next: (res) => {
        this.policy.set(res.policy);
        this.quote.set(res.quote);
      },
      error: () => undefined,
    });
  }

  canWithdraw(): boolean {
    // Buyers withdraw from /wallet (bank account form); the seller center is for seller payouts.
    if (this.persona() === 'buyer') return false;
    if (this.auth.user()?.role === 'admin') return true;
    if (!this.policy()?.canWithdraw) return false;
    return !!this.kyc()?.withdrawAllowed;
  }

  isErr(): boolean {
    return this.errFlag();
  }

  withdraw(): void {
    if (!this.policy()?.canWithdraw) {
      this.errFlag.set(true);
      this.msg.set(this.i18n.t('sell.wd.buyerBlocked'));
      return;
    }
    if (!this.canWithdraw()) {
      this.errFlag.set(true);
      this.msg.set(this.i18n.t('sell.wd.kycFirst'));
      return;
    }
    this.api.withdraw(this.amount, this.persona() || undefined).subscribe({
      next: (tx) => {
        this.errFlag.set(false);
        this.txs.update((list) => [tx, ...list]);
        this.msg.set(this.i18n.t('sell.wd.sent', { amount: tx.amount }));
        this.api.walletSummary().subscribe((s) => this.summary.set(s));
      },
      error: (err) => {
        this.errFlag.set(true);
        this.msg.set(err?.error?.message || this.i18n.t('sell.wd.fail'));
      },
    });
  }
}

@Component({
  selector: 'app-sell-products',
  standalone: true,
  imports: [RouterLink, DecimalPipe, TPipe],
  template: `
    <section>
      <div class="head">
        <div>
          <p class="crumb">{{ 'sell.nav.sales' | t }} / {{ 'sell.nav.products' | t }}</p>
          <h1>{{ 'sell.nav.products' | t }}</h1>
        </div>
        <a [routerLink]="addLink()" class="btn">+ {{ 'sell.prod.add' | t }}</a>
      </div>
      @if (isTalent()) {
        <p class="note">{{ 'sell.prod.talentNote' | t }}</p>
      }
      <div class="list">
        @for (p of products(); track p.id) {
          <article class="card">
            <div>
              <p class="cat">{{ label(p.category) }}</p>
              <a [routerLink]="['/product', p.slug]">{{ p.name }}</a>
              <p class="meta">{{ 'sell.prod.sold' | t: { n: ((p.salesCount || 0) | number) ?? '0' } }} · ★ {{ p.rating | number: '1.1-1' }}</p>
            </div>
            <a class="ghost" [routerLink]="actionLink(p)">{{ actionLabel(p) }}</a>
          </article>
        } @empty {
          <div class="card empty">
            <p>{{ 'sell.prod.empty' | t }}</p>
            <a [routerLink]="addLink()" class="btn">{{ 'sell.prod.add' | t }}</a>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: end; margin-bottom: 1rem; }
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .25rem 0 0; font-size: 1.45rem; font-weight: 800; }
    .btn { display: inline-flex; align-items: center; min-height: 2.4rem; padding: .5rem 1rem; border-radius: 10px; background: #e53935; color: #fff; text-decoration: none; font-weight: 800; }
    .list { display: grid; gap: .65rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1rem; display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .cat { margin: 0; font-size: .72rem; color: #888; text-transform: uppercase; }
    .card a { color: inherit; text-decoration: none; font-weight: 800; font-size: 1.05rem; }
    .meta { margin: .25rem 0 0; color: #777; font-size: .85rem; }
    .ghost { border: 1px solid #ddd; border-radius: 10px; padding: .45rem .8rem; text-decoration: none; color: #333; font-weight: 700; font-size: .85rem; }
    .empty { flex-direction: column; align-items: flex-start; }
    .note { margin: 0 0 1rem; padding: .65rem .85rem; border-radius: 10px; background: #fff7ed; color: #9a3412; font-size: .85rem; }
  `,
})
export class SellProductsComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly products = signal<Product[]>([]);
  readonly label = categoryLabel;
  readonly isTalent = computed(() => this.auth.user()?.role === 'talent');
  readonly addLink = computed(() => (this.isTalent() ? '/sell/products/new' : '/dashboard/products'));

  actionLabel(p: Product): string {
    if (isTemplateCategory(p.category)) return this.i18n.t('sell.nav.templates');
    const k = sellerWorkspaceKind(p.category);
    if (k === 'voice') return this.i18n.t('sell.prod.act.voice');
    if (k === 'watch') return this.i18n.t('sell.prod.act.watch');
    if (k === 'download') return 'License';
    if (k === 'hire') return 'Listing';
    if (k === 'compute') return 'GPU';
    return 'Deploy';
  }

  actionLink(p: Product): string | string[] {
    if (isTemplateCategory(p.category)) return '/sell/templates';
    const k = sellerWorkspaceKind(p.category);
    if (k === 'watch') return '/dashboard/products';
    if (k === 'download') return '/dashboard/licenses';
    if (k === 'hire') return ['/product', p.slug];
    if (k === 'compute') return '/dashboard/gpu';
    return ['/deploy', p.slug];
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sell.nav.products') });
    const slug = this.auth.user()?.creatorSlug;
    if (!slug) return;
    this.productsApi.list({ creatorSlug: slug, includeHidden: true }).subscribe((items) => this.products.set(items));
  }
}

@Component({
  selector: 'app-sell-placeholder',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="ph">
      <p class="crumb">{{ crumb }}</p>
      <h1>{{ title }}</h1>
      <div class="card">
        <p>{{ desc }}</p>
        <a routerLink="/sell" class="link">{{ 'sell.ph.back' | t }} ›</a>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.25rem; max-width: 560px; }
    p { color: #666; }
    .link { color: #e53935; font-weight: 700; text-decoration: none; }
  `,
})
export class SellPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  title = this.i18n.t('sell.ph.title');
  crumb = this.i18n.t('sell.ws.seller.title');
  desc = this.i18n.t('sell.ph.desc');

  constructor() {
    const key = this.route.snapshot.data['page'] as string | undefined;
    const sections: Record<string, [string, string]> = {
      complaints: ['complaints', 'sales'],
      coupons: ['coupons', 'sales'],
      ledger: ['ledger', 'finance'],
      integrate: ['integrate', 'dev'],
    };
    const hit = key ? sections[key] : undefined;
    if (hit) {
      const [page, group] = hit;
      this.title = this.i18n.t(`sell.nav.${page}`);
      this.crumb = `${this.i18n.t(`sell.nav.${group}`)} / ${this.title}`;
      this.desc = this.i18n.t(`sell.ph.${page}`);
    }
    this.seo.set({ title: this.title });
  }
}
