import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillingService, DashboardService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { CartService } from './cart.service';
import { categoryLabel } from '../../models/categories';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  readonly brand = environment.brandName;
  private readonly seo = inject(SeoService);
  private readonly walletApi = inject(DashboardService);
  private readonly billing = inject(BillingService);
  private readonly productsApi = inject(ProductService);

  readonly balance = signal(0);
  readonly walletCurrency = signal('USD');
  readonly useWallet = signal(true);
  readonly coupon = signal('');
  readonly couponApplied = signal(0);
  readonly msg = signal('');
  readonly paying = signal(false);
  readonly suggested = signal<Product[]>([]);
  readonly categoryLabel = categoryLabel;

  readonly allSelected = computed(
    () => this.cart.lines().length > 0 && this.cart.lines().every((l) => l.selected),
  );
  readonly discountSeller = computed(() => 0);
  readonly discountPlatform = computed(() => this.couponApplied());
  readonly total = computed(() =>
    Math.max(0, this.cart.subtotal() - this.discountSeller() - this.discountPlatform()),
  );

  ngOnInit(): void {
    this.seo.set({ title: 'Giỏ hàng' });
    this.cart.load();
    this.walletApi.wallet().subscribe((list) => {
      const bal = list.reduce(
        (s, t) => s + (t.type === 'debit' || t.type === 'withdraw' ? -t.amount : t.amount),
        0,
      );
      this.balance.set(bal);
      this.walletCurrency.set(list[0]?.currency || 'USD');
    });
    this.productsApi.list({ featured: true }).subscribe({
      next: (items) => this.suggested.set(items.slice(0, 4)),
      error: () =>
        this.productsApi.list().subscribe((items) => this.suggested.set(items.slice(0, 4))),
    });
  }

  toggleAll(): void {
    this.cart.toggleAll(!this.allSelected());
  }

  applyCoupon(): void {
    const code = this.coupon().trim().toUpperCase();
    if (!code) {
      this.msg.set('Nhập mã giảm giá trước.');
      return;
    }
    if (code === 'PHAI10' || code === 'WELCOME') {
      this.couponApplied.set(Math.min(this.cart.subtotal() * 0.1, this.cart.subtotal()));
      this.msg.set(`Đã áp dụng mã ${code}`);
    } else {
      this.couponApplied.set(0);
      this.msg.set('Mã không hợp lệ (thử PHAI10).');
    }
  }

  pay(): void {
    const selected = this.cart.selectedLines();
    if (!selected.length) {
      this.msg.set('Chọn ít nhất một sản phẩm.');
      return;
    }
    if (this.useWallet() && this.balance() < this.total()) {
      this.msg.set('Số dư ví không đủ. Hãy nạp thêm tiền.');
      return;
    }
    this.paying.set(true);
    const first = selected[0].product;
    this.billing.checkout({ productId: first.id, provider: 'payos' }).subscribe({
      next: (res) => {
        this.paying.set(false);
        this.msg.set(`Thanh toán ${res.checkoutId} · ${res.provider} (${res.status})`);
      },
      error: (err) => {
        this.paying.set(false);
        this.msg.set(err?.error?.message || 'Thanh toán thất bại.');
      },
    });
  }
}
