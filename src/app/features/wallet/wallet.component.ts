import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { WalletTx, GpayOrder, GpayQrResponse } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

declare const paypal: {
  FUNDING?: { PAYPAL?: string };
  Buttons: (opts: Record<string, unknown>) => { render: (sel: string) => Promise<unknown> };
};

type WalletTab = 'deposit' | 'withdraw' | 'history';
type DepositMethod = 'paypal' | 'gpay';

const PAYPAL_QUICK = [5, 10, 20, 50, 100];
const GPAY_QUICK_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const GPAY_POLL_MS = 4000;
/** Stop polling after ~15 minutes (QR / bill expiry). */
const GPAY_POLL_MAX = 225;

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
  readonly paypalEnabled = signal(false);
  readonly paypalBusy = signal(false);
  readonly msgIsError = signal(false);

  readonly depositMethod = signal<DepositMethod>('paypal');
  readonly gpayAvailable = signal(false);
  readonly gpayEnabled = signal(false);
  readonly gpayPortalEnabled = signal(false);
  readonly gpayQrEnabled = signal(false);
  readonly gpayCanSimulate = signal(false);
  readonly gpayQr = signal<GpayQrResponse | null>(null);
  readonly gpayPolling = signal(false);
  readonly gpayBusy = signal(false);
  readonly gpaySandbox = signal(false);
  readonly gpayVndPerUsd = signal(26000);
  readonly gpayMinTopupVnd = signal(0);

  depositAmount = 10;
  depositVnd = 100000;
  private paypalClientId = '';
  private paypalScript?: HTMLScriptElement;
  private paypalButtonsGen = 0;
  private gpayPollTimer?: ReturnType<typeof setTimeout>;
  private gpayPollOrder = '';

  readonly depositCurrency = computed(() => 'USD');
  readonly quickAmounts = computed(() => PAYPAL_QUICK);
  readonly gpayQuickAmounts = computed(() => GPAY_QUICK_VND);
  readonly gpayEstimateUsd = computed(() => {
    const rate = this.gpayVndPerUsd() || 26000;
    return Math.round((this.depositVnd / rate) * 100) / 100;
  });

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
    const payStatus = this.route.snapshot.queryParamMap.get('paymentStatus');
    if (payStatus === 'success') this.setMsg(this.i18n.t('wallet.msg.paypalOk'), false);
    if (payStatus === 'cancel') this.setMsg(this.i18n.t('wallet.msg.paypalCancel'), true);
    const amountQ = Number(this.route.snapshot.queryParamMap.get('amount'));
    if (Number.isFinite(amountQ) && amountQ >= 1) this.depositAmount = Math.round(amountQ);
    this.api.paypalConfig().subscribe({
      next: (cfg) => {
        this.paypalEnabled.set(!!cfg.enabled && !!cfg.clientId);
        this.paypalClientId = cfg.clientId || '';
        queueMicrotask(() => this.ensurePayPalButtons());
      },
      error: () => this.paypalEnabled.set(false),
    });

    this.api.gpayConfig().subscribe({
      next: (cfg) => {
        this.gpayAvailable.set(cfg.available ?? !!cfg.enabled);
        this.gpayEnabled.set(!!cfg.enabled);
        this.gpayPortalEnabled.set(!!cfg.portalEnabled);
        this.gpayQrEnabled.set(!!cfg.qrEnabled);
        this.gpayCanSimulate.set(!!cfg.canSimulate);
        this.gpaySandbox.set(!!cfg.sandbox);
        this.gpayVndPerUsd.set(Number(cfg.vndPerUsd) || 26000);
        this.gpayMinTopupVnd.set(Number(cfg.minTopupVnd) || 0);
      },
      error: () => {
        this.gpayAvailable.set(false);
        this.gpayEnabled.set(false);
      },
    });

    // Back from GPay's gateway: /wallet?gpay=return&order=AIM…
    const gpayOrder = this.route.snapshot.queryParamMap.get('order');
    if (this.route.snapshot.queryParamMap.get('gpay') === 'return' && gpayOrder) {
      this.depositMethod.set('gpay');
      this.setMsg(this.i18n.t('wallet.gpay.checking'), false);
      this.pollGpayOrder(gpayOrder);
    }
  }

  ngAfterViewInit(): void {
    this.ensurePayPalButtons();
  }

  ngOnDestroy(): void {
    this.paypalScript?.remove();
    this.stopGpayPolling();
  }

  setTab(tab: WalletTab): void {
    this.tab.set(tab);
    this.setMsg('', false);
    if (tab === 'deposit') setTimeout(() => this.ensurePayPalButtons(), 50);
  }

  pickAmount(v: number): void {
    this.depositAmount = v;
  }

  pickGpayAmount(v: number): void {
    this.depositVnd = v;
  }

  setDepositMethod(method: DepositMethod): void {
    this.depositMethod.set(method);
    this.setMsg('', false);
    if (method === 'paypal') {
      setTimeout(() => this.ensurePayPalButtons(), 50);
    }
  }

  gpayQrSrc(): string {
    const qr = this.gpayQr()?.qrCodeImage || '';
    if (!qr) return '';
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  }

  private gpayAmountOk(): boolean {
    const min = this.gpayMinTopupVnd();
    if (!this.depositVnd || this.depositVnd < 1 || this.depositVnd < min) {
      this.setMsg(this.i18n.t('wallet.gpay.amountInvalid'), true);
      return false;
    }
    return true;
  }

  /** 4xx carry a user-facing reason (amount, auth); GPay/server failures get the generic message. */
  private gpayError(err: unknown): void {
    this.gpayBusy.set(false);
    const e = err as { status?: number; error?: { message?: string } } | null;
    const status = Number(e?.status) || 0;
    const message = status >= 400 && status < 500 ? e?.error?.message : '';
    this.setMsg(message || this.i18n.t('wallet.gpay.createFail'), true);
  }

  /** Redirect to GPay's payment page (ATM / card / transfer). */
  gpayCheckout(): void {
    if (!this.gpayAmountOk()) return;
    this.gpayBusy.set(true);
    this.api.gpayCheckout(Math.round(this.depositVnd)).subscribe({
      next: (res) => {
        if (!res?.billUrl) return this.gpayError(null);
        this.setMsg(this.i18n.t('wallet.gpay.redirecting'), false);
        window.location.href = res.billUrl;
      },
      error: (err: unknown) => this.gpayError(err),
    });
  }

  /** Show a dynamic VietQR and wait for GPay's confirmation. */
  gpayCreateQr(): void {
    if (!this.gpayAmountOk()) return;
    this.gpayBusy.set(true);
    this.api.gpayQr(Math.round(this.depositVnd)).subscribe({
      next: (res) => {
        this.gpayBusy.set(false);
        this.gpayQr.set(res);
        this.setMsg('', false);
        this.pollGpayOrder(res.order.requestId);
      },
      error: (err: unknown) => {
        // VietQR down on GPay's side: fall back to the gateway instead of dead-ending.
        if (Number((err as { status?: number })?.status) >= 500 && this.gpayPortalEnabled()) {
          this.gpayBusy.set(false);
          this.gpayCheckout();
          return;
        }
        this.gpayError(err);
      },
    });
  }

  closeGpayQr(): void {
    this.gpayQr.set(null);
    this.stopGpayPolling();
  }

  private pollGpayOrder(requestId: string, attempt = 0): void {
    if (attempt === 0) {
      this.stopGpayPolling();
      this.gpayPollOrder = requestId;
      this.gpayPolling.set(true);
    }
    if (this.gpayPollOrder !== requestId) return;
    this.api.gpayOrder(requestId).subscribe({
      next: (res) => this.onGpayOrder(res.order, attempt),
      error: () => this.scheduleGpayPoll(requestId, attempt),
    });
  }

  private onGpayOrder(order: GpayOrder, attempt: number): void {
    if (order.status === 'completed') {
      this.stopGpayPolling();
      this.gpayQr.set(null);
      this.setMsg(this.i18n.t('wallet.gpay.paidOk', { usd: order.amountUsd }), false);
      this.reload();
      return;
    }
    if (order.status === 'failed' || order.status === 'cancelled') {
      this.stopGpayPolling();
      this.gpayQr.set(null);
      this.setMsg(this.i18n.t('wallet.gpay.paidFail'), true);
      return;
    }
    this.scheduleGpayPoll(order.requestId, attempt);
  }

  private scheduleGpayPoll(requestId: string, attempt: number): void {
    if (attempt + 1 >= GPAY_POLL_MAX) {
      this.stopGpayPolling();
      this.setMsg(this.i18n.t('wallet.gpay.pendingLong'), false);
      return;
    }
    this.gpayPollTimer = setTimeout(() => this.pollGpayOrder(requestId, attempt + 1), GPAY_POLL_MS);
  }

  private stopGpayPolling(): void {
    if (this.gpayPollTimer) clearTimeout(this.gpayPollTimer);
    this.gpayPollTimer = undefined;
    this.gpayPollOrder = '';
    this.gpayPolling.set(false);
  }

  sandboxCredit(): void {
    if (!this.depositVnd || this.depositVnd < 1) {
      this.setMsg(this.i18n.t('wallet.gpay.amountInvalid'), true);
      return;
    }
    this.gpayBusy.set(true);
    this.api.gpaySandboxCredit(this.depositVnd).subscribe({
      next: () => {
        this.gpayBusy.set(false);
        this.setMsg(this.i18n.t('wallet.gpay.sandboxOk'), false);
        this.reload();
      },
      error: (err: unknown) => {
        this.gpayBusy.set(false);
        const message = (err as { error?: { message?: string } })?.error?.message;
        this.setMsg(message || this.i18n.t('wallet.gpay.sandboxFail'), true);
      },
    });
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
    if (t.paymentMethod === 'paypal') return this.i18n.t('wallet.method.paypal');
    if (t.paymentMethod === 'gpay') return this.i18n.t('wallet.method.gpayVn');
    if (t.paymentMethod === 'apple_pay') return this.i18n.t('wallet.method.apple');
    if (t.paymentMethod === 'google_pay') return this.i18n.t('wallet.method.gpay');
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

  private sdkSrc(): string {
    const id = encodeURIComponent(this.paypalClientId);
    return `https://www.paypal.com/sdk/js?client-id=${id}&currency=USD&intent=capture&components=buttons`;
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
      existing.addEventListener('error', () => this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true), { once: true });
      return;
    }
    this.injectPayPalSdk();
  }

  private injectPayPalSdk(): void {
    document.getElementById('paypal-sdk')?.remove();
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = this.sdkSrc();
    script.async = true;
    script.onload = () => this.renderPayPalButtons();
    script.onerror = () => {
      script.remove();
      this.setMsg(this.i18n.t('wallet.msg.paypalFail'), true);
    };
    this.paypalScript = script;
    document.body.appendChild(script);
  }

  private renderPayPalButtons(): void {
    if (typeof paypal === 'undefined') return;
    const gen = ++this.paypalButtonsGen;
    const el = document.getElementById('paypal-btn-paypal');
    if (!el) {
      if (this.tab() !== 'deposit') return;
      setTimeout(() => {
        if (gen === this.paypalButtonsGen) this.renderPayPalButtons();
      }, 50);
      return;
    }
    el.innerHTML = '';
    paypal
      .Buttons({
        fundingSource: paypal.FUNDING?.PAYPAL || 'paypal',
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
        createOrder: async () => this.createPaypalOrder(),
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

  private async createPaypalOrder(): Promise<string> {
    if (!this.depositAmount || this.depositAmount < 1) {
      this.setMsg(this.i18n.t('wallet.err.amount'), true);
      throw new Error('invalid_amount');
    }
    try {
      const res = await firstValueFrom(this.api.paypalCreateOrder(this.depositAmount, 'USD', 'paypal'));
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
