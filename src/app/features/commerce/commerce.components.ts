import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { BillingService, DashboardService, ReviewService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import {
  AffiliateStats,
  AdminOverview,
  PaymentProvider,
  Review,
  User,
  WalletTx,
} from '../../models/marketplace.models';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page route-enter max-w-2xl">
      <h1 class="section-title">Billing</h1>
      <p class="mt-2 text-muted">Choose a payment provider for subscriptions and one-time purchases.</p>
      <form class="panel mt-8 grid gap-3" (ngSubmit)="pay()">
        <label class="text-xs uppercase tracking-wider text-muted">Provider</label>
        <select class="input" [(ngModel)]="provider" name="provider">
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
          <option value="paddle">Paddle</option>
          <option value="payos">PayOS</option>
        </select>
        <button class="btn btn-fill w-fit" type="submit">Start checkout demo</button>
        @if (msg()) {
          <p class="font-mono text-xs text-accent">{{ msg() }}</p>
        }
      </form>
    </section>
  `,
})
export class BillingComponent {
  private readonly billing = inject(BillingService);
  private readonly seo = inject(SeoService);
  provider: PaymentProvider = 'stripe';
  readonly msg = signal('');
  constructor() {
    this.seo.set({ title: 'Billing' });
  }
  pay(): void {
    this.billing.checkout({ productId: 'p-concierge', provider: this.provider }).subscribe((r) => {
      this.msg.set(`${r.provider} checkout ${r.checkoutId}`);
    });
  }
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Wallet</h1>
      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <div class="panel">
          <p class="text-xs uppercase text-muted">Available</p>
          <p class="mt-2 font-display text-4xl">{{ balance() | currency: 'USD' }}</p>
          <form class="mt-6 flex gap-2" (ngSubmit)="deposit()">
            <input class="input" type="number" [(ngModel)]="depositAmount" name="depositAmount" min="1" />
            <button class="btn btn-fill" type="submit">Deposit</button>
          </form>
          <form class="mt-3 flex gap-2" (ngSubmit)="withdraw()">
            <input class="input" type="number" [(ngModel)]="amount" name="amount" min="1" />
            <button class="btn" type="submit">Withdraw</button>
          </form>
        </div>
        <div class="panel">
          <h2 class="font-display text-2xl">Transactions</h2>
          <ul class="mt-4 space-y-3 text-sm">
            @for (t of txs(); track t.id) {
              <li class="flex justify-between border-b border-line pb-2">
                <span>{{ t.type }} · {{ t.note }}</span>
                <span>{{ t.amount | currency: t.currency }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class WalletComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly txs = signal<WalletTx[]>([]);
  readonly balance = signal(0);
  amount = 50;
  depositAmount = 100;

  ngOnInit(): void {
    this.seo.set({ title: 'Wallet' });
    this.reload();
  }

  reload(): void {
    this.api.wallet().subscribe((list) => {
      this.txs.set(list);
      const bal = list.reduce(
        (s, t) => s + (t.type === 'debit' || t.type === 'withdraw' ? -t.amount : t.amount),
        0,
      );
      this.balance.set(bal);
    });
  }

  deposit(): void {
    this.api.deposit(this.depositAmount).subscribe(() => this.reload());
  }

  withdraw(): void {
    this.api.withdraw(this.amount).subscribe(() => this.reload());
  }
}

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <section class="page route-enter max-w-xl">
      <h1 class="section-title">Profile</h1>
      @if (user(); as u) {
        <div class="panel mt-8 flex gap-4">
          <img [src]="u.avatarUrl" [alt]="u.name" class="h-20 w-20 rounded-2xl bg-mist" />
          <div>
            <p class="font-display text-3xl">{{ u.name }}</p>
            <p class="text-muted">{{ u.email }}</p>
            <p class="mt-2 text-sm uppercase tracking-wider text-muted">{{ u.role }}</p>
            @if (u.bio) {
              <p class="mt-3 text-muted">{{ u.bio }}</p>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly user = signal<User | null>(null);
  ngOnInit(): void {
    this.seo.set({ title: 'Profile' });
    this.user.set(this.auth.user());
  }
}

@Component({
  selector: 'app-affiliate',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <section class="page route-enter max-w-3xl">
      <h1 class="section-title">Affiliate</h1>
      @if (stats(); as s) {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="panel">
            <p class="text-xs text-muted">Code</p>
            <p class="mt-2 font-mono text-xl">{{ s.code }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Clicks</p>
            <p class="mt-2 font-display text-3xl">{{ s.clicks | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Conversions</p>
            <p class="mt-2 font-display text-3xl">{{ s.conversions | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Earnings</p>
            <p class="mt-2 font-display text-3xl">{{ s.earnings | currency: s.currency }}</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class AffiliateComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly stats = signal<AffiliateStats | null>(null);
  ngOnInit(): void {
    this.seo.set({ title: 'Affiliate' });
    this.api.affiliate().subscribe((s) => this.stats.set(s));
  }
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Admin dashboard</h1>
      <p class="mt-2 max-w-2xl text-muted">
        Marketplace GMV, platform fee (20%), per-shop revenue, and buyer wallet deposits.
      </p>

      @if (data(); as d) {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Tổng doanh thu sàn (GMV)</p>
            <p class="mt-2 font-display text-3xl">{{ d.totalGrossRevenue | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">{{ d.paidOrders | number }} paid orders</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí nền tảng</p>
            <p class="mt-2 font-display text-3xl">{{ d.platformFee | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">{{ d.platformFeeRate | percent }} of GMV</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Seller net (80%)</p>
            <p class="mt-2 font-display text-3xl">{{ d.sellerNet | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Across all shops</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Buyer nạp tiền</p>
            <p class="mt-2 font-display text-3xl">{{ d.buyerDeposits | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">{{ d.buyerDepositCount | number }} deposits</p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="panel">
            <p class="text-xs text-muted">Users</p>
            <p class="font-display text-3xl">{{ d.users | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Creators / shops</p>
            <p class="font-display text-3xl">{{ d.creators | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Products</p>
            <p class="font-display text-3xl">{{ d.products | number }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Orders</p>
            <p class="font-display text-3xl">{{ d.orders | number }}</p>
          </div>
        </div>

        <div class="panel mt-8">
          <h2 class="font-display text-2xl">Doanh thu từng shop</h2>
          <p class="mt-1 text-sm text-muted">Gross · platform fee 20% · seller net 80%</p>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[640px] text-left text-sm">
              <thead class="text-xs uppercase tracking-wider text-muted">
                <tr class="border-b border-line">
                  <th class="py-2 pr-3 font-medium">Shop</th>
                  <th class="py-2 pr-3 font-medium">Orders</th>
                  <th class="py-2 pr-3 font-medium">Gross</th>
                  <th class="py-2 pr-3 font-medium">Platform 20%</th>
                  <th class="py-2 font-medium">Seller net</th>
                </tr>
              </thead>
              <tbody>
                @for (shop of d.shops; track shop.sellerId) {
                  <tr class="border-b border-line">
                    <td class="py-3 pr-3">
                      <div class="flex items-center gap-3">
                        @if (shop.avatarUrl) {
                          <img [src]="shop.avatarUrl" [alt]="shop.shopName" class="h-8 w-8 rounded-full bg-mist" />
                        }
                        <div>
                          <p class="font-medium">{{ shop.shopName }}</p>
                          <p class="text-xs text-muted">{{ shop.creatorSlug || '—' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 pr-3">{{ shop.orders | number }}</td>
                    <td class="py-3 pr-3">{{ shop.grossRevenue | currency: d.currency }}</td>
                    <td class="py-3 pr-3">{{ shop.platformFee | currency: d.currency }}</td>
                    <td class="py-3">{{ shop.sellerNet | currency: d.currency }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="py-6 text-muted" colspan="5">No paid orders yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <div class="panel">
            <h2 class="font-display text-2xl">Recent users</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (u of d.usersList; track u.id) {
                <li class="flex justify-between border-b border-line py-2">
                  <span>{{ u.name }}</span>
                  <span class="text-muted">{{ u.role }}</span>
                </li>
              }
            </ul>
          </div>
          <div class="panel">
            <h2 class="font-display text-2xl">Recent products</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (p of d.productsList; track p.id) {
                <li class="flex justify-between border-b border-line py-2">
                  <span>{{ p.name }}</span>
                  <span class="text-muted">{{ p.category }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly data = signal<AdminOverview | null>(null);
  ngOnInit(): void {
    this.seo.set({ title: 'Admin' });
    this.api.adminOverview().subscribe((d) => this.data.set(d));
  }
}

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <section class="page route-enter max-w-3xl">
      <h1 class="section-title">Reviews</h1>
      <ul class="mt-8 space-y-4">
        @for (r of items(); track r.id) {
          <li class="panel">
            <p class="font-semibold">{{ r.title }} · ★ {{ r.rating | number }}</p>
            <p class="text-sm text-muted">{{ r.userName }} · {{ r.createdAt | date }}</p>
            <p class="mt-2">{{ r.body }}</p>
          </li>
        }
      </ul>
    </section>
  `,
})
export class ReviewsPageComponent implements OnInit {
  private readonly api = inject(ReviewService);
  private readonly seo = inject(SeoService);
  readonly items = signal<Review[]>([]);
  ngOnInit(): void {
    this.seo.set({ title: 'Reviews' });
    this.api.list().subscribe((items) => this.items.set(items));
  }
}
