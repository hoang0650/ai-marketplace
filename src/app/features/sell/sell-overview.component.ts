import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { KycService } from '../../services/api.services';
import { KycProfile } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ShopProfileService } from './shop-profile.service';
import { SellWorkspace, sellWorkspaceOf } from './sell-workspace';
import { WORK_BOARD_ENABLED } from '../../models/feature-flags';

@Component({
  selector: 'app-sell-overview',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="ov">
      @if (workspace() !== 'seller') {
        <div class="ov-dash">
          <p class="crumb">{{ ('sell.ws.' + workspace() + '.title') | t }} / {{ 'sell.nav.overview' | t }}</p>
          <h1>{{ ('sell.ws.' + workspace() + '.heading') | t }}</h1>
          <p class="muted">{{ 'sell.partner.lede' | t }}</p>

          <div class="ov-kyc" [class.ok]="kyc()?.status === 'verified'">
            <div>
              <strong>{{ 'sell.partner.kycTitle' | t }}</strong>
              <span>{{ ('kyc.status.' + (kyc()?.status || 'none')) | t }}</span>
              @if (kyc()?.status === 'rejected' && kyc()?.rejectReason) {
                <span class="reason">{{ kyc()?.rejectReason }}</span>
              }
            </div>
            <a routerLink="/sell/kyc" class="btn-primary">
              {{ (kyc()?.status === 'verified' ? 'sell.partner.kycView' : 'kyc.goVerify') | t }} ›
            </a>
          </div>

          <div class="ov-cards">
            @if (workEnabled) {
              <a routerLink="/work/manage" class="card">
                <strong>{{ 'sell.nav.work' | t }}</strong>
                <span>{{ ('sell.partner.workDesc.' + workspace()) | t }}</span>
              </a>
              <a routerLink="/work/manage/contracts" class="card">
                <strong>{{ 'sell.nav.contracts' | t }}</strong>
                <span>{{ 'sell.partner.contractsDesc' | t }}</span>
              </a>
            }
            <a routerLink="/sell/messages" class="card">
              <strong>{{ 'sell.nav.messages' | t }}</strong>
              <span>{{ 'sell.partner.messagesDesc' | t }}</span>
            </a>
            <a routerLink="/sell/issues" class="card">
              <strong>{{ 'sell.nav.issues' | t }}</strong>
              <span>{{ 'sell.partner.issuesDesc' | t }}</span>
            </a>
            <a routerLink="/sell/withdraw" class="card">
              <strong>{{ 'sell.nav.withdraw' | t }}</strong>
              <span>{{ 'payout.rulesBody' | t }}</span>
            </a>
          </div>
        </div>
      } @else if (!shop.started()) {
        <div class="ov-hero">
          <span class="ov-hero__icon" aria-hidden="true">🏪</span>
          <p class="ov-hero__eyebrow">{{ 'sell.ov.eyebrow' | t: { brand } }}</p>
          <h1>{{ 'sell.ov.title' | t }}</h1>
          <p class="ov-hero__desc">{{ 'sell.ov.desc' | t }}</p>
          <div class="ov-hero__actions">
            <button type="button" class="btn-primary" (click)="start()">{{ 'sell.ov.start' | t }} ›</button>
            <a routerLink="/legal/chinh-sach-nguoi-ban" class="btn-ghost">{{ 'sell.ov.rules' | t }}</a>
          </div>
          <div class="ov-steps">
            <article>
              <span>1</span>
              <h3>{{ 'sell.ov.step1' | t }}</h3>
              <p>{{ 'sell.ov.step1Desc' | t }}</p>
            </article>
            <article>
              <span>2</span>
              <h3>{{ 'sell.ov.step2' | t }}</h3>
              <p>{{ 'sell.ov.step2Desc' | t }}</p>
            </article>
            <article>
              <span>3</span>
              <h3>{{ 'sell.ov.step3' | t }}</h3>
              <p>{{ 'sell.ov.step3Desc' | t }}</p>
            </article>
          </div>
          <p class="ov-note">✓ {{ 'sell.ov.note' | t }}</p>
        </div>
      } @else {
        <div class="ov-dash">
          <p class="crumb">{{ 'sell.ws.seller.title' | t }} / {{ 'sell.nav.overview' | t }}</p>
          <h1>{{ 'sell.ov.dashTitle' | t }}</h1>
          <p class="muted">{{ 'sell.ov.dashLede' | t }}</p>
          <div class="ov-cards">
            <a routerLink="/sell/profile" class="card">
              <strong>{{ 'sell.nav.profile' | t }}</strong>
              <span>{{ 'sell.ov.statusLine' | t: { status: shop.statusLabel() } }}</span>
            </a>
            <a routerLink="/sell/kyc" class="card">
              <strong>{{ 'sell.nav.kyc' | t }}</strong>
              <span>{{ ('kyc.status.' + (kyc()?.status || 'none')) | t }}</span>
            </a>
            <a routerLink="/sell/products" class="card">
              <strong>{{ 'sell.nav.products' | t }}</strong>
              <span>{{ 'sell.ov.productsDesc' | t }}</span>
            </a>
            <a routerLink="/sell/orders" class="card">
              <strong>{{ 'sell.nav.orders' | t }}</strong>
              <span>{{ 'sell.ov.ordersDesc' | t }}</span>
            </a>
            <a routerLink="/sell/docs/api-usage" class="card">
              <strong>{{ 'sell.nav.apiDocs' | t }}</strong>
              <span>{{ 'sell.ov.apiDocsDesc' | t }}</span>
            </a>
            <a routerLink="/sell/payment" class="card">
              <strong>{{ 'sell.nav.payment' | t }}</strong>
              <span>{{ 'sell.ov.paymentDesc' | t }}</span>
            </a>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .ov-hero {
      max-width: 820px;
      margin: 1.5rem auto;
      background: #fff;
      border: 1px solid #ececec;
      border-radius: 16px;
      padding: 2.2rem 1.8rem 1.8rem;
      text-align: center;
    }
    .ov-hero__icon {
      width: 3rem;
      height: 3rem;
      border-radius: 12px;
      background: #e53935;
      color: #fff;
      display: grid;
      place-items: center;
      margin: 0 auto 0.9rem;
      font-size: 1.25rem;
    }
    .ov-hero__eyebrow {
      margin: 0;
      color: #e53935;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0.55rem 0 0;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .ov-hero__desc {
      margin: 0.75rem auto 0;
      max-width: 38rem;
      color: #666;
      line-height: 1.55;
    }
    .ov-hero__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.65rem;
      margin-top: 1.25rem;
    }
    .btn-primary,
    .btn-ghost {
      min-height: 2.6rem;
      padding: 0.55rem 1.1rem;
      border-radius: 10px;
      font: inherit;
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .btn-primary {
      border: 0;
      background: #e53935;
      color: #fff;
    }
    .btn-ghost {
      border: 1px solid #f0c7c7;
      background: #fff;
      color: #e53935;
    }
    .ov-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.9rem;
      margin-top: 1.8rem;
      text-align: left;
    }
    .ov-steps article {
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 1rem;
      background: #fafafa;
    }
    .ov-steps span {
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 999px;
      background: #ffe8e8;
      color: #e53935;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .ov-steps h3 {
      margin: 0.55rem 0 0.25rem;
      font-size: 0.95rem;
    }
    .ov-steps p {
      margin: 0;
      font-size: 0.82rem;
      color: #777;
      line-height: 1.45;
    }
    .ov-note {
      margin: 1.2rem 0 0;
      font-size: 0.82rem;
      color: #15803d;
    }
    .crumb {
      margin: 0;
      font-size: 0.8rem;
      color: #888;
    }
    .muted {
      margin: 0.35rem 0 0;
      color: #777;
    }
    .ov-dash h1 {
      margin-top: 0.35rem;
      font-size: 1.6rem;
    }
    .ov-cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 1.2rem;
    }
    .card {
      display: grid;
      gap: 0.25rem;
      padding: 1.1rem;
      border-radius: 14px;
      border: 1px solid #ececec;
      background: #fff;
      text-decoration: none;
      color: inherit;
    }
    .card strong {
      font-size: 1rem;
    }
    .card span {
      color: #777;
      font-size: 0.85rem;
    }
    .ov-kyc {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-top: 1.2rem;
      padding: 1rem 1.1rem;
      border-radius: 14px;
      border: 1px solid #f0d78c;
      background: #fff8e6;
    }
    .ov-kyc.ok {
      border-color: #bfe5cc;
      background: #eefaf2;
    }
    .ov-kyc div {
      display: grid;
      gap: 0.2rem;
    }
    .ov-kyc span {
      font-size: 0.85rem;
      color: #666;
    }
    .ov-kyc .reason {
      color: #b42318;
    }
    @media (max-width: 720px) {
      .ov-kyc {
        flex-direction: column;
        align-items: flex-start;
      }
      .ov-steps,
      .ov-cards {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SellOverviewComponent {
  readonly shop = inject(ShopProfileService);
  readonly brand = environment.brandName;
  readonly workEnabled = WORK_BOARD_ENABLED;
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly kycApi = inject(KycService);

  readonly workspace = computed<SellWorkspace>(() => sellWorkspaceOf(this.auth.user()?.role));
  readonly kyc = signal<KycProfile | null>(null);

  constructor() {
    this.seo.set({ title: this.i18n.t(`sell.ws.${this.workspace()}.title`) });
    this.shop.reload();
    this.kycApi.me().subscribe({ next: (k) => this.kyc.set(k), error: () => undefined });
  }

  start(): void {
    this.shop.start();
    void this.router.navigateByUrl('/sell/profile');
  }
}
