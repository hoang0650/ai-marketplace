import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { RunpodService } from '../../services/api.services';
import { RunpodPublicEndpoint } from '../../models/runpod-public-endpoints';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-docs-models',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './docs-models.component.html',
  styleUrl: './docs-models.component.scss',
})
export class DocsModelsComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly runpod = inject(RunpodService);

  readonly apiBase = environment.apiUrl.replace(/\/v1\/?$/, '/v1');
  readonly aiBase = environment.aiV1Url;
  models: RunpodPublicEndpoint[] = [];
  kinds: Array<RunpodPublicEndpoint['kind'] | 'all'> = ['all', 'image', 'video', 'text', 'audio'];
  kind: RunpodPublicEndpoint['kind'] | 'all' = 'all';

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('docsModels.title'),
      description: this.i18n.t('docsModels.lede'),
    });
    this.runpod.publicEndpoints().subscribe({
      next: (rows) => {
        this.models = rows;
      },
      error: () => {
        this.models = [];
      },
    });
  }

  filtered(): RunpodPublicEndpoint[] {
    if (this.kind === 'all') return this.models;
    return this.models.filter((m) => m.kind === this.kind);
  }

  setKind(kind: RunpodPublicEndpoint['kind'] | 'all'): void {
    this.kind = kind;
  }
}
