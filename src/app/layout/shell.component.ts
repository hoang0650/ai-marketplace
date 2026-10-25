import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { WalletBalanceService } from '../services/wallet-balance.service';
import { Component, ElementRef, HostListener, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { DashboardService, WishlistService } from '../services/api.services';
import { environment } from '../../environments/environment';
import { NAV_SECTIONS, isHiddenCategory } from '../models/categories';
import { UiIconComponent } from './ui-icon.component';
import { HEADER_MESSAGES } from './header.messages';
import { WORK_BOARD_ENABLED } from '../models/feature-flags';
import { CatalogLane } from '../models/marketplace.models';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { AppLang } from '../i18n/messages';
import { NotificationsFeedService } from '../services/notifications-feed.service';
import { CartService } from '../features/cart/cart.service';
import { AffiliateService } from '../services/affiliate.service';
import { GoogleSignInComponent } from '../features/auth/google-sign-in.component';
import { CurrencyService, AppCurrency, CURRENCIES } from '../i18n/currency.service';

type NotiTab = 'all' | 'tx' | 'system' | 'promo';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, GoogleSignInComponent, CurrencyPipe, UiIconComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(DashboardService);
  readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  readonly currencySvc = inject(CurrencyService);
  readonly currencies = CURRENCIES;
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly brand = environment.brandName;
  readonly year = new Date().getFullYear();
  readonly navSections = NAV_SECTIONS;
  readonly workEnabled = WORK_BOARD_ENABLED;
  readonly walletBalance = inject(WalletBalanceService);
  readonly footerNav = [
    { path: '/', key: 'footer.nav.about' },
    { path: '/marketplace', key: 'nav.marketplace' },
    { path: '/hire-agent/marketplace', key: 'nav.agent' },
    { path: '/models', key: 'nav.model' },
    ...(WORK_BOARD_ENABLED ? [{ path: '/work', key: 'work.nav.label' }] : []),
    { path: '/docs', key: 'nav.docs' },
    { path: '/support', key: 'nav.support' },
    { path: '/sell', key: 'footer.nav.sell' },
  ];
  readonly footerLegal = [
    { path: '/legal/chinh-sach-bao-mat-va-du-lieu', key: 'footer.privacy' },
    { path: '/legal/quy-che-hoat-dong-san-tmdt', key: 'footer.marketplaceRules' },
    { path: '/legal/chinh-sach-khieu-nai-tranh-chap', key: 'footer.disputePolicy' },
    { path: '/complaints/new', key: 'complaint.cta.file' },
    { path: '/legal/dieu-khoan-su-dung', key: 'footer.terms' },
  ];
  /** "Popular" column of the Categories mega-menu (former top-level Agent / Model links + key hubs). */
  readonly quickLinks = [
    { path: '/hire-agent/marketplace', key: 'hdr.quick.agent', desc: 'hdr.quick.agentDesc', icon: 'bot', cat: '' },
    { path: '/models', key: 'hdr.quick.model', desc: 'hdr.quick.modelDesc', icon: 'sparkles', cat: '' },
    { path: '/training/dataset', key: 'hdr.quick.dataset', desc: 'hdr.quick.datasetDesc', icon: 'database', cat: 'dataset' },
    { path: '/skill-pack', key: 'hdr.quick.skill', desc: 'hdr.quick.skillDesc', icon: 'layers', cat: 'skill-pack' },
    { path: '/game-server', key: 'hdr.quick.game', desc: 'hdr.quick.gameDesc', icon: 'gamepad', cat: 'game-server' },
    { path: '/training/gpu', key: 'hdr.quick.gpu', desc: 'hdr.quick.gpuDesc', icon: 'cpu', cat: '' },
  ].filter((l) => !l.cat || !isHiddenCategory(l.cat));
  private readonly categoryPaths = [
    ...this.quickLinks.map((l) => l.path),
    ...NAV_SECTIONS.flatMap((s) => s.links.map((l) => l.path)),
  ].filter((p) => p && p !== '/');
  readonly url = signal('/');
  readonly compact = signal(false);
  readonly categoriesActive = computed(() => {
    const u = this.url().split(/[?#]/)[0];
    return this.categoryPaths.some((p) => u === p || u.startsWith(p + '/'));
  });
  readonly docsActive = computed(() => /^\/docs(\/|$)|^\/sell\/integrate/.test(this.url()));
  readonly workActive = computed(() => /^\/work(\/|$)/.test(this.url()));
  readonly appStoreUrl = 'https://apps.apple.com/vn/app/ai-markets/id6822239570?l=vi';
  readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=app.phgroup.ai_market_vn';
  readonly categoryOpen = signal(false);
  readonly workOpen = signal(false);
  readonly docsOpen = signal(false);
  readonly cartOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notiOpen = signal(false);
  readonly langOpen = signal(false);
  readonly currencyOpen = signal(false);
  readonly mobileNavOpen = signal(false);
  private readonly router = inject(Router);
  private readonly feed = inject(NotificationsFeedService);
  readonly notifications = this.feed.items;
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
    inject(I18nService).extend(HEADER_MESSAGES);
    inject(AffiliateService).startTracking();
    this.url.set(this.router.url || '/');
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) this.closeMobileNav();
      if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects || event.url);
    });
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (!isPlatformBrowser(this.platformId)) return;
      if (authed) {
        this.feed.start();
        this.walletBalance.refresh();
      } else {
        this.feed.stop();
        this.walletBalance.reset();
      }
      this.cart.load();
      this.wishlist.load();
    });
  }

  loadNotifications(): void {
    this.feed.refresh();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleCategories(): void {
    this.categoryOpen.update((v) => !v);
    this.workOpen.set(false);
    this.docsOpen.set(false);
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
    this.docsOpen.set(false);
    this.userMenuOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeWork(): void {
    this.workOpen.set(false);
  }

  toggleDocs(event: Event): void {
    event.stopPropagation();
    this.docsOpen.update((v) => !v);
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.userMenuOpen.set(false);
    this.notiOpen.set(false);
    this.langOpen.set(false);
    this.currencyOpen.set(false);
    this.cartOpen.set(false);
  }

  closeDocs(): void {
    this.docsOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
    if (this.userMenuOpen()) this.walletBalance.refresh();
    this.categoryOpen.set(false);
    this.workOpen.set(false);
    this.docsOpen.set(false);
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
    if (this.docsOpen()) {
      if (target && !this.host.nativeElement.querySelector('.docs-dd')?.contains(target)) {
        this.closeDocs();
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
      if (target && !this.host.nativeElement.querySelector('.locale-dd')?.contains(target)) {
        this.closeLang();
      }
    }
    if (this.currencyOpen()) {
      if (target && !this.host.nativeElement.querySelector('.locale-dd')?.contains(target)) {
        this.closeCurrency();
      }
    }
    if (this.cartOpen()) {
      if (target && !this.host.nativeElement.querySelector('.lux-cart-dd')?.contains(target)) {
        this.closeCart();
      }
    }
  }

  toggleMobileNav(event: Event): void {
    event.stopPropagation();
    this.mobileNavOpen.update((v) => !v);
    this.closeCategories();
    this.closeWork();
    this.closeDocs();
    this.closeUserMenu();
    this.closeNoti();
    this.closeLang();
    this.closeCurrency();
    this.closeCart();
    this.syncNavLock();
  }

  closeMobileNav(): void {
    if (!this.mobileNavOpen()) return;
    this.mobileNavOpen.set(false);
    this.syncNavLock();
  }

  onNavClick(event: Event): void {
    const el = event.target as HTMLElement | null;
    if (el?.closest('a')) this.closeMobileNav();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.innerWidth >= 1024) this.closeMobileNav();
  }

  /** Sticky header shrinks once the page scrolls (class toggled only on change). */
  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const next = window.scrollY > 24;
    if (next !== this.compact()) this.compact.set(next);
  }

  private syncNavLock(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.toggle('nav-lock', this.mobileNavOpen());
    const header = this.host.nativeElement.querySelector('.site-header') as HTMLElement | null;
    if (header) {
      document.documentElement.style.setProperty('--shell-nav-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileNav();
    this.closeCategories();
    this.closeWork();
    this.closeDocs();
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
    this.closeLang();
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
