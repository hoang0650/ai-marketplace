import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';
import { ShopProfileService } from './shop-profile.service';
import { ProductService } from '../../services/api.services';

interface NavItem {
  label: string;
  path?: string;
  exact?: boolean;
  badge?: boolean;
}

interface NavGroup {
  title: string;
  key: string;
  collapsible?: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-sell-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './sell-shell.component.html',
  styleUrl: './sell-shell.component.scss',
})
export class SellShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly shop = inject(ShopProfileService);
  private readonly productsApi = inject(ProductService);

  readonly brand = environment.brandName;
  readonly collapsed = signal(false);
  readonly openGroups = signal<Record<string, boolean>>({
    setup: true,
    sales: true,
    finance: true,
    dev: false,
  });
  readonly productCount = signal(0);
  readonly userMenuOpen = signal(false);

  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  readonly groups: NavGroup[] = [
    {
      title: 'Tổng quan',
      key: 'overview',
      items: [{ label: 'Tổng quan', path: '/sell', exact: true }],
    },
    {
      title: 'Thiết lập gian hàng',
      key: 'setup',
      collapsible: true,
      items: [
        { label: 'Hồ sơ gian hàng', path: '/sell/profile', badge: true },
        { label: 'Hình ảnh', path: '/sell/images' },
      ],
    },
    {
      title: 'Bán hàng',
      key: 'sales',
      collapsible: true,
      items: [
        { label: 'Sản phẩm', path: '/sell/products' },
        { label: 'Đơn hàng', path: '/sell/orders' },
        { label: 'Khiếu nại', path: '/sell/complaints' },
        { label: 'Mã giảm giá', path: '/sell/coupons' },
      ],
    },
    {
      title: 'Tài chính',
      key: 'finance',
      collapsible: true,
      items: [
        { label: 'Thanh toán', path: '/sell/payment' },
        { label: 'Rút tiền', path: '/sell/withdraw' },
        { label: 'Sổ cái', path: '/sell/ledger' },
      ],
    },
    {
      title: 'Nhà phát triển',
      key: 'dev',
      collapsible: true,
      items: [
        { label: 'Docs API & token', path: '/sell/docs/api-usage' },
        { label: 'Tích hợp', path: '/sell/integrate' },
      ],
    },
  ];

  constructor() {
    this.shop.reload();
    const slug = this.auth.user()?.creatorSlug;
    if (slug) {
      this.productsApi.list({ creatorSlug: slug }).subscribe((items) => this.productCount.set(items.length));
    }
  }

  toggleGroup(key: string): void {
    this.openGroups.update((m) => ({ ...m, [key]: !m[key] }));
  }

  isOpen(key: string): boolean {
    return !!this.openGroups()[key];
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.closeUserMenu();
  }
}
