import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Order, Product, WalletTx } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';
import { ShopProfileService } from './shop-profile.service';

@Component({
  selector: 'app-sell-images',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="si">
      <p class="crumb">Kênh bán hàng · {{ shop.statusLabel() }} · Hình ảnh</p>
      <h1>Hình ảnh gian hàng</h1>
      <div class="si-grid">
        <div class="si-main">
          <div class="card row">
            <div class="upload">
              <div class="upload__box upload__box--logo">
                @if (logoUrl) {
                  <img [src]="logoUrl" alt="Logo preview" />
                } @else {
                  <span>🏪</span>
                  <p>Xem trước logo</p>
                }
              </div>
              <label class="btn">
                Tải logo
                <input type="file" accept="image/*" hidden (change)="onLogo($event)" />
              </label>
              <input class="url" [(ngModel)]="logoUrl" name="logoUrl" placeholder="Hoặc dán URL logo" />
            </div>
            <div class="upload grow">
              <div class="upload__box upload__box--cover">
                @if (coverUrl) {
                  <img [src]="coverUrl" alt="Cover preview" />
                } @else {
                  <p>Xem trước ảnh bìa</p>
                }
              </div>
              <label class="btn">
                Tải ảnh bìa
                <input type="file" accept="image/*" hidden (change)="onCover($event)" />
              </label>
              <input class="url" [(ngModel)]="coverUrl" name="coverUrl" placeholder="Hoặc dán URL ảnh bìa" />
            </div>
          </div>
          <button type="button" class="save" (click)="save()">Lưu hình ảnh vào hồ sơ</button>
          @if (msg()) {
            <p class="ok">{{ msg() }}</p>
          }
        </div>
        <aside class="card">
          <h2>Xem trước cách dùng</h2>
          <div class="mini-card">
            <p class="label">Thẻ sản phẩm</p>
            <div class="mini-card__row">
              <div class="avatar">{{ initials }}</div>
              <div>
                <strong>{{ shop.profile().shopName || 'Tên gian hàng' }}</strong>
                <span>Người bán</span>
              </div>
            </div>
          </div>
          <div class="mini-card">
            <p class="label">Đầu trang gian hàng</p>
            <div class="header-prev" [style.backgroundImage]="coverUrl ? 'url(' + coverUrl + ')' : null">
              <div class="avatar">{{ initials }}</div>
              <strong>{{ shop.profile().shopName || 'Tên gian hàng' }}</strong>
            </div>
          </div>
          <a routerLink="/sell/profile" class="link">Quay lại hồ sơ ›</a>
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
  logoUrl = '';
  coverUrl = '';
  readonly msg = signal('');
  initials = 'GH';

  constructor() {
    this.seo.set({ title: 'Hình ảnh gian hàng' });
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
    this.msg.set('Đã lưu hình ảnh vào hồ sơ');
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
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section>
      <p class="crumb">Bán hàng / Đơn hàng</p>
      <h1>Đơn hàng</h1>
      <p class="lede">Theo dõi và xử lý đơn hàng từ khách mua.</p>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Sản phẩm</th>
              <th>Người mua</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày</th>
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
                <td colspan="6" class="empty">Chưa có đơn hàng nào.</td>
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
  readonly orders = signal<Order[]>([]);

  ngOnInit(): void {
    this.seo.set({ title: 'Đơn hàng' });
    this.api.orders().subscribe((list) => this.orders.set(list));
  }

  statusLabel(status: Order['status']): string {
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'pending') return 'Đang xử lý';
    return 'Đã hoàn';
  }
}

@Component({
  selector: 'app-sell-payment',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="pay">
      <p class="crumb">Không gian bán hàng · {{ shop.statusLabel() }} · Thanh toán</p>
      <h1>Thanh toán</h1>
      @if (!shop.started() || shop.profile().status === 'draft') {
        <div class="gate">
          <span class="gate__icon">ℹ</span>
          <h2>Tạo hồ sơ người bán</h2>
          <p>Tạo hồ sơ gian hàng và gửi xét duyệt trước khi dùng Thanh toán.</p>
          <a routerLink="/sell/profile" class="btn">Bắt đầu hồ sơ</a>
        </div>
      } @else {
        <div class="card">
          <h2>Thiết lập nhận tiền</h2>
          <p>
            Hồ sơ đang ở trạng thái <strong>{{ shop.statusLabel() }}</strong>. Sau khi được duyệt bạn có thể liên
            kết tài khoản nhận thanh toán.
          </p>
          <a routerLink="/sell/withdraw" class="link">Đi tới Rút tiền ›</a>
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
  `,
})
export class SellPaymentComponent {
  readonly shop = inject(ShopProfileService);
  constructor() {
    inject(SeoService).set({ title: 'Thanh toán' });
  }
}

@Component({
  selector: 'app-sell-withdraw',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <section>
      <p class="crumb">Tài chính / Rút tiền</p>
      <h1>Rút tiền</h1>
      <div class="grid">
        <form class="card" (ngSubmit)="withdraw()">
          <label>
            <span>Số tiền</span>
            <input type="number" min="1" [(ngModel)]="amount" name="amount" />
          </label>
          <button type="submit">Yêu cầu rút tiền</button>
          @if (msg()) {
            <p class="ok">{{ msg() }}</p>
          }
        </form>
        <div class="card">
          <h2>Lịch sử ví</h2>
          <ul>
            @for (t of txs(); track t.id) {
              <li>
                <span>{{ t.type }} · {{ t.note }}</span>
                <strong>{{ t.amount | currency: t.currency }}</strong>
              </li>
            } @empty {
              <li class="empty">Chưa có giao dịch.</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1rem; }
    label { display: grid; gap: .35rem; font-weight: 700; font-size: .85rem; }
    input { border: 1px solid #e5e5e5; border-radius: 10px; padding: .7rem .8rem; font: inherit; }
    button { margin-top: .85rem; min-height: 2.45rem; border: 0; border-radius: 10px; background: #e53935; color: #fff; font: inherit; font-weight: 800; cursor: pointer; padding: 0 1rem; }
    ul { list-style: none; margin: .75rem 0 0; padding: 0; display: grid; gap: .55rem; }
    li { display: flex; justify-content: space-between; gap: .75rem; font-size: .85rem; border-bottom: 1px solid #f0f0f0; padding-bottom: .55rem; }
    .ok { color: #15803d; font-size: .85rem; }
    .empty { color: #999; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SellWithdrawComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly txs = signal<WalletTx[]>([]);
  readonly msg = signal('');
  amount = 100;

  ngOnInit(): void {
    this.seo.set({ title: 'Rút tiền' });
    this.api.wallet().subscribe((t) => this.txs.set(t));
  }

  withdraw(): void {
    this.api.withdraw(this.amount).subscribe((tx) => {
      this.txs.update((list) => [tx, ...list]);
      this.msg.set(`Đã gửi yêu cầu rút ${tx.amount}`);
    });
  }
}

@Component({
  selector: 'app-sell-products',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <section>
      <div class="head">
        <div>
          <p class="crumb">Bán hàng / Sản phẩm</p>
          <h1>Sản phẩm</h1>
        </div>
        <a routerLink="/dashboard/products" class="btn">+ Đăng sản phẩm</a>
      </div>
      <div class="list">
        @for (p of products(); track p.id) {
          <article class="card">
            <div>
              <p class="cat">{{ label(p.category) }}</p>
              <a [routerLink]="['/product', p.slug]">{{ p.name }}</a>
              <p class="meta">{{ p.installCount | number }} lượt · ★ {{ p.rating | number: '1.1-1' }}</p>
            </div>
            <a class="ghost" [routerLink]="['/deploy', p.slug]">Deploy</a>
          </article>
        } @empty {
          <div class="card empty">
            <p>Chưa có sản phẩm. Hãy đăng sản phẩm đầu tiên.</p>
            <a routerLink="/dashboard/products" class="btn">Đăng sản phẩm</a>
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
  `,
})
export class SellProductsComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly products = signal<Product[]>([]);
  readonly label = categoryLabel;

  ngOnInit(): void {
    this.seo.set({ title: 'Sản phẩm' });
    const slug = this.auth.user()?.creatorSlug;
    if (!slug) return;
    this.productsApi.list({ creatorSlug: slug }).subscribe((items) => this.products.set(items));
  }
}

@Component({
  selector: 'app-sell-placeholder',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="ph">
      <p class="crumb">{{ crumb }}</p>
      <h1>{{ title }}</h1>
      <div class="card">
        <p>{{ desc }}</p>
        <a routerLink="/sell" class="link">Về tổng quan ›</a>
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
  title = 'Đang cập nhật';
  crumb = 'Kênh bán hàng';
  desc = 'Tính năng này sẽ sớm có mặt trong kênh bán hàng.';

  constructor() {
    const key = this.route.snapshot.data['page'] as string | undefined;
    if (key === 'complaints') {
      this.title = 'Khiếu nại';
      this.crumb = 'Bán hàng / Khiếu nại';
      this.desc = 'Theo dõi và phản hồi khiếu nại từ người mua.';
    } else if (key === 'coupons') {
      this.title = 'Mã giảm giá';
      this.crumb = 'Bán hàng / Mã giảm giá';
      this.desc = 'Tạo mã giảm giá để tăng chuyển đổi cho gian hàng.';
    } else if (key === 'ledger') {
      this.title = 'Sổ cái';
      this.crumb = 'Tài chính / Sổ cái';
      this.desc = 'Xem sổ cái doanh thu, phí nền tảng và số dư.';
    } else if (key === 'integrate') {
      this.title = 'Tích hợp';
      this.crumb = 'Nhà phát triển / Tích hợp';
      this.desc = 'Kết nối webhook, API key và cổng thanh toán.';
    }
    this.seo.set({ title: this.title });
  }
}
