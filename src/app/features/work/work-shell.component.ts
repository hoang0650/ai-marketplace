import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-work-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './work-shell.component.html',
  styleUrl: './work-shell.component.scss',
})
export class WorkShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly brand = environment.brandName;
  readonly collapsed = signal(false);
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
      items: [
        { label: 'Bảng công việc', path: '/work/manage', exact: true },
        { label: 'Hồ sơ năng lực', path: '/work/manage/profile' },
        { label: 'Việc đã lưu', path: '/work/manage/saved' },
        { label: 'Hồ sơ tìm việc', path: '/work/manage/job-profile' },
      ],
    },
    {
      title: 'Tuyển dụng',
      items: [
        { label: 'Đăng việc mới', path: '/work/post' },
        { label: 'Tổ chức', path: '/work/manage/org' },
        { label: 'Dịch vụ của tôi', path: '/work/manage/services' },
        { label: 'Cuộc thi của tôi', path: '/work/manage/contests' },
      ],
    },
    {
      title: 'Tài chính & bảo vệ',
      items: [
        { label: 'Hợp đồng', path: '/work/manage/contracts' },
        { label: 'Tranh chấp', path: '/work/manage/disputes' },
        { label: 'Rút tiền', path: '/work/manage/withdraw' },
      ],
    },
  ];

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
