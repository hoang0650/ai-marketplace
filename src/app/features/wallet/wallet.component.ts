import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { WalletTx } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';
import { TPipe } from '../../i18n/t.pipe';

type WalletTab = 'deposit' | 'withdraw' | 'history';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, TPipe],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);

  readonly brand = environment.brandName;
  readonly txs = signal<WalletTx[]>([]);
  readonly balance = signal(0);
  readonly currency = signal('USD');
  readonly tab = signal<WalletTab>('deposit');
  readonly msg = signal('');
  readonly monthKey = signal(this.currentMonthKey());

  depositAmount = 500000;
  withdrawAmount = 100;
  readonly quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  readonly monthOptions = computed(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: `tháng ${d.getMonth() + 1} năm ${d.getFullYear()}` };
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
      .filter((t) => t.type === 'deposit' || t.type === 'credit')
      .reduce((s, t) => s + t.amount, 0);
    const spend = list
      .filter((t) => t.type === 'debit' || t.type === 'withdraw')
      .reduce((s, t) => s + t.amount, 0);
    return { deposit, spend, count: list.length };
  });

  ngOnInit(): void {
    this.seo.set({ title: 'Ví của bạn' });
    this.reload();
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
      const bal = list.reduce(
        (s, t) => s + (t.type === 'debit' || t.type === 'withdraw' ? -t.amount : t.amount),
        0,
      );
      this.balance.set(bal);
      this.currency.set(list[0]?.currency || 'VND');
    });
  }

  deposit(): void {
    if (!this.depositAmount || this.depositAmount < 1) {
      this.msg.set('Nhập số tiền hợp lệ.');
      return;
    }
    this.api.deposit(this.depositAmount).subscribe({
      next: () => {
        this.msg.set('Đã tạo yêu cầu nạp / ghi có vào ví.');
        this.reload();
        this.tab.set('history');
      },
      error: (err) => this.msg.set(err?.error?.message || 'Nạp tiền thất bại.'),
    });
  }

  typeLabel(type: WalletTx['type']): string {
    if (type === 'deposit') return 'Nạp tiền';
    if (type === 'credit') return 'Hoàn tiền / ghi có';
    if (type === 'withdraw') return 'Rút tiền';
    return 'Thanh toán đơn hàng';
  }

  methodLabel(type: WalletTx['type']): string {
    if (type === 'deposit') return 'Chuyển khoản';
    if (type === 'withdraw') return 'Rút ví';
    return 'Ví nội bộ';
  }

  isCredit(type: WalletTx['type']): boolean {
    return type === 'deposit' || type === 'credit';
  }

  private currentMonthKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
