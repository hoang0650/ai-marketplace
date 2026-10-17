import { Component, inject } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { StudioPanelComponent } from './studio-panel.component';

@Component({
  selector: 'app-talking-avatar',
  standalone: true,
  imports: [StudioPanelComponent, TPipe],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">{{ 'studio.title.talking' | t }}</h1>
      <p class="mt-2 max-w-2xl text-muted">{{ 'studio.page.talking' | t }}</p>
      <div class="mt-6"><app-studio-panel mode="talking" /></div>
    </section>
  `,
})
export class TalkingAvatarComponent {
  constructor() {
    const i18n = inject(I18nService);
    inject(SeoService).set({ title: i18n.t('studio.title.talking'), description: i18n.t('studio.page.talking') });
  }
}
