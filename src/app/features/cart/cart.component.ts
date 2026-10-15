import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { newIdempotencyKey } from '../../services/idempotency';
import { WalletBalanceService } from '../../services/wallet-balance.service';
import { NotificationsFeedService } from '../../services/notifications-feed.service';
import { BillingService, DashboardService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';
import { isLicenseCategory } from '../../models/categories';
import { forkJoin } from 'rxjs';
import { CartService } from './cart.service';
import { I18nService } from '../../i18n/i18n.service';
import { InvoiceChoiceComponent } from '../orders/invoice-choice.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule, TPipe, InvoiceChoiceComponent],
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

  private readonly walletBal = inject(WalletBalanceService);
  readonly balance = this.walletBal.available;
  readonly walletCurrency = this.walletBal.currency;
  readonly coupon = signal('');
  readonly couponApplied = signal(0);
  readonly msg = signal('');
  readonly paying = signal(false);
  private readonly feed = inject(NotificationsFeedService);
  private readonly payKeys = new Map<string, string>();

  private payKey(productId: string, qty: number): string {
    const k = `${productId}:${qty}`;
    let v = this.payKeys.get(k);
    if (!v) {
      v = newIdempotencyKey();
      this.payKeys.set(k, v);
    }
    return v;
  }
  readonly paid = signal(false);
  readonly receipts = signal<
    Array<{
      name: string;
      amount?: number;
      currency?: string;
      licenseKey?: string;
      emailSent?: boolean;
      emailTo?: string | null;
      orderId?: string;
    }>
  >([]);
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
    this.walletBal.refresh();
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
    if (this.paying()) return;
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
        licenseTerm: isLicenseCategory(line.product.category)
          ? line.product.contentMeta?.licenseTerm === 'day' ||
            line.product.contentMeta?.licenseTerm === 'year'
            ? line.product.contentMeta.licenseTerm
            : 'month'
          : undefined,
        // Same key for a retried pay of the same line, so a lost response never charges twice.
        idempotencyKey: this.payKey(line.product.id, line.qty),
      }),
    );
    forkJoin(requests).subscribe({
      next: (rows) => {
        this.paying.set(false);
        const units = selected.reduce((s, l) => s + l.qty, 0);
        const last = rows[rows.length - 1];
        if (last) this.walletBal.apply(last);
        else this.walletBal.refresh();
        this.payKeys.clear();
        this.feed.refreshSoon();
        this.receipts.set(
          rows.map((row, i) => ({
            name: selected[i]?.product.name || 'Sản phẩm',
            amount: row.amount,
            currency: row.currency,
            licenseKey: row.license?.licenseKey,
            emailSent: row.emailSent,
            emailTo: row.emailTo,
            orderId: row.orderId,
          })),
        );
        this.paid.set(true);
        const emailed = rows.some((r) => r.emailSent);
        const to = rows.find((r) => r.emailTo)?.emailTo;
        this.msg.set(
          emailed
            ? this.i18n.t('cart.msg.paidEmail', { orders: rows.length, units, email: to || '' })
            : this.i18n.t('cart.msg.paid', { orders: rows.length, units }),
        );
        this.cart.removeSelected();
      },
      error: (err) => {
        this.paying.set(false);
        this.walletBal.refresh();
        this.feed.refreshSoon();
        this.msg.set(err?.error?.message || this.i18n.t('cart.err.payFail'));
      },
    });
  }
}
