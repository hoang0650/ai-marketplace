import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { WalletTx } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

declare const paypal: { Buttons: (opts: Record<string, unknown>) => { render: (sel: string) => Promise<unknown> } };

type WalletTab = 'deposit' | 'withdraw' | 'history';
type DepositMethod = 'sepay' | 'paypal';

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

  readonly brand = environment.brandName;
  readonly txs = signal<WalletTx[]>([]);
  readonly balance = signal(0);
  readonly currency = signal('VND');
  readonly tab = signal<WalletTab>('deposit');
  readonly msg = signal('');
  readonly monthKey = signal(this.currentMonthKey());
  readonly depositMethod = signal<DepositMethod>('sepay');
  readonly paypalEnabled = signal(false);
  readonly paypalBusy = signal(false);

  depositAmount = 500000;
  withdrawAmount = 100;
  readonly quickAmounts = [50000, 100000, 200000, 500000, 1000000];
  private paypalClientId = '';
  private paypalScript?: HTMLScriptElement;

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
    this.api.paypalConfig().subscribe({
      next: (cfg) => {
        this.paypalEnabled.set(!!cfg.enabled && !!cfg.clientId);
        this.paypalClientId = cfg.clientId || '';
      },
      error: () => this.paypalEnabled.set(false),
    });
  }

  ngAfterViewInit(): void {
    if (this.depositMethod() === 'paypal') this.ensurePayPalButtons();
  }

  ngOnDestroy(): void {
    this.paypalScript?.remove();
  }

  setDepositMethod(method: DepositMethod): void {
    this.depositMethod.set(method);
    this.msg.set('');
    if (method === 'paypal') {
      setTimeout(() => this.ensurePayPalButtons(), 50);
    }
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
      this.currency.set(list[0]?.currency || 'VND');
    });
  }

  deposit(): void {
    if (!this.depositAmount || this.depositAmount < 1) {
      this.msg.set(this.i18n.t('wallet.err.amount'));
      return;
    }
    this.api.deposit(this.depositAmount).subscribe({
      next: () => {
        this.msg.set(this.i18n.t('wallet.msg.depositOk'));
        this.reload();
        this.tab.set('history');
      },
      error: (err) => this.msg.set(err?.error?.message || this.i18n.t('wallet.msg.depositFail')),
    });
  }

  typeLabel(type: WalletTx['type']): string {
    if (type === 'deposit') return this.i18n.t('wallet.type.deposit');
    if (type === 'credit') return this.i18n.t('wallet.type.credit');
    if (type === 'withdraw') return this.i18n.t('wallet.type.withdraw');
    return this.i18n.t('wallet.type.debit');
  }

  methodLabel(t: WalletTx): string {
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
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    const intent = 'capture';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(this.paypalClientId)}&currency=USD&intent=${intent}&components=buttons`;
    script.async = true;
    script.onload = () => mount();
    script.onerror = () => this.msg.set(this.i18n.t('wallet.msg.paypalFail'));
    this.paypalScript = script;
    document.body.appendChild(script);
  }

  private renderPayPalButtons(): void {
    const el = document.getElementById('paypal-button-container');
    if (!el || typeof paypal === 'undefined') return;
    el.innerHTML = '';
    paypal
      .Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          const res = await firstValueFrom(this.api.paypalCreateOrder(this.depositAmount, 'VND'));
          return res.orderId;
        },
        onApprove: async (data: { orderID?: string }) => {
          const orderId = String(data?.orderID || '');
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
        },
        onCancel: () => this.msg.set(this.i18n.t('wallet.msg.paypalCancel')),
        onError: () => this.msg.set(this.i18n.t('wallet.msg.paypalFail')),
      })
      .render('#paypal-button-container')
      .catch(() => this.msg.set(this.i18n.t('wallet.msg.paypalFail')));
  }
}
