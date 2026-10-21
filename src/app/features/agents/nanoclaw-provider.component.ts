import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { BuilderService, ByokKey, ByokProvider } from '../builder/builder.service';
import { ByokKeysComponent } from '../builder/byok-keys.component';

interface ProviderSelection {
  provider: string;
  model: string;
  updatedAt?: string;
}

/** Lets the buyer run NanoClaw or Hermes on one of their own BYOK keys. Platform keys are never copied in. */
@Component({
  selector: 'app-nanoclaw-provider',
  standalone: true,
  imports: [FormsModule, ByokKeysComponent],
  template: `
    <div class="panel agents-panel mt-4">
      <h2 class="font-display text-xl">AI provider</h2>
      <p class="text-sm text-muted">
        Run this agent on your own API key (OpenAI, Anthropic, Gemini, OpenRouter…). The key stays encrypted in your
        account and is not shared with other buyers. NanoClaw falls back to the AI Markets model when this is unset;
        Hermes only runs after you choose a key here.
      </p>

      @if (!auth.isAuthenticated()) {
        <p class="mt-3 text-sm text-muted">Sign in to use your own API key.</p>
      } @else {
        <p class="mt-3 text-sm">
          @if (selection(); as s) {
            Current: <strong>{{ labelOf(s.provider) }}</strong> · <code class="font-mono">{{ s.model }}</code>
          } @else {
            Current: {{ runtime() === 'hermes' ? 'no key yet — Hermes will not call a model' : 'AI Markets default model' }}.
          }
        </p>

        @if (usable().length) {
          <form class="mt-4 grid gap-3" (ngSubmit)="save()">
            <label class="text-xs uppercase tracking-wider text-muted" for="nanoclaw-provider">Provider</label>
            <select
              id="nanoclaw-provider"
              class="input"
              name="provider"
              [(ngModel)]="provider"
              (ngModelChange)="onProviderChange()"
            >
              @for (p of usable(); track p.id) {
                <option [value]="p.id">{{ p.label }}</option>
              }
            </select>
            <label class="text-xs uppercase tracking-wider text-muted" for="nanoclaw-model">Model</label>
            <input
              id="nanoclaw-model"
              class="input font-mono"
              name="model"
              list="nanoclaw-models"
              autocomplete="off"
              [(ngModel)]="model"
              [placeholder]="modelPlaceholder()"
            />
            <datalist id="nanoclaw-models">
              @for (m of models(); track m) {
                <option [value]="m"></option>
              }
            </datalist>
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="agents-btn agents-btn--primary" [disabled]="busy() || !provider">
                {{ busy() ? 'Saving…' : 'Use this key' }}
              </button>
              @if (selection() && runtime() !== 'hermes') {
                <button type="button" class="agents-btn agents-btn--ghost" (click)="clear()" [disabled]="busy()">
                  Use AI Markets default
                </button>
              }
              @if (selection() && runtime() === 'hermes') {
                <button type="button" class="agents-btn agents-btn--ghost" (click)="clear()" [disabled]="busy()">
                  Remove key
                </button>
              }
            </div>
          </form>
        } @else {
          <p class="mt-3 text-sm text-muted">Add and verify an API key below, then choose it here.</p>
        }

        @if (error()) {
          <p class="mt-3 text-sm text-red-400">{{ error() }}</p>
        }
        @if (message()) {
          <p class="mt-3 text-sm text-emerald-400">{{ message() }}</p>
        }
        <p class="mt-3 text-xs text-muted">
          Takes effect the next time the agent starts. A conversation already running keeps its current key until
          restart. Usage on your key is billed by the provider, not by AI Markets.
        </p>

        <button type="button" class="agents-btn agents-btn--ghost mt-4" (click)="showKeys.set(!showKeys())">
          {{ showKeys() ? 'Hide API keys' : 'Manage API keys' }}
        </button>
        @if (showKeys()) {
          <div class="mt-3">
            <app-byok-keys (changed)="onKeys($event)" />
          </div>
        }
      }
    </div>
  `,
})
export class NanoclawProviderComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly builder = inject(BuilderService);
  /** Which hosted agent this panel configures. */
  readonly runtime = input<'nanoclaw' | 'hermes'>('nanoclaw');

  readonly providers = signal<ByokProvider[]>([]);
  readonly keys = signal<ByokKey[]>([]);
  readonly selection = signal<ProviderSelection | null>(null);
  readonly models = signal<string[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly showKeys = signal(false);

  /** Providers the buyer holds a verified key for. */
  readonly usable = computed(() =>
    this.providers().filter((p) => this.keys().some((k) => k.provider === p.id && k.status === 'active')),
  );

  provider = '';
  model = '';

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) return;
    this.builder.providers().subscribe({
      next: (r) => {
        this.providers.set(r.providers || []);
        this.keys.set(r.keys || []);
        this.http.get<{ selection: ProviderSelection | null }>(this.endpoint()).subscribe({
          next: (s) => {
            this.selection.set(s.selection || null);
            this.syncForm();
          },
          error: (e) => this.error.set(e?.error?.message || 'Could not load the provider setting.'),
        });
      },
      error: (e) => this.error.set(e?.error?.message || 'Could not load your API keys.'),
    });
  }

  labelOf(id: string): string {
    return this.providers().find((p) => p.id === id)?.label || id;
  }

  modelPlaceholder(): string {
    const p = this.providers().find((x) => x.id === this.provider);
    const key = this.keys().find((k) => k.provider === this.provider);
    return p?.defaultModel || key?.model || 'model id';
  }

  onKeys(keys: ByokKey[]): void {
    this.keys.set(keys);
    if (!this.usable().some((p) => p.id === this.provider)) this.syncForm();
  }

  onProviderChange(): void {
    this.model = this.defaultModelFor(this.provider);
    this.loadModels();
  }

  save(): void {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http
      .put<{ selection: ProviderSelection }>(this.endpoint(), { provider: this.provider, model: this.model.trim() })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.selection.set(r.selection);
          this.model = r.selection.model;
          const name = this.runtime() === 'hermes' ? 'Hermes' : 'NanoClaw';
          this.message.set(`${name} now uses ${this.labelOf(r.selection.provider)} · ${r.selection.model}.`);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(e?.error?.message || 'Could not save the provider.');
        },
      });
  }

  clear(): void {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.delete(this.endpoint()).subscribe({
      next: () => {
        this.busy.set(false);
        this.selection.set(null);
        this.message.set(
          this.runtime() === 'hermes'
            ? 'Hermes will not call a model until you choose a key.'
            : 'NanoClaw is back on the AI Markets default model.',
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || 'Could not reset the provider.');
      },
    });
  }

  private syncForm(): void {
    const usable = this.usable();
    const current = this.selection();
    if (current && usable.some((p) => p.id === current.provider)) {
      this.provider = current.provider;
      this.model = current.model;
    } else {
      this.provider = usable[0]?.id || '';
      this.model = this.defaultModelFor(this.provider);
    }
    if (!usable.length) this.showKeys.set(true);
    this.loadModels();
  }

  private defaultModelFor(provider: string): string {
    const p = this.providers().find((x) => x.id === provider);
    const key = this.keys().find((k) => k.provider === provider);
    return (p?.custom ? key?.model : p?.defaultModel) || key?.model || '';
  }

  private endpoint(): string {
    return `${environment.apiUrl}/${this.runtime()}/provider`;
  }

  private loadModels(): void {
    this.models.set([]);
    const provider = this.provider;
    if (!provider) return;
    this.builder.models(provider).subscribe({
      next: (r) => {
        if (this.provider === provider) this.models.set(r.models || []);
      },
      error: () => undefined,
    });
  }
}
