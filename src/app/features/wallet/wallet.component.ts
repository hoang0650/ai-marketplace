import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { WalletTx } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

declare const paypal: {
  FUNDING?: { PAYPAL?: string; APPLEPAY?: string; GOOGLEPAY?: string };
  Buttons: (opts: Record<string, unknown>) => { render: (sel: string) => Promise<unknown> };
  isFundingEligible?: (source: string) => boolean;
};

type WalletTab = 'deposit' | 'withdraw' | 'history';
type DepositMethod = 'paypal' | 'apple' | 'gpay';
type PaypalFunding = 'apple' | 'gpay' | 'paypal';

const PAYPAL_QUICK = [5, 10, 20, 50, 100];

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TPipe],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);

  readonly brand = environment.brandName;
  readonly txs = signal<WalletTx[]>([]);
  readonly balance = signal(0);
  readonly currency = signal('USD');
  readonly tab = signal<WalletTab>('deposit');
  readonly msg = signal('');
  readonly monthKey = signal(this.currentMonthKey());
  readonly depositMethod = signal<DepositMethod>('paypal');
  readonly paypalEnabled = signal(false);
  readonly paypalBusy = signal(false);
  readonly applePayOn = signal(true);
  readonly googlePayOn = signal(true);
  readonly fundingUnavailable = signal<PaypalFunding | ''>('');
  readonly msgIsError = signal(false);

  depositAmount = 10;
  private paypalClientId = '';
  private paypalScript?: HTMLScriptElement;
  private paypalButtonsGen = 0;

  readonly depositCurrency = computed(() => 'USD');
  readonly quickAmounts = computed(() => PAYPAL_QUICK);

  readonly monthOptions = computed(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: this.i18n.t('wallet.monthLabel', {
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        }),
      };
    });
  });

  readonly monthLabel = computed(() => {
    const opt = this.monthOptions().find((o) => o.key === this.monthKey());
    return opt?.label || this.monthKey();
  });

  readonly monthStats = computed(() => {
    const [y, m] = this.monthKey().split('-').map(Number);
    const list = this.txs().filter((t) => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const deposit = list
      .filter((t) => (t.type === 'deposit' || t.type === 'credit') && (t.status || 'completed') === 'completed')
      .reduce((s, t) => s + t.amount, 0);
    const spend = list
      .filter((t) => (t.type === 'debit' || t.type === 'withdraw') && (t.status || 'completed') !== 'failed' && (t.status || 'completed') !== 'cancelled')
      .reduce((s, t) => s + t.amount, 0);
    return { deposit, spend, count: list.length };
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('wallet.title') });
    this.reload();
    const method = this.route.snapshot.queryParamMap.get('method');
    const payStatus = this.route.snapshot.queryParamMap.get('paymentStatus');
    if (method === 'gpay' || method === 'apple' || method === 'paypal') {
      this.depositMethod.set(method);
      this.depositAmount = 10;
    }
    if (payStatus === 'success') this.setMsg(this.i18n.t('wallet.msg.paypalOk'), false);
    if (payStatus === 'cancel') this.setMsg(this.i18n.t('wallet.msg.paypalCancel'), true);
    this.api.paypalConfig().subscribe({
      next: (cfg) => {
        this.paypalEnabled.set(!!cfg.enabled && !!cfg.clientId);
        this.paypalClientId = cfg.clientId || '';
        this.applePayOn.set(cfg.applePay !== false);
        this.googlePayOn.set(cfg.googlePay !== false);
        queueMicrotask(() => this.ensurePayPalButtons());
      },
      error: () => this.paypalEnabled.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.ensurePayPalButtons();
  }

  ngOnDestroy(): void {
    this.paypalScript?.remove();
  }

  setDepositMethod(method: DepositMethod): void {
    this.depositMethod.set(method);
    this.setMsg('', false);
    this.fundingUnavailable.set('');
    if (!this.paypalEnabled()) {
      this.setMsg(this.i18n.t('wallet.deposit.paypalOffline'), true);
      return;
    }
    setTimeout(() => this.ensurePayPalButtons(), 50);
  }

  setTab(tab: WalletTab): void {
    this.tab.set(tab);
    this.setMsg('', false);
  }

  pickAmount(v: number): void {
    this.depositAmount = v;
  }

  reload(): void {
    this.api.wallet().subscribe((list) => {
      this.txs.set(list);
      const bal = list.reduce((s, t) => s + this.txDelta(t), 0);
      this.balance.set(bal);
      this.currency.set(list[0]?.currency || 'USD');
    });
  }

  typeLabel(type: WalletTx['type']): string {
    if (type === 'deposit') return this.i18n.t('wallet.type.deposit');
    if (type === 'credit') return this.i18n.t('wallet.type.credit');
    if (type === 'withdraw') return this.i18n.t('wallet.type.withdraw');
    return this.i18n.t('wallet.type.debit');
  }

  methodLabel(t: WalletTx): string {
    const note = (t.note || '').toLowerCase();
    if (t.paymentMethod === 'iap' || note.includes('app store') || note.includes('google play') || note.includes(' iap')) {
      return this.i18n.t('wallet.method.iap');
    }
    if (note.includes('apple')) return this.i18n.t('wallet.method.apple');
    if (note.includes('google')) return this.i18n.t('wallet.method.gpay');
    if (t.paymentMethod === 'paypal') return this.i18n.t('wallet.method.paypal');
    if (t.type === 'deposit') return this.i18n.t('wallet.method.transfer');
    if (t.type === 'withdraw') return this.i18n.t('wallet.method.withdraw');
    return this.i18n.t('wallet.method.internal');
  }

  isCredit(type: WalletTx['type']): boolean {
    return type === 'deposit' || type === 'credit';
  }

  statusLabel(t: WalletTx): string {
    return this.i18n.t(`wallet.status.${t.status || 'completed'}`);
  }

  railHint(): string {
    const method = this.depositMethod();
    if (method === 'apple') return this.i18n.t('wallet.deposit.appleHint');
    if (method === 'gpay') return this.i18n.t('wallet.deposit.gpayHint');
    return this.i18n.t('wallet.deposit.paypalHint');
  }

  private txDelta(t: WalletTx): number {
    const st = t.status || 'completed';
    if (st === 'failed' || st === 'cancelled') return 0;
    if (t.type === 'deposit' || t.type === 'credit') {
      return st === 'completed' ? t.amount : 0;
    }
    if (st === 'pending' || st === 'completed') return -t.amount;
    return 0;
  }

  private currentMonthKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private setMsg(text: string, isError: boolean): void {
    this.msg.set(text);
    this.msgIsError.set(!!text && isError);
  }

  private sdkSrc(full: boolean): string {
    const id = encodeURIComponent(this.paypalClientId);
    // Do not add enable-funding=applepay,googlepay — PayPal returns 400 for VN merchants.
    const components = full ? 'buttons,applepay,googlepay' : 'buttons';
    return `https://www.paypal.com/sdk/js?client-id=${id}&currency=USD&intent=capture&components=${components}`;
  }

  private ensurePayPalButtons(): void {
    if (!this.paypalEnabled() || !this.paypalClientId || typeof document === 'undefined') return;
    const mount = () => this.renderPayPalButtons();
    if (typeof paypal !== 'undefined') {
      mount();
      return;
    }
    const existing = document.getElementById('paypal-sdk') as HTMLScriptElement | null;
    if (existing) {
      if (typeof paypal !== 'undefined') {
        mount();
        return;
      }
      if (existing.src.includes('enable-funding=')) {
        existing.remove();
        this.injectPayPalSdk(this.sdkSrc(true), true);
        return;
      }
      existing.addEventListener('load', mount, { once: true });
      existing.addEventListener(
        'error',
        () => this.injectPayPalSdk(this.sdkSrc(false), false),
        { once: true },
      );
      return;
    }
    this.injectPayPalSdk(this.sdkSrc(true), true);
  }

  private injectPayPalSdk(src: string, allowFallback: boolean): void {
    document.getElementById('paypal-sdk')?.remove();
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = src;
    script.async = true;
    script.onload = () => this.renderPayPalButtons();
    script.onerror = () => {
      script.remove();
      if (allowFallback) {
        this.injectPayPalSdk(this.sdkSrc(false), false);
        return;
      }
      this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true);
    };
    this.paypalScript = script;
    document.body.appendChild(script);
  }

  private renderPayPalButtons(): void {
    if (typeof paypal === 'undefined') return;
    const gen = ++this.paypalButtonsGen;
    const selected = this.depositMethod();
    if (selected !== 'apple' && selected !== 'gpay' && selected !== 'paypal') return;
    const funding = paypal.FUNDING || {};
    const specs: Record<PaypalFunding, { el: string; source: string; style: Record<string, unknown> }> = {
      apple: {
        el: 'paypal-btn-apple',
        source: funding.APPLEPAY || 'applepay',
        style: { layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 48 },
      },
      gpay: {
        el: 'paypal-btn-gpay',
        source: funding.GOOGLEPAY || 'googlepay',
        style: { layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 48 },
      },
      paypal: {
        el: 'paypal-btn-paypal',
        source: funding.PAYPAL || 'paypal',
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
      },
    };
    const spec = specs[selected];
    const el = document.getElementById(spec.el);
    if (!el) {
      if (this.tab() !== 'deposit') return;
      setTimeout(() => {
        if (gen === this.paypalButtonsGen) this.renderPayPalButtons();
      }, 50);
      return;
    }
    el.innerHTML = '';
    el.hidden = false;
    const appleGpay = selected === 'apple' || selected === 'gpay';
    const ineligible =
      appleGpay &&
      typeof paypal.isFundingEligible === 'function' &&
      !paypal.isFundingEligible(spec.source);
    if (ineligible) {
      el.hidden = true;
      this.markFundingUnavailable(selected);
      this.mountPaypalFallback(gen);
      return;
    }
    paypal
      .Buttons({
        fundingSource: spec.source,
        style: spec.style,
        createOrder: async () => this.createPaypalOrder(selected),
        onApprove: async (data: { orderID?: string }) => this.capturePaypal(String(data?.orderID || '')),
        onCancel: () => this.setMsg(this.i18n.t('wallet.msg.paypalCancel'), true),
        onError: () => this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true),
      })
      .render(`#${spec.el}`)
      .then(() => {
        if (gen !== this.paypalButtonsGen) return;
      })
      .catch(() => {
        if (gen !== this.paypalButtonsGen) return;
        el.hidden = true;
        if (appleGpay) {
          this.markFundingUnavailable(selected);
          this.mountPaypalFallback(gen);
          return;
        }
        this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true);
      });
  }

  private mountPaypalFallback(gen: number): void {
    const el = document.getElementById('paypal-btn-paypal');
    if (!el || typeof paypal === 'undefined') return;
    el.hidden = false;
    el.innerHTML = '';
    const source = paypal.FUNDING?.PAYPAL || 'paypal';
    paypal
      .Buttons({
        fundingSource: source,
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
        createOrder: async () => this.createPaypalOrder('paypal'),
        onApprove: async (data: { orderID?: string }) => this.capturePaypal(String(data?.orderID || '')),
        onCancel: () => this.setMsg(this.i18n.t('wallet.msg.paypalCancel'), true),
        onError: () => this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true),
      })
      .render('#paypal-btn-paypal')
      .catch(() => {
        if (gen !== this.paypalButtonsGen) return;
        this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true);
      });
  }

  private markFundingUnavailable(key: PaypalFunding): void {
    this.fundingUnavailable.set(key);
    if (key === 'apple') this.setMsg(this.i18n.t('wallet.deposit.appleUnavailable'), false);
    if (key === 'gpay') this.setMsg(this.i18n.t('wallet.deposit.gpayUnavailable'), false);
  }

  private async createPaypalOrder(funding: PaypalFunding): Promise<string> {
    if (!this.depositAmount || this.depositAmount < 1) {
      this.setMsg(this.i18n.t('wallet.err.amount'), true);
      throw new Error('invalid_amount');
    }
    const source = funding === 'apple' ? 'applepay' : funding === 'gpay' ? 'googlepay' : 'paypal';
    try {
      const res = await firstValueFrom(this.api.paypalCreateOrder(this.depositAmount, 'USD', source));
      if (!res?.orderId) throw new Error('no_order');
      return res.orderId;
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.setMsg(message || this.i18n.t('wallet.msg.paypalFail'), true);
      throw err;
    }
  }

  private async capturePaypal(orderId: string): Promise<void> {
    if (!orderId) return;
    this.paypalBusy.set(true);
    try {
      const captured = await firstValueFrom(this.api.paypalCaptureOrder(orderId));
      if (captured.success) {
        this.setMsg(this.i18n.t('wallet.msg.paypalOk'), false);
        this.reload();
        this.tab.set('history');
      } else {
        this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true);
      }
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.setMsg(message || this.i18n.t('wallet.msg.paypalFail'), true);
    } finally {
      this.paypalBusy.set(false);
    }
  }
}
