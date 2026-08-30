import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
  templateUrl: './settings-shell.component.html',
  styleUrl: './settings-shell.component.scss',
})
export class SettingsShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly brand = environment.brandName;

  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    this.i18n.lang();
    const role = this.auth.user()?.role;
    if (role === 'admin') return this.i18n.t('role.admin');
    if (role === 'creator') return this.i18n.t('role.seller');
    return this.i18n.t('role.member');
  });

  readonly links = computed(() => {
    this.i18n.lang();
    return [
      { path: '/settings/profile', title: this.i18n.t('settings.profile'), desc: this.i18n.t('settings.profileDesc'), icon: '👤' },
      { path: '/settings/activity', title: this.i18n.t('settings.activity'), desc: this.i18n.t('settings.activityDesc'), icon: '🕒' },
      { path: '/settings/security', title: this.i18n.t('settings.security'), desc: this.i18n.t('settings.securityDesc'), icon: '🛡' },
      { path: '/settings/notifications', title: this.i18n.t('settings.noti'), desc: this.i18n.t('settings.notiDesc'), icon: '📣' },
      { path: '/settings/connections', title: this.i18n.t('settings.conn'), desc: this.i18n.t('settings.connDesc'), icon: '🔗' },
      { path: '/settings/feed', title: this.i18n.t('settings.feed'), desc: this.i18n.t('settings.feedDesc'), icon: '▦' },
    ];
  });
}
