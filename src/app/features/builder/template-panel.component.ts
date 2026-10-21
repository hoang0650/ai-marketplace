import { Component, PLATFORM_ID, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { PhoneSimulatorComponent } from './phone-simulator.component';
import { ExpoQrComponent } from './expo-qr.component';
import { environment } from '../../../environments/environment';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';
import { BuilderService, TemplateMeta } from './builder.service';

type Device = 'desktop' | 'phone';

/** Product page block for template-web / template-app listings: live demo + "use in builder". */
@Component({
  selector: 'app-template-panel',
  standalone: true,
  imports: [TPipe, RouterLink, PhoneSimulatorComponent, ExpoQrComponent],
  template: `
    <section class="tp">
      <div class="tp__head">
        <div>
          <h2>{{ 'builder.tpl.panel.title' | t }}</h2>
          <p>{{ 'builder.tpl.panel.sub.' + kind() | t }}</p>
        </div>
        <div class="tp__actions">
          @if (meta()?.access) {
            <button type="button" class="btn btn-fill" [disabled]="busy() || !meta()?.ready" (click)="use()">
              {{ busy() ? ('builder.creating' | t) : ('builder.tpl.use' | t) }}
            </button>
          } @else {
            <button type="button" class="btn btn-fill" (click)="buy.emit()">{{ 'builder.tpl.buyToUse' | t }}</button>
          }
          @if (meta()?.demoUrl) {
            @if (kind() === 'app') {
              <!-- App templates open the phone simulator page (iOS/Android frame + QR for a real phone). -->
              <a class="btn btn-outline" [routerLink]="['/template-demo', product().id]" [queryParams]="{ name: product().name, from: product().slug }" target="_blank" rel="noopener">{{ 'builder.tpl.demo' | t }} ↗</a>
            } @else {
              <a class="btn btn-outline" [href]="meta()!.demoUrl" target="_blank" rel="noopener">{{ 'builder.tpl.demo' | t }} ↗</a>
            }
          }
        </div>
      </div>

      @if (error()) {
        <p class="tp__err">{{ error() }}</p>
      }

      @if (meta(); as m) {
        <p class="tp__meta">
          {{ 'builder.kind.' + m.kind | t }} · v{{ m.version }} · {{ m.fileCount }} {{ 'builder.files' | t }} ·
          {{ 'builder.tpl.uses' | t: { n: m.useCount } }}
          @if (m.access) {
            · <strong>{{ 'builder.tpl.owned' | t }}</strong>
          }
        </p>
        <div class="tp__grid">
          <div class="tp__stage">
            @if (demoSrc(); as src) {
              <div class="tp__devices">
                @for (d of devices; track d) {
                  <button type="button" [class.on]="device() === d" (click)="device.set(d)">{{ 'builder.tpl.device.' + d | t }}</button>
                }
              </div>
              @if (device() === 'phone') {
                <div class="tp__phone">
                  <app-phone-simulator [url]="meta()!.demoUrl" [title]="product().name" [maxHeight]="700" />
                  @if (m.kind === 'app') {
                    <app-expo-qr class="tp__expo" [infoUrl]="expoInfo()" [qrUrl]="expoQr()" [version]="m.version" [webQrUrl]="webQr()" [webUrl]="m.demoUrl" />
                  }
                </div>
              } @else {
                <div class="tp__frame">
                  <iframe
                    [src]="src"
                    title="Template demo"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    loading="lazy"
                  ></iframe>
                </div>
              }
            } @else {
              <div class="tp__nodemo">{{ (m.ready ? 'builder.tpl.noDemo' : 'builder.tpl.noFiles') | t }}</div>
            }
          </div>
          <aside class="tp__files">
            <p class="tp__label">{{ 'builder.tpl.files' | t }}</p>
            <ul>
              @for (p of m.paths || []; track p) {
                <li><code>{{ p }}</code></li>
              }
            </ul>
            <p class="tp__hint">{{ 'builder.tpl.panel.how' | t }}</p>
          </aside>
        </div>
      } @else {
        <p class="tp__meta">{{ 'builder.tpl.loading' | t }}</p>
      }
    </section>
  `,
  styles: `
    .tp { display: grid; gap: .9rem; }
    .tp__head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
    .tp__head h2 { margin: 0; font-size: 1.25rem; font-weight: 800; }
    .tp__head p { margin: .25rem 0 0; opacity: .75; font-size: .9rem; max-width: 40rem; }
    .tp__actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .tp__err { margin: 0; color: #e53935; font-size: .88rem; }
    .tp__meta { margin: 0; opacity: .8; font-size: .85rem; }
    .tp__grid { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr) 15rem; }
    .tp__stage { display: grid; gap: .5rem; }
    .tp__phone { display: grid; grid-template-columns: minmax(0, 1fr) 16rem; gap: 1rem; align-items: start; }
    @media (max-width: 900px) { .tp__phone { grid-template-columns: 1fr; } }
    .tp__devices { display: flex; gap: .4rem; }
    .tp__devices button { border: 1px solid rgba(127,127,127,.35); border-radius: 999px; padding: .25rem .8rem; font-size: .8rem; background: transparent; color: inherit; cursor: pointer; }
    .tp__devices button.on { border-color: currentColor; font-weight: 700; }
    .tp__frame { height: 560px; border: 1px solid rgba(127,127,127,.3); border-radius: 14px; overflow: hidden; background: #fff; }
    .tp__frame iframe { width: 100%; height: 100%; border: 0; display: block; }
    .tp__nodemo { height: 240px; display: grid; place-items: center; border: 1px dashed rgba(127,127,127,.4); border-radius: 14px; opacity: .7; text-align: center; padding: 1rem; }
    .tp__files ul { list-style: none; margin: .4rem 0; padding: 0; max-height: 420px; overflow: auto; display: grid; gap: .2rem; font-size: .8rem; }
    .tp__label { margin: 0; font-weight: 700; font-size: .85rem; }
    .tp__hint { margin: .4rem 0 0; font-size: .78rem; opacity: .7; }
    @media (max-width: 860px) { .tp__grid { grid-template-columns: 1fr; } }
  `,
})
export class TemplatePanelComponent {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly product = input.required<Product>();
  /** Bump after a successful checkout so access is re-checked. */
  readonly refresh = input(0);
  readonly buy = output<void>();

  readonly devices: Device[] = ['desktop', 'phone'];
  readonly meta = signal<TemplateMeta | null>(null);
  readonly device = signal<Device>('desktop');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly kind = computed(() => (this.product().category === 'template-app' ? 'app' : 'web'));
  private readonly tplApi = computed(() => `${environment.apiUrl}/builder/templates/${this.meta()?.productId || ''}`);
  readonly expoInfo = computed(() => `${this.tplApi()}/expo`);
  readonly expoQr = computed(() => `${this.tplApi()}/expo-qr.svg`);
  readonly webQr = computed(() => `${this.tplApi()}/demo-qr.svg`);
  readonly demoSrc = computed<SafeResourceUrl | null>(() => {
    const url = this.meta()?.demoUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    effect(() => {
      const p = this.product();
      this.refresh();
      untracked(() => {
        this.device.set(p.category === 'template-app' ? 'phone' : 'desktop');
        this.load(p.id);
      });
    });
  }

  use(): void {
    const p = this.product();
    if (!this.auth.user()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: `/product/${p.slug}` } });
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.useTemplate(p.id).subscribe({
      next: (r) => {
        this.busy.set(false);
        void this.router.navigate(['/build', r.project.id]);
      },
      error: (e) => {
        this.busy.set(false);
        if (e?.status === 402) {
          this.buy.emit();
          return;
        }
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  private load(productId: string): void {
    if (!this.browser) return;
    this.api.template(productId).subscribe({
      next: (r) => this.meta.set(r.template),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }
}
