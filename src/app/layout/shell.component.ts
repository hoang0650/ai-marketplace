import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/api.services';
import { environment } from '../../environments/environment';
import { CATEGORY_GROUP_LABEL, CATEGORY_META, categoriesByGroup } from '../models/categories';
import { CategoryGroup, NotificationItem } from '../models/marketplace.models';

type NotiTab = 'all' | 'tx' | 'system' | 'promo';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(DashboardService);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly brand = environment.brandName;
  readonly navCategories = CATEGORY_META;
  readonly groupLabel = CATEGORY_GROUP_LABEL;
  readonly modelCategories = categoriesByGroup('models');
  readonly skillCategories = categoriesByGroup('skills');
  readonly hireCategories = categoriesByGroup('hire');
  readonly categoryOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notiOpen = signal(false);
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
      return list.filter((n) => /đơn|ví|thanh toán|giao dịch|order|wallet|payment/i.test(`${n.title} ${n.body}`));
    }
    if (tab === 'system') {
      return list.filter((n) => /hệ thống|system|bảo mật|security/i.test(`${n.title} ${n.body}`));
    }
    if (tab === 'promo') {
      return list.filter((n) => /khuyến mãi|promo|giảm giá|coupon/i.test(`${n.title} ${n.body}`));
    }
    return list.slice(0, 8);
  });

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadNotifications();
      } else {
        this.notifications.set([]);
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) this.loadNotifications();
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
    this.userMenuOpen.set(false);
    this.notiOpen.set(false);
  }

  closeCategories(): void {
    this.categoryOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
    this.categoryOpen.set(false);
    this.notiOpen.set(false);
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
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCategories();
    this.closeUserMenu();
    this.closeNoti();
  }

  logout(): void {
    this.closeUserMenu();
    this.closeNoti();
    this.auth.logout();
  }

  groupTitle(group: CategoryGroup): string {
    return this.groupLabel[group];
  }
}
