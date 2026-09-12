import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { DashboardService, ReviewService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import {
  AdminOverview,
  AffiliateStats,
  Order,
  Review,
} from '../../models/marketplace.models';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page route-enter max-w-2xl">
      <h1 class="section-title">Billing</h1>
      <p class="mt-2 text-muted">
        Mọi đơn hàng trên AI Markets được thanh toán bằng ví aimarkets.vn. Nạp tiền vào ví rồi mua trên trang sản phẩm hoặc giỏ hàng.
      </p>
      <div class="panel mt-8 grid gap-3">
        <p class="text-sm">Phương thức: ví aimarkets.vn — trên web nạp Apple Pay, Google Pay hoặc PayPal; trên app iOS/Android nạp bằng IAP.</p>
        <a class="btn btn-fill w-fit" routerLink="/wallet">Mở ví & nạp tiền</a>
      </div>
    </section>
  `,
})
export class BillingComponent {
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.set({ title: 'Billing' });
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
  imports: [CurrencyPipe, DecimalPipe, PercentPipe, DatePipe, RouterLink],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Admin dashboard</h1>
      <p class="mt-2 max-w-2xl text-muted">
        GMV, phí sàn (commission, mặc định 20%), phí CHPlay/App Store (IAP), thuế khấu trừ và seller payable theo snapshot đơn — không tính lại 80% trên tổng GMV.
      </p>

      @if (data(); as d) {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Tổng doanh thu sàn (GMV)</p>
            <p class="mt-2 font-display text-3xl">{{ d.totalGrossRevenue | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">{{ d.paidOrders | number }} paid orders</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí sàn (commission)</p>
            <p class="mt-2 font-display text-3xl">{{ d.platformFee | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Mặc định {{ d.platformFeeRate | percent }} — không phải thuế</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Seller payable (net)</p>
            <p class="mt-2 font-display text-3xl">{{ d.sellerNet | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Sau phí sàn / cửa hàng / thuế / điều chỉnh</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí CHPlay / App Store</p>
            <p class="mt-2 font-display text-3xl">{{ (d.storeFees || 0) | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Tổng phí IAP Google + Apple — không phải doanh thu sàn</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí CHPlay</p>
            <p class="mt-2 font-display text-3xl">{{ (d.playStoreFees || 0) | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Google Play 15% trên IAP — Google thu</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí App Store</p>
            <p class="mt-2 font-display text-3xl">{{ (d.appStoreFees || 0) | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">App Store 30% trên IAP — Apple thu</p>
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
          <p class="mt-1 text-sm text-muted">Gross · phí sàn · phí CHPlay · phí App Store · tổng IAP · seller payable — không đồng nhất với 80%</p>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[960px] text-left text-sm">
              <thead class="text-xs uppercase tracking-wider text-muted">
                <tr class="border-b border-line">
                  <th class="py-2 pr-3 font-medium">Shop</th>
                  <th class="py-2 pr-3 font-medium">Orders</th>
                  <th class="py-2 pr-3 font-medium">Gross</th>
                  <th class="py-2 pr-3 font-medium">Phí sàn 20%</th>
                  <th class="py-2 pr-3 font-medium">Phí CHPlay</th>
                  <th class="py-2 pr-3 font-medium">Phí App Store</th>
                  <th class="py-2 pr-3 font-medium">CHPlay / App Store</th>
                  <th class="py-2 font-medium">Seller payable</th>
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
                    <td class="py-3 pr-3">{{ (shop.playStoreFeeAmount || 0) | currency: d.currency }}</td>
                    <td class="py-3 pr-3">{{ (shop.appStoreFeeAmount || 0) | currency: d.currency }}</td>
                    <td class="py-3 pr-3">{{ (shop.storeFeeAmount || 0) | currency: d.currency }}</td>
                    <td class="py-3">{{ shop.sellerNet | currency: d.currency }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="py-6 text-muted" colspan="8">No paid orders yet.</td>
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
                <li class="border-b border-line py-2">
                  <a class="flex justify-between gap-3 hover:text-accent" [routerLink]="['/admin/users', u.id]">
                    <span>{{ u.name }}</span>
                    <span class="text-muted">{{ u.role }} · {{ u.accountStatus || 'active' }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
          <div class="panel">
            <h2 class="font-display text-2xl">Recent products</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (p of d.productsList; track p.id) {
                <li class="border-b border-line py-2">
                  <a class="flex justify-between gap-3 hover:text-accent" [routerLink]="['/admin/products', p.id]">
                    <span>{{ p.name }}</span>
                    <span class="text-muted">{{ p.category }} · bán {{ p.salesCount || 0 }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
        </div>

        <div class="panel mt-8">
          <h2 class="font-display text-2xl">Nạp / rút tiền</h2>
          <p class="mt-1 text-sm text-muted">Duyệt yêu cầu nạp ví và rút tiền seller. Chỉ cộng/trừ số dư sau khi admin xác nhận.</p>
          <p class="mt-2"><a class="text-accent underline" routerLink="/admin/finance">Mở quản lý nạp rút</a></p>
        </div>

        <div class="panel mt-8">
          <h2 class="font-display text-2xl">Complaints</h2>
          <p class="mt-1 text-sm text-muted">Hồ sơ khiếu nại theo quy trình tiếp nhận → xác minh → quyết định.</p>
          <p class="mt-2"><a class="text-accent underline" routerLink="/admin/complaints">Mở danh sách khiếu nại</a></p>
        </div>

        <div class="panel mt-8">
          <h2 class="font-display text-2xl">Disputes</h2>
          <p class="mt-1 text-sm text-muted">Chỉ đóng băng seller net của đơn bị khiếu nại, không khóa cả ví.</p>
          <ul class="mt-4 space-y-3 text-sm">
            @for (o of disputes(); track o.id) {
              <li class="border-b border-line py-3">
                <p class="font-medium">{{ o.productName }} · {{ o.amount | currency: o.currency }}</p>
                <p class="text-muted">{{ o.disputeStatus }} · {{ o.disputeReason }}</p>
                <p class="text-xs text-muted">
                  Held {{ o.sellerNet | currency: o.currency }} · {{ o.disputeOpenedAt | date: 'short' }}
                </p>
                @if (o.disputeStatus === 'open') {
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button class="btn btn-fill text-xs" type="button" (click)="resolve(o, 'seller')">
                      Seller keeps payout
                    </button>
                    <button class="btn btn-outline text-xs" type="button" (click)="resolve(o, 'buyer')">
                      Refund buyer
                    </button>
                  </div>
                }
              </li>
            } @empty {
              <li class="text-muted">No disputes.</li>
            }
          </ul>
        </div>
      }
    </section>
  `,
})
export class AdminComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly data = signal<AdminOverview | null>(null);
  readonly disputes = signal<Order[]>([]);
  ngOnInit(): void {
    this.seo.set({ title: 'Admin' });
    this.api.adminOverview().subscribe((d) => this.data.set(d));
    this.api.adminDisputes().subscribe((list) => this.disputes.set(list));
  }

  resolve(o: Order, resolution: 'seller' | 'buyer'): void {
    this.api.resolveDispute(o.id, resolution).subscribe((updated) => {
      this.disputes.update((list) => list.map((row) => (row.id === updated.id ? updated : row)));
    });
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
