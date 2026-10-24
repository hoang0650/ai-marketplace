import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';
import { ShopProfileService } from './shop-profile.service';
import { ProductService } from '../../services/api.services';
import { TPipe } from '../../i18n/t.pipe';
import { SellWorkspace, sellWorkspaceOf } from './sell-workspace';
import { WORK_BOARD_ENABLED } from '../../models/feature-flags';

interface NavItem {
  labelKey: string;
  path: string;
  exact?: boolean;
  badge?: boolean;
}

interface NavGroup {
  titleKey: string;
  key: string;
  collapsible?: boolean;
  items: NavItem[];
}

const SELLER_GROUPS: NavGroup[] = [
  {
    titleKey: 'sell.nav.overview',
    key: 'overview',
    items: [{ labelKey: 'sell.nav.overview', path: '/sell', exact: true }],
  },
  {
    titleKey: 'sell.nav.setup',
    key: 'setup',
    collapsible: true,
    items: [
      { labelKey: 'sell.nav.kyc', path: '/sell/kyc' },
      { labelKey: 'sell.nav.verification', path: '/sell/verification', badge: true },
      { labelKey: 'sell.nav.profile', path: '/sell/profile', badge: true },
      { labelKey: 'sell.nav.images', path: '/sell/images' },
    ],
  },
  {
    titleKey: 'sell.nav.sales',
    key: 'sales',
    collapsible: true,
    items: [
      { labelKey: 'sell.nav.products', path: '/sell/products' },
      { labelKey: 'sell.nav.templates', path: '/sell/templates' },
      { labelKey: 'sell.nav.orders', path: '/sell/orders' },
      { labelKey: 'sell.nav.messages', path: '/sell/messages' },
      { labelKey: 'sell.nav.complaints', path: '/sell/complaints' },
      { labelKey: 'sell.nav.coupons', path: '/sell/coupons' },
      { labelKey: 'sell.nav.affiliate', path: '/sell/affiliate' },
    ],
  },
  {
    titleKey: 'sell.nav.finance',
    key: 'finance',
    collapsible: true,
    items: [
      { labelKey: 'sell.nav.payment', path: '/sell/payment' },
      { labelKey: 'sell.nav.withdraw', path: '/sell/withdraw' },
      { labelKey: 'sell.nav.ledger', path: '/sell/ledger' },
    ],
  },
  {
    titleKey: 'sell.nav.dev',
    key: 'dev',
    collapsible: true,
    items: [
      { labelKey: 'sell.nav.apiDocs', path: '/sell/docs/api-usage' },
      { labelKey: 'sell.nav.integrate', path: '/sell/integrate' },
    ],
  },
];

function partnerGroups(ws: Exclude<SellWorkspace, 'seller'>): NavGroup[] {
  const work: NavItem[] =
    ws === 'talent'
      ? [
          { labelKey: 'sell.nav.products', path: '/sell/products' },
          ...(WORK_BOARD_ENABLED
            ? [
                { labelKey: 'sell.nav.workProfile', path: '/work/manage/profile' },
                { labelKey: 'sell.nav.contracts', path: '/work/manage/contracts' },
              ]
            : []),
        ]
      : [
          ...(WORK_BOARD_ENABLED
            ? [
                { labelKey: 'sell.nav.workBoard', path: '/work/manage' },
                { labelKey: 'sell.nav.contracts', path: '/work/manage/contracts' },
              ]
            : []),
        ];
  return [
    {
      titleKey: 'sell.nav.overview',
      key: 'overview',
      items: [{ labelKey: 'sell.nav.overview', path: '/sell', exact: true }],
    },
    {
      titleKey: 'sell.nav.identity',
      key: 'setup',
      collapsible: true,
      items:
        ws === 'talent'
          ? [
              { labelKey: 'sell.nav.kyc', path: '/sell/kyc' },
              { labelKey: 'sell.nav.verification', path: '/sell/verification' },
            ]
          : [{ labelKey: 'sell.nav.kyc', path: '/sell/kyc' }],
    },
    {
      titleKey: 'sell.nav.work',
      key: 'sales',
      collapsible: true,
      items: [
        ...work,
        { labelKey: 'sell.nav.messages', path: '/sell/messages' },
        ...(WORK_BOARD_ENABLED ? [{ labelKey: 'sell.nav.issues', path: '/sell/issues' }] : []),
      ],
    },
    {
      titleKey: 'sell.nav.finance',
      key: 'finance',
      collapsible: true,
      items: [
        { labelKey: 'sell.nav.withdraw', path: '/sell/withdraw' },
        { labelKey: 'sell.nav.wallet', path: '/wallet' },
      ],
    },
  ];
}

@Component({
  selector: 'app-sell-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
  templateUrl: './sell-shell.component.html',
  styleUrl: './sell-shell.component.scss',
})
export class SellShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly workEnabled = WORK_BOARD_ENABLED;
  readonly shop = inject(ShopProfileService);
  private readonly productsApi = inject(ProductService);

  readonly brand = environment.brandName;
  private readonly platformId = inject(PLATFORM_ID);
  readonly collapsed = signal(false);
  readonly compactNav = signal(false);
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

  readonly workspace = computed<SellWorkspace>(() => sellWorkspaceOf(this.auth.user()?.role));
  readonly groups = computed<NavGroup[]>(() => {
    const ws = this.workspace();
    return ws === 'seller' ? SELLER_GROUPS : partnerGroups(ws);
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.compactNav.set(window.innerWidth <= 960);
    this.shop.reload();
    const slug = this.auth.user()?.creatorSlug;
    if (slug && this.workspace() === 'seller') {
      this.productsApi.list({ creatorSlug: slug, includeHidden: true }).subscribe((items) => this.productCount.set(items.length));
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

  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.compactNav.set(window.innerWidth <= 960);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.closeUserMenu();
  }
}