import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { User } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { GoogleSignInComponent } from './google-sign-in.component';
import { environment } from '../../../environments/environment';

function afterAuthRoute(user: User, returnUrl?: string | null): string {
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
  if (user.role === 'admin') return '/admin';
  if (user.role === 'creator') return '/dashboard';
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
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly brand = environment.brandName;
  name = '';
  email = '';
  password = '';
  asCreator = false;
  agreed = false;
  showPassword = false;
  readonly error = signal('');
  readonly loading = signal(false);

  constructor() {
    this.seo.set({ title: this.i18n.t('auth.register') });
    const authed = this.auth.user();
    if (this.auth.isAuthenticated() && authed) {
      void this.router.navigateByUrl(afterAuthRoute(authed));
    }
  }

  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    if (!this.agreed) {
      this.error.set(this.i18n.t('auth.mustAgree'));
      return;
    }
    this.loading.set(true);
    this.auth
      .register({ email: this.email, name: this.name, password: this.password, asCreator: this.asCreator })
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
