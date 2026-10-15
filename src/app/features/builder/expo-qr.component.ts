import { HttpClient } from '@angular/common/http';
import { Component, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TPipe } from '../../i18n/t.pipe';

/** Answer of GET …/expo (template) or …/preview-expo/:id/:token (project). */
export interface ExpoSnackInfo {
  enabled: boolean;
  available: boolean;
  url: string;
  webUrl?: string;
  sdkVersion?: string;
  templateSdk?: string;
  retargeted?: boolean;
  stale?: boolean;
  error?: string;
}

/**
 * "Open in Expo Go" card: QR of the Snack exp:// link (runs the real React Native code natively),
 * install/scan steps, and the browser-runtime QR as the secondary "open the web version" option.
 */
@Component({
  selector: 'app-expo-qr',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="eq" [class.eq--row]="compact()">
      <div class="eq__main">
        <h3>{{ 'builder.expo.title' | t }}</h3>
        @if (loading()) {
          <div class="eq__qr eq__qr--wait" aria-busy="true">{{ 'builder.expo.publishing' | t }}</div>
        } @else if (info()?.url) {
          <img class="eq__qr" [src]="qrUrl() + '?v=' + bust()" width="180" height="180" [alt]="'builder.expo.qrAlt' | t" />
          <a class="eq__btn" [href]="info()!.url">{{ 'builder.expo.open' | t }}</a>
        } @else {
          <div class="eq__qr eq__qr--wait">{{ 'builder.expo.err.' + (info()?.error || 'SNACK_SAVE_FAILED') | t }}</div>
          <button type="button" class="eq__link" (click)="load()">{{ 'builder.expo.retry' | t }}</button>
        }
      </div>
      <div class="eq__info">
        <ol>
          <li>{{ 'builder.expo.step1' | t }}
            <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener">iOS</a> ·
            <a href="https://play.google.com/store/apps/details?id=host.exp.exponent" target="_blank" rel="noopener">Android</a>
          </li>
          <li>{{ 'builder.expo.step2' | t }}</li>
          <li>{{ 'builder.expo.step3' | t }}</li>
        </ol>
        @if (info()?.sdkVersion) {
          <p class="eq__sdk">
            {{ 'builder.expo.sdk' | t: { v: major(info()!.sdkVersion!) } }}
            @if (info()!.retargeted) {
              {{ 'builder.expo.retargeted' | t: { from: major(info()!.templateSdk!), v: major(info()!.sdkVersion!) } }}
            }
          </p>
        }
        @if (info()?.stale) {
          <p class="eq__sdk">{{ 'builder.expo.stale' | t }}</p>
        }
        @if (info()?.webUrl) {
          <a class="eq__link" [href]="info()!.webUrl" target="_blank" rel="noopener">{{ 'builder.expo.snack' | t }} ↗</a>
        }
        @if (webQrUrl() || webUrl()) {
          <details class="eq__web">
            <summary>{{ 'builder.expo.webTitle' | t }}</summary>
            @if (webQrUrl()) {
              <img class="eq__qr eq__qr--small" [src]="webQrUrl()" width="120" height="120" [alt]="'builder.sim.qrAlt' | t" />
            }
            <p>{{ 'builder.expo.webHint' | t }}</p>
            @if (webUrl()) {
              <a class="eq__link" [href]="webUrl()" target="_blank" rel="noopener">{{ 'builder.sim.openRaw' | t }} ↗</a>
            }
          </details>
        }
      </div>
    </div>
  `,
  styles: `
    .eq { border: 1px solid rgba(127,127,127,.3); border-radius: 16px; padding: 1rem; display: grid; gap: .8rem; font-size: .82rem; }
    .eq--row { grid-template-columns: auto minmax(0, 1fr); align-items: start; }
    .eq__main { display: grid; gap: .5rem; justify-items: center; text-align: center; }
    .eq h3 { margin: 0; font-size: 1rem; font-weight: 700; }
    .eq__qr { background: #fff; border-radius: 12px; padding: 6px; width: 180px; height: 180px; box-sizing: border-box; }
    .eq__qr--small { width: 120px; height: 120px; }
    .eq__qr--wait { display: grid; place-items: center; color: #555; font-size: .78rem; padding: .8rem; text-align: center; }
    .eq__btn { display: inline-block; border-radius: 999px; padding: .35rem .9rem; background: #4630eb; color: #fff; font-weight: 700; text-decoration: none; }
    .eq__info { display: grid; gap: .45rem; }
    .eq__info ol { margin: 0; padding-left: 1.1rem; display: grid; gap: .25rem; opacity: .85; }
    .eq__sdk { margin: 0; opacity: .7; font-size: .76rem; }
    .eq__link { font-size: .8rem; background: none; border: 0; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; justify-self: start; }
    .eq__web { border-top: 1px dashed rgba(127,127,127,.35); padding-top: .45rem; }
    .eq__web summary { cursor: pointer; font-weight: 600; }
    .eq__web p { margin: .3rem 0; opacity: .75; }
    @media (max-width: 640px) { .eq--row { grid-template-columns: 1fr; } }
  `,
})
export class ExpoQrComponent {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** JSON endpoint describing the Snack. */
  readonly infoUrl = input.required<string>();
  /** SVG QR of the exp:// link. */
  readonly qrUrl = input.required<string>();
  /** Changes when the files change, so the card refetches (the API republishes only then). */
  readonly version = input<number | string>(0);
  readonly webQrUrl = input('');
  readonly webUrl = input('');
  readonly compact = input(false);

  readonly info = signal<ExpoSnackInfo | null>(null);
  readonly loading = signal(false);
  readonly bust = signal('');

  constructor() {
    effect(() => {
      this.infoUrl();
      this.version();
      if (this.browser) queueMicrotask(() => this.load());
    });
  }

  major(v: string): string {
    return String(v || '').split('.')[0];
  }

  load(): void {
    const url = this.infoUrl();
    if (!url) return;
    this.loading.set(true);
    this.http.get<ExpoSnackInfo>(url).subscribe({
      next: (r) => {
        this.info.set(r);
        this.bust.set(encodeURIComponent(r.url.split('snack=')[1] || ''));
        this.loading.set(false);
      },
      error: (e) => {
        this.info.set({ enabled: true, available: false, url: '', error: e?.status === 404 ? 'SNACK_NOT_FOUND' : 'SNACK_SAVE_FAILED' });
        this.loading.set(false);
      },
    });
  }
}
