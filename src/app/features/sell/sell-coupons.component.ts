import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CouponService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Coupon, Product } from '../../models/marketplace.models';

@Component({
  selector: 'app-sell-coupons',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  template: `
    <section>
      <p class="crumb">Bán hàng / Mã giảm giá</p>
      <h1>Voucher & giảm giá</h1>
      <p class="lead">
        Tạo mã cho toàn shop hoặc một sản phẩm. Giảm trừ vào đơn trước phí nền tảng — seller chịu phần giảm.
      </p>

      <form class="card form" (ngSubmit)="create()">
        <h2>Tạo mã mới</h2>
        <div class="grid">
          <label>
            Mã
            <input class="in" name="code" [(ngModel)]="draft.code" required maxlength="24" placeholder="SALE20" />
          </label>
          <label>
            Loại
            <select class="in" name="type" [(ngModel)]="draft.type">
              <option value="percent">Phần trăm (%)</option>
              <option value="amount">Số tiền (USD)</option>
            </select>
          </label>
          <label>
            Mức giảm
            <input class="in" type="number" min="0.01" step="0.01" name="value" [(ngModel)]="draft.value" required />
          </label>
          <label>
            Áp dụng
            <select class="in" name="productId" [(ngModel)]="draft.productId">
              <option value="">Toàn bộ sản phẩm của shop</option>
              @for (p of products(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </label>
          <label>
            Đơn tối thiểu (USD)
            <input class="in" type="number" min="0" step="0.01" name="minSubtotal" [(ngModel)]="draft.minSubtotal" />
          </label>
          <label>
            Giảm tối đa (USD, % )
            <input class="in" type="number" min="0" step="0.01" name="maxDiscount" [(ngModel)]="draft.maxDiscount" />
          </label>
          <label>
            Lượt dùng tối đa (0 = không giới hạn)
            <input class="in" type="number" min="0" step="1" name="maxUses" [(ngModel)]="draft.maxUses" />
          </label>
          <label>
            Hết hạn
            <input class="in" type="date" name="endsAt" [(ngModel)]="draft.endsAt" />
          </label>
        </div>
        <button type="submit" class="btn" [disabled]="saving()">Tạo mã</button>
        @if (msg()) {
          <p class="msg" [class.err]="isErr()">{{ msg() }}</p>
        }
      </form>

      <div class="list">
        @for (c of coupons(); track c.id) {
          <article class="card row">
            <div>
              <p class="code">{{ c.code }}</p>
              <p class="meta">
                {{ c.type === 'percent' ? (c.value | number: '1.0-0') + '%' : '$' + (c.value | number: '1.2-2') }}
                · {{ c.usedCount | number }} lượt
                @if (c.maxUses) {
                  / {{ c.maxUses | number }}
                }
                @if (c.endsAt) {
                  · hết {{ c.endsAt | date: 'dd/MM/yyyy' }}
                }
                · {{ c.productIds.length ? 'một sản phẩm' : 'toàn shop' }}
              </p>
            </div>
            <div class="acts">
              <span class="pill" [class.off]="!c.active">{{ c.active ? 'Đang chạy' : 'Tắt' }}</span>
              <button type="button" class="ghost" (click)="toggle(c)">{{ c.active ? 'Tắt' : 'Bật' }}</button>
            </div>
          </article>
        } @empty {
          <div class="card empty">Chưa có mã. Tạo mã đầu tiên ở form trên.</div>
        }
      </div>
      <a routerLink="/sell/products" class="link">Quản lý sản phẩm ›</a>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .25rem 0 .35rem; font-size: 1.45rem; font-weight: 800; }
    h2 { margin: 0 0 .85rem; font-size: 1rem; font-weight: 800; }
    .lead { color: #666; max-width: 40rem; line-height: 1.5; margin: 0 0 1.1rem; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.15rem; }
    .form { margin-bottom: 1rem; }
    .grid { display: grid; gap: .75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    label { display: flex; flex-direction: column; gap: .3rem; font-size: .78rem; font-weight: 700; color: #555; }
    .in { min-height: 2.4rem; border: 1px solid #ddd; border-radius: 10px; padding: .45rem .7rem; font: inherit; }
    .btn { margin-top: .9rem; min-height: 2.4rem; padding: .5rem 1.1rem; border: 0; border-radius: 10px; background: #e53935; color: #fff; font-weight: 800; cursor: pointer; }
    .btn:disabled { opacity: .6; }
    .msg { margin: .7rem 0 0; color: #2e7d32; font-weight: 600; }
    .msg.err { color: #c62828; }
    .list { display: grid; gap: .65rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .code { margin: 0; font-weight: 800; letter-spacing: .06em; }
    .meta { margin: .2rem 0 0; color: #777; font-size: .85rem; }
    .acts { display: flex; gap: .5rem; align-items: center; }
    .pill { font-size: .72rem; font-weight: 800; padding: .2rem .5rem; border-radius: 999px; background: #e8f5e9; color: #2e7d32; }
    .pill.off { background: #f5f5f5; color: #888; }
    .ghost { border: 1px solid #ddd; background: #fff; border-radius: 10px; padding: .4rem .75rem; font-weight: 700; cursor: pointer; }
    .empty { color: #888; }
    .link { display: inline-block; margin-top: 1rem; color: #e53935; font-weight: 700; text-decoration: none; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .row { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SellCouponsComponent implements OnInit {
  private readonly couponsApi = inject(CouponService);
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  readonly coupons = signal<Coupon[]>([]);
  readonly products = signal<Product[]>([]);
  readonly saving = signal(false);
  readonly msg = signal('');
  isErr = signal(false);

  draft = {
    code: '',
    type: 'percent' as 'percent' | 'amount',
    value: 10,
    productId: '',
    minSubtotal: 0,
    maxDiscount: 0,
    maxUses: 0,
    endsAt: '',
  };

  ngOnInit(): void {
    this.seo.set({ title: 'Mã giảm giá' });
    this.reload();
    const slug = this.auth.user()?.creatorSlug;
    if (slug) {
      this.productsApi.list({ creatorSlug: slug }).subscribe((items) => this.products.set(items));
    }
  }

  reload(): void {
    this.couponsApi.list().subscribe({
      next: (rows) => this.coupons.set(rows),
      error: (err) => {
        this.isErr.set(true);
        this.msg.set(err?.error?.message || 'Không tải được mã giảm giá');
      },
    });
  }

  create(): void {
    this.saving.set(true);
    this.msg.set('');
    this.isErr.set(false);
    this.couponsApi
      .create({
        code: this.draft.code,
        type: this.draft.type,
        value: Number(this.draft.value),
        productIds: this.draft.productId ? [this.draft.productId] : [],
        minSubtotal: Number(this.draft.minSubtotal) || 0,
        maxDiscount: Number(this.draft.maxDiscount) || 0,
        maxUses: Number(this.draft.maxUses) || 0,
        endsAt: this.draft.endsAt ? new Date(this.draft.endsAt).toISOString() : null,
        maxUsesPerBuyer: 1,
      })
      .subscribe({
        next: (row) => {
          this.saving.set(false);
          this.coupons.update((list) => [row, ...list]);
          this.draft.code = '';
          this.msg.set(`Đã tạo mã ${row.code}`);
        },
        error: (err) => {
          this.saving.set(false);
          this.isErr.set(true);
          this.msg.set(err?.error?.message || 'Không tạo được mã');
        },
      });
  }

  toggle(c: Coupon): void {
    const req = c.active ? this.couponsApi.deactivate(c.id) : this.couponsApi.update(c.id, { active: true });
    req.subscribe({
      next: (row) => this.coupons.update((list) => list.map((x) => (x.id === row.id ? row : x))),
      error: (err) => {
        this.isErr.set(true);
        this.msg.set(err?.error?.message || 'Không cập nhật được mã');
      },
    });
  }
}
