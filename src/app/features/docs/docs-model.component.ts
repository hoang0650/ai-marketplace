import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { PlaygroundService, RunpodService } from '../../services/api.services';
import { RunpodPublicEndpoint } from '../../models/runpod-public-endpoints';
import { RunpodModelSchema } from '../../models/runpod-schema';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-docs-model',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './docs-model.component.html',
  styleUrl: './docs-model.component.scss',
})
export class DocsModelComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly runpod = inject(RunpodService);
  private readonly playground = inject(PlaygroundService);

  readonly apiBase = environment.apiUrl.replace(/\/v1\/?$/, '/v1');
  readonly aiBase = environment.aiV1Url;
  model: RunpodPublicEndpoint | null = null;
  schema: RunpodModelSchema | null = null;
  notFound = false;
  copied = '';

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.runpod.bySlug(slug).subscribe({
      next: (ep) => {
        this.model = ep;
        this.seo.set({
          title: `${ep.name} · ${this.i18n.t('docsModels.short')}`,
          description: ep.description,
        });
        this.playground.modelSchema(ep.slug).subscribe({
          next: (schema) => {
            this.schema = schema;
          },
          error: () => {
            this.schema = null;
          },
        });
      },
      error: () => {
        this.notFound = true;
        this.seo.set({ title: this.i18n.t('docsModels.notFound') });
      },
    });
  }

  samplePayload(): Record<string, unknown> {
    const kind = this.model?.kind;
    if (kind === 'video') {
      return { input: { prompt: 'A cinematic drone shot over misty mountains', duration: 5 } };
    }
    if (kind === 'audio') {
      return { input: { prompt: 'A calm narrator reading a short welcome.' } };
    }
    if (kind === 'text') {
      return { input: { prompt: 'Explain retrieval-augmented generation in two sentences.' } };
    }
    return { input: { prompt: 'A serene mountain landscape at golden hour, photorealistic' } };
  }

  curlRunsync(): string {
    const url = this.model?.runsyncUrl || `${this.apiBase}/models/${this.model?.slug}/runsync`;
    return `curl -X POST "${url}" \\
  -H "Authorization: Bearer $MARKETPLACE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(this.samplePayload())}'`;
  }

  curlRun(): string {
    const url = this.model?.runUrl || `${this.apiBase}/models/${this.model?.slug}/run`;
    return `curl -X POST "${url}" \\
  -H "Authorization: Bearer $MARKETPLACE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(this.samplePayload())}'`;
  }

  curlStatus(): string {
    const url = (this.model?.statusUrlTemplate || `${this.apiBase}/models/${this.model?.slug}/status/{JOB_ID}`).replace(
      '{JOB_ID}',
      '$JOB_ID',
    );
    return `curl "${url}" \\
  -H "Authorization: Bearer $MARKETPLACE_JWT"`;
  }

  curlOpenai(): string {
    const model = this.model?.openaiModel || this.model?.slug || 'model';
    return `curl -X POST "${this.aiBase}/chat/completions" \\
  -H "Authorization: Bearer $MARKETPLACE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model}","messages":[{"role":"user","content":"Hello"}]}'`;
  }

  paramRows(): Array<{ name: string; type: string; required: string; doc: string }> {
    if (!this.schema?.params) return [];
    return Object.entries(this.schema.params).map(([name, spec]) => ({
      name,
      type: spec.type,
      required: spec.required ? 'yes' : 'no',
      doc: spec.doc || (spec.enum ? spec.enum.join(', ') : spec.default !== undefined ? String(spec.default) : ''),
    }));
  }

  async copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = key;
      setTimeout(() => {
        if (this.copied === key) this.copied = '';
      }, 1600);
    } catch {
      this.copied = '';
    }
  }
}
