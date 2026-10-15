import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';
import { BuilderKind, BuilderProject, BuilderService, ByokKey, TemplateListing } from './builder.service';
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
              (click)="setKind(k)"
            >
              <p class="font-semibold">{{ 'builder.kind.' + k | t }}</p>
              <p class="max-w-xs text-xs text-muted">{{ 'builder.kind.' + k + '.hint' | t }}</p>
            </button>
          }
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold">{{ 'builder.tpl.startFrom' | t }}</p>
            <a class="text-xs text-accent hover:underline" [routerLink]="'/template-' + kind()">{{ 'builder.tpl.browseAll' | t }} →</a>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              class="w-44 shrink-0 rounded-xl border p-3 text-left"
              [class.border-line]="!!selected()"
              [class.border-accent]="!selected()"
              [class.ring-2]="!selected()"
              (click)="selected.set(null)"
            >
              <p class="text-2xl">✨</p>
              <p class="mt-1 text-sm font-semibold">{{ 'builder.tpl.blank' | t }}</p>
              <p class="text-xs text-muted">{{ 'builder.tpl.blankHint' | t }}</p>
            </button>
            @for (row of kindTemplates(); track row.product.id) {
              <div
                class="w-52 shrink-0 overflow-hidden rounded-xl border"
                [class.border-line]="selected()?.product?.id !== row.product.id"
                [class.border-accent]="selected()?.product?.id === row.product.id"
                [class.ring-2]="selected()?.product?.id === row.product.id"
              >
                @if (row.product.coverUrl) {
                  <img [src]="row.product.coverUrl" alt="" class="h-24 w-full object-cover" loading="lazy" />
                } @else {
                  <div class="grid h-24 place-items-center bg-white/5 text-3xl">{{ row.template.kind === 'app' ? '📱' : '🖥️' }}</div>
                }
                <div class="space-y-1 p-3">
                  <p class="truncate text-sm font-semibold" [title]="row.product.name">{{ row.product.name }}</p>
                  <p class="truncate text-xs text-muted">
                    {{ row.product.creatorName }} ·
                    @if (row.template.access) {
                      <span class="text-emerald-400">{{ 'builder.tpl.owned' | t }}</span>
                    } @else {
                      {{ priceLabel(row) }}
                    }
                  </p>
                  <div class="flex gap-1.5 pt-1">
                    @if (row.template.access) {
                      <button type="button" class="btn btn-fill px-2 py-1 text-xs" (click)="selected.set(row)">{{ 'builder.tpl.pick' | t }}</button>
                    } @else {
                      <a class="btn btn-fill px-2 py-1 text-xs" [routerLink]="['/product', row.product.slug]">{{ 'builder.tpl.buy' | t }}</a>
                    }
                    @if (row.template.demoUrl) {
                      <a class="btn btn-outline px-2 py-1 text-xs" [href]="row.template.kind === 'app' && row.template.simulatorUrl ? row.template.simulatorUrl : row.template.demoUrl" target="_blank" rel="noopener">{{ 'builder.tpl.demo' | t }}</a>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <p class="self-center text-xs text-muted">{{ 'builder.tpl.none' | t }}</p>
            }
          </div>
        </div>

        <textarea
          class="input min-h-[7rem] w-full"
          name="prompt"
          [(ngModel)]="prompt"
          maxlength="8000"
          [placeholder]="(selected() ? 'builder.tpl.promptPh' : 'builder.promptPh.' + kind()) | t"
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
          <button class="btn btn-fill" type="submit" [disabled]="!canSubmit()">
            {{ busy() ? ('builder.creating' | t) : ((selected() ? 'builder.tpl.useStart' : 'builder.startBuild') | t) }}
          </button>
        </div>
        @if (!hasKey() && loaded() && !selected()) {
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
                @if (p.template) {
                  <p class="mt-1 truncate text-xs text-muted">{{ 'builder.tpl.from' | t: { name: p.template.name } }}</p>
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
  readonly templates = signal<TemplateListing[]>([]);
  readonly kindTemplates = computed(() => this.templates().filter((t) => t.template.kind === this.kind()));
  readonly selected = signal<TemplateListing | null>(null);

  prompt = '';
  name = '';

  /** Opening a template as-is needs no AI key; restyling it with a prompt does. */
  canSubmit(): boolean {
    if (this.busy()) return false;
    const hasPrompt = !!this.prompt.trim();
    if (this.selected()) return !hasPrompt || this.hasKey();
    return hasPrompt && this.hasKey();
  }

  setKind(k: BuilderKind): void {
    this.kind.set(k);
    if (this.selected()?.template.kind !== k) this.selected.set(null);
  }

  priceLabel(row: TemplateListing): string {
    const pr = row.product.pricing;
    if (!pr || pr.model === 'free' || !(Number(pr.price) > 0)) return this.i18n.t('builder.tpl.free');
    return `$${Number(pr.price).toFixed(2)}`;
  }

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
    this.api.templates().subscribe({
      next: (r) => {
        this.templates.set(r.templates || []);
        const wanted = this.route.snapshot.queryParamMap.get('template');
        const row = wanted ? r.templates.find((t) => t.product.id === wanted && t.template.access) : null;
        if (row) {
          this.kind.set(row.template.kind);
          this.selected.set(row);
        }
      },
      error: () => this.templates.set([]),
    });
  }

  useIdea(key: string): void {
    this.prompt = this.i18n.t(key);
  }

  onKeys(keys: ByokKey[]): void {
    this.keys.set(keys);
  }

  create(): void {
    if (!this.canSubmit()) return;
    const prompt = this.prompt.trim();
    const tpl = this.selected();
    if (tpl) {
      this.busy.set(true);
      this.error.set('');
      this.api.useTemplate(tpl.product.id, this.name.trim() || undefined).subscribe({
        next: (r) => {
          this.busy.set(false);
          this.router.navigate(['/build', r.project.id], prompt ? { state: { prompt } } : {});
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
        },
      });
      return;
    }
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
