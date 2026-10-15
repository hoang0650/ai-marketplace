import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LicensedItem, TrainingService } from '../../services/api.services';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';

/** Tabs of /training. Each tab is its own child route, so /training/dataset etc. are deep-linkable. */
export const TRAINING_TABS = [
  { id: 'train', path: '/training', labelKey: 'train.tab.train', exact: true },
  { id: 'dataset', path: '/training/dataset', labelKey: 'train.tab.dataset', exact: false },
  { id: 'voice-clone', path: '/training/voice-clone', labelKey: 'cat.voice-clone.label', exact: false },
  { id: 'voice-preset', path: '/training/voice-preset', labelKey: 'cat.voice-preset.label', exact: false },
  { id: 'gpu', path: '/training/gpu', labelKey: 'nav.gpuRent', exact: false },
] as const;

/**
 * Training hub: Huấn luyện / Fine-tune, Dataset, Giọng clone, Giọng sẵn, Thuê GPU.
 * Reuses the existing pages (TrainingStudio, CategoryHub, GpuRent) inside a router outlet.
 * `/training?tab=dataset` is accepted too and normalised to `/training/dataset`.
 */
@Component({
  selector: 'app-training-hub',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, DatePipe],
  template: `
    <div class="th">
      <nav class="th__tabs" role="tablist" [attr.aria-label]="'train.hub.title' | t">
        @for (t of tabs; track t.id) {
          <a
            role="tab"
            class="th__tab"
            [routerLink]="t.path"
            routerLinkActive="th__tab--on"
            #rla="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: t.exact }"
            [attr.aria-selected]="rla.isActive"
            queryParamsHandling=""
          >{{ t.labelKey | t }}</a>
        }
      </nav>
      @if (ownedVoices().length) {
        <section class="th__owned" [attr.aria-label]="'train.owned.voices' | t">
          <p class="th__owned-title">{{ 'train.owned.title' | t }} <span>· {{ 'train.owned.voicesHint' | t }}</span></p>
          <div class="th__owned-row">
            @for (v of ownedVoices(); track v.productId) {
              <a class="th__voice" [routerLink]="v.category === 'dataset' ? ['/training'] : ['/product', v.slug]">
                <strong>{{ v.category === 'dataset' ? '🗂️' : '🎙️' }} {{ v.name }}</strong>
                <small>{{ 'train.owned.expires' | t: { d: ((v.expiresAt | date: 'dd/MM/yyyy') || '') } }}</small>
                <em>{{ (v.category === 'dataset' ? 'train.owned.use' : 'train.owned.useVoice') | t }} →</em>
              </a>
            }
          </div>
        </section>
      }
    </div>
    <router-outlet />
  `,
  styles: `
    .th { max-width: 72rem; margin: 0 auto; padding: 1rem 1rem 0; }
    .th__tabs { display: flex; gap: .4rem; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--color-line, rgba(127,127,127,.25)); padding-bottom: .5rem; }
    .th__tabs::-webkit-scrollbar { display: none; }
    .th__tab { white-space: nowrap; border-radius: 999px; padding: .45rem .95rem; font-size: .88rem; font-weight: 600; text-decoration: none; color: inherit; border: 1px solid var(--color-line, rgba(127,127,127,.3)); }
    .th__tab:hover { background: var(--color-mist, rgba(127,127,127,.08)); }
    .th__owned { margin-top: .9rem; }
    .th__owned-title { margin: 0 0 .45rem; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
    .th__owned-title span { text-transform: none; letter-spacing: 0; font-weight: 400; }
    .th__owned-row { display: flex; gap: .6rem; overflow-x: auto; }
    .th__voice { display: grid; gap: .1rem; min-width: 11rem; border: 1px solid var(--color-line, rgba(127,127,127,.3)); border-radius: 12px; padding: .6rem .8rem; text-decoration: none; color: inherit; font-size: .85rem; }
    .th__voice small { opacity: .65; }
    .th__voice em { font-style: normal; font-weight: 700; font-size: .78rem; }
    .th__tab--on { background: var(--color-ink, #111); color: var(--color-paper, #fff); border-color: transparent; }
  `,
})
export class TrainingHubComponent {
  readonly tabs = TRAINING_TABS;
  private readonly voices = signal<LicensedItem[]>([]);
  private readonly url = signal('');
  /** On the voice tabs: the voices this user holds a license for (Giọng clone / Giọng sẵn). */
  readonly ownedVoices = computed(() => {
    const u = this.url();
    const cat = u.includes('/training/dataset') ? 'dataset' : u.includes('/training/voice-clone') ? 'voice-clone' : u.includes('/training/voice-preset') ? 'voice-preset' : '';
    return cat ? this.voices().filter((v) => v.category === cat) : [];
  });

  constructor() {
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    this.url.set(router.url);
    const sub = router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.url.set(router.url));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
    if (isPlatformBrowser(inject(PLATFORM_ID)) && inject(AuthService).isAuthenticated()) {
      inject(TrainingService).licensed().subscribe({ next: (r) => this.voices.set([...(r.datasets || []), ...(r.voices || [])]), error: () => undefined });
    }
    const tab = route.snapshot.queryParamMap.get('tab');
    const hit = TRAINING_TABS.find((t) => t.id === tab);
    if (hit) {
      const rest = { ...route.snapshot.queryParams };
      delete rest['tab'];
      void router.navigate([hit.path], { queryParams: rest, replaceUrl: true });
    }
  }
}
