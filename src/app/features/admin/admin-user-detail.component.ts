import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import {
  AdminUserDetail,
  AdminUserPhone,
  ModerationStatus,
} from '../../models/marketplace.models';
import { AdminStatusFormComponent } from '../commerce/admin-moderation.components';
import { ADMIN_USER_MESSAGES } from './admin-user.messages';
import { ADMIN_DISPUTE_MESSAGES } from './admin-disputes.messages';
import { adminHttpError } from './admin-http';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, CurrencyPipe, TPipe, AdminStatusFormComponent],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: './admin-user-detail.component.scss',
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);

  readonly item = signal<AdminUserDetail | null>(null);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly isSelf = signal(false);
  readonly loading = signal(true);

  constructor() {
    this.i18n.extend(ADMIN_USER_MESSAGES);
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.user.title') });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.adminUser(id).subscribe({
      next: (u) => {
        this.item.set(u);
        this.isSelf.set(this.auth.user()?.id === u.id);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(adminHttpError(err, this.i18n.t('admin.user.loadError')));
        this.loading.set(false);
      },
    });
  }

  initial(name: string): string {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  roleLabel(role: string): string {
    return this.lookup(`admin.user.role.${role}`, role);
  }

  statusLabel(s: string): string {
    return this.lookup(`admin.user.status.${s}`, s);
  }

  disputeLabel(s: string): string {
    return this.lookup(`admin.dispute.status.${s}`, s);
  }

  phoneSource(phone: AdminUserPhone): string {
    return this.lookup(`admin.user.phoneSource.${phone.source}`, phone.source);
  }

  kycStatus(status: string): string {
    return this.lookup(`kyc.status.${status}`, status);
  }

  kycSubject(subject: string | undefined): string {
    if (!subject) return '';
    return this.lookup(`kyc.subject.${subject}`, subject);
  }

  orderRole(role: string): string {
    return this.lookup(`admin.user.orderRole.${role}`, role);
  }

  licenseStatus(status: string): string {
    return this.lookup(`admin.user.lic.${status}`, status);
  }

  orderStatus(status: string): string {
    return this.lookup(`bhub.order.status.${status}`, status);
  }

  shopHref(u: AdminUserDetail): string | null {
    if (u.links?.shop) return u.links.shop;
    return u.creatorSlug ? `/store/${u.creatorSlug}` : null;
  }

  save(body: { status: ModerationStatus; days?: number; reason?: string }): void {
    const u = this.item();
    if (!u) return;
    this.actionError.set('');
    this.api.updateUserStatus(u.id, body).subscribe({
      next: (next) => this.item.set({ ...u, ...next }),
      error: (err) => this.actionError.set(adminHttpError(err, this.i18n.t('admin.user.actionError'))),
    });
  }

  remove(): void {
    const u = this.item();
    if (!u) return;
    this.actionError.set('');
    this.api.deleteUser(u.id).subscribe({
      next: () => void this.router.navigateByUrl('/admin'),
      error: (err) => this.actionError.set(adminHttpError(err, this.i18n.t('admin.user.actionError'))),
    });
  }

  private lookup(key: string, fallback: string): string {
    const text = this.i18n.t(key);
    return text === key ? fallback : text;
  }
}
