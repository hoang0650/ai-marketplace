import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';
import { ShopProfileService } from './shop-profile.service';

@Component({
  selector: 'app-sell-overview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="ov">
      @if (!shop.started()) {
        <div class="ov-hero">
          <span class="ov-hero__icon" aria-hidden="true">🏪</span>
          <p class="ov-hero__eyebrow">Bắt đầu bán hàng trên {{ brand }}</p>
          <h1>Tạo hồ sơ người bán</h1>
          <p class="ov-hero__desc">
            Thiết lập gian hàng đáng tin cậy trước khi đăng sản phẩm đầu tiên. Hoàn tất hồ sơ để mở bán,
            nhận đơn và rút doanh thu.
          </p>
          <div class="ov-hero__actions">
            <button type="button" class="btn-primary" (click)="start()">Bắt đầu hồ sơ ›</button>
            <a routerLink="/marketplace" class="btn-ghost">Xem quy định người bán</a>
          </div>
          <div class="ov-steps">
            <article>
              <span>1</span>
              <h3>Tạo gian hàng</h3>
              <p>Thêm tên shop, đường dẫn và thông tin liên hệ.</p>
            </article>
            <article>
              <span>2</span>
              <h3>Gửi xét duyệt</h3>
              <p>Hoàn tất thông tin bắt buộc và theo dõi trạng thái duyệt.</p>
            </article>
            <article>
              <span>3</span>
              <h3>Đăng sản phẩm đầu tiên</h3>
              <p>Thiết lập giá, giao hàng và tồn kho để bắt đầu bán.</p>
            </article>
          </div>
          <p class="ov-note">✓ Gửi hồ sơ không đồng nghĩa với việc đăng sản phẩm tự động.</p>
        </div>
      } @else {
        <div class="ov-dash">
          <p class="crumb">Kênh bán hàng / Tổng quan</p>
          <h1>Tổng quan gian hàng</h1>
          <p class="muted">Theo dõi trạng thái shop và lối tắt quản lý.</p>
          <div class="ov-cards">
            <a routerLink="/sell/profile" class="card">
              <strong>Hồ sơ gian hàng</strong>
              <span>Trạng thái: {{ shop.statusLabel() }}</span>
            </a>
            <a routerLink="/sell/products" class="card">
              <strong>Sản phẩm</strong>
              <span>Quản lý catalog bán hàng</span>
            </a>
            <a routerLink="/sell/orders" class="card">
              <strong>Đơn hàng</strong>
              <span>Theo dõi đơn mua gần đây</span>
            </a>
            <a routerLink="/sell/payment" class="card">
              <strong>Thanh toán</strong>
              <span>Thiết lập nhận tiền</span>
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
    @media (max-width: 720px) {
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
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.set({ title: 'Kênh bán hàng' });
    this.shop.reload();
  }

  start(): void {
    this.shop.start();
    void this.router.navigateByUrl('/sell/profile');
  }
}
