import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { User, SignupRole } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { GoogleSignInComponent } from './google-sign-in.component';
import { environment } from '../../../environments/environment';

function afterAuthRoute(user: User, returnUrl?: string | null): string {
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
  if (user.role === 'admin') return '/admin';
  if (user.role === 'seller') return '/dashboard';
  if (user.role === 'talent') return '/work/talents';
  if (user.role === 'freelancer') return '/work/manage/contracts';
  if (user.role === 'employer') return '/work/manage';
  return '/marketplace';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, TPipe, GoogleSignInComponent],
  templateUrl: './auth-login.component.html',
  styleUrl: './auth-page.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly brand = environment.brandName;
  email = '';
  password = '';
  showPassword = false;
  readonly error = signal('');
  readonly loading = signal(false);

  constructor() {
    this.seo.set({ title: this.i18n.t('auth.login') });
    const authed = this.auth.user();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (this.auth.isAuthenticated() && authed) {
      void this.router.navigateByUrl(afterAuthRoute(authed, returnUrl));
      return;
    }
    const q = this.route.snapshot.queryParamMap;
    if (q.get('google') === 'error') {
      this.error.set(q.get('message') || this.i18n.t('auth.googleFail'));
    }
  }

  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: (user) =>
        void this.router.navigateByUrl(afterAuthRoute(user, this.route.snapshot.queryParamMap.get('returnUrl'))),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || this.i18n.t('auth.invalid'));
      },
    });
  }

  onGoogleSignedIn(user: User): void {
    void this.router.navigateByUrl(afterAuthRoute(user, this.route.snapshot.queryParamMap.get('returnUrl')));
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, TPipe, GoogleSignInComponent],
  templateUrl: './auth-register.component.html',
  styleUrl: './auth-page.scss',
})
export class RegisterComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly brand = environment.brandName;
  readonly roles: SignupRole[] = ['buyer', 'seller', 'talent', 'freelancer', 'employer'];
  readonly role = signal<SignupRole>('buyer');
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreed = false;
  showPassword = false;
  readonly error = signal('');
  readonly loading = signal(false);
  /** Set when the form was prefilled from Google — sent to link the account. */
  readonly googleSignupToken = signal('');
  readonly googleLoaded = signal(false);
  private googleEmail = '';

  constructor() {
    this.seo.set({ title: this.i18n.t('auth.register') });
    const authed = this.auth.user();
    if (this.auth.isAuthenticated() && authed) {
      void this.router.navigateByUrl(afterAuthRoute(authed));
    }
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    // Google redirect back to /auth/register?google=prefill&email=&name=&googleSignupToken=
    if (q.get('google') === 'prefill') {
      this.applyPrefill({
        email: q.get('email') || '',
        name: q.get('name') || '',
        avatarUrl: q.get('avatar') || '',
        googleSignupToken: q.get('googleSignupToken') || '',
        hasAccount: false,
      });
      return;
    }
    if (q.get('google') === 'error') {
      this.error.set(q.get('message') || this.i18n.t('auth.googlePrefillFail'));
    }
  }

  applyPrefill(p: { email?: string; name?: string; avatarUrl?: string; googleSignupToken?: string; hasAccount?: boolean }): void {
    if (p.email) this.email = p.email;
    if (p.name) this.name = p.name;
    if (p.googleSignupToken) this.googleSignupToken.set(p.googleSignupToken);
    this.googleLoaded.set(!!p.googleSignupToken);
    this.googleEmail = (p.email || '').trim().toLowerCase();
    if (p.hasAccount) this.error.set(this.i18n.t('auth.haveAccount'));
  }

  /** Google token is bound to the prefilled email — drop it if the user edits the email. */
  onEmailChange(): void {
    if (this.googleSignupToken() && this.googleEmail && this.email.trim().toLowerCase() !== this.googleEmail) {
      this.googleSignupToken.set('');
      this.googleLoaded.set(false);
    }
  }

  clearGoogle(): void {
    this.googleSignupToken.set('');
    this.googleLoaded.set(false);
    this.email = '';
    this.name = '';
  }

  chooseRole(role: SignupRole): void {
    this.role.set(role);
  }

  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    if (!this.agreed) {
      this.error.set(this.i18n.t('auth.mustAgree'));
      return;
    }
    if (!this.role()) {
      this.error.set(this.i18n.t('auth.roleRequired'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    this.loading.set(true);
    this.auth
      .register({
        email: this.email,
        name: this.name,
        password: this.password,
        confirmPassword: this.confirmPassword,
        role: this.role(),
        googleSignupToken: this.googleSignupToken() || undefined,
      })
      .subscribe({
        next: (user) => void this.router.navigateByUrl(afterAuthRoute(user)),
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || this.i18n.t('auth.registerFail'));
        },
      });
  }

  onGoogleSignedIn(user: User): void {
    void this.router.navigateByUrl(afterAuthRoute(user));
  }
}
