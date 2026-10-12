import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrencyPipe, DecimalPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, ProductService, UploadService, ContentService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import {
  DashboardSummary,
  Order,
  Product,
  ProductCategory,
  PricingModel,
  UsageStat,
  WalletSummary,
  WalletTx,
  IssuedLicense,
  ContentEpisode,
  CategoryMeta,
} from '../../models/marketplace.models';
import { AI_CATEGORIES, CATEGORY_META, categoryLabel, isHiddenCategory, isHireRequestCategory, isLicenseCategory, isVoiceCloneCategory, isVoiceCategory, isWatchContentCategory, isComputeStreamCategory, sellerWorkspaceKind, needsEndpointDeploy, isTemplateCategory, templateKind } from '../../models/categories';
import { BuilderService, TemplateBuild } from '../builder/builder.service';
import { TemplateGitBuildComponent } from '../builder/template-git-build.component';
import {
  RUNPOD_PUBLIC_ENDPOINTS,
  RunpodPublicEndpoint,
  runtimeFromRunpodPublicEndpoint,
} from '../../models/runpod-public-endpoints';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">{{ 'dash.title' | t }}</h1>
      <nav class="mt-6 flex flex-wrap gap-2" [attr.aria-label]="'dash.title' | t">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="btn-fill" class="btn btn-outline text-xs">{{ l.key | t }}</a>
        }
      </nav>
      <div class="mt-8">
        <router-outlet />
      </div>
    </section>
  `,
})
export class DashboardShellComponent {
  readonly links = [
    { path: '/dashboard', key: 'dash.overview' },
    { path: '/dashboard/orders', key: 'dash.orders' },
    { path: '/dashboard/usage', key: 'dash.usage' },
    { path: '/dashboard/tokens', key: 'dash.tokens' },
    { path: '/dashboard/gpu', key: 'dash.gpu' },
    { path: '/account/console', key: 'dash.console' },
    { path: '/dashboard/analytics', key: 'dash.analytics' },
    { path: '/dashboard/products', key: 'dash.products' },
    { path: '/dashboard/licenses', key: 'dash.licenses' },
    { path: '/dashboard/withdraw', key: 'dash.withdraw' },
  ];
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, TPipe, RouterLink],
  template: `
    @if (summary(); as s) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="panel"><p class="text-xs uppercase text-muted">{{ 'dash.revenue' | t }}</p><p class="mt-2 font-display text-3xl">{{ s.revenue | currency: s.currency }}</p></div>
        <div class="panel"><p class="text-xs uppercase text-muted">{{ 'dash.orders' | t }}</p><p class="mt-2 font-display text-3xl">{{ s.orders | number }}</p></div>
        <div class="panel">
          <p class="text-xs uppercase text-muted">Listings</p>
          <p class="mt-2 font-display text-3xl">{{ products().length | number }}</p>
          <p class="mt-1 text-xs text-muted">{{ catalogHint() }}</p>
        </div>
        @if (hasEndpointListings()) {
          <div class="panel"><p class="text-xs uppercase text-muted">Token usage</p><p class="mt-2 font-display text-3xl">{{ s.tokenUsage | number }}</p></div>
        } @else if (hasComputeListings()) {
          <div class="panel"><p class="text-xs uppercase text-muted">GPU hours</p><p class="mt-2 font-display text-3xl">{{ s.gpuHours | number:'1.1-1' }}</p></div>
        } @else if (hasVoiceListings()) {
          <div class="panel">
            <p class="text-xs uppercase text-muted">Giọng TTS / STT</p>
            <p class="mt-2 font-display text-3xl">{{ voiceCount() | number }}</p>
            <p class="mt-1 text-xs text-muted">VieNeu đọc · PhoWhisper nhận giọng · tính ký tự hoặc AIM-xxxx</p>
          </div>
        } @else if (hasWatchListings()) {
          <div class="panel">
            <p class="text-xs uppercase text-muted">Phim / truyện</p>
            <p class="mt-2 font-display text-3xl">{{ watchCount() | number }}</p>
            <p class="mt-1 text-xs text-muted">License ngày / tháng / năm</p>
          </div>
        } @else {
          <div class="panel"><p class="text-xs uppercase text-muted">Thực nhận</p><p class="mt-2 font-display text-3xl">{{ (s.netPayable || 0) | currency: s.currency }}</p></div>
        }
      </div>
      @if (mix().length) {
        <div class="mt-4 flex flex-wrap gap-2">
          @for (row of mix(); track row.id) {
            <a class="rounded-full border border-line px-3 py-1 text-xs text-muted no-underline hover:border-accent hover:text-ink" [routerLink]="row.href">{{ row.label }} · {{ row.n }}</a>
          }
        </div>
      }
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="panel">
          <p class="text-xs uppercase text-muted">Phí sàn (commission)</p>
          <p class="mt-2 font-display text-2xl">{{ (s.platformCommission || 0) | currency: s.currency }}</p>
          <p class="mt-1 text-xs text-muted">Mặc định 20% — chưa gồm thuế 10% trên 80% seller</p>
        </div>
        <div class="panel">
          <p class="text-xs uppercase text-muted">Thuế khấu trừ</p>
          <p class="mt-2 font-display text-2xl">{{ (s.taxWithholding || 0) | currency: s.currency }}</p>
          <p class="mt-1 text-xs text-muted">10% trên 80% doanh thu seller (8% đơn)</p>
        </div>
        <div class="panel">
          <p class="text-xs uppercase text-muted">Hoàn tiền</p>
          <p class="mt-2 font-display text-2xl">{{ (s.refunds || 0) | currency: s.currency }}</p>
        </div>
        <div class="panel">
          <p class="text-xs uppercase text-muted">Thực nhận (net payable)</p>
          <p class="mt-2 font-display text-2xl">{{ (s.netPayable || 0) | currency: s.currency }}</p>
        </div>
      </div>
    }
  `,
})
export class DashboardHomeComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly products = signal<Product[]>([]);
  readonly mix = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.products()) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return [...counts.entries()].map(([id, n]) => ({
      id,
      n,
      label: categoryLabel(id),
      href: this.workspaceHref(id),
    }));
  });
  readonly hasEndpointListings = computed(() => this.products().some((p) => needsEndpointDeploy(p.category)));
  readonly hasComputeListings = computed(() => this.products().some((p) => isComputeStreamCategory(p.category)));
  readonly hasVoiceListings = computed(() => this.products().some((p) => isVoiceCategory(p.category)));
  readonly hasWatchListings = computed(() => this.products().some((p) => isWatchContentCategory(p.category)));
  readonly voiceCount = computed(() => this.products().filter((p) => isVoiceCategory(p.category)).length);
  readonly watchCount = computed(() => this.products().filter((p) => isWatchContentCategory(p.category)).length);

  catalogHint(): string {
    const rows = this.mix();
    if (!rows.length) return 'Chưa có listing';
    return rows.map((r) => `${r.n} ${r.label}`).join(' · ');
  }

  workspaceHref(category: string): string {
    const kind = sellerWorkspaceKind(category);
    if (kind === 'compute') return '/dashboard/gpu';
    if (kind === 'download') return '/dashboard/licenses';
    return '/dashboard/products';
  }

  ngOnInit(): void {
    this.seo.set({ title: 'Dashboard' });
    this.api.summary().subscribe((s) => this.summary.set(s));
    const slug = this.auth.user()?.creatorSlug || '';
    this.productsApi.list(slug ? { creatorSlug: slug, includeHidden: true } : {}).subscribe((items) => this.products.set(items));
  }
}

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="panel overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="text-xs uppercase text-muted">
          <tr><th class="pb-3">Order</th><th>Product</th><th>Buyer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr class="border-t border-line">
              <td class="py-3 font-mono text-xs">{{ o.id }}</td>
              <td>{{ o.productName }}</td>
              <td>{{ o.buyerName }}</td>
              <td>{{ o.amount | currency: o.currency }}</td>
              <td>
                {{ o.status }}
                @if (o.payoutHeld) {
                  <span class="block text-xs text-muted">
                    {{ o.payoutHoldKind === 'dispute' ? 'Đóng băng khiếu nại' : 'Giữ 48h' }}
                    · {{ o.sellerNet | currency: o.currency }}
                  </span>
                }
                @if (o.canDispute) {
                  <a
                    class="mt-1 block text-xs text-accent underline"
                    [routerLink]="['/complaints/new']"
                    [queryParams]="{ orderId: o.id, kind: 'buyer_seller' }"
                  >
                    Khiếu nại
                  </a>
                } @else if (o.disputeStatus === 'open') {
                  <a class="mt-1 block text-xs text-accent underline" routerLink="/complaints">Đang khiếu nại</a>
                }
              </td>
              <td>{{ o.createdAt | date: 'short' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DashboardOrdersComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly orders = signal<Order[]>([]);
  ngOnInit(): void {
    this.api.orders().subscribe((o) => this.orders.set(o));
  }
}

@Component({
  selector: 'app-dashboard-usage',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe],
  template: `
    <div class="grid gap-3">
      @for (u of usage(); track u.date) {
        <div class="panel flex flex-wrap items-center justify-between gap-3 text-sm">
          <span class="font-mono">{{ u.date }}</span>
          <span>{{ u.requests | number }} req</span>
          <span>{{ u.tokens | number }} tokens</span>
          <span>{{ u.gpuHours | number:'1.1-1' }} GPU h</span>
          <span>{{ u.revenue | currency:'USD' }}</span>
        </div>
      }
    </div>
  `,
})
export class DashboardUsageComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => this.usage.set(u));
  }
}

@Component({
  selector: 'app-dashboard-tokens',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="panel">
      <h2 class="font-display text-2xl">Token usage</h2>
      <p class="mt-2 text-muted">Last 7 days total: {{ total() | number }} tokens</p>
      <ul class="mt-6 space-y-2">
        @for (u of usage(); track u.date) {
          <li class="flex justify-between border-b border-line py-2 text-sm">
            <span>{{ u.date }}</span><span class="font-mono">{{ u.tokens | number }}</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DashboardTokensComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  readonly total = signal(0);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.total.set(u.reduce((s, x) => s + x.tokens, 0));
    });
  }
}

@Component({
  selector: 'app-dashboard-gpu',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="panel">
      <h2 class="font-display text-2xl">GPU usage</h2>
      <p class="mt-2 text-muted">Last 7 days: {{ total() | number:'1.1-1' }} hours</p>
      <ul class="mt-6 space-y-2">
        @for (u of usage(); track u.date) {
          <li class="flex justify-between border-b border-line py-2 text-sm">
            <span>{{ u.date }}</span><span class="font-mono">{{ u.gpuHours | number:'1.1-1' }} h</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DashboardGpuComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  readonly total = signal(0);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.total.set(u.reduce((s, x) => s + x.gpuHours, 0));
    });
  }
}

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="panel">
        <h2 class="font-display text-2xl">Revenue trend</h2>
        <div class="mt-6 flex h-40 items-end gap-2">
          @for (u of usage(); track u.date) {
            <div class="flex-1 rounded-t bg-accent/80" [style.height.%]="bar(u.revenue)" [title]="u.date + ': $' + u.revenue"></div>
          }
        </div>
      </div>
      <div class="panel">
        <h2 class="font-display text-2xl">Requests</h2>
        <ul class="mt-4 space-y-2 text-sm">
          @for (u of usage(); track u.date) {
            <li class="flex justify-between"><span>{{ u.date }}</span><span>{{ u.requests | number }}</span></li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DashboardAnalyticsComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  private max = 1;
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.max = Math.max(...u.map((x) => x.revenue), 1);
    });
  }
  bar(v: number): number {
    return Math.max(8, (v / this.max) * 100);
  }
}

@Component({
  selector: 'app-dashboard-products',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, TemplateGitBuildComponent, TPipe],
  template: `
    <div class="mb-4 flex justify-between gap-3">
      <h2 class="font-display text-2xl">Your products</h2>
      <button type="button" class="btn btn-fill" (click)="showForm = !showForm">{{ showForm ? 'Close' : 'New product' }}</button>
    </div>
    @if (showForm) {
      <form class="panel mb-6 grid gap-3 md:grid-cols-2" (ngSubmit)="create()">
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Name</label>
          <input class="input" [(ngModel)]="draft.name" name="name" placeholder="e.g. Hailuo 02 Standard" required />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tagline</label>
          <input class="input" [(ngModel)]="draft.tagline" name="tagline" placeholder="One-line value prop" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Description</label>
          <textarea class="input min-h-24" [(ngModel)]="draft.description" name="description" placeholder="What buyers get + how to call the API"></textarea>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">AI category</label>
          <select class="input" [(ngModel)]="draft.category" name="category" required (ngModelChange)="onCategoryChange()">
            <optgroup label="AI">
              @for (c of aiCategories(); track c.id) {
                <option [ngValue]="c.id">{{ c.label }}</option>
              }
            </optgroup>
          </select>
          @if (isTalentOnly()) {
            <p class="mt-1 text-xs text-muted">Tài khoản dịch vụ chuyên môn chỉ đăng được gói dịch vụ giá cố định: Làm web, Làm app, Marketing, SEO, Creator, Tự động hóa.</p>
          }
        </div>
        @if (isHireDraft()) {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Giá trọn gói (USD)</label>
            <input class="input" type="number" min="1" step="1" [(ngModel)]="draft.price" name="hirePrice" />
          </div>
          <div class="md:col-span-2">
            <p class="mt-1 text-xs text-muted">
              Dịch vụ chuyên môn được bán theo gói giá cố định: mô tả rõ phạm vi, sản phẩm bàn giao và thời gian thực hiện.
              Không báo giá, không tính theo giờ/tháng. Khách thanh toán bằng số dư ví khi mua; phí sàn 20% (trên giá sau giảm giá) và thuế 8% được khấu trừ khi đơn hoàn tất, tiền được tạm giữ 48 giờ trước khi rút.
            </p>
          </div>
        } @else {
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Pricing model</label>
          <select class="input" [(ngModel)]="draft.pricingModel" name="pricingModel">
            @if (!isTemplateDraft()) {
              <option value="usage">Usage</option>
              <option value="subscription">Subscription</option>
            }
            <option value="one-time">One-time</option>
            <option value="free">Free</option>
          </select>
        </div>
        @if (draft.pricingModel === 'usage') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Rate (USD)</label>
            <input class="input" type="number" min="0" step="0.001" [(ngModel)]="draft.usageRate" name="usageRate" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Per unit</label>
            <input class="input" [(ngModel)]="draft.usageUnit" name="usageUnit" placeholder="1M tokens / second / image" />
          </div>
        }
        @if (draft.pricingModel === 'subscription' || draft.pricingModel === 'one-time') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Price (USD)</label>
            <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.price" name="price" />
          </div>
        }
        @if (draft.pricingModel === 'subscription') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Interval</label>
            <select class="input" [(ngModel)]="draft.interval" name="interval">
              <option value="day">day</option>
              <option value="month">month</option>
              <option value="year">year</option>
            </select>
          </div>
        }
        @if (draft.pricingModel !== 'free') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Compare-at price (USD)</label>
            <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.compareAtPrice" name="compareAtPrice" />
            <p class="mt-1 text-xs text-muted">Giá gốc gạch ngang khi cao hơn giá bán. 0 = không giảm giá listing. Voucher mã giảm giá tạo ở Bán hàng → Mã giảm giá.</p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">{{ 'sellAff.ratePct' | t }}</label>
            <input class="input" type="number" min="0" max="25" step="0.5" [(ngModel)]="draft.affiliatePct" name="affiliatePct" [placeholder]="'sellAff.inherit' | t" />
            <p class="mt-1 text-xs text-muted">{{ 'sellAff.productHint' | t }}</p>
          </div>
        }
        }
        @if (isVoiceDraft()) {
          <div class="md:col-span-2 rounded-lg border border-line p-3">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Seller — nhân bản giọng (MP3)</p>
            <p class="mb-3 text-xs text-muted">Upload file giọng (.mp3/.wav, 10–60 giây). VieNeu nhân bản giọng đó. Buyer mua theo ký tự và/hoặc license ngày/tháng/năm (AIM-xxxx). STT dùng PhoWhisper-large.</p>
            <div class="flex flex-wrap gap-4 text-sm">
              <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="draft.voiceTts" name="voiceTts" /> TTS (đọc văn bản)</label>
              <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="draft.voiceStt" name="voiceStt" /> STT (nhận giọng)</label>
            </div>
            <label class="mt-3 mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">File giọng mẫu (.mp3)</label>
            <input class="input" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav,.m4a" name="voiceFile" (change)="onVoiceFile($event)" />
            @if (voiceUploading) {
              <p class="mt-2 text-xs text-muted">Đang tải MP3 lên… hệ thống sẽ tạo giọng clone.</p>
            }
            @if (voiceUploadError) {
              <p class="mt-2 text-xs text-red-600">{{ voiceUploadError }}</p>
            }
            @if (draft.voiceSampleUrl) {
              <audio class="mt-3 w-full" [src]="draft.voiceSampleUrl" controls preload="metadata"></audio>
              <p class="mt-1 break-all font-mono text-[11px] text-muted">{{ draft.voiceSampleUrl }}</p>
            }
            <label class="mt-3 mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Ký tự / 1 credit</label>
            <input class="input" type="number" min="1" [(ngModel)]="draft.charactersPerCredit" name="charactersPerCredit" />
            <p class="mt-2 text-xs text-muted">Usage = credit theo khối văn bản buyer TTS. File gốc chỉ dùng làm mẫu clone, không phát nguyên cho buyer như sản phẩm cuối.</p>
          </div>
        }
        @if (isLicenseDraft()) {
          <div class="md:col-span-2 rounded-lg border border-line p-3">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">License key theo thời hạn</p>
            <p class="mb-3 text-xs text-muted">Phim / truyện / skill / dataset / giọng đọc: buyer nhận AIM-xxxx theo ngày / tháng / năm. Key gửi email. Hoàn tiền thu hồi key. Giọng sàn (VieNeu preset) do AI Markets đăng; seller đăng giọng clone từ MP3 — cùng bảng giá ký tự + thời hạn.</p>
            <div class="grid gap-3 md:grid-cols-3">
              <div>
                <label class="mb-1 block text-xs uppercase text-muted">Giá / ngày (USD)</label>
                <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.priceDay" name="priceDay" />
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase text-muted">Giá / tháng</label>
                <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.priceMonth" name="priceMonth" />
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase text-muted">Giá / năm</label>
                <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.priceYear" name="priceYear" />
              </div>
            </div>
            @if (draft.category === 'ai-film-series' || draft.category === 'story-book') {
            <p class="mt-3 text-xs text-muted">Sau khi Publish, tải từng tập/chương (ảnh hoặc video, tối đa 80MB) ở danh sách sản phẩm bên dưới. Mỗi listing cấp một license AIM-xxxx riêng — cùng shop không dùng chung key. Hết hạn thì file .aimc trên máy họ không mở được.</p>
            }
            @if (draft.category === 'skill-pack' || draft.category === 'dataset') {
            <p class="mt-3 text-xs text-muted">Buyer thanh toán theo ngày/tháng/năm sẽ nhận license key AIM-xxxx (email + dashboard). Key chỉ mở khóa đúng listing này — hết hạn thì không còn quyền tải/cài.</p>
            }
            @if (draft.category === 'voice-clone') {
            <p class="mt-3 text-xs text-muted">Giọng clone của bạn bán giống giọng sàn: không có license thì trừ phí theo ký tự; có AIM-xxxx còn hạn thì TTS/STT không trừ usage.</p>
            }
          </div>
        }
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Cover image URL</label>
          <input class="input" [(ngModel)]="draft.coverUrl" name="coverUrl" placeholder="https://…" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tags (comma-separated)</label>
          <input class="input" [(ngModel)]="draft.tags" name="tags" placeholder="llm, vietnamese, text-to-text" />
        </div>
        @if (isTemplateDraft()) {
          <div class="md:col-span-2 border-t border-line pt-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Source code — GitHub</p>
            <p class="mb-3 text-xs text-muted">
              Chọn repo/branch/thư mục chứa template ({{ draftTemplateKind() === 'app' ? 'App.tsx / App.js (React Native · Expo)' : 'index.html' }}), bấm Build.
              Build thành công mới được Publish. Build lỗi → xem log, sửa trong repo rồi Build lại.
              Muốn tải ZIP? Dùng <a routerLink="/sell/templates" class="underline">Web / app templates</a>.
            </p>
            <app-template-git-build
              [kind]="draftTemplateKind()"
              [returnKey]="'dash-' + draftTemplateKind()"
              (built)="templateBuild = $event"
            />
          </div>
        }
        @if (!isVoiceDraft() && !isLicenseDraft() && !isTemplateDraft() && !isHireDraft()) {
        <div class="md:col-span-2 border-t border-line pt-3">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">AI Markets endpoints (optional — editable later in Deployments)</p>
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Pick from hosted catalog</label>
          <select class="input" name="runpodCatalog" [(ngModel)]="catalogSlug" (ngModelChange)="applyRunpodCatalog($event)">
            <option value="">— Custom / paste URLs —</option>
            @for (e of catalogForCategory(); track e.slug) {
              <option [value]="e.slug">{{ e.name }} · {{ e.pricing }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Public endpoint (/runsync)</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.publicEndpoint" name="publicEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/runsync" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Async endpoint (/run)</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.serverlessEndpoint" name="serverlessEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/run" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tokenize endpoint</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.tokenizeEndpoint" name="tokenizeEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/tokenize" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Gateway / OpenAI base</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.gatewayUrl" name="gatewayUrl" placeholder="https://ai.aimarkets.vn/v1" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">.env (KEY=VALUE per line)</label>
          <textarea class="input min-h-20 font-mono text-xs" [(ngModel)]="draft.envText" name="envText" placeholder="MARKETPLACE_API_KEY=&#10;UPSTREAM_RUNSYNC="></textarea>
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Skills (comma-separated)</label>
          <input class="input" [(ngModel)]="draft.skillsText" name="skillsText" placeholder="web-search, code-exec, memory" />
        </div>
        }
        <div class="md:col-span-2 flex flex-wrap items-center gap-3">
          <button class="btn btn-fill" type="submit" [disabled]="publishing || (isTemplateDraft() && !templateBuild)">
            {{ publishing ? 'Publishing…' : 'Publish' }}
          </button>
          @if (isTemplateDraft() && !templateBuild) {
            <span class="text-xs text-muted">Cần Build thành công trước khi Publish.</span>
          }
          @if (publishError) {
            <span class="text-xs text-red-600">{{ publishError }}</span>
          }
        </div>
      </form>
    }
    @if (publishNotice) {
      <p class="panel mb-4 text-sm">{{ publishNotice }}</p>
    }
    <div class="grid gap-3">
      @for (p of products(); track p.id) {
        <div class="panel grid gap-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-muted">{{ categoryLabel(p.category) }}</p>
            <a [routerLink]="['/product', p.slug]" class="font-display text-xl no-underline">{{ p.name }}</a>
            <p class="text-sm text-muted">{{ (p.salesCount || 0) | number }} đã bán · ★ {{ p.rating | number:'1.1-1' }}</p>
            @if (workspaceKind(p.category) === 'voice') {
              <p class="mt-1 text-xs text-muted">
                {{ p.category === 'voice-preset' ? 'Giọng sàn VieNeu' : 'Giọng clone VieNeu' }}
                @if (p.contentMeta?.cloneStatus) { · {{ p.contentMeta?.cloneStatus }} }
                @if (p.contentMeta?.voiceModes?.length) { · {{ p.contentMeta?.voiceModes?.join(', ') }} }
                · {{ p.contentMeta?.charactersPerCredit || 1000 }} ký tự / credit
                · STT PhoWhisper-large
              </p>
            } @else if (isWatchProduct(p) && p.contentMeta?.episodeCount) {
              <p class="mt-1 text-xs text-muted">{{ p.contentMeta?.episodeCount }} tập / chương đã đăng</p>
            } @else if (workspaceKind(p.category) === 'download') {
              <p class="mt-1 text-xs text-muted">License AIM-xxxx ngày / tháng / năm — không gắn API endpoint</p>
            } @else if (workspaceKind(p.category) === 'hire') {
              <p class="mt-1 text-xs text-muted">Listing thuê — buyer gửi brief, không deploy GPU</p>
            } @else if (workspaceKind(p.category) === 'compute') {
              <p class="mt-1 text-xs text-muted">GPU / stream — quản lý ở tab GPU</p>
            } @else if (needsEndpointDeploy(p.category) && (p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint)) {
              <p class="mt-1 max-w-xl truncate font-mono text-[11px] text-muted">
                {{ p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint }}
              </p>
            }
          </div>
          <div class="flex gap-2">
            @if (isTemplate(p.category)) {
              <a class="btn btn-outline" routerLink="/sell/templates">Template</a>
            } @else {
            @switch (workspaceKind(p.category)) {
              @case ('watch') {
                <button type="button" class="btn btn-outline" (click)="toggleChapters(p)">Tập / chương</button>
              }
              @case ('voice') {
                <a class="btn btn-outline" [routerLink]="['/deploy', p.slug]">Giọng</a>
              }
              @case ('download') {
                <a class="btn btn-outline" [routerLink]="['/product', p.slug]">License</a>
              }
              @case ('hire') {
                <a class="btn btn-outline" [routerLink]="['/product', p.slug]">Listing</a>
              }
              @case ('compute') {
                <a class="btn btn-outline" routerLink="/dashboard/gpu">GPU</a>
              }
              @default {
                <a class="btn btn-outline" [routerLink]="['/deploy', p.slug]">Deploy</a>
              }
            }
            }
            <button type="button" class="btn btn-outline" (click)="remove(p.id)">Delete</button>
          </div>
          </div>
          @if (managingId === p.id) {
            <div class="rounded-lg border border-line p-3">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {{ p.category === 'story-book' ? 'Upload chương (nhiều trang ảnh)' : 'Upload tập / chương (ảnh hoặc video)' }}
              </p>
              <p class="mb-3 text-xs text-muted">
                {{ p.category === 'story-book'
                  ? 'Chọn nhiều ảnh trong một lần — mỗi ảnh là một trang/frame của chương. File lưu riêng, buyer chỉ đọc khi license còn hạn.'
                  : 'File lưu riêng, không public. Buyer chỉ stream/tải khi license còn hạn. Tải xuống là file .aimc mã hóa.' }}
              </p>
              <div class="mb-3 flex flex-wrap items-end gap-2">
                <div class="min-w-[12rem] flex-1">
                  <label class="mb-1 block text-xs uppercase text-muted">Tiêu đề</label>
                  <input class="input" [(ngModel)]="chapterTitle" name="chapterTitle" [placeholder]="p.category === 'story-book' ? 'Chương 1 — Phố cổ' : 'Tập 1 / Chương 1'" />
                </div>
                <label class="btn btn-fill cursor-pointer">
                  {{ chapterBusy ? 'Đang tải…' : (p.category === 'story-book' ? 'Chọn nhiều trang' : 'Chọn file') }}
                  <input type="file" class="hidden" [attr.multiple]="p.category === 'story-book' ? '' : null" accept="video/*,image/*,audio/*,.mp4,.webm,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.txt" (change)="onChapterFile($event, p)" [disabled]="chapterBusy" />
                </label>
              </div>
              @if (chapterError) {
                <p class="mb-2 text-xs" style="color:#c62828">{{ chapterError }}</p>
              }
              <ul class="grid gap-2">
                @for (ep of chapters(); track ep.id) {
                  <li class="flex items-center justify-between gap-2 text-sm">
                    <span>{{ ep.index }}. {{ ep.title }} · {{ ep.kind }}@if ((ep.pageCount || 0) > 1) { · {{ ep.pageCount }} trang }</span>
                    <button type="button" class="btn btn-outline text-xs" (click)="removeChapter(ep, p)">Xóa</button>
                  </li>
                }
              </ul>
              @if (!chapters().length) {
                <p class="text-xs text-muted">Chưa có tập nào.</p>
              }
            </div>
          }
        </div>
      }
      @if (!products().length) {
        <p class="text-muted">No products yet — publish one with the correct modality.</p>
      }
    </div>
  `,
})
export class DashboardProductsComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly uploads = inject(UploadService);
  private readonly contentApi = inject(ContentService);
  private readonly auth = inject(AuthService);
  private readonly builder = inject(BuilderService);
  private readonly route = inject(ActivatedRoute);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly products = signal<Product[]>([]);
  readonly chapters = signal<ContentEpisode[]>([]);
  readonly categories = CATEGORY_META;
  /** Talent may only offer custom work (quote + milestones); sellers list everything. */
  readonly isTalentOnly = computed(() => this.auth.user()?.role === 'talent');
  /** Seller đăng giọng clone (MP3). Giọng sàn VieNeu do AI Markets seed, không hiện ở form này. */
  private readonly listableCategories = computed(() =>
    this.isTalentOnly()
      ? AI_CATEGORIES.filter((c) => isHireRequestCategory(c.id))
      : AI_CATEGORIES.filter((c) => c.id !== 'voice-preset'),
  );

  /** Danh mục tạm ẩn chỉ còn hiện khi đang sửa sản phẩm cũ thuộc danh mục đó. */
  aiCategories(): CategoryMeta[] {
    const current = this.draft?.category;
    return this.listableCategories().filter((c) => !isHiddenCategory(c.id) || c.id === current);
  }
  publishNotice = '';
  readonly categoryLabel = categoryLabel;
  readonly workspaceKind = sellerWorkspaceKind;
  readonly needsEndpointDeploy = needsEndpointDeploy;
  readonly isTemplate = isTemplateCategory;
  readonly runpodCatalog: RunpodPublicEndpoint[] = RUNPOD_PUBLIC_ENDPOINTS;
  catalogSlug = '';
  showForm = false;
  publishing = false;
  publishError = '';
  /** Last successful GitHub build for a template draft — required before Publish. */
  templateBuild: TemplateBuild | null = null;
  voiceUploading = false;
  voiceUploadError = '';
  managingId = '';
  chapterTitle = '';
  chapterBusy = false;
  chapterError = '';
  draft = this.emptyDraft();

  ngOnInit(): void {
    this.reload();
    if (this.isTalentOnly()) {
      this.draft.category = 'hire-build-web';
      this.onCategoryChange();
      this.showForm = true;
    }
    if (!this.browser) return;
    const tplgit = this.route.snapshot.queryParamMap.get('tplgit') || '';
    if (tplgit === 'dash-web' || tplgit === 'dash-app') {
      this.draft.category = `template-${tplgit.slice(5)}` as ProductCategory;
      this.onCategoryChange();
      this.showForm = true;
    }
  }

  catalogForCategory(): RunpodPublicEndpoint[] {
    const modality = this.draft.category;
    const matched = this.runpodCatalog.filter((e) => e.modality === modality);
    return matched.length ? matched : this.runpodCatalog;
  }

  applyRunpodCatalog(slug: string): void {
    if (!slug) return;
    const ep = this.runpodCatalog.find((e) => e.slug === slug);
    if (!ep) return;
    const mapped = runtimeFromRunpodPublicEndpoint(ep);
    this.draft.publicEndpoint = mapped.publicEndpoint;
    this.draft.serverlessEndpoint = mapped.serverlessEndpoint;
    this.draft.gatewayUrl = mapped.gatewayUrl;
    this.draft.tokenizeEndpoint = mapped.tokenizeEndpoint;
    const up = mapped._upstream;
    this.draft.envText = [
      'AI_PROVIDER=runpod_public',
      `PROVIDER_ENDPOINT_ID=${up.endpointId}`,
      `UPSTREAM_RUNSYNC=${up.runsync}`,
      `UPSTREAM_RUN=${up.run}`,
      up.gateway ? `UPSTREAM_GATEWAY=${up.gateway}` : '',
      'MARKETPLACE_API_KEY=',
    ]
      .filter(Boolean)
      .join('\n');
    if (!this.draft.name) this.draft.name = ep.name;
    if (!this.draft.tagline) this.draft.tagline = ep.description;
    this.draft.category = ep.modality;
  }

  emptyDraft() {
    return {
      name: '',
      tagline: '',
      description: '',
      category: 'text-to-text' as ProductCategory,
      pricingModel: 'usage' as PricingModel,
      price: 29,
      usageRate: 0.05,
      usageUnit: '1K tokens',
      interval: 'month' as 'day' | 'month' | 'year',
      coverUrl: '',
      tags: '',
      serverlessEndpoint: '',
      publicEndpoint: '',
      tokenizeEndpoint: '',
      gatewayUrl: '',
      envText: '',
      skillsText: '',
      voiceTts: true,
      voiceStt: true,
      voiceSampleUrl: '',
      charactersPerCredit: 1000,
      episodeCount: 0,
      priceDay: 0,
      priceMonth: 9,
      priceYear: 79,
      compareAtPrice: 0,
      negotiable: true,
      affiliatePct: '' as number | string,
    };
  }

  /** Seller affiliate commission 0–25% → fraction; empty = store default (null). Server re-validates. */
  draftAffiliateRate(): number | null {
    const raw = this.draft.affiliatePct;
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = Math.min(25, Math.max(0, Number(raw) || 0));
    return Math.round(n * 100) / 10000;
  }

  isHireDraft(): boolean {
    return isHireRequestCategory(this.draft.category);
  }

  /** Seller đăng giọng clone (MP3). Giọng sàn VieNeu do AI Markets seed, không hiện ở form này. */
  isVoiceDraft(): boolean {
    return isVoiceCloneCategory(this.draft.category);
  }

  isLicenseDraft(): boolean {
    return isLicenseCategory(this.draft.category);
  }

  isTemplateDraft(): boolean {
    return isTemplateCategory(this.draft.category);
  }

  draftTemplateKind(): 'web' | 'app' {
    return templateKind(this.draft.category) || 'web';
  }

  isWatchProduct(p: Product): boolean {
    return isWatchContentCategory(p.category);
  }

  toggleChapters(p: Product): void {
    if (this.managingId === p.id) {
      this.managingId = '';
      this.chapters.set([]);
      return;
    }
    this.managingId = p.id;
    this.chapterError = '';
    this.chapterTitle = '';
    this.contentApi.episodes(p.slug).subscribe({
      next: (rows) => this.chapters.set(rows),
      error: () => this.chapters.set([]),
    });
  }

  onChapterFile(event: Event, p: Product): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    this.chapterBusy = true;
    this.chapterError = '';
    const title = this.chapterTitle.trim() || files[0].name.replace(/\.[^.]+$/, '');
    const payload = files.length > 1 ? { title, files } : { title, file: files[0] };
    this.contentApi.createEpisode(p.id, payload).subscribe({
      next: (ep) => {
        this.chapterBusy = false;
        this.chapterTitle = '';
        this.chapters.update((list) => [...list, ep].sort((a, b) => a.index - b.index));
        this.reload();
      },
      error: (err) => {
        this.chapterBusy = false;
        this.chapterError = err?.error?.message || 'Upload tập thất bại. Kiểm tra MinIO (tối đa 80MB).';
      },
    });
  }

  removeChapter(ep: ContentEpisode, p: Product): void {
    this.contentApi.removeEpisode(ep.id).subscribe({
      next: () => {
        this.chapters.update((list) => list.filter((x) => x.id !== ep.id));
        this.reload();
      },
      error: (err) => {
        this.chapterError = err?.error?.message || 'Xóa tập thất bại';
      },
    });
  }

  onVoiceFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.voiceUploadError = '';
    this.voiceUploading = true;
    this.uploads.uploadAudio(file).subscribe({
      next: (res) => {
        this.draft.voiceSampleUrl = res.url;
        this.voiceUploading = false;
      },
      error: (err) => {
        this.voiceUploading = false;
        this.voiceUploadError = err?.error?.message || 'Upload MP3 failed. Check MinIO or paste a public audio URL.';
      },
    });
  }

  onCategoryChange(): void {
    this.publishError = '';
    this.templateBuild = null;
    if (this.isHireDraft()) {
      this.draft.pricingModel = 'one-time';
      if (this.draft.price === 29) this.draft.price = 300;
    } else if (this.isTemplateDraft()) {
      if (this.draft.pricingModel !== 'free') this.draft.pricingModel = 'one-time';
      if (this.draft.price === 29) this.draft.price = 19;
    } else if (this.isVoiceDraft()) {
      this.draft.pricingModel = 'usage';
      this.draft.usageUnit = '1K characters';
      this.draft.usageRate = 0.02;
      this.draft.interval = 'month';
      this.draft.priceDay = this.draft.priceDay || 1.49;
      this.draft.priceMonth = this.draft.priceMonth || 9.99;
      this.draft.priceYear = this.draft.priceYear || 79;
    } else if (this.isLicenseDraft()) {
      this.draft.pricingModel = 'subscription';
      this.draft.interval = 'month';
      this.draft.price = Number(this.draft.priceMonth) || 9;
    }
  }

  reload(): void {
    const slug = this.auth.user()?.creatorSlug || (this.isTalentOnly() ? '' : 'nova-labs');
    if (!slug) {
      this.products.set([]);
      return;
    }
    this.productsApi.list({ creatorSlug: slug, includeHidden: true }).subscribe((items) => this.products.set(items));
  }

  create(): void {
    if (this.publishing) return;
    this.publishError = '';
    if (this.isVoiceDraft() && !String(this.draft.voiceSampleUrl || '').trim()) {
      this.voiceUploadError = 'Upload MP3 giọng của bạn trước — hệ thống sẽ tự clone.';
      return;
    }
    const user = this.auth.user();
    const tags = this.draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.includes(this.draft.category)) {
      tags.push(this.draft.category);
    }
    if (this.isTemplateDraft()) {
      this.createTemplate(tags);
      return;
    }
    const pricing =
      this.isHireDraft()
        ? {
            model: 'one-time' as const,
            price: Math.max(0, Number(this.draft.price) || 0),
            currency: 'USD',
            negotiable: false,
          }
        : this.isVoiceDraft()
        ? {
            model: 'usage' as const,
            price: Number(this.draft.priceMonth) || Number(this.draft.price) || 0,
            currency: 'USD',
            interval: this.draft.interval || 'month',
            usageUnit: this.draft.usageUnit || '1K characters',
            usageRate: Number(this.draft.usageRate) || 0,
          }
        : this.draft.pricingModel === 'usage'
        ? {
            model: 'usage' as const,
            price: 0,
            currency: 'USD',
            usageUnit: this.draft.usageUnit || 'request',
            usageRate: Number(this.draft.usageRate) || 0,
          }
        : this.draft.pricingModel === 'subscription'
          ? {
              model: 'subscription' as const,
              price: Number(this.draft.price) || 0,
              currency: 'USD',
              interval: this.draft.interval,
            }
          : this.draft.pricingModel === 'one-time'
            ? {
                model: 'one-time' as const,
                price: Number(this.draft.price) || 0,
                currency: 'USD',
              }
            : { model: 'free' as const, price: 0, currency: 'USD' };
    const compareAtPrice = Number(this.draft.compareAtPrice) || 0;
    if (compareAtPrice > 0) {
      Object.assign(pricing, { compareAtPrice });
    }

    const contentMeta = this.isVoiceDraft()
      ? {
          kind: 'voice' as const,
          voiceSource: 'clone' as const,
          voiceModes: [
            ...(this.draft.voiceTts ? (['tts'] as const) : []),
            ...(this.draft.voiceStt ? (['stt'] as const) : []),
          ],
          voiceSampleUrl: this.draft.voiceSampleUrl,
          creditUnit: 'character' as const,
          charactersPerCredit: Number(this.draft.charactersPerCredit) || 1000,
          licenseTerm: this.draft.interval || 'month',
          licensePrices: {
            day: Number(this.draft.priceDay) || 0,
            month: Number(this.draft.priceMonth) || Number(this.draft.price) || 0,
            year: Number(this.draft.priceYear) || 0,
          },
        }
      : this.isLicenseDraft()
        ? {
            kind: (this.draft.category === 'story-book'
              ? 'story'
              : this.draft.category === 'skill-pack'
                ? 'skill'
                : this.draft.category === 'dataset'
                  ? 'dataset'
                  : 'series') as 'story' | 'series' | 'skill' | 'dataset',
            episodeCount: Number(this.draft.episodeCount) || 0,
            licenseTerm: this.draft.interval,
            licensePrices: {
              day: Number(this.draft.priceDay) || 0,
              month: Number(this.draft.priceMonth) || Number(this.draft.price) || 0,
              year: Number(this.draft.priceYear) || 0,
            },
          }
        : undefined;

    this.productsApi
      .create({
        name: this.draft.name,
        tagline: this.draft.tagline,
        description: this.draft.description,
        creatorSlug: user?.creatorSlug || 'nova-labs',
        creatorName: user?.name || 'Creator',
        category: this.draft.category,
        pricing,
        affiliateRate: this.draftAffiliateRate(),
        contentMeta,
        runtime: {
          serverlessEndpoint: this.draft.serverlessEndpoint.trim(),
          publicEndpoint: this.draft.publicEndpoint.trim(),
          tokenizeEndpoint: this.draft.tokenizeEndpoint.trim(),
          gatewayUrl: this.draft.gatewayUrl.trim(),
          env: this.draft.envText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && line.includes('='))
            .map((line) => {
              const i = line.indexOf('=');
              return { key: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
            }),
          skills: this.draft.skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          baseModel: this.draft.name,
          systemPrompt: '',
          temperature: 0.7,
          maxTokens: 1024,
        },
        coverUrl: this.draft.coverUrl || undefined,
        gallery: this.draft.coverUrl ? [this.draft.coverUrl] : undefined,
        tags,
        apiDocsMarkdown: this.isHireDraft()
          ? `## ${this.draft.name}\n\n${this.draft.description}`
          : `## ${this.draft.name}\n\nModality: \`${this.draft.category}\`\n\nPOST \`/v1/${this.draft.category}/run\``,
        changelog: [{ version: '1.0.0', date: new Date().toISOString().slice(0, 10), notes: 'Initial release.' }],
      })
      .subscribe({
        next: () => this.created(),
        error: (err) => (this.publishError = err?.error?.message || 'Publish thất bại.'),
      });
  }

  /** Template listing: create the product, then attach the files of the successful build (undo on failure). */
  private createTemplate(tags: string[]): void {
    const build = this.templateBuild;
    if (!build || build.kind !== this.draftTemplateKind()) {
      this.publishError = 'Cần Build thành công trước khi Publish.';
      return;
    }
    const user = this.auth.user();
    const price = Math.max(0, Number(this.draft.price) || 0);
    const pricing =
      this.draft.pricingModel !== 'free' && price > 0
        ? { model: 'one-time' as const, price, currency: 'USD', ...(Number(this.draft.compareAtPrice) > price ? { compareAtPrice: Number(this.draft.compareAtPrice) } : {}) }
        : { model: 'free' as const, price: 0, currency: 'USD' };
    this.publishing = true;
    this.productsApi
      .create({
        name: this.draft.name,
        tagline: this.draft.tagline,
        description: this.draft.description,
        creatorSlug: user?.creatorSlug || 'nova-labs',
        creatorName: user?.name || 'Creator',
        category: this.draft.category,
        pricing,
        affiliateRate: this.draftAffiliateRate(),
        coverUrl: this.draft.coverUrl || undefined,
        gallery: this.draft.coverUrl ? [this.draft.coverUrl] : undefined,
        tags,
      } as Parameters<ProductService['create']>[0])
      .subscribe({
        next: (product) => {
          this.builder.templateFromBuild(product.id, build.id).subscribe({
            next: () => {
              this.publishing = false;
              this.created();
            },
            error: (err) => {
              this.publishing = false;
              this.publishError = err?.error?.message || 'Không gắn được bản build vào sản phẩm.';
              this.productsApi.remove(product.id).subscribe({ error: () => this.reload() });
            },
          });
        },
        error: (err) => {
          this.publishing = false;
          this.publishError = err?.error?.message || 'Publish thất bại.';
        },
      });
  }

  private created(): void {
    this.draft = this.emptyDraft();
    this.templateBuild = null;
    this.catalogSlug = '';
    this.showForm = this.isTalentOnly();
    this.publishNotice = 'Đã gửi listing — listing hiển thị công khai sau khi sàn duyệt.';
    if (this.isTalentOnly()) {
      this.auth.refreshMe().subscribe(() => this.reload());
    } else {
      this.reload();
    }
  }

  remove(id: string): void {
    this.productsApi.remove(id).subscribe(() => this.reload());
  }
}

@Component({
  selector: 'app-dashboard-withdraw',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="grid gap-6 lg:grid-cols-2">
      <form class="panel grid gap-3" (ngSubmit)="withdraw()">
        <h2 class="font-display text-2xl">Withdraw</h2>
        @if (summary(); as s) {
          <p class="text-sm text-muted">Ledger {{ s.balance | currency: s.currency }}</p>
          <p class="text-sm text-muted">Held (48h / dispute, per order) {{ s.held | currency: s.currency }}</p>
          <p class="font-display text-2xl">Available {{ s.available | currency: s.currency }}</p>
        }
        <input class="input" type="number" min="1" [(ngModel)]="amount" name="amount" />
        <button class="btn btn-fill w-fit" type="submit">Request payout</button>
        @if (msg()) { <p class="text-sm text-accent">{{ msg() }}</p> }
        @if (summary()?.holds?.length) {
          <ul class="mt-2 space-y-2 text-xs text-muted">
            @for (h of summary()!.holds; track h.orderId) {
              <li>
                {{ h.productName }} · {{ h.amount | currency: h.currency }} ·
                {{ h.kind === 'dispute' ? 'Khiếu nại' : 'Chờ 48h' }}
              </li>
            }
          </ul>
        }
      </form>
      <div class="panel">
        <h2 class="font-display text-2xl">Wallet history</h2>
        <ul class="mt-4 space-y-3 text-sm">
          @for (t of txs(); track t.id) {
            <li class="flex justify-between border-b border-line pb-2">
              <span>{{ t.type }} · {{ t.status || 'completed' }} · {{ t.note }}</span>
              <span>{{ t.amount | currency: t.currency }} · {{ t.createdAt | date:'shortDate' }}</span>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DashboardWithdrawComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly txs = signal<WalletTx[]>([]);
  readonly summary = signal<WalletSummary | null>(null);
  readonly msg = signal('');
  amount = 100;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.wallet().subscribe((t) => this.txs.set(t));
    this.api.walletSummary().subscribe((s) => this.summary.set(s));
  }

  withdraw(): void {
    this.api.withdraw(this.amount).subscribe({
      next: (tx) => {
        this.txs.update((list) => [tx, ...list]);
        this.msg.set(`Withdraw ${tx.amount} pending admin confirmation`);
        this.api.walletSummary().subscribe((s) => this.summary.set(s));
      },
      error: (err) => this.msg.set(err?.error?.message || 'Withdraw failed'),
    });
  }
}

@Component({
  selector: 'app-dashboard-licenses',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="panel overflow-x-auto">
      <h2 class="font-display text-2xl">License keys</h2>
      <p class="mt-1 text-sm text-muted">
        Mỗi sản phẩm một key, kể cả cùng shop. Key chỉ dùng được đến hạn. Hết hạn hoặc hoàn tiền thì key vô hiệu.
      </p>
      <table class="mt-4 w-full min-w-[640px] text-left text-sm">
        <thead class="text-xs uppercase text-muted">
          <tr>
            <th class="pb-3">Key</th>
            <th>Sản phẩm</th>
            <th>Shop</th>
            <th>Hạn</th>
            <th>Hết hạn</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (k of keys(); track k.id) {
            <tr class="border-t border-line">
              <td class="py-3 font-mono text-xs">{{ k.licenseKey }}</td>
              <td>{{ k.productName }}</td>
              <td>{{ k.sellerName || '—' }}</td>
              <td>{{ k.term }}</td>
              <td>{{ k.expiresAt | date: 'short' }}</td>
              <td>{{ k.valid ? 'active' : k.status }}</td>
            </tr>
          } @empty {
            <tr>
              <td class="py-6 text-muted" colspan="6">Chưa có license key.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DashboardLicensesComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly keys = signal<IssuedLicense[]>([]);
  ngOnInit(): void {
    this.api.licenses().subscribe((rows) => this.keys.set(rows));
  }
}
