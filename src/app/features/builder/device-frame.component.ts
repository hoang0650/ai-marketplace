import { Component, DestroyRef, PLATFORM_ID, computed, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type DeviceModel = 'iphone' | 'android' | 'tablet';

/** Edge colours reported by the preview (see EMULATOR in the API preview runtime). */
export interface DeviceChrome {
  top: string;
  bottom: string;
  /** StatusBar style requested by the app: light = white icons. */
  bar: 'light' | 'dark' | 'auto';
  /** StatusBar backgroundColor (Android only, like the real platform). */
  barBackground: string;
}

export const DEFAULT_CHROME: DeviceChrome = { top: 'rgb(255, 255, 255)', bottom: 'rgb(255, 255, 255)', bar: 'auto', barBackground: '' };

interface Spec {
  bezel: number;
  radius: number;
  status: number;
  nav: number;
}

const SPECS: Record<DeviceModel, Spec> = {
  iphone: { bezel: 12, radius: 58, status: 47, nav: 34 },
  android: { bezel: 10, radius: 40, status: 32, nav: 24 },
  tablet: { bezel: 18, radius: 36, status: 24, nav: 20 },
};

/** Outer size of the frame for a screen of width × height (used to scale it into the stage). */
export function deviceOuter(model: DeviceModel, width: number, height: number): { width: number; height: number } {
  const b = SPECS[model].bezel;
  return { width: width + 2 * b, height: height + 2 * b };
}

function isDark(color: string): boolean {
  const p = (color.match(/[\d.]+/g) || []).map(Number);
  if (p.length < 3) return false;
  return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255 < 0.6;
}

/**
 * Phone / tablet emulator shell: hardware frame + side buttons, status bar (clock, signal, wifi,
 * battery) with Dynamic Island or punch-hole camera, and the home indicator / gesture bar.
 * The app screen (iframe) is projected between the status bar and the navigation area.
 */
@Component({
  selector: 'app-device-frame',
  standalone: true,
  template: `
    <div
      class="df"
      [attr.data-model]="model()"
      [style.width.px]="outer().width"
      [style.height.px]="outer().height"
      [style.borderRadius.px]="spec().radius"
      [style.padding.px]="spec().bezel"
    >
      @for (b of buttons(); track $index) {
        @if (b.side === 'top') {
          <span class="hw hw--top" [style.left.px]="b.at" [style.width.px]="b.len"></span>
        } @else {
          <span class="hw" [class.hw--right]="b.side === 'right'" [style.top.px]="b.at" [style.height.px]="b.len"></span>
        }
      }
      <div class="screen" [style.width.px]="width()" [style.height.px]="height()" [style.borderRadius.px]="spec().radius - spec().bezel">
        <div class="status" [class.status--light]="lightTop()" [style.height.px]="spec().status" [style.background]="statusBg()">
          @switch (model()) {
            @case ('iphone') {
              <span class="time time--ios">{{ clock() }}</span>
              <span class="island"></span>
              <span class="icons icons--ios">
                <svg viewBox="0 0 18 12" width="18" height="12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
                <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .8 10.4 10.4 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3C5.5 6.7 6.7 6.2 8 6.2Zm0 3.5c.4 0 .8.2 1.1.4L8 11.3 6.9 10.1c.3-.2.7-.4 1.1-.4Z"/></svg>
                <span class="batt"><span class="batt__lvl" style="width: 80%"></span></span>
              </span>
            }
            @case ('android') {
              <span class="time time--android">{{ clock() }}</span>
              <span class="punch"></span>
              <span class="icons icons--android">
                <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 13.5 0.5 4.6A11.4 11.4 0 0 1 8 2a11.4 11.4 0 0 1 7.5 2.6Z"/></svg>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M15 1v14H1Z"/></svg>
                <span class="batt-v"><span class="batt-v__lvl" style="height: 80%"></span></span>
              </span>
            }
            @default {
              <span class="time time--tablet">{{ clock() }}&nbsp;&nbsp;{{ day() }}</span>
              <span class="icons icons--ios">
                <svg viewBox="0 0 16 12" width="15" height="11" aria-hidden="true"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .8 10.4 10.4 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3C5.5 6.7 6.7 6.2 8 6.2Zm0 3.5c.4 0 .8.2 1.1.4L8 11.3 6.9 10.1c.3-.2.7-.4 1.1-.4Z"/></svg>
                <span class="pct">80%</span>
                <span class="batt"><span class="batt__lvl" style="width: 80%"></span></span>
              </span>
            }
          }
        </div>
        <div class="content">
          <ng-content />
        </div>
        <div class="nav" [class.nav--light]="lightBottom()" [style.height.px]="spec().nav" [style.background]="chrome().bottom">
          <span class="pill" [class.pill--android]="model() === 'android'"></span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .df {
      position: relative; box-sizing: border-box;
      background: linear-gradient(145deg, #2b2b2e, #0d0d0f 45%, #1d1d20);
      box-shadow: 0 0 0 1.5px #4a4a4f, 0 0 0 3px #111, 0 30px 80px rgb(0 0 0 / .55), inset 0 0 2px rgb(255 255 255 / .25);
    }
    .df[data-model='android'] { background: linear-gradient(145deg, #3a3d42, #16181b 50%, #2a2d31); }
    .df[data-model='tablet'] { background: linear-gradient(145deg, #3b3b3f, #1a1a1c 50%, #2c2c30); }
    .hw { position: absolute; left: -4px; width: 4px; border-radius: 3px 0 0 3px; background: linear-gradient(90deg, #555, #2a2a2d); }
    .hw--right { left: auto; right: -4px; border-radius: 0 3px 3px 0; background: linear-gradient(270deg, #555, #2a2a2d); }
    .hw--top { top: -4px; height: 4px; border-radius: 3px 3px 0 0; background: linear-gradient(0deg, #2a2a2d, #555); }
    .screen { position: relative; display: flex; flex-direction: column; overflow: hidden; background: #000; }
    .status {
      position: relative; flex: none; display: flex; align-items: center; justify-content: space-between;
      color: #000; transition: background-color .2s, color .2s; z-index: 2;
      font-family: -apple-system, 'SF Pro Text', Inter, system-ui, sans-serif;
    }
    .status--light { color: #fff; }
    .status svg { fill: currentColor; display: block; }
    .time { font-variant-numeric: tabular-nums; }
    .time--ios { flex: 1; text-align: center; font-weight: 600; font-size: 16px; padding-top: 8px; padding-right: 64px; }
    .icons--ios { flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; padding-top: 8px; padding-left: 64px; }
    .island { position: absolute; top: 11px; left: 50%; width: 124px; height: 36px; transform: translateX(-50%); border-radius: 20px; background: #000; }
    .island::after { content: ''; position: absolute; right: 14px; top: 12px; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #2c3e66, #0a0f1c 70%); }
    .batt { position: relative; width: 25px; height: 12px; border: 1px solid currentColor; border-radius: 4px; opacity: .9; box-sizing: border-box; padding: 1.5px; margin-right: 3px; }
    .batt::after { content: ''; position: absolute; right: -3.5px; top: 3.5px; width: 2px; height: 4px; border-radius: 0 2px 2px 0; background: currentColor; opacity: .5; }
    .batt__lvl { display: block; height: 100%; border-radius: 2px; background: currentColor; }
    .time--android { padding-left: 18px; font-family: Roboto, 'Noto Sans', system-ui, sans-serif; font-size: 14px; font-weight: 500; }
    .punch { position: absolute; top: 8px; left: 50%; width: 18px; height: 18px; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle at 40% 40%, #1f2a44, #000 65%); box-shadow: 0 0 0 2px #000; }
    .icons--android { display: flex; align-items: center; gap: 5px; padding-right: 16px; }
    .batt-v { position: relative; display: flex; align-items: flex-end; width: 8px; height: 14px; border-radius: 2px; box-sizing: border-box; border: 1.5px solid currentColor; padding: 1px; }
    .batt-v::before { content: ''; position: absolute; top: -3px; left: 1.5px; width: 2px; height: 2px; background: currentColor; }
    .batt-v__lvl { display: block; width: 100%; background: currentColor; border-radius: 1px; }
    .time--tablet { padding-left: 22px; font-size: 13px; font-weight: 600; }
    .df[data-model='tablet'] .icons--ios { flex: none; padding: 0 22px 0 0; font-size: 12px; font-weight: 600; }
    .pct { margin-right: 2px; }
    .content { position: relative; flex: 1; min-height: 0; background: #fff; }
    .nav { position: relative; flex: none; display: flex; align-items: center; justify-content: center; transition: background-color .2s; }
    .pill { width: 134px; height: 5px; border-radius: 3px; background: rgb(0 0 0 / .85); }
    .pill--android { width: 108px; height: 4px; }
    .df[data-model='tablet'] .pill { width: 180px; height: 5px; }
    .nav--light .pill { background: rgb(255 255 255 / .9); }
  `,
})
export class DeviceFrameComponent {
  readonly model = input.required<DeviceModel>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  readonly chrome = input<DeviceChrome>(DEFAULT_CHROME);

  readonly spec = computed(() => SPECS[this.model()]);
  readonly outer = computed(() => deviceOuter(this.model(), this.width(), this.height()));
  readonly statusBg = computed(() => {
    const c = this.chrome();
    return this.model() === 'android' && c.barBackground ? c.barBackground : c.top;
  });
  readonly lightTop = computed(() => {
    const bar = this.chrome().bar;
    return bar === 'light' || (bar === 'auto' && isDark(this.statusBg()));
  });
  readonly lightBottom = computed(() => isDark(this.chrome().bottom));
  readonly buttons = computed(() => {
    switch (this.model()) {
      case 'iphone':
        return [
          { side: 'left', at: 120, len: 32 },
          { side: 'left', at: 180, len: 60 },
          { side: 'left', at: 252, len: 60 },
          { side: 'right', at: 210, len: 96 },
        ];
      case 'android':
        return [
          { side: 'right', at: 190, len: 66 },
          { side: 'right', at: 290, len: 118 },
        ];
      default:
        return [
          { side: 'top', at: 640, len: 60 },
          { side: 'right', at: 90, len: 56 },
          { side: 'right', at: 156, len: 56 },
        ];
    }
  });

  private readonly now = signal(new Date());
  readonly clock = computed(() => {
    const d = this.now();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  readonly day = computed(() => this.now().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const timer = setInterval(() => this.now.set(new Date()), 15000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
