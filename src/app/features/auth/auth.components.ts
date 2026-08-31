import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { User } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { GoogleSignInComponent } from './google-sign-in.component';
import { environment } from '../../../environments/environment';

function afterAuthRoute(user: User): string {
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
  }

  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: (user) => void this.router.navigateByUrl(afterAuthRoute(user)),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || this.i18n.t('auth.invalid'));
      },
    });
  }

  onGoogleSignedIn(user: User): void {
    void this.router.navigateByUrl(afterAuthRoute(user));
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
