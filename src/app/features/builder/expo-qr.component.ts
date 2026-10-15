import { HttpClient } from '@angular/common/http';
import { Component, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
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
  imports: [TPipe, NgTemplateOutlet],
  template: `
    @if (dock()) {
      @if (collapsed()) {
        <button type="button" class="eqd__fab" (click)="collapsed.set(false)" [title]="'builder.expo.title' | t" [attr.aria-label]="'builder.expo.title' | t" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3z"/></svg>
          <span>Expo Go</span>
        </button>
      } @else {
        <div class="eqd" role="region" [attr.aria-label]="'builder.expo.title' | t">
          <div class="eqd__head">
            <strong>{{ 'builder.expo.title' | t }}</strong>
            <button type="button" class="eqd__x" (click)="collapsed.set(true)" aria-label="Thu gọn" aria-expanded="true">–</button>
          </div>
          @if (loading()) {
            <div class="eq__qr eqd__qr eq__qr--wait" aria-busy="true">{{ 'builder.expo.publishing' | t }}</div>
          } @else if (info()?.url) {
            @if (!mobile()) {
              <img class="eq__qr eqd__qr" [src]="qrUrl() + '?v=' + bust()" width="120" height="120" [alt]="'builder.expo.qrAlt' | t" />
            }
            <a class="eq__btn eqd__btn" [href]="info()!.url">{{ 'builder.expo.open' | t }}</a>
            <p class="eqd__hint">{{ (mobile() ? 'builder.expo.mobileHint' : 'builder.expo.scan') | t }}</p>
          } @else {
            <div class="eq__qr eqd__qr eq__qr--wait">{{ 'builder.expo.err.' + (info()?.error || 'SNACK_SAVE_FAILED') | t }}</div>
            <button type="button" class="eq__link" (click)="load()">{{ 'builder.expo.retry' | t }}</button>
          }
          <details class="eqd__more">
            <summary>{{ 'builder.expo.more' | t }}</summary>
            <ng-container *ngTemplateOutlet="infoTpl" />
          </details>
        </div>
      }
    } @else {
    <div class="eq" [class.eq--row]="compact()">
      <div class="eq__main">
        <h3>{{ 'builder.expo.title' | t }}</h3>
        @if (loading()) {
          <div class="eq__qr eq__qr--wait" aria-busy="true">{{ 'builder.expo.publishing' | t }}</div>
        } @else if (info()?.url) {
          @if (mobile()) {
            <a class="eq__btn eq__btn--big" [href]="info()!.url">{{ 'builder.expo.open' | t }}</a>
            <p class="eq__scan">{{ 'builder.expo.mobileHint' | t }}</p>
          } @else {
            <p class="eq__scan">{{ 'builder.expo.scan' | t }}</p>
            <img class="eq__qr" [src]="qrUrl() + '?v=' + bust()" width="240" height="240" [alt]="'builder.expo.qrAlt' | t" />
            <a class="eq__btn" [href]="info()!.url">{{ 'builder.expo.open' | t }}</a>
          }
          <p class="eq__warn">{{ 'builder.expo.fallback' | t }}</p>
        } @else {
          <div class="eq__qr eq__qr--wait">{{ 'builder.expo.err.' + (info()?.error || 'SNACK_SAVE_FAILED') | t }}</div>
          <button type="button" class="eq__link" (click)="load()">{{ 'builder.expo.retry' | t }}</button>
        }
      </div>
      <div class="eq__info"><ng-container *ngTemplateOutlet="infoTpl" /></div>
    </div>
    }
    <ng-template #infoTpl>
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
    </ng-template>
  `,
  styles: `
    .eq { border: 1px solid rgba(127,127,127,.3); border-radius: 16px; padding: 1rem; display: grid; gap: .8rem; font-size: .82rem; }
    .eq--row { grid-template-columns: auto minmax(0, 1fr); align-items: start; }
    .eq__main { display: grid; gap: .5rem; justify-items: center; text-align: center; }
    .eq h3 { margin: 0; font-size: 1rem; font-weight: 700; }
    .eq__qr { background: #fff; border-radius: 12px; padding: 6px; width: 240px; height: 240px; max-width: 100%; box-sizing: border-box; }
    .eq__qr--small { width: 120px; height: 120px; }
    .eq__qr--wait { display: grid; place-items: center; color: #555; font-size: .78rem; padding: .8rem; text-align: center; }
    .eq__btn { display: inline-block; border-radius: 999px; padding: .35rem .9rem; background: #4630eb; color: #fff; font-weight: 700; text-decoration: none; }
    .eq__btn--big { font-size: 1rem; padding: .7rem 1.4rem; width: 100%; box-sizing: border-box; text-align: center; }
    .eq__scan { margin: 0; font-weight: 700; font-size: .9rem; }
    .eq__warn { margin: 0; font-size: .74rem; opacity: .65; }
    .eq__info { display: grid; gap: .45rem; }
    .eq__info ol { margin: 0; padding-left: 1.1rem; display: grid; gap: .25rem; opacity: .85; }
    .eq__sdk { margin: 0; opacity: .7; font-size: .76rem; }
    .eq__link { font-size: .8rem; background: none; border: 0; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; justify-self: start; }
    .eq__web { border-top: 1px dashed rgba(127,127,127,.35); padding-top: .45rem; }
    .eq__web summary { cursor: pointer; font-weight: 600; }
    .eq__web p { margin: .3rem 0; opacity: .75; }
    .eqd { width: 168px; display: grid; gap: .4rem; justify-items: center; text-align: center; padding: .6rem; border-radius: 14px; background: rgba(255,255,255,.96); color: #111; box-shadow: 0 8px 28px rgba(0,0,0,.35); font-size: .74rem; max-height: calc(100% - 1.5rem); overflow-y: auto; }
    .eqd__head { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .3rem; text-align: left; font-size: .76rem; }
    .eqd__x { border: 0; background: rgba(0,0,0,.07); border-radius: 999px; width: 22px; height: 22px; cursor: pointer; font-weight: 700; color: inherit; }
    .eqd__qr { width: 124px; height: 124px; padding: 4px; border: 1px solid #eee; }
    .eqd__btn { font-size: .74rem; padding: .35rem .7rem; }
    .eqd__hint { margin: 0; font-size: .68rem; opacity: .7; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .eqd__more { width: 100%; text-align: left; border-top: 1px dashed rgba(0,0,0,.15); padding-top: .35rem; }
    .eqd__more summary { cursor: pointer; font-weight: 600; font-size: .7rem; }
    .eqd__more ol { padding-left: 1rem; margin: .3rem 0; display: grid; gap: .2rem; }
    .eqd__more .eq__sdk, .eqd__more .eq__link { font-size: .68rem; }
    .eqd__fab { display: inline-flex; align-items: center; gap: .35rem; border: 0; border-radius: 999px; padding: .45rem .7rem; background: #4630eb; color: #fff; font-weight: 700; font-size: .75rem; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.35); }
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
  /** Small floating panel docked in the preview's corner (Builder studio). */
  readonly dock = input(false);
  readonly collapsed = signal(false);

  readonly info = signal<ExpoSnackInfo | null>(null);
  readonly loading = signal(false);
  readonly bust = signal('');
  /** Phone/tablet visitor: a QR is useless, show the exp:// button instead. */
  readonly mobile = signal(false);

  constructor() {
    if (this.browser) {
      this.mobile.set(window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches);
      // Narrow screens: start as an icon button so the phone preview keeps the space.
      this.collapsed.set(window.matchMedia('(max-width: 1024px)').matches);
    }
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
