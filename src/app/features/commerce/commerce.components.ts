import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { DashboardService, ReviewService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AdminOverviewChartsComponent } from '../admin/admin-overview-charts.component';
import { AdminPeopleComponent } from '../admin/admin-people.component';
import { AdminDisputesComponent } from '../admin/admin-disputes.component';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ADMIN_DISPUTE_MESSAGES } from '../admin/admin-disputes.messages';
import {
  AdminOverview,
  Review,
} from '../../models/marketplace.models';

type AdminTab = 'overview' | 'shops' | 'people' | 'ops' | 'disputes';

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
        <p class="text-sm">Phương thức: ví aimarkets.vn — web nạp bằng chuyển khoản ngân hàng (mã QR VietQR) vào tài khoản thanh toán của Công ty; app iOS/Android nạp bằng Apple/Google IAP.</p>
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
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe, RouterLink, TPipe, AdminOverviewChartsComponent, AdminPeopleComponent, AdminDisputesComponent],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Admin dashboard</h1>
      <p class="mt-2 max-w-2xl text-muted">
        GMV, phí sàn 20%, thuế theo loại người bán (cá nhân kinh doanh 7% / 1,5% do sàn khấu trừ; hộ kinh doanh, doanh nghiệp 0%) và seller payable theo snapshot đơn. Không có phí CHPlay/App Store trên đơn hàng (IAP chỉ dùng để nạp ví).
      </p>

      <nav class="admin-links mt-5 flex flex-wrap gap-2" aria-label="Trang quản trị">
        @for (l of adminLinks; track l.path) {
          <a [routerLink]="l.path" class="admin-links__item inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-black/5"><span aria-hidden="true">{{ l.icon }}</span> {{ l.label }}</a>
        }
      </nav>
      <div class="admin-tabs mt-6" role="tablist">
        @for (x of tabs; track x.id) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === x.id" [class.active]="tab() === x.id" (click)="setTab(x.id)">
            {{ x.id === 'disputes' ? ('admin.dispute.tab' | t) : x.label }}
            @if (x.id === 'disputes' && openDisputes()) {
              <span class="admin-tabs__count">{{ openDisputes() }}</span>
            }
          </button>
        }
      </div>

        @switch (tab()) {
        @case ('overview') {
        @if (data(); as d) {
        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Tổng doanh thu sàn (GMV)</p>
            <p class="mt-2 font-display text-3xl">{{ d.totalGrossRevenue | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">{{ d.paidOrders | number }} paid orders</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Phí sàn (commission)</p>
            <p class="mt-2 font-display text-3xl">{{ d.platformFee | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Mặc định {{ d.platformFeeRate | percent }} — thuế tính riêng theo loại người bán (cá nhân 7%, HKD/doanh nghiệp 0%)</p>
          </div>
          <div class="panel">
            <p class="text-xs uppercase tracking-wider text-muted">Seller payable (net)</p>
            <p class="mt-2 font-display text-3xl">{{ d.sellerNet | currency: d.currency }}</p>
            <p class="mt-1 text-xs text-muted">Sau phí sàn / thuế / điều chỉnh</p>
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

        <app-admin-overview-charts [overview]="d" />
        }
        }

        @case ('shops') {
        @if (data(); as d) {
        <div class="panel mt-6">
          <h2 class="font-display text-2xl">Doanh thu từng shop</h2>
          <p class="mt-1 text-sm text-muted">Gross · phí sàn · seller payable — không đồng nhất với 80%</p>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[960px] text-left text-sm">
              <thead class="text-xs uppercase tracking-wider text-muted">
                <tr class="border-b border-line">
                  <th class="py-2 pr-3 font-medium">Shop</th>
                  <th class="py-2 pr-3 font-medium">Orders</th>
                  <th class="py-2 pr-3 font-medium">Gross</th>
                  <th class="py-2 pr-3 font-medium">Phí sàn 20%</th>
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
        }
        }

        @case ('people') {
        <app-admin-people />
        }

        @case ('ops') {
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="panel">
            <h2 class="font-display text-2xl">Nạp / rút tiền</h2>
            <p class="mt-1 text-sm text-muted">Duyệt yêu cầu nạp ví và rút tiền seller. Chỉ cộng/trừ số dư sau khi admin xác nhận.</p>
            <p class="mt-2"><a class="text-accent underline" routerLink="/admin/finance">Mở quản lý nạp rút</a></p>
          </div>

          <div class="panel">
            <h2 class="font-display text-2xl">Duyệt eKYC</h2>
            <p class="mt-1 text-sm text-muted">Xác minh hồ sơ cá nhân và tổ chức (hộ kinh doanh / công ty). Chỉ tài khoản đã duyệt mới được rút tiền.</p>
            <p class="mt-2"><a class="text-accent underline" routerLink="/admin/kyc">Mở hàng chờ duyệt eKYC</a></p>
          </div>

          <div class="panel">
            <h2 class="font-display text-2xl">Thuế &amp; báo cáo thuế</h2>
            <p class="mt-1 text-sm text-muted">Xuất báo cáo thuế quý (CSV/XLSX), dữ liệu chứng từ khấu trừ TNCN cuối năm, duyệt Cam kết Mẫu 08/CK-TNCN của affiliate.</p>
            <p class="mt-2"><a class="text-accent underline" routerLink="/admin/tax">Mở công cụ thuế</a></p>
          </div>

          <div class="panel">
            <h2 class="font-display text-2xl">Xóa dữ liệu agent hết hạn</h2>
            <p class="mt-1 text-sm text-muted">Workspace agent quá hạn lưu trữ nhưng runtime chưa có webhook xóa tự động (hoặc webhook lỗi) sẽ vào hàng chờ để vận hành xóa tay và xác nhận.</p>
            <p class="mt-2"><a class="text-accent underline" routerLink="/admin/agent-purges">Mở hàng chờ xóa dữ liệu runtime</a></p>
          </div>

          <div class="panel">
            <h2 class="font-display text-2xl">Complaints</h2>
            <p class="mt-1 text-sm text-muted">Hồ sơ khiếu nại theo quy trình tiếp nhận → xác minh → quyết định.</p>
            <p class="mt-2"><a class="text-accent underline" routerLink="/admin/complaints">Mở danh sách khiếu nại</a></p>
          </div>
        </div>
        }

        @case ('disputes') {
        <div class="mt-6">
          <app-admin-disputes (openCountChange)="openDisputes.set($event)" />
        </div>
        }
        }
    </section>
  `,
  styles: [
    `
      .admin-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .admin-tabs button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border: 1px solid var(--color-line);
        background: var(--color-surface);
        border-radius: 999px;
        padding: 0.4rem 0.95rem;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .admin-tabs button.active {
        background: var(--color-ink);
        color: #fff;
        border-color: var(--color-ink);
      }
      .admin-tabs__count {
        min-width: 1.3rem;
        padding: 0 0.35rem;
        border-radius: 999px;
        background: #fee2e2;
        color: #b91c1c;
        font-size: 0.72rem;
        text-align: center;
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  /** Every admin page in one place — the avatar menu only has a single "Quản trị" entry now. */
  readonly adminLinks = [
    { path: '/admin/finance', icon: '💰', label: 'Tài chính & đối soát' },
    { path: '/admin/bank-deposits', icon: '🏦', label: 'Nạp / rút tiền' },
    { path: '/admin/kyc', icon: '🪪', label: 'Duyệt eKYC' },
    { path: '/admin/invoices', icon: '🧾', label: 'Hóa đơn GTGT' },
    { path: '/admin/tax', icon: '📑', label: 'Thuế & báo cáo thuế' },
    { path: '/admin/complaints', icon: '⚖️', label: 'Khiếu nại' },
    { path: '/admin/community-agents', icon: '🗳️', label: 'Duyệt agent cộng đồng' },
    { path: '/admin/agent-purges', icon: '🧹', label: 'Xóa dữ liệu agent hết hạn' },
  ];
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'shops', label: 'Doanh thu shop' },
    { id: 'people', label: 'Người dùng & sản phẩm' },
    { id: 'ops', label: 'Vận hành' },
    { id: 'disputes', label: 'Tranh chấp' },
  ];
  readonly tab = signal<AdminTab>('overview');
  readonly data = signal<AdminOverview | null>(null);
  readonly openDisputes = signal(0);

  constructor() {
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: 'Admin' });
    this.route.queryParamMap.subscribe((q) => {
      const t = q.get('tab') as AdminTab | null;
      this.tab.set(t && this.tabs.some((x) => x.id === t) ? t : 'overview');
    });
    this.api.adminOverview().subscribe((d) => this.data.set(d));
    this.api.adminDisputes({ limit: 1 }).subscribe({
      next: (page) => this.openDisputes.set(page.openCount),
      error: () => undefined,
    });
  }

  setTab(id: AdminTab): void {
    void this.router.navigate([], { queryParams: { tab: id === 'overview' ? null : id }, replaceUrl: true });
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
