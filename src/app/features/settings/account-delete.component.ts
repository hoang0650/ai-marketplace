import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AppLang } from '../../i18n/messages';

interface DeletionBlocker {
  code: string;
  count: number;
  message: string;
}
interface DeletionPreview {
  deleted: string[];
  retained: string[];
  canDelete: boolean;
  blockers: DeletionBlocker[];
  requiresPassword: boolean;
  publicRequestSlaDays: number;
  policyUrl: string;
}

const MESSAGES: Record<AppLang, Record<string, string>> = {
  vi: {
    'del.title': 'Xóa tài khoản',
    'del.lede': 'Xóa vĩnh viễn tài khoản AI Markets và dữ liệu cá nhân của bạn. Không thể hoàn tác.',
    'del.deleted': 'Sẽ bị xóa',
    'del.retained': 'Được lưu theo quy định pháp luật',
    'del.blocked': 'Cần xử lý trước khi xóa',
    'del.confirmLabel': 'Nhập XÓA để xác nhận',
    'del.password': 'Mật khẩu hiện tại',
    'del.reason': 'Lý do (không bắt buộc)',
    'del.submit': 'Xóa vĩnh viễn tài khoản',
    'del.done': 'Tài khoản của bạn đã được xóa.',
    'del.fail': 'Không thể xóa tài khoản.',
    'del.policy': 'Chính sách lưu trữ và cung cấp dữ liệu',
    'del.publicLede': 'Bạn có thể tự xóa tài khoản ngay trong ứng dụng hoặc website: Hồ sơ/Cài đặt → Xóa tài khoản. Nếu không thể đăng nhập, gửi yêu cầu bên dưới; chúng tôi xác minh danh tính và xử lý trong {{days}} ngày.',
    'del.signIn': 'Đăng nhập để xóa ngay',
    'del.email': 'Email tài khoản',
    'del.request': 'Gửi yêu cầu xóa',
    'del.requested': 'Đã nhận yêu cầu. Nếu email thuộc một tài khoản, chúng tôi sẽ gửi hướng dẫn và xử lý trong {{days}} ngày.',
    'del.retainShort': 'Đơn hàng, giao dịch, hóa đơn, khiếu nại và hồ sơ eKYC đã nộp được lưu 03 năm theo Quy chế rồi xóa; dữ liệu hồ sơ cá nhân bị xóa ngay.',
    'settings.delete': 'Xóa tài khoản',
    'settings.deleteDesc': 'Xóa vĩnh viễn tài khoản và dữ liệu cá nhân',
  },
  en: {
    'del.title': 'Delete account',
    'del.lede': 'Permanently delete your AI Markets account and personal data. This cannot be undone.',
    'del.deleted': 'Will be deleted',
    'del.retained': 'Kept as required by law',
    'del.blocked': 'Settle these first',
    'del.confirmLabel': 'Type DELETE to confirm',
    'del.password': 'Current password',
    'del.reason': 'Reason (optional)',
    'del.submit': 'Permanently delete account',
    'del.done': 'Your account has been deleted.',
    'del.fail': 'Could not delete the account.',
    'del.policy': 'Data retention policy',
    'del.publicLede': 'You can delete your account yourself in the app or on the website: Profile/Settings → Delete account. If you cannot sign in, send a request below; we verify your identity and process it within {{days}} days.',
    'del.signIn': 'Sign in to delete now',
    'del.email': 'Account email',
    'del.request': 'Send deletion request',
    'del.requested': 'Request received. If the email belongs to an account, we will email instructions and process it within {{days}} days.',
    'del.retainShort': 'Orders, transactions, invoices, complaints and submitted eKYC records are kept for 3 years as required by the marketplace rules, then deleted; profile data is deleted immediately.',
    'settings.delete': 'Delete account',
    'settings.deleteDesc': 'Permanently delete your account and personal data',
  },
  zh: {
    'del.title': '删除账户',
    'del.lede': '永久删除您的 AI Markets 账户及个人数据，此操作无法撤销。',
    'del.deleted': '将被删除',
    'del.retained': '依法保留',
    'del.blocked': '删除前需先处理',
    'del.confirmLabel': '输入 删除 或 DELETE 以确认',
    'del.password': '当前密码',
    'del.reason': '原因（选填）',
    'del.submit': '永久删除账户',
    'del.done': '您的账户已删除。',
    'del.fail': '无法删除账户。',
    'del.policy': '数据保存政策',
    'del.publicLede': '您可在应用或网站中自行删除账户：个人资料/设置 → 删除账户。如无法登录，请在下方提交申请；我们核实身份后将在 {{days}} 天内处理。',
    'del.signIn': '登录后立即删除',
    'del.email': '账户邮箱',
    'del.request': '提交删除申请',
    'del.requested': '已收到申请。如该邮箱对应账户，我们将发送说明并在 {{days}} 天内处理。',
    'del.retainShort': '订单、交易、发票、投诉及已提交的 eKYC 资料依平台规则保存 3 年后删除；个人资料立即删除。',
    'settings.delete': '删除账户',
    'settings.deleteDesc': '永久删除账户及个人数据',
  },
};

/** /settings/delete-account (signed in) and public /account/delete (Google Play deletion URL). */
@Component({
  selector: 'app-account-delete',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="container-page py-10 max-w-3xl">
      <h1 class="section-title">{{ 'del.title' | t }}</h1>
      <p class="mt-2 text-muted">{{ 'del.lede' | t }}</p>

      @if (done()) {
        <div class="panel mt-6" role="status">{{ 'del.done' | t }}</div>
      } @else if (auth.isAuthenticated()) {
        @if (preview(); as p) {
          <div class="panel mt-6">
            <h2 class="font-display text-lg">{{ 'del.deleted' | t }}</h2>
            <ul class="mt-2 list-disc pl-5 text-sm">@for (s of p.deleted; track s) { <li>{{ s }}</li> }</ul>
            <h2 class="mt-4 font-display text-lg">{{ 'del.retained' | t }}</h2>
            <ul class="mt-2 list-disc pl-5 text-sm">@for (s of p.retained; track s) { <li>{{ s }}</li> }</ul>
            <a routerLink="/legal/chinh-sach-luu-tru-va-cung-cap-du-lieu" class="mt-3 inline-block text-sm underline">{{ 'del.policy' | t }}</a>
          </div>
          @if (!p.canDelete) {
            <div class="panel mt-6 border-amber-400" role="alert">
              <h2 class="font-display text-lg">{{ 'del.blocked' | t }}</h2>
              <ul class="mt-2 list-disc pl-5 text-sm">@for (b of p.blockers; track b.code) { <li>{{ b.message }}</li> }</ul>
            </div>
          }
          <form class="panel mt-6 grid gap-3" (ngSubmit)="remove(p)">
            <label class="grid gap-1 text-sm">{{ 'del.confirmLabel' | t }}
              <input class="input" name="confirm" [(ngModel)]="confirm" autocomplete="off" />
            </label>
            @if (p.requiresPassword) {
              <label class="grid gap-1 text-sm">{{ 'del.password' | t }}
                <input class="input" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" />
              </label>
            }
            <label class="grid gap-1 text-sm">{{ 'del.reason' | t }}
              <textarea class="input" name="reason" rows="2" [(ngModel)]="reason"></textarea>
            </label>
            @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
            <button type="submit" class="btn bg-red-600 text-white" [disabled]="busy() || !p.canDelete || !confirm.trim()">
              {{ 'del.submit' | t }}
            </button>
          </form>
        } @else if (error()) {
          <p class="mt-6 text-sm text-red-600" role="alert">{{ error() }}</p>
        }
      } @else {
        <div class="panel mt-6">
          <p>{{ 'del.publicLede' | t: { days: slaDays } }}</p>
          <p class="mt-2 text-sm text-muted">{{ 'del.retainShort' | t }}</p>
          <a routerLink="/auth/login" [queryParams]="{ returnUrl: '/settings/delete-account' }" class="btn btn-fill mt-4 inline-block">{{ 'del.signIn' | t }}</a>
        </div>
        <form class="panel mt-6 grid gap-3" (ngSubmit)="request()">
          <label class="grid gap-1 text-sm">{{ 'del.email' | t }}
            <input class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </label>
          <label class="grid gap-1 text-sm">{{ 'del.reason' | t }}
            <textarea class="input" name="reason" rows="2" [(ngModel)]="reason"></textarea>
          </label>
          @if (error()) { <p class="text-sm text-red-600" role="alert">{{ error() }}</p> }
          @if (requested()) { <p class="text-sm" role="status">{{ 'del.requested' | t: { days: slaDays } }}</p> }
          <button type="submit" class="btn" [disabled]="busy() || !email.trim()">{{ 'del.request' | t }}</button>
          <a routerLink="/legal/chinh-sach-luu-tru-va-cung-cap-du-lieu" class="text-sm underline">{{ 'del.policy' | t }}</a>
        </form>
      }
    </section>
  `,
})
export class AccountDeleteComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/account`;

  readonly preview = signal<DeletionPreview | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly done = signal(false);
  readonly requested = signal(false);
  readonly slaDays = 30;
  confirm = '';
  password = '';
  reason = '';
  email = '';

  constructor() {
    this.i18n.extend(MESSAGES);
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.http.get<DeletionPreview>(`${this.base}/deletion`, { withCredentials: true }).subscribe({
        next: (p) => this.preview.set(p),
        error: (err) => this.error.set(err?.error?.message || this.i18n.t('del.fail')),
      });
    }
  }

  remove(p: DeletionPreview): void {
    if (!p.canDelete || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const body = { confirm: this.confirm, password: this.password, reason: this.reason, source: 'web' };
    this.http.post(`${this.base}/deletion`, body, { withCredentials: true }).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        this.auth.clearSession();
        setTimeout(() => void this.router.navigateByUrl('/'), 2500);
      },
      error: (err) => {
        this.busy.set(false);
        const blockers = err?.error?.blockers as DeletionBlocker[] | undefined;
        if (blockers?.length) this.preview.set({ ...p, canDelete: false, blockers });
        this.error.set(err?.error?.message || this.i18n.t('del.fail'));
      },
    });
  }

  request(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http.post(`${this.base}/deletion-requests`, { email: this.email.trim(), reason: this.reason }).subscribe({
      next: () => {
        this.busy.set(false);
        this.requested.set(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || this.i18n.t('del.fail'));
      },
    });
  }
}
