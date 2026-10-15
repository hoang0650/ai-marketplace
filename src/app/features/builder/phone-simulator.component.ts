import { Component, DestroyRef, ElementRef, PLATFORM_ID, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TPipe } from '../../i18n/t.pipe';
import { DEFAULT_CHROME, DeviceChrome, DeviceFrameComponent, deviceOuter } from './device-frame.component';

export type PhoneOs = 'ios' | 'android';

/** Screen sizes in CSS px, same as the Builder studio (iPhone 15 / Pixel 8 Pro class). */
const SCREENS: Record<PhoneOs, { model: 'iphone' | 'android'; width: number; height: number }> = {
  ios: { model: 'iphone', width: 390, height: 844 },
  android: { model: 'android', width: 412, height: 915 },
};

/**
 * Mobile simulator for a template demo: real device chrome (status bar, notch / punch-hole,
 * home indicator), a true mobile viewport (390×844 / 412×915), scaled to fit, and the preview
 * runtime's touch emulation (?device=… → drag-to-scroll with inertia, touch cursor, no scrollbars).
 */
@Component({
  selector: 'app-phone-simulator',
  standalone: true,
  imports: [TPipe, DeviceFrameComponent],
  template: `
    <div class="ps">
      <div class="ps__bar">
        <div class="ps__os" role="tablist">
          @for (o of oses; track o) {
            <button type="button" role="tab" [attr.aria-selected]="os() === o" [class.on]="os() === o" (click)="os.set(o)">
              {{ 'builder.sim.os.' + o | t }}
            </button>
          }
        </div>
        <span class="ps__size">{{ screen().width }}×{{ screen().height }} · {{ pct() }}%</span>
        <button type="button" class="ps__reload" (click)="reload()" [attr.aria-label]="'builder.sim.reload' | t">↻</button>
      </div>
      <div #stage class="ps__stage" [style.height.px]="outer().height * scale() + 8">
        @if (src(); as s) {
          <div class="ps__box" [style.width.px]="outer().width * scale()" [style.height.px]="outer().height * scale()">
            <div class="ps__scaled" [style.transform]="'translateX(-50%) scale(' + scale() + ')'">
              <app-device-frame [model]="screen().model" [width]="screen().width" [height]="screen().height" [chrome]="chrome()">
                <iframe
                  #frame
                  class="ps__frame"
                  [src]="s"
                  [title]="title()"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                ></iframe>
              </app-device-frame>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .ps { display: grid; gap: .6rem; }
    .ps__bar { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .ps__os { display: inline-flex; border: 1px solid rgba(127,127,127,.35); border-radius: 999px; padding: 2px; }
    .ps__os button { border: 0; background: transparent; color: inherit; padding: .3rem .9rem; border-radius: 999px; font-size: .82rem; cursor: pointer; }
    .ps__os button.on { background: #111; color: #fff; font-weight: 700; }
    .ps__size { font-size: .75rem; opacity: .65; font-variant-numeric: tabular-nums; }
    .ps__reload { margin-left: auto; border: 1px solid rgba(127,127,127,.35); background: transparent; color: inherit; border-radius: 999px; width: 2rem; height: 2rem; cursor: pointer; }
    .ps__stage { display: flex; justify-content: center; overflow: hidden; }
    .ps__box { position: relative; }
    .ps__scaled { position: absolute; left: 50%; top: 0; transform-origin: top center; }
    .ps__frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; touch-action: pan-y; }
  `,
})
export class PhoneSimulatorComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Demo URL from the template meta (…/demo/). */
  readonly url = input.required<string>();
  readonly title = input('Template demo');
  readonly initialOs = input<PhoneOs>('ios');
  /** Largest rendered height in px (the frame is scaled down to fit width and this). */
  readonly maxHeight = input(760);

  readonly oses: PhoneOs[] = ['ios', 'android'];
  readonly os = signal<PhoneOs>('ios');
  readonly screen = computed(() => SCREENS[this.os()]);
  readonly outer = computed(() => deviceOuter(this.screen().model, this.screen().width, this.screen().height));
  readonly hostWidth = signal(0);
  readonly scale = computed(() => {
    const { width, height } = this.outer();
    const w = this.hostWidth();
    return Math.min(1, w ? (w - 8) / width : 1, this.maxHeight() / height);
  });
  readonly pct = computed(() => Math.round(this.scale() * 100));
  readonly chrome = signal<DeviceChrome>(DEFAULT_CHROME);
  private readonly nonce = signal(0);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  readonly src = computed<SafeResourceUrl | null>(() => {
    const u = this.url();
    if (!u) return null;
    const sep = u.includes('?') ? '&' : '?';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${u}${sep}device=${this.screen().model}&v=${this.nonce()}`);
  });

  constructor() {
    effect(() => {
      const o = this.initialOs();
      untracked(() => this.os.set(o));
    });
    effect(() => {
      this.src();
      untracked(() => this.chrome.set(DEFAULT_CHROME));
    });
    if (!this.browser) return;
    const ro = new ResizeObserver((entries) => this.hostWidth.set(entries[0]?.contentRect.width || 0));
    ro.observe(this.host.nativeElement);
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; top?: string; bottom?: string; style?: string; background?: string } | null;
      if (!data || data.source !== 'aim-preview') return;
      if (event.source !== this.frame()?.nativeElement.contentWindow) return;
      const color = (v?: string) => (typeof v === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|[a-z]{3,20})$/i.test(v.trim()) ? v.trim() : '');
      if (data.type === 'chrome') {
        this.chrome.update((c) => ({ ...c, top: color(data.top) || c.top, bottom: color(data.bottom) || c.bottom }));
      } else if (data.type === 'statusbar') {
        const bar = data.style === 'light' || data.style === 'dark' ? data.style : 'auto';
        this.chrome.update((c) => ({ ...c, bar, barBackground: color(data.background) }));
      }
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => {
      ro.disconnect();
      window.removeEventListener('message', onMessage);
    });
  }

  reload(): void {
    this.nonce.update((n) => n + 1);
  }
}
