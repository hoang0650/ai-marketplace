import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="page route-enter mx-auto max-w-md">
      <h1 class="section-title">{{ 'auth.login' | t }}</h1>
      <p class="mt-2 text-sm text-muted">{{ 'auth.loginHint' | t }}</p>
      <form class="mt-8 grid gap-3" (ngSubmit)="submit()">
        <input class="input" type="email" name="email" [(ngModel)]="email" required [placeholder]="'auth.email' | t" />
        <input class="input" type="password" name="password" [(ngModel)]="password" required [placeholder]="'auth.password' | t" />
        @if (error()) { <p class="text-sm text-red-500">{{ error() }}</p> }
        <button class="btn btn-fill" type="submit">{{ 'auth.continue' | t }}</button>
      </form>
      <p class="mt-4 text-sm text-muted">{{ 'auth.noAccount' | t }} <a routerLink="/auth/register" class="text-accent">{{ 'auth.register' | t }}</a></p>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  email = 'buyer@example.com';
  password = 'demo';
  readonly error = signal('');

  constructor() {
    this.seo.set({ title: this.i18n.t('auth.login') });
  }

  submit(): void {
    this.auth.login(this.email, this.password).subscribe({
      next: (user) => {
        void this.router.navigateByUrl(user.role === 'admin' ? '/admin' : user.role === 'creator' ? '/dashboard' : '/marketplace');
      },
      error: () => this.error.set(this.i18n.t('auth.invalid')),
    });
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="page route-enter mx-auto max-w-md">
      <h1 class="section-title">{{ 'auth.create' | t }}</h1>
      <form class="mt-8 grid gap-3" (ngSubmit)="submit()">
        <input class="input" name="name" [(ngModel)]="name" required [placeholder]="'auth.name' | t" />
        <input class="input" type="email" name="email" [(ngModel)]="email" required [placeholder]="'auth.email' | t" />
        <input class="input" type="password" name="password" [(ngModel)]="password" required [placeholder]="'auth.password' | t" />
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" [(ngModel)]="asCreator" name="asCreator" />
          {{ 'auth.wantSell' | t }}
        </label>
        <p class="text-xs text-muted">
          {{ 'auth.agree' | t }}
          <a routerLink="/terms-of-service" class="text-accent">{{ 'auth.terms' | t }}</a>
          {{ 'auth.and' | t }}
          <a routerLink="/privacy-policy" class="text-accent">{{ 'auth.privacy' | t }}</a>.
        </p>
        <button class="btn btn-fill" type="submit">{{ 'auth.create' | t }}</button>
      </form>
      <p class="mt-4 text-sm text-muted">{{ 'auth.haveAccount' | t }} <a routerLink="/auth/login" class="text-accent">{{ 'auth.login' | t }}</a></p>
    </section>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  name = '';
  email = '';
  password = '';
  asCreator = false;

  constructor() {
    this.seo.set({ title: this.i18n.t('auth.register') });
  }

  submit(): void {
    this.auth
      .register({ email: this.email, name: this.name, password: this.password, asCreator: this.asCreator })
      .subscribe((user) => {
        void this.router.navigateByUrl(user.role === 'creator' ? '/dashboard' : '/marketplace');
      });
  }
}
