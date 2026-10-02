import { Component, OnInit, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { BuilderService, ByokKey, ByokProvider } from './builder.service';

/** Buyer's own provider keys (BYOK). Stored encrypted by the API; only the last 4 characters come back. */
@Component({
  selector: 'app-byok-keys',
  standalone: true,
  imports: [FormsModule, DatePipe, TPipe],
  template: `
    <div class="space-y-3">
      <p class="text-xs text-muted">{{ 'builder.keys.hint' | t }}</p>
      @if (error()) {
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{{ error() }}</p>
      }
      <ul class="divide-y divide-line rounded-xl border border-line">
        @for (p of providers(); track p.id) {
          <li class="space-y-2 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-semibold">{{ p.label }}</p>
                @if (keyOf(p.id); as k) {
                  <p class="text-xs" [class.text-emerald-400]="k.status === 'active'" [class.text-red-400]="k.status !== 'active'">
                    {{ (k.status === 'active' ? 'builder.keys.active' : 'builder.keys.invalid') | t }} · ••••{{ k.last4 }}
                    @if (k.lastVerifiedAt) { · {{ k.lastVerifiedAt | date: 'short' }} }
                  </p>
                } @else {
                  <p class="text-xs text-muted">{{ 'builder.keys.none' | t }}</p>
                }
              </div>
              <div class="flex gap-2">
                @if (keyOf(p.id)) {
                  <button type="button" class="btn btn-outline text-xs" [disabled]="busy() === p.id" (click)="test(p)">{{ 'builder.keys.test' | t }}</button>
                  <button type="button" class="btn btn-outline text-xs text-red-400" [disabled]="busy() === p.id" (click)="remove(p)">
                    {{ 'builder.keys.delete' | t }}
                  </button>
                }
                <button type="button" class="btn btn-outline text-xs" (click)="toggle(p.id)">
                  {{ (editing() === p.id ? 'builder.keys.close' : keyOf(p.id) ? 'builder.keys.replace' : 'builder.keys.add') | t }}
                </button>
              </div>
            </div>
            @if (editing() === p.id) {
              <form class="grid gap-2" (ngSubmit)="save(p)">
                <input
                  class="input w-full font-mono text-xs"
                  type="password"
                  name="apiKey"
                  autocomplete="off"
                  [(ngModel)]="apiKey"
                  [placeholder]="p.keyHint || 'API key'"
                />
                @if (p.custom) {
                  <input class="input w-full text-xs" name="baseUrl" [(ngModel)]="baseUrl" placeholder="https://api.example.com/v1" />
                  <input class="input w-full text-xs" name="model" [(ngModel)]="model" placeholder="llama-3.3-70b" />
                }
                <div class="flex flex-wrap items-center gap-3">
                  <button class="btn btn-fill text-xs" type="submit" [disabled]="busy() === p.id || (!apiKey.trim() && !keyOf(p.id))">
                    {{ busy() === p.id ? ('builder.keys.verifying' | t) : ('builder.keys.save' | t) }}
                  </button>
                  @if (p.keyUrl) {
                    <a class="text-xs underline" [href]="p.keyUrl" target="_blank" rel="noopener noreferrer">{{ 'builder.keys.getKey' | t }}</a>
                  }
                </div>
              </form>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class ByokKeysComponent implements OnInit {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);

  readonly changed = output<ByokKey[]>();
  readonly providers = signal<ByokProvider[]>([]);
  readonly keys = signal<ByokKey[]>([]);
  readonly editing = signal('');
  readonly busy = signal('');
  readonly error = signal('');

  apiKey = '';
  baseUrl = '';
  model = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.providers().subscribe({
      next: (r) => {
        this.providers.set(r.providers || []);
        this.setKeys(r.keys || []);
      },
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  keyOf(provider: string): ByokKey | undefined {
    return this.keys().find((k) => k.provider === provider);
  }

  toggle(provider: string): void {
    const open = this.editing() === provider ? '' : provider;
    this.editing.set(open);
    const k = this.keyOf(provider);
    this.apiKey = '';
    this.baseUrl = k?.baseUrl || '';
    this.model = k?.model || '';
  }

  save(p: ByokProvider): void {
    this.busy.set(p.id);
    this.error.set('');
    const body = p.custom ? { apiKey: this.apiKey.trim(), baseUrl: this.baseUrl.trim(), model: this.model.trim() } : { apiKey: this.apiKey.trim() };
    this.api.saveKey(p.id, body).subscribe({
      next: (r) => {
        this.busy.set('');
        this.apiKey = '';
        this.editing.set('');
        this.setKeys([...this.keys().filter((k) => k.provider !== p.id), r.key]);
      },
      error: (e) => {
        this.busy.set('');
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  test(p: ByokProvider): void {
    this.busy.set(p.id);
    this.error.set('');
    this.api.testKey(p.id).subscribe({
      next: (r) => {
        this.busy.set('');
        this.setKeys(this.keys().map((k) => (k.provider === p.id ? r.key : k)));
      },
      error: (e) => {
        this.busy.set('');
        if (e?.error?.key) this.setKeys(this.keys().map((k) => (k.provider === p.id ? e.error.key : k)));
        this.error.set(`${p.label}: ${e?.error?.message || this.i18n.t('builder.err.generic')}`);
      },
    });
  }

  remove(p: ByokProvider): void {
    if (!confirm(this.i18n.t('builder.keys.confirmDelete', { provider: p.label }))) return;
    this.busy.set(p.id);
    this.api.deleteKey(p.id).subscribe({
      next: () => {
        this.busy.set('');
        this.setKeys(this.keys().filter((k) => k.provider !== p.id));
      },
      error: (e) => {
        this.busy.set('');
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  private setKeys(keys: ByokKey[]): void {
    this.keys.set(keys);
    this.changed.emit(keys);
  }
}
