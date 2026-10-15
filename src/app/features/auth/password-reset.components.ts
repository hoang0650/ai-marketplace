import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';


/** /auth/forgot-password — request a reset link (always the same answer; no account enumeration). */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  styleUrl: './auth-page.scss',
  template: `
<div class="auth-page route-enter">
  <div class="auth-page__layout">
    <aside class="auth-page__aside">
      <a routerLink="/" class="auth-page__brand">
        <img src="/brand/ai-markets-icon.svg" alt="" class="auth-page__brand-icon" width="44" height="44" />
        <span class="auth-page__brand-text">AI Markets</span>
      </a>
      <h1>{{ 'auth.forgotTitle' | t }}</h1>
    </aside>
    <div class="auth-page__card">
      <div class="auth-page__mobile-head"><h1>{{ 'auth.forgotTitle' | t }}</h1></div>
      <p>{{ 'auth.forgotLead' | t }}</p>
     @if (sent()) {
       <div class="auth-alert" role="status" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0">{{ 'auth.forgotSent' | t }}</div>
     } @else {
       <form class="auth-form" (ngSubmit)="submit()">
         <div class="auth-field">
           <label for="fp-email">{{ 'auth.email' | t }}</label>
           <input id="fp-email" type="email" name="email" [(ngModel)]="email" required autocomplete="email" [placeholder]="'auth.emailPh' | t" />
         </div>
         @if (error()) { <div class="auth-alert" role="alert">{{ error() }}</div> }
         <button class="auth-submit" type="submit" [disabled]="loading() || !email">{{ loading() ? ('auth.loading' | t) : ('auth.forgotSend' | t) }}</button>
       </form>
     }
      <p class="auth-page__foot"><a routerLink="/auth/login">{{ 'auth.backToLogin' | t }}</a></p>
    </div>
  </div>
</div>`,
})
export class ForgotPasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') || '';
  readonly sent = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    inject(SeoService).set({ title: this.i18n.t('auth.forgotTitle') });
  }

  submit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || this.i18n.t('auth.resetInvalid'));
      },
    });
  }
}

/** /reset-password?token=… — link target of the reset email. */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  styleUrl: './auth-page.scss',
  template: `
<div class="auth-page route-enter">
  <div class="auth-page__layout">
    <aside class="auth-page__aside">
      <a routerLink="/" class="auth-page__brand">
        <img src="/brand/ai-markets-icon.svg" alt="" class="auth-page__brand-icon" width="44" height="44" />
        <span class="auth-page__brand-text">AI Markets</span>
      </a>
      <h1>{{ 'auth.resetTitle' | t }}</h1>
    </aside>
    <div class="auth-page__card">
      <div class="auth-page__mobile-head"><h1>{{ 'auth.resetTitle' | t }}</h1></div>
      @if (!token) {
       <div class="auth-alert" role="alert">{{ 'auth.resetInvalid' | t }}</div>
       <p class="auth-page__foot"><a routerLink="/auth/forgot-password">{{ 'auth.forgot' | t }}</a></p>
     } @else {
       <form class="auth-form" (ngSubmit)="submit()">
         <div class="auth-field">
           <label for="rp-new">{{ 'auth.newPassword' | t }}</label>
           <input id="rp-new" type="password" name="pw" [(ngModel)]="password" required minlength="8" maxlength="128" autocomplete="new-password" />
         </div>
         <div class="auth-field">
           <label for="rp-confirm">{{ 'auth.confirmPassword' | t }}</label>
           <input id="rp-confirm" type="password" name="pw2" [(ngModel)]="confirm" required autocomplete="new-password" />
         </div>
         @if (error()) { <div class="auth-alert" role="alert">{{ error() }}</div> }
         <button class="auth-submit" type="submit" [disabled]="loading()">{{ loading() ? ('auth.loading' | t) : ('auth.resetSubmit' | t) }}</button>
       </form>
     }
      <p class="auth-page__foot"><a routerLink="/auth/login">{{ 'auth.backToLogin' | t }}</a></p>
    </div>
  </div>
</div>`,
})
export class ResetPasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') || '';
  password = '';
  confirm = '';
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    inject(SeoService).set({ title: this.i18n.t('auth.resetTitle') });
  }

  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    if (this.password.length < 8 || this.password.length > 128) return this.error.set(this.i18n.t('auth.pwLength'));
    if (this.password !== this.confirm) return this.error.set(this.i18n.t('auth.pwMismatch'));
    this.loading.set(true);
    this.http
      .post(`${environment.apiUrl}/auth/reset-password`, { token: this.token, newPassword: this.password, confirmPassword: this.confirm })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/auth/login'], { queryParams: { reset: '1' } });
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.code === 'RESET_INVALID' ? this.i18n.t('auth.resetInvalid') : err?.error?.message || this.i18n.t('auth.resetInvalid'));
        },
      });
  }
}
