import { HttpClient } from '@angular/common/http';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';
import { ExpoSnackInfo } from './expo-qr.component';

/**
 * /expo/:productId and /expo/p/:projectId/:token — what the Expo Go QR encodes. iOS Camera opens
 * https best; this page hands off to the exp:// link (Expo Go) and explains what to do if
 * Expo Go isn't installed or can't load the app.
 */
@Component({
  selector: 'app-expo-landing',
  standalone: true,
  imports: [TPipe],
  template: `
    <section class="el">
      <h1>{{ 'builder.expo.title' | t }}</h1>
      @if (info(); as i) {
        @if (i.url) {
          <a class="el__btn" [href]="i.url">{{ 'builder.expo.open' | t }}</a>
          <p class="el__muted">{{ 'builder.expo.landingHint' | t }}</p>
          <div class="el__stores">
            <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener">App Store — Expo Go</a>
            <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" target="_blank" rel="noopener">Google Play — Expo Go</a>
          </div>
          <p class="el__muted">{{ 'builder.expo.fallback' | t }}</p>
        } @else {
          <p class="el__err">{{ 'builder.expo.err.' + (i.error || 'SNACK_SAVE_FAILED') | t }}</p>
        }
        @if (webUrl()) {
          <a class="el__web" [href]="webUrl()">{{ 'builder.expo.webTitle' | t }} ↗</a>
        }
      } @else if (failed()) {
        <p class="el__err">{{ 'builder.expo.err.SNACK_NOT_FOUND' | t }}</p>
      } @else {
        <p class="el__muted">{{ 'builder.expo.publishing' | t }}</p>
      }
    </section>
  `,
  styles: `
    .el { max-width: 28rem; margin: 0 auto; padding: 2.5rem 1.2rem; display: grid; gap: 1rem; text-align: center; }
    .el h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .el__btn { display: block; border-radius: 999px; padding: .9rem 1.2rem; background: #4630eb; color: #fff; font-weight: 800; font-size: 1.05rem; text-decoration: none; }
    .el__stores { display: grid; gap: .5rem; }
    .el__stores a { border: 1px solid rgba(127,127,127,.4); border-radius: 12px; padding: .6rem; text-decoration: none; color: inherit; font-weight: 600; }
    .el__muted { margin: 0; opacity: .7; font-size: .85rem; }
    .el__err { color: #e53935; margin: 0; }
    .el__web { font-size: .9rem; }
  `,
})
export class ExpoLandingComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly info = signal<ExpoSnackInfo | null>(null);
  readonly failed = signal(false);
  readonly webUrl = signal('');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const m = this.route.snapshot.paramMap;
    const productId = m.get('productId') || '';
    const projectId = m.get('projectId') || '';
    const token = m.get('token') || '';
    let api = '';
    if (/^[a-f0-9]{24}$/.test(productId)) {
      api = `${environment.apiUrl}/builder/templates/${productId}/expo`;
      this.webUrl.set(`${environment.apiUrl}/builder/templates/${productId}/demo/`);
    } else if (/^[a-f0-9]{24}$/.test(projectId) && /^[A-Za-z0-9_-]{16,64}$/.test(token)) {
      api = `${environment.apiUrl}/builder/preview-expo/${projectId}/${token}`;
      this.webUrl.set(`${environment.apiUrl}/builder/preview/${projectId}/${token}/`);
    }
    if (!api) {
      this.failed.set(true);
      return;
    }
    this.http.get<ExpoSnackInfo>(api).subscribe({
      next: (r) => {
        this.info.set(r);
        // Hand off to Expo Go once on phones; if it isn't installed nothing happens and the page stays.
        if (r.url && window.matchMedia('(pointer: coarse)').matches) setTimeout(() => (location.href = r.url), 300);
      },
      error: () => this.failed.set(true),
    });
  }
}
