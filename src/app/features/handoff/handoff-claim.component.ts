import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { AuthService } from '../../services/auth.service';
import { HandoffService } from '../../services/handoff.service';

/**
 * /handoff/:code — what the "Tiếp tục trên điện thoại" QR opens (https works with any camera).
 * Logged in as the same user (authGuard) -> redeem the code and jump into the session.
 * Also offers the native app via aimarkets://handoff/<code>.
 */
@Component({
  selector: 'app-handoff-claim',
  standalone: true,
  imports: [TPipe, RouterLink],
  template: `
    <section class="hc">
      <h1>{{ 'handoff.title' | t }}</h1>
      @if (state() === 'choose') {
        <a class="hc__app" [href]="'aimarkets://handoff/' + code">{{ 'handoff.openApp' | t }}</a>
        <button type="button" class="hc__web" (click)="continueWeb()">{{ 'handoff.continueWeb' | t }}</button>
        <p class="hc__muted">{{ 'handoff.appHint' | t }}</p>
      } @else if (state() === 'working') {
        <p>{{ 'handoff.connecting' | t }}</p>
      } @else if (state() === 'error') {
        <p class="hc__err">{{ error() }}</p>
        <a routerLink="/account/devices">{{ 'handoff.devices' | t }}</a>
      }
    </section>
  `,
  styles: `
    .hc { max-width: 26rem; margin: 0 auto; padding: 2.5rem 1.2rem; display: grid; gap: .9rem; text-align: center; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 800; }
    .hc__err { color: #e53935; margin: 0; }
    .hc__app { display: block; border-radius: 999px; padding: .8rem 1rem; background: #111; color: #fff; font-weight: 700; text-decoration: none; }
    .hc__web { border-radius: 999px; padding: .8rem 1rem; border: 1px solid currentColor; background: none; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
    .hc__muted { margin: 0; font-size: .8rem; opacity: .7; }
  `,
})
export class HandoffClaimComponent {
  private readonly api = inject(HandoffService);
  private readonly router = inject(Router);
  readonly code = String(inject(ActivatedRoute).snapshot.paramMap.get('code') || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12);
  private readonly auth = inject(AuthService);
  /** Phones choose app vs browser first: redeeming here would burn the code before the app could use it. */
  readonly state = signal<'choose' | 'working' | 'error'>('working');
  readonly error = signal('');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile) this.state.set('choose');
    else this.continueWeb();
  }

  continueWeb(): void {
    this.auth.ensureReady().subscribe(() => {
      if (!this.auth.isAuthenticated()) {
        void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/handoff/${this.code}` } });
        return;
      }
      this.state.set('working');
      this.api.claim(this.code).subscribe({
        next: (r) => void this.router.navigateByUrl(r.target.path, { replaceUrl: true }),
        error: (e) => {
          this.state.set('error');
          this.error.set(e?.error?.error?.message || 'Không mở được phiên.');
        },
      });
    });
  }
}
