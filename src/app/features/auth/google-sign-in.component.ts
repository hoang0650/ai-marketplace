import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google-auth.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

function afterAuthRoute(user: User): string {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'creator') return '/dashboard';
  return '/marketplace';
}

@Component({
  selector: 'app-google-sign-in',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="auth-oauth" [class.auth-oauth--compact]="compact()">
      @if (divider() === 'top') {
        <div class="auth-oauth__divider"><span>{{ 'auth.or' | t }}</span></div>
      }
      <button
        type="button"
        class="auth-oauth__google"
        [disabled]="busy()"
        [attr.title]="!ready() ? ('auth.googleUnavailable' | t) : null"
        (click)="signIn()"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {{ compact() ? ('auth.googleShort' | t) : ('auth.google' | t) }}
      </button>
      @if (divider() === 'bottom') {
        <div class="auth-oauth__divider auth-oauth__divider--bottom"><span>{{ 'auth.or' | t }}</span></div>
      }
      @if (error()) {
        <p class="auth-oauth__err">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .auth-oauth {
        margin-top: 1rem;
      }
      .auth-oauth--compact {
        margin-top: 0;
      }
      .auth-oauth__divider {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
        color: var(--color-muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .auth-oauth__divider--bottom {
        margin-bottom: 0;
        margin-top: 1rem;
      }
      .auth-oauth__divider::before,
      .auth-oauth__divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--color-line);
      }
      .auth-oauth__google {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        padding: 0.65rem 1rem;
        border: 1px solid var(--color-line);
        border-radius: 10px;
        background: var(--color-surface);
        color: var(--color-ink);
        font: inherit;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .auth-oauth--compact .auth-oauth__google {
        width: auto;
        padding: 0.45rem 0.85rem;
        font-size: 0.82rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .auth-oauth__google:hover:not(:disabled) {
        border-color: #dadce0;
        box-shadow: 0 1px 3px rgba(60, 64, 67, 0.12);
      }
      .auth-oauth__google:disabled {
        opacity: 0.65;
        cursor: wait;
      }
      .auth-oauth__err {
        margin: 0.55rem 0 0;
        font-size: 0.82rem;
        color: #dc2626;
      }
      .auth-oauth--compact .auth-oauth__err {
        position: absolute;
        right: 0;
        top: calc(100% + 0.35rem);
        min-width: 14rem;
        padding: 0.45rem 0.6rem;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #fecaca;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        z-index: 20;
      }
    `,
  ],
})
export class GoogleSignInComponent implements OnInit {
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  /** Compact pill for header nav. */
  readonly compact = input(false);
  readonly divider = input<'top' | 'bottom' | 'none'>('bottom');
  /** Navigate after sign-in when true (header). */
  readonly redirect = input(false);

  readonly signedIn = output<User>();
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.googleAuth.getConfig().subscribe((cfg) => this.ready.set(cfg.enabled));
  }

  signIn(): void {
    this.error.set('');
    if (!this.ready()) {
      this.error.set(this.i18n.t('auth.googleUnavailable'));
      return;
    }
    this.busy.set(true);
    this.googleAuth.signIn().subscribe({
      next: (result) => {
        this.auth.loginWithGoogle(result).subscribe({
          next: (user) => {
            this.busy.set(false);
            this.signedIn.emit(user);
            if (this.redirect()) {
              void this.router.navigateByUrl(afterAuthRoute(user));
            }
          },
          error: (err) => {
            this.busy.set(false);
            this.error.set(err?.error?.message || this.i18n.t('auth.googleFail'));
          },
        });
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.message || this.i18n.t('auth.googleFail'));
      },
    });
  }
}
