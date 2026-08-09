import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page route-enter mx-auto max-w-md">
      <h1 class="section-title">Log in</h1>
      <p class="mt-2 text-sm text-muted">Demo sellers: nova@creators.dev · orbit@creators.dev · pulse@creators.dev (any password)</p>
      <form class="mt-8 grid gap-3" (ngSubmit)="submit()">
        <input class="input" type="email" name="email" [(ngModel)]="email" required placeholder="Email" />
        <input class="input" type="password" name="password" [(ngModel)]="password" required placeholder="Password" />
        @if (error()) { <p class="text-sm text-red-500">{{ error() }}</p> }
        <button class="btn btn-fill" type="submit">Continue</button>
      </form>
      <p class="mt-4 text-sm text-muted">No account? <a routerLink="/auth/register" class="text-accent">Register</a></p>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  email = 'buyer@example.com';
  password = 'demo';
  readonly error = signal('');

  constructor() {
    this.seo.set({ title: 'Log in' });
  }

  submit(): void {
    this.auth.login(this.email, this.password).subscribe({
      next: (user) => {
        void this.router.navigateByUrl(user.role === 'admin' ? '/admin' : user.role === 'creator' ? '/dashboard' : '/marketplace');
      },
      error: () => this.error.set('Invalid credentials'),
    });
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page route-enter mx-auto max-w-md">
      <h1 class="section-title">Create account</h1>
      <form class="mt-8 grid gap-3" (ngSubmit)="submit()">
        <input class="input" name="name" [(ngModel)]="name" required placeholder="Name" />
        <input class="input" type="email" name="email" [(ngModel)]="email" required placeholder="Email" />
        <input class="input" type="password" name="password" [(ngModel)]="password" required placeholder="Password" />
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" [(ngModel)]="asCreator" name="asCreator" />
          I want to sell on PH AI Market
        </label>
        <p class="text-xs text-muted">
          By creating an account you agree to our
          <a routerLink="/terms-of-service" class="text-accent">Terms</a>
          and
          <a routerLink="/privacy-policy" class="text-accent">Privacy Policy</a>.
        </p>
        <button class="btn btn-fill" type="submit">Create account</button>
      </form>
      <p class="mt-4 text-sm text-muted">Have an account? <a routerLink="/auth/login" class="text-accent">Log in</a></p>
    </section>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  name = '';
  email = '';
  password = '';
  asCreator = false;

  constructor() {
    this.seo.set({ title: 'Register' });
  }

  submit(): void {
    this.auth
      .register({ email: this.email, name: this.name, password: this.password, asCreator: this.asCreator })
      .subscribe((user) => {
        void this.router.navigateByUrl(user.role === 'creator' ? '/dashboard' : '/marketplace');
      });
  }
}
