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
import { switchMap } from 'rxjs/operators';
import { authoritativeVnd, formatDong, listOffer, offerAmount, offerForTerm, offerPriceLabel } from '../usage/billing-display';
import { UsageCatalogService } from '../usage/usage.service';
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
  readonly i18n = inject(I18nService);
  private readonly usageApi = inject(UsageCatalogService);

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

  private defaultTerm(line: { product: Product }): 'day' | 'month' | 'year' {
    const t = line.product.contentMeta?.licenseTerm;
    return t === 'day' || t === 'year' ? t : 'month';
  }

  termUnit(term: string): string {
    if (!term) return '';
    return this.i18n.t(term === 'day' ? 'pd.unitDay' : term === 'month' ? 'pd.unitMonth' : 'pd.unitYear');
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

  suggestPrice(product: Product): string {
    if (this.i18n.lang() !== 'vi') return '';
    const offer = listOffer(product);
    return offer ? offerPriceLabel(offer, 'vi') || this.i18n.t('money.missingVnd') : '';
  }

  cartWallet(): string {
    const amount = authoritativeVnd(this.walletBal.displayAvailable());
    return amount == null ? this.i18n.t('money.missingVnd') : formatDong(amount);
  }

  viSubtotal(): string {
    if (this.i18n.lang() !== 'vi') return '';
    let sum = 0;
    for (const line of this.cart.selectedLines()) {
      if (line.qty !== 1 || line.serverUnitVnd == null) return this.i18n.t('money.missingVnd');
      sum += line.serverUnitVnd;
    }
    return formatDong(sum);
  }

  lineOffer(line: { product: Product; licenseTerm: string }) {
    if (line.licenseTerm) return offerForTerm(line.product, line.licenseTerm);
    return listOffer(line.product);
  }

  linePrice(line: { product: Product; qty: number; licenseTerm: string; serverUnitVnd: number | null }): string {
    if (this.i18n.lang() !== 'vi') return '';
    const offer = this.lineOffer(line);
    const label = offerPriceLabel(offer, 'vi');
    if (label) return label;
    if (line.serverUnitVnd != null && line.qty === 1) return formatDong(line.serverUnitVnd);
    return this.i18n.t('money.missingVnd');
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
    const requests = selected.map((line) => {
      const licenseTerm = isLicenseCategory(line.product.category) ? line.licenseTerm || this.defaultTerm(line) : undefined;
      const usd = this.cart.lineUnitPrice(line) * (licenseTerm ? 1 : line.qty);
      const currency = line.product.pricing?.currency || 'USD';
      const checkout = (amountVnd?: number) =>
        this.billing.checkout({
          productId: line.product.id,
          quantity: line.qty,
          licenseTerm,
          idempotencyKey: this.payKey(line.product.id, line.qty),
          ...(amountVnd != null ? { amountVnd } : {}),
        });
      const offered = offerAmount(this.lineOffer(line));
      if (this.i18n.lang() !== 'vi') return checkout(offered ?? undefined);
      if (offered != null) return checkout(offered);
      if (!(usd > 0)) return checkout();
      return this.usageApi.quote(usd, currency).pipe(
        switchMap((quote) => {
          const amountVnd = authoritativeVnd(quote);
          if (amountVnd == null) throw { error: { message: this.i18n.t('money.missingVnd') } };
          return checkout(amountVnd);
        }),
      );
    });
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
