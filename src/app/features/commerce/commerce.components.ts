import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { BillingService, DashboardService, ReviewService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import {
  AffiliateStats,
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
          <form class="mt-6 flex gap-2" (ngSubmit)="withdraw()">
            <input class="input" type="number" [(ngModel)]="amount" name="amount" />
            <button class="btn btn-fill" type="submit">Withdraw</button>
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
  imports: [CurrencyPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Admin</h1>
      @if (data(); as d) {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="panel">
            <p class="text-xs text-muted">Users</p>
            <p class="font-display text-3xl">{{ d['users'] }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Products</p>
            <p class="font-display text-3xl">{{ d['products'] }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">Creators</p>
            <p class="font-display text-3xl">{{ d['creators'] }}</p>
          </div>
          <div class="panel">
            <p class="text-xs text-muted">GMV</p>
            <p class="font-display text-3xl">{{ $any(d['gmv']) | currency: 'USD' }}</p>
          </div>
        </div>
        <div class="mt-8 grid gap-6 lg:grid-cols-2">
          <div class="panel">
            <h2 class="font-display text-2xl">Users</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (u of $any(d['usersList']); track u.id) {
                <li class="flex justify-between border-b border-line py-2">
                  <span>{{ u.name }}</span><span class="text-muted">{{ u.role }}</span>
                </li>
              }
            </ul>
          </div>
          <div class="panel">
            <h2 class="font-display text-2xl">Products</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (p of $any(d['productsList']); track p.id) {
                <li class="flex justify-between border-b border-line py-2">
                  <span>{{ p.name }}</span><span class="text-muted">{{ p.category }}</span>
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
  readonly data = signal<Record<string, unknown> | null>(null);
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
