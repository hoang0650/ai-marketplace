import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './settings-shell.component.html',
  styleUrl: './settings-shell.component.scss',
})
export class SettingsShellComponent {
  readonly auth = inject(AuthService);
  readonly brand = environment.brandName;

  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const role = this.auth.user()?.role;
    if (role === 'admin') return 'Admin';
    if (role === 'creator') return 'Người bán';
    return 'Thành viên';
  });

  readonly links = [
    {
      path: '/settings/profile',
      title: 'Thông tin hồ sơ',
      desc: 'Quản lý thông tin của tài khoản',
      icon: '👤',
    },
    {
      path: '/settings/activity',
      title: 'Lịch sử hoạt động',
      desc: 'Xem các hoạt động của tài khoản',
      icon: '🕒',
    },
    {
      path: '/settings/security',
      title: 'Bảo mật',
      desc: 'Mật khẩu, 2FA, phiên đăng nhập',
      icon: '🛡',
    },
    {
      path: '/settings/notifications',
      title: 'Kênh thông báo',
      desc: 'Xem nơi nhận cập nhật tài khoản',
      icon: '📣',
    },
    {
      path: '/settings/connections',
      title: 'Liên kết tài khoản',
      desc: 'Kết nối với các nền tảng khác',
      icon: '🔗',
    },
    {
      path: '/settings/feed',
      title: 'Feed',
      desc: 'Cá nhân hóa và quyền riêng tư',
      icon: '▦',
    },
  ];
}
