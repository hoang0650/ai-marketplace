import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { environment } from '../../../environments/environment';
import { BuilderService, TemplateMeta } from './builder.service';
import { PhoneOs, PhoneSimulatorComponent } from './phone-simulator.component';
import { ExpoQrComponent } from './expo-qr.component';

/**
 * /template-demo/:productId — full-page phone simulator for an app template demo, with a QR code
 * Expo Go QR (Snack, runs natively) for app templates, plus the web-runtime QR as a fallback.
 */
@Component({
  selector: 'app-template-demo-page',
  standalone: true,
  imports: [TPipe, RouterLink, PhoneSimulatorComponent, ExpoQrComponent],
  template: `
    <section class="td">
      <header class="td__head">
        <div>
          <p class="td__eyebrow">{{ 'builder.sim.eyebrow' | t }}</p>
          <h1>{{ name() || ('builder.sim.title' | t) }}</h1>
          <p class="td__sub">{{ 'builder.sim.sub' | t }}</p>
        </div>
        @if (backSlug()) {
          <a class="btn btn-outline" [routerLink]="['/product', backSlug()]">← {{ 'builder.sim.back' | t }}</a>
        }
      </header>

      @if (error()) {
        <p class="td__err">{{ error() }}</p>
      } @else if (meta(); as m) {
        @if (m.demoUrl) {
          <div class="td__grid">
            <app-phone-simulator [url]="m.demoUrl" [title]="name() || 'Template demo'" [initialOs]="initialOs()" [maxHeight]="820" />
            <aside class="td__side">
              @if (m.kind === 'app') {
                <app-expo-qr [infoUrl]="expoInfo()" [qrUrl]="expoQr()" [version]="m.version" [webQrUrl]="qrSrc()" [webUrl]="m.demoUrl" />
              } @else {
                <div class="td__card">
                  <h2>{{ 'builder.sim.qrTitle' | t }}</h2>
                  <img class="td__qr" [src]="qrSrc()" width="200" height="200" [alt]="'builder.sim.qrAlt' | t" />
                  <p>{{ 'builder.sim.qrHint' | t }}</p>
                  <a class="td__open" [href]="m.demoUrl" target="_blank" rel="noopener">{{ 'builder.sim.openRaw' | t }} ↗</a>
                </div>
              }
            </aside>
          </div>
        } @else {
          <p class="td__err">{{ 'builder.tpl.noDemo' | t }}</p>
        }
      } @else {
        <p>{{ 'builder.tpl.loading' | t }}</p>
      }
    </section>
  `,
  styles: `
    .td { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem 3rem; display: grid; gap: 1.2rem; }
    .td__head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .td__eyebrow { margin: 0; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }
    .td__head h1 { margin: .2rem 0; font-size: 1.6rem; font-weight: 800; }
    .td__sub { margin: 0; opacity: .75; max-width: 40rem; }
    .td__err { color: #e53935; }
    .td__grid { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; gap: 1.5rem; align-items: start; }
    .td__side { display: grid; gap: 1rem; }
    @media (max-width: 860px) { .td__side { order: -1; } }
    .td__card { border: 1px solid rgba(127,127,127,.3); border-radius: 16px; padding: 1rem; display: grid; gap: .6rem; justify-items: center; text-align: center; }
    .td__card h2, .td__card h3 { margin: 0; font-size: 1rem; font-weight: 700; }
    .td__card p { margin: 0; font-size: .82rem; opacity: .75; }
    .td__card--note { justify-items: start; text-align: left; }
    .td__qr { background: #fff; border-radius: 12px; padding: 6px; }
    .td__open { font-size: .82rem; }
    @media (max-width: 860px) { .td__grid { grid-template-columns: 1fr; } }
  `,
})
export class TemplateDemoPageComponent {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly productId = this.route.snapshot.paramMap.get('productId') || '';
  readonly name = signal(this.route.snapshot.queryParamMap.get('name') || '');
  readonly backSlug = signal(this.route.snapshot.queryParamMap.get('from') || '');
  readonly initialOs = signal<PhoneOs>(this.route.snapshot.queryParamMap.get('os') === 'android' ? 'android' : 'ios');
  readonly meta = signal<TemplateMeta | null>(null);
  readonly error = signal('');
  readonly expoInfo = computed(() => `${environment.apiUrl}/builder/templates/${this.productId}/expo`);
  readonly expoQr = computed(() => `${environment.apiUrl}/builder/templates/${this.productId}/expo-qr.svg`);
  readonly qrSrc = computed(() => `${environment.apiUrl}/builder/templates/${this.productId}/demo-qr.svg`);

  constructor() {
    if (!this.browser) return;
    if (!/^[a-f0-9]{24}$/.test(this.productId)) {
      this.error.set(this.i18n.t('builder.tpl.noDemo'));
      return;
    }
    this.api.template(this.productId).subscribe({
      next: (r) => {
        // Phones used to be redirected to the web demo here, which hid the Expo Go QR/button;
        // now app templates show the Expo Go card first on small screens.
        this.meta.set(r.template);
      },
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.tpl.noDemo')),
    });
  }
}
