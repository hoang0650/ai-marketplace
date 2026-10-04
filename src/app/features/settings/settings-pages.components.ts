import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { AccountExtrasService } from './account-extras.service';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AccountActivityItem, CurrentSessionInfo } from '../../models/marketplace.models';

const BASE_STYLES = `
  h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
  .lede { margin: .35rem 0 1.1rem; color: #777; }
  h2 { margin: 0 0 .3rem; font-size: 1rem; display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; }
  p { margin: 0; color: #777; font-size: .88rem; line-height: 1.45; }
  .block { padding: 1rem 0; border-top: 1px solid #f0f0f0; }
  .block__head { display: flex; justify-content: space-between; gap: .75rem; align-items: flex-start; margin-bottom: .6rem; }
  .pill { font-style: normal; font-size: .72rem; font-weight: 800; color: #888; background: #f3f4f6; border-radius: 999px; padding: .12rem .45rem; }
  .pill.on { color: #15803d; background: #e8f8ef; }
  .btn-dark, .btn-ghost, .link { font: inherit; font-weight: 800; cursor: pointer; border-radius: 10px; text-decoration: none; }
  .btn-dark { border: 0; background: #171717; color: #fff; min-height: 2.4rem; padding: 0 1rem; }
  .btn-ghost { border: 1px solid #ddd; background: #fff; color: #222; min-height: 2.35rem; padding: 0 .9rem; display: inline-flex; align-items: center; white-space: nowrap; font-size: .85rem; }
  .btn-dark:disabled, .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .link { border: 0; background: transparent; color: #666; font-size: .85rem; }
  .toast { margin-top: 1rem; color: #15803d; font-size: .88rem; }
  .toast.error { color: #c62828; }
`;

abstract class Flash {
  readonly msg = signal('');
  readonly error = signal(false);
  protected flash(text: string, isError = false): void {
    this.msg.set(text);
    this.error.set(isError);
  }
}

@Component({
  selector: 'app-settings-activity',
  standalone: true,
  imports: [TPipe, DatePipe],
  template: `
    <header class="block__head">
      <div>
        <h1>{{ 'settings.activity' | t }}</h1>
        <p class="lede">{{ 'set.activity.lede' | t }}</p>
      </div>
      <button type="button" class="btn-ghost" (click)="reload()" [disabled]="loading()">{{ 'set.reload' | t }}</button>
    </header>
    <ul class="timeline">
      @for (e of items(); track e.type + e.at) {
        <li>
          <strong>{{ 'set.activity.' + e.type | t }}</strong>
          <span>{{ e.at | date: 'dd/MM/yyyy HH:mm' }}@if (e.ip) { · IP {{ e.ip }} }</span>
        </li>
      } @empty {
        @if (!loading()) {
          <li class="empty">{{ 'set.activity.empty' | t }}</li>
        }
      }
    </ul>
  `,
  styles: `
    ${BASE_STYLES}
    .timeline { list-style: none; margin: 0; padding: 0; border-top: 1px solid #f0f0f0; }
    .timeline li { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem 0; border-bottom: 1px solid #f5f5f5; font-size: .9rem; }
    .timeline span { color: #888; font-size: .82rem; white-space: nowrap; }
    .timeline .empty { color: #999; border: 0; }
    @media (max-width: 720px) { .timeline li { flex-direction: column; gap: .2rem; } }
  `,
})
export class SettingsActivityComponent implements OnInit {
  private readonly api = inject(AccountExtrasService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly items = signal<AccountActivityItem[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('settings.activity') });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.activity().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

@Component({
  selector: 'app-settings-security',
  standalone: true,
  imports: [FormsModule, TPipe, DatePipe],
  template: `
    <h1>{{ 'settings.security' | t }}</h1>
    <p class="lede">{{ 'set.sec.lede' | t }}</p>

    <section class="block">
      <h2>{{ 'set.sec.password' | t }}</h2>
      <p>{{ (hasPassword() ? 'set.sec.passwordChangeDesc' : 'set.sec.passwordSetDesc') | t }}</p>
      <form class="pw" (ngSubmit)="savePassword()">
        @if (hasPassword()) {
          <label>
            <span>{{ 'set.sec.current' | t }}</span>
            <input type="password" [(ngModel)]="current" name="current" autocomplete="current-password" required />
          </label>
        }
        <label>
          <span>{{ 'set.sec.new' | t }}</span>
          <input type="password" [(ngModel)]="next" name="next" autocomplete="new-password" minlength="8" maxlength="128" required />
        </label>
        <label>
          <span>{{ 'set.sec.confirm' | t }}</span>
          <input type="password" [(ngModel)]="confirm" name="confirm" autocomplete="new-password" required />
        </label>
        <div>
          <button type="submit" class="btn-dark" [disabled]="busy()">
            {{ busy() ? ('set.saving' | t) : ((hasPassword() ? 'set.sec.change' : 'set.sec.create') | t) }}
          </button>
        </div>
      </form>
    </section>

    <section class="block row">
      <div>
        <h2>{{ 'set.sec.2fa' | t }} <em class="pill">{{ 'set.soon' | t }}</em></h2>
        <p>{{ 'set.sec.2faDesc' | t }}</p>
      </div>
    </section>

    <section class="block">
      <div class="block__head">
        <h2>{{ 'set.sec.sessions' | t }}</h2>
        <button type="button" class="link" (click)="loadSession()">{{ 'set.reload' | t }}</button>
      </div>
      <div class="session">
        <div>
          <strong>{{ deviceLabel() }} · {{ 'set.sec.thisDevice' | t }}</strong>
          @if (session()?.lastLogin) {
            <p>
              {{ 'set.sec.lastLogin' | t: { date: (session()!.lastLogin | date: 'dd/MM/yyyy HH:mm') || '' } }}
              @if (session()?.lastLoginIp) { · IP {{ session()?.lastLoginIp }} }
            </p>
          }
        </div>
        <button type="button" class="btn-ghost" [disabled]="busy()" (click)="revokeAll()">{{ 'set.sec.revokeAll' | t }}</button>
      </div>
    </section>

    @if (msg()) {
      <p class="toast" [class.error]="error()" role="status">{{ msg() }}</p>
    }
  `,
  styles: `
    ${BASE_STYLES}
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .pw { display: grid; gap: .7rem; max-width: 26rem; margin-top: .85rem; }
    label { display: grid; gap: .35rem; font-size: .85rem; font-weight: 700; }
    input { border: 1px solid #e5e5e5; border-radius: 10px; padding: .7rem .8rem; font: inherit; font-weight: 500; }
    .session { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .85rem; border: 1px solid #ececec; border-radius: 12px; }
    .session strong { display: block; font-size: .92rem; }
    .session p { margin-top: .2rem; }
    @media (max-width: 720px) { .row, .session { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SettingsSecurityComponent extends Flash implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(AccountExtrasService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);

  readonly busy = signal(false);
  readonly session = signal<CurrentSessionInfo | null>(null);
  readonly hasPassword = computed(() => !!this.auth.user()?.hasPassword);
  readonly deviceLabel = computed(() => describeAgent(this.session()?.userAgent || globalThis.navigator?.userAgent || ''));
  current = '';
  next = '';
  confirm = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('settings.security') });
    this.loadSession();
  }

  loadSession(): void {
    this.api.currentSession().subscribe({ next: (s) => this.session.set(s), error: () => undefined });
  }

  savePassword(): void {
    if (this.next.length < 8 || this.next.length > 128) return this.flash(this.i18n.t('set.sec.length'), true);
    if (this.next !== this.confirm) return this.flash(this.i18n.t('set.sec.mismatch'), true);
    this.busy.set(true);
    const body: Record<string, string> = { newPassword: this.next, confirmPassword: this.confirm };
    if (this.hasPassword()) body['currentPassword'] = this.current;
    this.auth.rotateSession('password', body).subscribe({
      next: () => {
        this.busy.set(false);
        this.current = this.next = this.confirm = '';
        this.flash(this.i18n.t('set.sec.changed'));
      },
      error: (err) => {
        this.busy.set(false);
        this.flash(err?.error?.message || this.i18n.t('set.saveFail'), true);
      },
    });
  }

  revokeAll(): void {
    if (!globalThis.confirm?.(this.i18n.t('set.sec.revokeConfirm'))) return;
    this.busy.set(true);
    this.auth.rotateSession('sessions/revoke-all').subscribe({
      next: () => {
        this.busy.set(false);
        this.flash(this.i18n.t('set.sec.revoked'));
        this.loadSession();
      },
      error: (err) => {
        this.busy.set(false);
        this.flash(err?.error?.message || this.i18n.t('set.saveFail'), true);
      },
    });
  }
}

function describeAgent(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <h1>{{ 'settings.noti' | t }}</h1>
    <p class="lede">{{ 'set.noti.lede' | t }}</p>

    <article class="card">
      <div class="left">
        <span class="icon">📬</span>
        <div>
          <strong>{{ 'set.noti.inbox' | t: { brand: brand } }}</strong>
          <em class="pill on">{{ 'set.noti.always' | t }}</em>
          <p>{{ 'set.noti.inboxDesc' | t }}</p>
        </div>
      </div>
      <a routerLink="/notifications" class="btn-ghost">{{ 'set.noti.inboxOpen' | t }}</a>
    </article>

    <article class="card">
      <div class="left">
        <span class="icon">✉️</span>
        <div>
          <strong>{{ 'set.noti.email' | t }}</strong>
          <em class="pill on">{{ 'set.noti.always' | t }}</em>
          <p>{{ 'set.noti.emailDesc' | t: { email: auth.user()?.email || '' } }}</p>
          <p>{{ 'set.noti.lang' | t: { lang: langLabel() } }}</p>
        </div>
      </div>
      <a routerLink="/settings/profile" class="btn-ghost">{{ 'set.noti.langEdit' | t }}</a>
    </article>

    <article class="card">
      <div class="left">
        <span class="icon">✈️</span>
        <div>
          <strong>Telegram</strong>
          <em class="pill">{{ 'set.soon' | t }}</em>
          <p>{{ 'set.noti.telegramDesc' | t }}</p>
        </div>
      </div>
    </article>
  `,
  styles: `
    ${BASE_STYLES}
    .card { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 1rem 0; border-top: 1px solid #f0f0f0; }
    .left { display: flex; gap: .8rem; }
    .icon { flex: none; width: 2.4rem; height: 2.4rem; border-radius: 10px; background: #f5f5f5; display: grid; place-items: center; }
    strong { display: block; font-size: .95rem; }
    .pill { display: inline-block; margin-top: .2rem; }
    p { margin-top: .35rem; font-size: .85rem; }
    @media (max-width: 720px) { .card { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SettingsNotificationsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly brand = environment.brandName;
  readonly langLabel = computed(() => {
    const lang = this.auth.user()?.profile?.notifyLang || 'vi';
    return lang === 'en' ? 'English' : lang === 'zh' ? '中文' : 'Tiếng Việt';
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('settings.noti') });
  }
}

@Component({
  selector: 'app-settings-connections',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <h1>{{ 'settings.conn' | t }}</h1>
    <p class="lede">{{ 'set.conn.lede' | t }}</p>

    <section class="block">
      <div class="block__head">
        <h2>
          {{ 'set.conn.google' | t }}
          <em class="pill" [class.on]="googleLinked()">{{ (googleLinked() ? 'set.connected' : 'set.notConnected') | t }}</em>
        </h2>
        <button type="button" class="link" (click)="reload()">{{ 'set.reload' | t }}</button>
      </div>
      @if (googleLinked()) {
        <p>{{ 'set.conn.googleOn' | t: { email: auth.user()?.email || '' } }}</p>
        @if (auth.user()?.hasPassword) {
          <button type="button" class="btn-ghost mt" [disabled]="busy()" (click)="unlinkGoogle()">{{ 'set.conn.unlink' | t }}</button>
        } @else {
          <p class="warn">{{ 'set.conn.needPassword' | t }}</p>
          <a routerLink="/settings/security" class="btn-ghost mt">{{ 'set.conn.toSecurity' | t }}</a>
        }
      } @else {
        <p>{{ 'set.conn.googleOff' | t: { email: auth.user()?.email || '' } }}</p>
      }
    </section>

    <section class="block">
      <h2>{{ 'set.conn.telegram' | t }} <em class="pill">{{ 'set.soon' | t }}</em></h2>
      <p>{{ 'set.noti.telegramDesc' | t }}</p>
    </section>

    @if (msg()) {
      <p class="toast" [class.error]="error()" role="status">{{ msg() }}</p>
    }
  `,
  styles: `
    ${BASE_STYLES}
    .warn { color: #b45309; margin-top: .4rem; }
    .mt { margin-top: .7rem; }
  `,
})
export class SettingsConnectionsComponent extends Flash implements OnInit {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly busy = signal(false);
  readonly googleLinked = computed(() => !!this.auth.user()?.googleLinked);

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('settings.conn') });
    this.reload();
  }

  reload(): void {
    this.auth.refreshMe().subscribe();
  }

  unlinkGoogle(): void {
    if (!globalThis.confirm?.(this.i18n.t('set.conn.unlinkConfirm'))) return;
    this.busy.set(true);
    this.auth.unlinkGoogle().subscribe({
      next: () => {
        this.busy.set(false);
        this.flash(this.i18n.t('set.conn.unlinked'));
      },
      error: (err) => {
        this.busy.set(false);
        this.flash(err?.error?.message || this.i18n.t('set.saveFail'), true);
      },
    });
  }
}

@Component({
  selector: 'app-settings-feed',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <h1>{{ 'set.feed.title' | t }}</h1>
    <p class="lede">{{ 'set.feed.lede' | t }}</p>

    <section class="card">
      <div class="row">
        <div>
          <strong>{{ 'set.feed.content' | t }}</strong>
          <p>{{ 'set.feed.contentDesc' | t }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" [(ngModel)]="personalizeContent" name="pc" [disabled]="busy()" (ngModelChange)="persist()" />
        </label>
      </div>
      <div class="row">
        <div>
          <strong>{{ 'set.feed.ads' | t }}</strong>
          <p>{{ 'set.feed.adsDesc' | t }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" [(ngModel)]="personalizeAds" name="pa" [disabled]="busy()" (ngModelChange)="persist()" />
        </label>
      </div>
    </section>
    @if (msg()) {
      <p class="toast" [class.error]="error()" role="status">{{ msg() }}</p>
    }
  `,
  styles: `
    ${BASE_STYLES}
    .card { border: 1px solid #ececec; border-radius: 14px; padding: .35rem 1rem; margin-bottom: .85rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .9rem 0; }
    .row + .row { border-top: 1px solid #f0f0f0; }
    strong { display: block; font-size: .95rem; }
    p { margin-top: .25rem; font-size: .85rem; }
    .switch input { width: 2.6rem; height: 1.35rem; accent-color: #e53935; }
    @media (max-width: 720px) { .row { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SettingsFeedComponent extends Flash implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  readonly busy = signal(false);
  personalizeContent = false;
  personalizeAds = false;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('set.feed.title') });
    this.sync();
  }

  persist(): void {
    this.busy.set(true);
    this.auth
      .updateProfile({
        preferences: { personalizeContent: this.personalizeContent, personalizeAds: this.personalizeAds },
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.flash(this.i18n.t('set.feed.saved'));
        },
        error: (err) => {
          this.busy.set(false);
          this.sync();
          this.flash(err?.error?.message || this.i18n.t('set.saveFail'), true);
        },
      });
  }

  private sync(): void {
    const prefs = this.auth.user()?.preferences;
    this.personalizeContent = !!prefs?.personalizeContent;
    this.personalizeAds = !!prefs?.personalizeAds;
  }
}
