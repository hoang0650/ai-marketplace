import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';
import { BuilderKind, BuilderProject, BuilderService, ByokKey } from './builder.service';
import { ByokKeysComponent } from './byok-keys.component';

const IDEAS: Record<BuilderKind, string[]> = {
  web: ['builder.idea.web.1', 'builder.idea.web.2', 'builder.idea.web.3', 'builder.idea.web.4'],
  app: ['builder.idea.app.1', 'builder.idea.app.2', 'builder.idea.app.3', 'builder.idea.app.4'],
};

@Component({
  selector: 'app-builder-home',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe, ByokKeysComponent],
  template: `
    <section class="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header class="space-y-2">
        <h1 class="font-display text-3xl">{{ 'builder.title' | t }}</h1>
        <p class="max-w-3xl text-sm text-muted">{{ 'builder.subtitle' | t }}</p>
      </header>

      @if (error()) {
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error() }}</p>
      }

      @if (loaded() && !hasKey()) {
        <div class="panel space-y-3 border-amber-500/40">
          <h2 class="font-display text-xl">{{ 'builder.needKey.title' | t }}</h2>
          <p class="text-sm text-muted">{{ 'builder.needKey.body' | t }}</p>
          <app-byok-keys (changed)="onKeys($event)" />
        </div>
      }

      <form class="panel space-y-4" (ngSubmit)="create()">
        <div class="flex flex-wrap gap-2" role="tablist">
          @for (k of kinds; track k) {
            <button
              type="button"
              role="tab"
              class="rounded-xl border px-4 py-3 text-left"
              [class.border-line]="kind() !== k"
              [class.border-accent]="kind() === k"
              [class.ring-2]="kind() === k"
              [attr.aria-selected]="kind() === k"
              (click)="kind.set(k)"
            >
              <p class="font-semibold">{{ 'builder.kind.' + k | t }}</p>
              <p class="max-w-xs text-xs text-muted">{{ 'builder.kind.' + k + '.hint' | t }}</p>
            </button>
          }
        </div>
        <textarea
          class="input min-h-[7rem] w-full"
          name="prompt"
          [(ngModel)]="prompt"
          maxlength="8000"
          [placeholder]="'builder.promptPh.' + kind() | t"
        ></textarea>
        <div class="flex flex-wrap gap-2">
          @for (idea of ideas(); track idea) {
            <button type="button" class="rounded-full border border-line px-3 py-1 text-xs hover:border-accent" (click)="useIdea(idea)">
              {{ idea | t }}
            </button>
          }
        </div>
        <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input class="input" name="name" [(ngModel)]="name" maxlength="80" [placeholder]="'builder.namePh' | t" />
          <button class="btn btn-fill" type="submit" [disabled]="busy() || !hasKey() || !prompt.trim()">
            {{ busy() ? ('builder.creating' | t) : ('builder.startBuild' | t) }}
          </button>
        </div>
        @if (!hasKey() && loaded()) {
          <p class="text-xs text-amber-400">{{ 'builder.needKey.short' | t }}</p>
        }
      </form>

      <div class="panel">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-display text-xl">{{ 'builder.projects' | t }}</h2>
          <button type="button" class="btn btn-outline text-xs" (click)="showKeys.set(!showKeys())">{{ 'builder.keys.manage' | t }}</button>
        </div>
        @if (showKeys() && hasKey()) {
          <div class="mt-4"><app-byok-keys (changed)="onKeys($event)" /></div>
        }
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (p of projects(); track p.id) {
            <li class="flex flex-col justify-between gap-3 rounded-xl border border-line p-4">
              <div>
                <p class="font-semibold">{{ p.name }}</p>
                <p class="mt-1 text-xs text-muted">
                  {{ 'builder.kind.' + p.kind | t }} · {{ p.fileCount }} {{ 'builder.files' | t }} · {{ p.updatedAt | date: 'short' }}
                </p>
                @if (p.model) {
                  <p class="mt-1 truncate text-xs text-muted">{{ p.provider }} / {{ p.model }}</p>
                }
              </div>
              <div class="flex gap-2">
                <a class="btn btn-fill text-xs" [routerLink]="['/build', p.id]">{{ 'builder.open' | t }}</a>
                <button type="button" class="btn btn-outline text-xs text-red-400" (click)="remove(p)">{{ 'builder.delete' | t }}</button>
              </div>
            </li>
          } @empty {
            <li class="text-sm text-muted">{{ 'builder.noProjects' | t }}</li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class BuilderHomeComponent implements OnInit {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly kinds: BuilderKind[] = ['web', 'app'];
  readonly kind = signal<BuilderKind>('web');
  readonly ideas = computed(() => IDEAS[this.kind()]);
  readonly projects = signal<BuilderProject[]>([]);
  readonly keys = signal<ByokKey[]>([]);
  readonly hasKey = computed(() => this.keys().some((k) => k.status === 'active'));
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showKeys = signal(false);

  prompt = '';
  name = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('builder.title'), description: this.i18n.t('builder.subtitle') });
    const k = this.route.snapshot.queryParamMap.get('kind');
    if (k === 'web' || k === 'app') this.kind.set(k);
    if (!this.browser) return;
    this.api.providers().subscribe({
      next: (r) => {
        this.keys.set(r.keys || []);
        this.loaded.set(true);
      },
      error: (e) => {
        this.loaded.set(true);
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
    this.api.list().subscribe({
      next: (r) => this.projects.set(r.projects || []),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  useIdea(key: string): void {
    this.prompt = this.i18n.t(key);
  }

  onKeys(keys: ByokKey[]): void {
    this.keys.set(keys);
  }

  create(): void {
    const prompt = this.prompt.trim();
    if (!prompt || !this.hasKey()) return;
    const active = this.keys().find((k) => k.status === 'active');
    const name = this.name.trim() || prompt.split(/[.\n]/)[0].slice(0, 60) || this.i18n.t('builder.kind.' + this.kind());
    this.busy.set(true);
    this.error.set('');
    this.api.create({ name, kind: this.kind(), provider: active?.provider }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.router.navigate(['/build', r.project.id], { state: { prompt } });
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  remove(p: BuilderProject): void {
    if (!confirm(this.i18n.t('builder.confirmDelete', { name: p.name }))) return;
    this.api.remove(p.id).subscribe({
      next: () => this.projects.update((rows) => rows.filter((x) => x.id !== p.id)),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }
}
