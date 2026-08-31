import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillingService, DashboardService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';
import { forkJoin } from 'rxjs';
import { CartService } from './cart.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule, TPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly walletApi = inject(DashboardService);
  private readonly billing = inject(BillingService);
  private readonly productsApi = inject(ProductService);
  private readonly i18n = inject(I18nService);

  readonly balance = signal(0);
  readonly walletCurrency = signal('USD');
  readonly coupon = signal('');
  readonly couponApplied = signal(0);
  readonly msg = signal('');
  readonly paying = signal(false);
  readonly suggested = signal<Product[]>([]);

  catLabel(id: string): string {
    return this.i18n.catLabel(id);
  }

  readonly allSelected = computed(
    () => this.cart.lines().length > 0 && this.cart.lines().every((l) => l.selected),
  );
  readonly discountSeller = computed(() => 0);
  readonly discountPlatform = computed(() => this.couponApplied());
  readonly total = computed(() =>
    Math.max(0, this.cart.subtotal() - this.discountSeller() - this.discountPlatform()),
  );

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('cart.title') });
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
      this.msg.set(this.i18n.t('cart.err.couponEmpty'));
      return;
    }
    if (code === 'PHAI10' || code === 'WELCOME') {
      this.couponApplied.set(Math.min(this.cart.subtotal() * 0.1, this.cart.subtotal()));
      this.msg.set(this.i18n.t('cart.err.couponOk', { code }));
    } else {
      this.couponApplied.set(0);
      this.msg.set(this.i18n.t('cart.err.couponInvalid'));
    }
  }

  pay(): void {
    const selected = this.cart.selectedLines();
    if (!selected.length) {
      this.msg.set(this.i18n.t('cart.err.selectProduct'));
      return;
    }
    if (this.balance() < this.total()) {
      this.msg.set(this.i18n.t('cart.err.insufficient'));
      return;
    }
    this.paying.set(true);
    const requests = selected.map((line) =>
      this.billing.checkout({
        productId: line.product.id,
        quantity: line.qty,
      }),
    );
    forkJoin(requests).subscribe({
      next: (rows) => {
        this.paying.set(false);
        const units = selected.reduce((s, l) => s + l.qty, 0);
        const last = rows[rows.length - 1];
        if (typeof last?.balance === 'number') this.balance.set(last.balance);
        this.msg.set(
          this.i18n.t('cart.msg.paid', { orders: rows.length, units }),
        );
      },
      error: (err) => {
        this.paying.set(false);
        this.msg.set(err?.error?.message || this.i18n.t('cart.err.payFail'));
      },
    });
  }
}
