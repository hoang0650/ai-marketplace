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
    if (payStatus === 'success') this.msg.set(this.i18n.t('wallet.msg.paypalOk'));
    if (payStatus === 'cancel') this.msg.set(this.i18n.t('wallet.msg.paypalCancel'));
    this.api.paypalConfig().subscribe({
      next: (cfg) => {
        this.paypalEnabled.set(!!cfg.enabled && !!cfg.clientId);
        this.paypalClientId = cfg.clientId || '';
        this.applePayOn.set(cfg.applePay !== false);
        this.googlePayOn.set(cfg.googlePay !== false);
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
    this.msg.set('');
    this.fundingUnavailable.set('');
    if (!this.paypalEnabled()) {
      this.msg.set(this.i18n.t('wallet.deposit.paypalOffline'));
      return;
    }
    setTimeout(() => this.ensurePayPalButtons(), 50);
  }

  setTab(tab: WalletTab): void {
    this.tab.set(tab);
    this.msg.set('');
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

  private sdkSrc(full: boolean): string {
    const id = encodeURIComponent(this.paypalClientId);
    const components = full ? 'buttons,applepay,googlepay' : 'buttons';
    return `https://www.paypal.com/sdk/js?client-id=${id}&currency=USD&intent=capture&components=${components}&enable-funding=applepay,googlepay`;
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
      existing.addEventListener('load', mount, { once: true });
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
      this.msg.set(this.i18n.t('wallet.msg.paypalFail'));
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
    const specs: Record<PaypalFunding, { el: string; source?: string; style: Record<string, unknown> }> = {
      apple: {
        el: 'paypal-btn-apple',
        source: funding.APPLEPAY,
        style: { layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 48 },
      },
      gpay: {
        el: 'paypal-btn-gpay',
        source: funding.GOOGLEPAY,
        style: { layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 48 },
      },
      paypal: {
        el: 'paypal-btn-paypal',
        source: funding.PAYPAL,
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
      },
    };
    const spec = specs[selected];
    const el = document.getElementById(spec.el);
    if (!el) return;
    el.innerHTML = '';
    el.hidden = false;
    if (!spec.source) {
      el.hidden = true;
      this.markFundingUnavailable(selected);
      return;
    }
    if (typeof paypal.isFundingEligible === 'function' && !paypal.isFundingEligible(spec.source) && selected !== 'paypal') {
      el.hidden = true;
      this.markFundingUnavailable(selected);
      return;
    }
    paypal
      .Buttons({
        fundingSource: spec.source,
        style: spec.style,
        createOrder: async () => this.createPaypalOrder(selected),
        onApprove: async (data: { orderID?: string }) => this.capturePaypal(String(data?.orderID || '')),
        onCancel: () => this.msg.set(this.i18n.t('wallet.msg.paypalCancel')),
        onError: () => this.msg.set(this.i18n.t('wallet.msg.paypalFail')),
      })
      .render(`#${spec.el}`)
      .then(() => {
        if (gen !== this.paypalButtonsGen) return;
      })
      .catch(() => {
        if (gen !== this.paypalButtonsGen) return;
        el.hidden = true;
        this.markFundingUnavailable(selected);
        if (selected === 'paypal') this.msg.set(this.i18n.t('wallet.msg.paypalFail'));
      });
  }

  private markFundingUnavailable(key: PaypalFunding): void {
    this.fundingUnavailable.set(key);
    if (key === 'apple') this.msg.set(this.i18n.t('wallet.deposit.appleUnavailable'));
    if (key === 'gpay') this.msg.set(this.i18n.t('wallet.deposit.gpayUnavailable'));
  }

  private async createPaypalOrder(funding: PaypalFunding): Promise<string> {
    if (!this.depositAmount || this.depositAmount < 1) {
      this.msg.set(this.i18n.t('wallet.err.amount'));
      throw new Error('invalid_amount');
    }
    const source = funding === 'apple' ? 'applepay' : funding === 'gpay' ? 'googlepay' : 'paypal';
    const res = await firstValueFrom(this.api.paypalCreateOrder(this.depositAmount, 'USD', source));
    return res.orderId;
  }

  private async capturePaypal(orderId: string): Promise<void> {
    if (!orderId) return;
    this.paypalBusy.set(true);
    try {
      const captured = await firstValueFrom(this.api.paypalCaptureOrder(orderId));
      if (captured.success) {
        this.msg.set(this.i18n.t('wallet.msg.paypalOk'));
        this.reload();
        this.tab.set('history');
      } else {
        this.msg.set(this.i18n.t('wallet.msg.paypalFail'));
      }
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.msg.set(message || this.i18n.t('wallet.msg.paypalFail'));
    } finally {
      this.paypalBusy.set(false);
    }
  }
}
