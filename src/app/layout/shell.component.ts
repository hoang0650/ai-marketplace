import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/api.services';
import { environment } from '../../environments/environment';
import { AI_CATEGORIES, NAV_PLATFORM_LINKS, categoriesByNavGroup } from '../models/categories';
import { CatalogLane, NotificationItem } from '../models/marketplace.models';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { AppLang } from '../i18n/messages';
import { CartService } from '../features/cart/cart.service';
import { GoogleSignInComponent } from '../features/auth/google-sign-in.component';
import { CurrencyService, AppCurrency, CURRENCIES } from '../i18n/currency.service';

type NotiTab = 'all' | 'tx' | 'system' | 'promo';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, GoogleSignInComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(DashboardService);
  readonly cart = inject(CartService);
  readonly currencySvc = inject(CurrencyService);
  readonly currencies = CURRENCIES;
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly brand = environment.brandName;
  readonly year = new Date().getFullYear();
  readonly platformLinks = NAV_PLATFORM_LINKS;
  readonly generateCats = categoriesByNavGroup('generate');
  readonly apiCats = categoriesByNavGroup('apis');
  readonly platformCats = categoriesByNavGroup('platform');
  readonly talentCats = categoriesByNavGroup('talent');
  readonly aiCategories = AI_CATEGORIES;
  readonly categoryOpen = signal(false);
  readonly workOpen = signal(false);
  readonly cartOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notiOpen = signal(false);
  readonly langOpen = signal(false);
  readonly currencyOpen = signal(false);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly notiTab = signal<NotiTab>('all');

  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly visibleNotifs = computed(() => {
    const list = this.notifications();
    const tab = this.notiTab();
    if (tab === 'tx') {
      return list.filter((n) =>
        /đơn|ví|thanh toán|giao dịch|order|wallet|payment|交易|支付|钱包/i.test(`${n.title} ${n.body}`),
      );
    }
    if (tab === 'system') {
      return list.filter((n) => /hệ thống|system|bảo mật|security|系统|安全/i.test(`${n.title} ${n.body}`));
    }
    if (tab === 'promo') {
      return list.filter((n) => /khuyến mãi|promo|giảm giá|coupon|促销|优惠/i.test(`${n.title} ${n.body}`));
    }
    return list.slice(0, 8);
  });

  constructor() {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (!isPlatformBrowser(this.platformId)) return;
      if (authed) {
        this.loadNotifications();
      } else {
        this.notifications.set([]);
      }
      this.cart.load();
    });
  }

  loadNotifications(): void {
    this.api.notifications().subscribe({
      next: (items) => this.notifications.set(items),
      error: () => this.notifications.set([]),
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleCategories(): void {
    this.categoryOpen.update((v) => !v);
    this.workOpen.set(false);
    this.userMenuOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeCategories(): void {
    this.categoryOpen.set(false);
  }

  toggleWork(event: Event): void {
    event.stopPropagation();
    this.workOpen.update((v) => !v);
    this.categoryOpen.set(false);
    this.userMenuOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeWork(): void {
    this.workOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  toggleNoti(event: Event): void {
    event.stopPropagation();
    const next = !this.notiOpen();
    this.notiOpen.set(next);
    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
    if (next) this.loadNotifications();
  }

  closeNoti(): void {
    this.notiOpen.set(false);
  }

  setNotiTab(tab: NotiTab): void {
    this.notiTab.set(tab);
  }

  readAllNotifs(): void {
    this.api.readAllNotifications().subscribe((items) => this.notifications.set(items));
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (this.categoryOpen()) {
      if (target && !this.host.nativeElement.querySelector('.nav-dd')?.contains(target)) {
        this.closeCategories();
      }
    }
    if (this.workOpen()) {
      if (target && !this.host.nativeElement.querySelector('.work-dd')?.contains(target)) {
        this.closeWork();
      }
    }
    if (this.userMenuOpen()) {
      if (target && !this.host.nativeElement.querySelector('.user-menu')?.contains(target)) {
        this.closeUserMenu();
      }
    }
    if (this.notiOpen()) {
      if (target && !this.host.nativeElement.querySelector('.noti-menu')?.contains(target)) {
        this.closeNoti();
      }
    }
    if (this.langOpen()) {
      if (target && !this.host.nativeElement.querySelector('.lang-dd')?.contains(target)) {
        this.closeLang();
      }
    }
    if (this.currencyOpen()) {
      if (target && !this.host.nativeElement.querySelector('.currency-dd')?.contains(target)) {
        this.closeCurrency();
      }
    }
    if (this.cartOpen()) {
      if (target && !this.host.nativeElement.querySelector('.lux-cart-dd')?.contains(target)) {
        this.closeCart();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCategories();
    this.closeWork();
    this.closeUserMenu();
    this.closeNoti();
    this.closeLang();
    this.closeCurrency();
    this.closeCart();
  }

  logout(): void {
    this.closeUserMenu();
    this.closeNoti();
    this.closeLang();
    this.closeCurrency();
    this.closeCart();
    this.auth.logout();
  }

  toggleLang(event: Event): void {
    event.stopPropagation();
    this.langOpen.update((v) => !v);
    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.notiOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeLang(): void {
    this.langOpen.set(false);
  }

  closeCurrency(): void {
    this.currencyOpen.set(false);
  }

  toggleCurrency(event: Event): void {
    event.stopPropagation();
    this.currencyOpen.update((v) => !v);
    this.langOpen.set(false);
    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.notiOpen.set(false);
    this.cartOpen.set(false);
  }

  setCurrency(code: AppCurrency): void {
    this.currencySvc.setCurrency(code);
    this.closeCurrency();
  }

  currencyLabel(): string {
    return this.i18n.t(`currency.${this.currencySvc.currency().toLowerCase()}`);
  }

  setLang(lang: AppLang): void {
    this.i18n.setLang(lang);
    this.closeLang();
  }

  toggleCart(event: Event): void {
    event.stopPropagation();
    this.cartOpen.update((v) => !v);
    this.userMenuOpen.set(false);
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cart.load();
  }

  closeCart(): void {
    this.cartOpen.set(false);
  }

  onNewsletter(event: Event): void {
    event.preventDefault();
  }

  laneTitle(_lane: CatalogLane): string {
    return this.i18n.t('group.apis');
  }
}
