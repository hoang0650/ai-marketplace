import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { LocalProviderError, LocalProviderService } from './local-provider.service';

const PRESETS = [
  { id: 'ollama', label: 'Ollama', url: 'http://localhost:11434/v1' },
  { id: 'lmstudio', label: 'LM Studio', url: 'http://localhost:1234/v1' },
  { id: 'llamacpp', label: 'llama.cpp', url: 'http://localhost:8080/v1' },
];

/** Builder keys drawer: configure a localhost OpenAI-compatible endpoint (browser → localhost). */
@Component({
  selector: 'app-local-provider-card',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <section class="lp">
      <header class="lp__head">
        <div>
          <h3>🖥 {{ 'builder.local.title' | t }}</h3>
          <p>{{ 'builder.local.sub' | t }}</p>
        </div>
        @if (local.config(); as c) {
          <span class="lp__badge">{{ 'builder.local.on' | t }}</span>
        }
      </header>

      <div class="lp__presets">
        @for (p of presets; track p.id) {
          <button type="button" [class.on]="baseUrl === p.url" (click)="baseUrl = p.url">{{ p.label }}</button>
        }
      </div>

      <label class="lp__field">
        <span>{{ 'builder.local.url' | t }}</span>
        <input class="input" [(ngModel)]="baseUrl" placeholder="http://localhost:11434/v1" autocomplete="off" spellcheck="false" />
      </label>
      <label class="lp__field">
        <span>{{ 'builder.local.model' | t }}</span>
        <input class="input" [(ngModel)]="model" list="lp-models" placeholder="qwen2.5-coder:7b" autocomplete="off" spellcheck="false" />
        <datalist id="lp-models">
          @for (m of models(); track m) {
            <option [value]="m"></option>
          }
        </datalist>
      </label>
      <label class="lp__field">
        <span>{{ 'builder.local.key' | t }}</span>
        <input
          class="input"
          type="password"
          [(ngModel)]="apiKey"
          [placeholder]="local.config()?.hasKey ? ('builder.local.keySaved' | t) : ('builder.local.keyOptional' | t)"
          autocomplete="off"
        />
      </label>
      <p class="lp__privacy">🔒 {{ 'builder.local.privacy' | t }}</p>

      <div class="lp__actions">
        <button type="button" class="btn btn-fill text-xs" [disabled]="busy()" (click)="save()">{{ 'builder.local.save' | t }}</button>
        <button type="button" class="btn btn-outline text-xs" [disabled]="busy()" (click)="test()">{{ busy() ? ('builder.local.testing' | t) : ('builder.local.test' | t) }}</button>
        @if (local.config()) {
          <button type="button" class="btn btn-ghost text-xs" (click)="remove()">{{ 'builder.local.remove' | t }}</button>
        }
      </div>
      @if (status(); as s) {
        <p class="lp__status" [class.lp__status--err]="s.error">{{ s.text }}</p>
      }

      <details class="lp__help" [open]="showHelp()">
        <summary>{{ 'builder.local.corsTitle' | t }}</summary>
        <p>{{ 'builder.local.corsWhy' | t: { origin: origin } }}</p>
        <p><strong>Ollama</strong></p>
        <pre>OLLAMA_ORIGINS={{ origin }} ollama serve</pre>
        <p class="lp__small">{{ 'builder.local.corsOllamaWin' | t }}</p>
        <pre>setx OLLAMA_ORIGINS "{{ origin }}"</pre>
        <p><strong>LM Studio</strong>: {{ 'builder.local.corsLmStudio' | t }}</p>
        <p><strong>llama.cpp / vLLM / LocalAI</strong>: {{ 'builder.local.corsOther' | t }}</p>
        <p class="lp__small">{{ 'builder.local.mixed' | t }}</p>
      </details>
    </section>
  `,
  styles: `
    .lp { display: grid; gap: .6rem; border: 1px solid rgba(127,127,127,.3); border-radius: 14px; padding: .9rem; margin-bottom: 1rem; }
    .lp__head { display: flex; justify-content: space-between; gap: .6rem; align-items: flex-start; }
    .lp__head h3 { margin: 0; font-size: .92rem; font-weight: 700; }
    .lp__head p { margin: .2rem 0 0; font-size: .78rem; opacity: .75; }
    .lp__badge { font-size: .7rem; font-weight: 700; color: #1b8a3a; background: #e7f6ec; border-radius: 999px; padding: .15rem .55rem; white-space: nowrap; }
    .lp__presets { display: flex; gap: .35rem; flex-wrap: wrap; }
    .lp__presets button { border: 1px solid rgba(127,127,127,.35); background: transparent; color: inherit; border-radius: 999px; padding: .2rem .7rem; font-size: .75rem; cursor: pointer; }
    .lp__presets button.on { border-color: currentColor; font-weight: 700; }
    .lp__field { display: grid; gap: .2rem; font-size: .78rem; }
    .lp__field span { opacity: .8; }
    .lp__privacy { margin: 0; font-size: .74rem; opacity: .75; }
    .lp__actions { display: flex; gap: .4rem; flex-wrap: wrap; }
    .lp__status { margin: 0; font-size: .78rem; color: #1b8a3a; word-break: break-word; }
    .lp__status--err { color: #e53935; }
    .lp__help { font-size: .76rem; }
    .lp__help summary { cursor: pointer; font-weight: 600; }
    .lp__help p { margin: .35rem 0; }
    .lp__help pre { margin: .2rem 0; padding: .45rem .6rem; border-radius: 8px; background: rgba(127,127,127,.12); white-space: pre-wrap; word-break: break-all; font-size: .72rem; }
    .lp__small { opacity: .7; }
  `,
})
export class LocalProviderCardComponent {
  readonly local = inject(LocalProviderService);
  private readonly i18n = inject(I18nService);
  readonly changed = output<void>();
  readonly presets = PRESETS;
  readonly origin = typeof location !== 'undefined' ? location.origin : 'https://aimarkets.vn';

  baseUrl = this.local.config()?.baseUrl || PRESETS[0].url;
  model = this.local.config()?.model || '';
  apiKey = '';
  readonly busy = signal(false);
  readonly models = signal<string[]>([]);
  readonly status = signal<{ text: string; error: boolean } | null>(null);
  readonly showHelp = signal(false);

  async save(): Promise<boolean> {
    try {
      await this.local.save({ baseUrl: this.baseUrl, model: this.model, apiKey: this.apiKey || undefined });
      this.apiKey = '';
      this.status.set({ text: this.i18n.t('builder.local.saved'), error: false });
      this.changed.emit();
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  async test(): Promise<void> {
    if (!(await this.save())) return;
    this.busy.set(true);
    try {
      const list = await this.local.listModels();
      this.models.set(list);
      if (!this.model && list[0]) {
        this.model = list[0];
        await this.local.save({ baseUrl: this.baseUrl, model: this.model });
        this.changed.emit();
      }
      this.status.set({ text: this.i18n.t('builder.local.ok', { n: list.length }), error: false });
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    await this.local.clear();
    this.apiKey = '';
    this.status.set(null);
    this.changed.emit();
  }

  private fail(e: unknown): void {
    if (e instanceof LocalProviderError) {
      if (e.code === 'LOCAL_UNREACHABLE') this.showHelp.set(true);
      const key = `builder.local.err.${e.code}`;
      const t = this.i18n.t(key);
      this.status.set({ text: t !== key ? (e.code === 'LOCAL_HTTP' ? `${t} (${e.message})` : t) : e.message, error: true });
      return;
    }
    this.status.set({ text: (e as Error)?.message || 'Error', error: true });
  }
}
