import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { Order, User, WalletTx } from '../../models/marketplace.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);

  readonly brand = environment.brandName;
  readonly user = signal<User | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly wallet = signal<WalletTx[]>([]);
  readonly shareMsg = signal('');

  readonly initials = computed(() => {
    const name = this.user()?.name?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    if (role === 'admin') return 'Admin';
    if (role === 'creator') return 'Người bán';
    return 'Thành viên';
  });

  readonly balance = computed(() =>
    this.wallet().reduce(
      (sum, t) => sum + (t.type === 'debit' || t.type === 'withdraw' ? -t.amount : t.amount),
      0,
    ),
  );

  readonly walletCurrency = computed(() => this.wallet()[0]?.currency || 'USD');

  readonly orderCount = computed(() => this.orders().length);
  readonly paidCount = computed(() => this.orders().filter((o) => o.status === 'paid').length);
  readonly pendingCount = computed(() => this.orders().filter((o) => o.status === 'pending').length);
  readonly refundedCount = computed(() => this.orders().filter((o) => o.status === 'refunded').length);
  readonly totalSpent = computed(() =>
    this.orders()
      .filter((o) => o.status === 'paid' || o.status === 'pending')
      .reduce((sum, o) => sum + o.amount, 0),
  );
  readonly spendCurrency = computed(() => this.orders()[0]?.currency || this.walletCurrency());
  readonly completionRate = computed(() => {
    const total = this.orderCount();
    if (!total) return 0;
    return Math.round((this.paidCount() / total) * 100);
  });
  readonly recentOrders = computed(() => this.orders().slice(0, 4));

  ngOnInit(): void {
    this.seo.set({
      title: 'Hồ sơ',
      description: 'Quản lý tài khoản và hoạt động mua bán của bạn.',
    });
    this.user.set(this.auth.user());
    this.api.orders().subscribe((list) => this.orders.set(list));
    this.api.wallet().subscribe((list) => this.wallet.set(list));
  }

  statusLabel(status: Order['status']): string {
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'pending') return 'Đang xử lý';
    return 'Đã hoàn';
  }

  async shareProfile(): Promise<void> {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.shareMsg.set('Đã sao chép liên kết hồ sơ');
        setTimeout(() => this.shareMsg.set(''), 2000);
      }
    } catch {
      this.shareMsg.set('Không thể sao chép liên kết');
    }
  }
}
