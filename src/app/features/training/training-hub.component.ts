import { Component, inject } from '@angular/core';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
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
    </div>
    <router-outlet />
  `,
  styles: `
    .th { max-width: 72rem; margin: 0 auto; padding: 1rem 1rem 0; }
    .th__tabs { display: flex; gap: .4rem; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--color-line, rgba(127,127,127,.25)); padding-bottom: .5rem; }
    .th__tabs::-webkit-scrollbar { display: none; }
    .th__tab { white-space: nowrap; border-radius: 999px; padding: .45rem .95rem; font-size: .88rem; font-weight: 600; text-decoration: none; color: inherit; border: 1px solid var(--color-line, rgba(127,127,127,.3)); }
    .th__tab:hover { background: var(--color-mist, rgba(127,127,127,.08)); }
    .th__tab--on { background: var(--color-ink, #111); color: var(--color-paper, #fff); border-color: transparent; }
  `,
})
export class TrainingHubComponent {
  readonly tabs = TRAINING_TABS;

  constructor() {
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const tab = route.snapshot.queryParamMap.get('tab');
    const hit = TRAINING_TABS.find((t) => t.id === tab);
    if (hit) {
      const rest = { ...route.snapshot.queryParams };
      delete rest['tab'];
      void router.navigate([hit.path], { queryParams: rest, replaceUrl: true });
    }
  }
}
