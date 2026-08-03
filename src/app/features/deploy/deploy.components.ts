import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeploymentService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { Deployment, InvokeResult } from '../../models/deployment.models';

/** Model modalities shown in the Featherless-style catalog. */
const MODEL_CATEGORIES = [
  'text-to-text',
  'text-to-video',
  'image-to-video',
  'text-to-image',
  'image-to-image',
  'inference',
  'fine-tune',
];

/* ------------------------------------------------------------------ */
/*  AI MODELS HUB — Featherless-style serverless model catalog         */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-models-hub',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Serverless inference</p>
          <h1 class="section-title mt-1">AI Models</h1>
          <p class="mt-2 max-w-2xl text-muted">
            Deploy any model with one click — pay per token, no idle cost. Configure, get an endpoint
            + API key, and meter every request.
          </p>
        </div>
        <a routerLink="/deployments" class="btn-ghost">My deployments →</a>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <input
          type="search"
          class="input w-full max-w-sm rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink"
          placeholder="Search models…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        @for (c of categories; track c) {
          <button
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs transition"
            [class.border-accent]="cat() === c"
            [class.text-accent]="cat() === c"
            [class.border-line]="cat() !== c"
            [class.text-muted]="cat() !== c"
            (click)="toggleCat(c)"
          >
            {{ c }}
          </button>
        }
      </div>

      <div class="mt-8 overflow-hidden rounded-xl border border-line">
        <div class="hidden grid-cols-12 gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
          <span class="col-span-4">Model</span>
          <span class="col-span-2">Modality</span>
          <span class="col-span-2">Creator</span>
          <span class="col-span-2 text-right">Price / 1K tokens</span>
          <span class="col-span-2 text-right">Deploy</span>
        </div>
        @for (p of filtered(); track p.id) {
          <div class="grid grid-cols-1 items-center gap-3 border-b border-line px-4 py-4 transition hover:bg-line/20 md:grid-cols-12">
            <div class="col-span-4">
              <a [routerLink]="['/product', p.slug]" class="font-medium text-ink hover:text-accent">{{ p.name }}</a>
              <p class="mt-0.5 line-clamp-1 text-xs text-muted">{{ p.tagline }}</p>
            </div>
            <div class="col-span-2">
              <span class="rounded bg-line/40 px-2 py-0.5 text-xs text-muted">{{ p.category }}</span>
            </div>
            <div class="col-span-2 text-sm text-muted">{{ p.creatorName }}</div>
            <div class="col-span-2 text-left text-sm text-ink md:text-right">
              @if (p.pricing.model === 'usage') {
                <strong>\${{ p.pricing.usageRate | number: '1.2-4' }}</strong>
              } @else if (p.pricing.model === 'free') {
                <strong class="text-accent">Free</strong>
              } @else {
                <strong>\${{ p.pricing.price | number: '1.0-2' }}</strong>
                <span class="text-xs text-muted"> {{ p.pricing.model }}</span>
              }
            </div>
            <div class="col-span-2 md:text-right">
              <a [routerLink]="['/deploy', p.slug]" class="btn-primary inline-flex text-sm">Deploy</a>
            </div>
          </div>
        } @empty {
          <p class="px-4 py-10 text-center text-muted">No models match your filters.</p>
        }
      </div>
    </section>
  `,
})
export class ModelsHubComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly categories = MODEL_CATEGORIES;
  readonly products = signal<Product[]>([]);
  readonly q = signal('');
  readonly cat = signal<string | null>(null);

  readonly filtered = computed(() => {
    const q = this.q().toLowerCase();
    const cat = this.cat();
    return this.products().filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!q || `${p.name} ${p.tagline} ${p.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.seo.set({
      title: 'AI Models — serverless deploy',
      description: 'Deploy AI models serverless, pay per token.',
    });
    this.productsApi.list().subscribe((items) => {
      this.products.set(items.filter((p) => MODEL_CATEGORIES.includes(p.category)));
    });
  }

  toggleCat(c: string): void {
    this.cat.set(this.cat() === c ? null : c);
  }
}

/* ------------------------------------------------------------------ */
/*  DEPLOY WIZARD — configure & launch a model/agent deployment        */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-deploy-wizard',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <section class="page route-enter mx-auto max-w-3xl">
      <p class="text-xs text-muted">
        <a routerLink="/models" class="hover:text-accent">AI Models</a> / Deploy
      </p>

      @if (created(); as dep) {
        <div class="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-6">
          <h1 class="text-xl font-semibold text-ink">🚀 {{ dep.name }} is live</h1>
          <p class="mt-1 text-sm text-muted">Status: {{ dep.status }} · Visibility: {{ dep.visibility }}</p>
          <dl class="mt-4 space-y-3 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wider text-muted">Endpoint</dt>
              <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.endpoint }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wider text-muted">API key (store it now — shown once)</dt>
              <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.apiKey }}</dd>
            </div>
          </dl>
          <div class="mt-5 flex gap-3">
            <a routerLink="/deployments" class="btn-primary">Manage deployments</a>
            @if (dep.visibility === 'public') {
              <a routerLink="/agent-browser" class="btn-ghost">View in Agent Browser</a>
            }
          </div>
        </div>
      } @else {
        <h1 class="section-title mt-2">Deploy {{ product()?.name || '…' }}</h1>
        @if (product(); as p) {
          <p class="mt-2 text-sm text-muted">
            {{ p.tagline }}
            @if (p.pricing.model === 'usage') {
              — <strong class="text-ink">\${{ p.pricing.usageRate | number: '1.2-4' }} / 1K tokens</strong>
              (billed from your wallet per request)
            }
          </p>

          <form class="mt-8 space-y-6" (ngSubmit)="submit()">
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-name">Deployment name</label>
              <input id="dep-name" name="name" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.name" required maxlength="120" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-model">Base model</label>
              <input id="dep-model" name="baseModel" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.baseModel" maxlength="200" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-prompt">System prompt (agent behaviour)</label>
              <textarea id="dep-prompt" name="systemPrompt" rows="4" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.systemPrompt" maxlength="4000" placeholder="You are a helpful agent that…"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-ink" for="dep-temp">Temperature ({{ form.temperature }})</label>
                <input id="dep-temp" name="temperature" type="range" min="0" max="2" step="0.1" class="w-full" [(ngModel)]="form.temperature" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-ink" for="dep-max">Max tokens</label>
                <input id="dep-max" name="maxTokens" type="number" min="1" max="32768" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.maxTokens" />
              </div>
            </div>
            <fieldset>
              <legend class="mb-2 text-sm font-medium text-ink">Visibility</legend>
              <div class="flex gap-3">
                <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-3 text-sm" [class.border-accent]="form.visibility === 'private'">
                  <input type="radio" name="visibility" value="private" [(ngModel)]="form.visibility" />
                  <span><strong class="text-ink">Private</strong><br /><span class="text-xs text-muted">Only you can invoke</span></span>
                </label>
                <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-3 text-sm" [class.border-accent]="form.visibility === 'public'">
                  <input type="radio" name="visibility" value="public" [(ngModel)]="form.visibility" />
                  <span><strong class="text-ink">Publish to Agent Browser</strong><br /><span class="text-xs text-muted">Anyone can discover &amp; use it</span></span>
                </label>
              </div>
            </fieldset>

            @if (error()) {
              <p class="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">{{ error() }}</p>
            }

            <button type="submit" class="btn-primary w-full py-3" [disabled]="busy()">
              {{ busy() ? 'Deploying…' : 'Deploy now' }}
            </button>
          </form>
        }
      }
    </section>
  `,
})
export class DeployWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly deployments = inject(DeploymentService);
  private readonly seo = inject(SeoService);

  readonly product = signal<Product | null>(null);
  readonly created = signal<Deployment | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  form = {
    name: '',
    baseModel: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1024,
    visibility: 'private' as 'private' | 'public',
  };

  ngOnInit(): void {
    this.seo.set({ title: 'Deploy' });
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.productsApi.bySlug(slug).subscribe((p) => {
      this.product.set(p);
      this.form.name = `${p.name} — my deployment`;
      this.form.baseModel = p.name;
      this.seo.set({ title: `Deploy ${p.name}` });
    });
  }

  submit(): void {
    const p = this.product();
    if (!p || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.deployments
      .deploy({
        productId: p.id,
        name: this.form.name,
        visibility: this.form.visibility,
        config: {
          baseModel: this.form.baseModel,
          systemPrompt: this.form.systemPrompt,
          temperature: Number(this.form.temperature),
          maxTokens: Number(this.form.maxTokens),
        },
      })
      .subscribe({
        next: (dep) => {
          this.busy.set(false);
          this.created.set(dep);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'Deploy failed. Please try again.');
        },
      });
  }
}

/* ------------------------------------------------------------------ */
/*  AGENT BROWSER — public catalog of user-deployed agents             */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-agent-browser',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Community deployments</p>
          <h1 class="section-title mt-1">Agent Browser</h1>
          <p class="mt-2 max-w-2xl text-muted">
            Agents and models configured &amp; published by the community. Deploy your own from
            <a routerLink="/models" class="text-accent hover:underline">AI Models</a> or
            <a routerLink="/hire-agent/marketplace" class="text-accent hover:underline">Hire Agent</a>.
          </p>
        </div>
        <a routerLink="/models" class="btn-primary">+ Deploy your own</a>
      </div>

      <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (d of items(); track d.id) {
          <article class="panel flex flex-col rounded-xl border border-line p-5">
            <div class="flex items-start justify-between gap-2">
              <h2 class="font-medium text-ink">{{ d.name }}</h2>
              <span class="rounded-full px-2 py-0.5 text-[11px]" [class]="d.kind === 'agent' ? 'bg-accent/15 text-accent' : 'bg-line/40 text-muted'">
                {{ d.kind }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted">
              by {{ d.ownerName || 'Community' }} · base:
              <a [routerLink]="['/product', d.productSlug]" class="text-accent hover:underline">{{ d.productName }}</a>
            </p>
            @if (d.config.systemPrompt) {
              <p class="mt-3 line-clamp-3 text-sm text-muted">“{{ d.config.systemPrompt }}”</p>
            }
            <div class="mt-4 flex flex-wrap gap-3 text-xs text-muted">
              <span>⚡ {{ d.totals.requests | number }} runs</span>
              <span>🔤 {{ d.totals.inputTokens + d.totals.outputTokens | number }} tokens</span>
              <span>🌡 {{ d.config.temperature }}</span>
            </div>
            <div class="mt-auto pt-5">
              <p class="select-all truncate rounded bg-line/30 px-2 py-1.5 font-mono text-[11px] text-muted" title="{{ d.endpoint }}">{{ d.endpoint }}</p>
              <a [routerLink]="['/product', d.productSlug]" class="btn-ghost mt-3 w-full justify-center text-sm">View base product</a>
            </div>
          </article>
        } @empty {
          <div class="panel col-span-full rounded-xl border border-line p-10 text-center text-muted">
            <p>No public agents yet — be the first to publish one.</p>
            <a routerLink="/models" class="btn-primary mt-4 inline-flex">Deploy a model</a>
          </div>
        }
      </div>
    </section>
  `,
})
export class AgentBrowserComponent implements OnInit {
  private readonly deployments = inject(DeploymentService);
  private readonly seo = inject(SeoService);

  readonly items = signal<Deployment[]>([]);

  ngOnInit(): void {
    this.seo.set({
      title: 'Agent Browser',
      description: 'Browse community-deployed AI agents and models.',
    });
    this.deployments.browser().subscribe((rows) => this.items.set(rows));
  }
}

/* ------------------------------------------------------------------ */
/*  MY DEPLOYMENTS — manage, publish, and metered test playground      */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-my-deployments',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="section-title">My Deployments</h1>
          <p class="mt-2 text-muted">Endpoints, API keys, usage &amp; billing for everything you deployed.</p>
        </div>
        <a routerLink="/models" class="btn-primary">+ New deployment</a>
      </div>

      @if (status()) {
        <p class="mt-4 rounded-lg border border-line bg-line/20 px-3 py-2 text-sm text-muted">{{ status() }}</p>
      }

      <div class="mt-8 space-y-5">
        @for (d of items(); track d.id) {
          <article class="panel rounded-xl border border-line p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="flex items-center gap-2 font-medium text-ink">
                  {{ d.name }}
                  <span class="rounded-full px-2 py-0.5 text-[11px]" [class]="d.status === 'running' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-line/40 text-muted'">
                    {{ d.status }}
                  </span>
                  <span class="rounded-full bg-line/40 px-2 py-0.5 text-[11px] text-muted">{{ d.visibility }}</span>
                </h2>
                <p class="mt-1 text-xs text-muted">
                  {{ d.kind }} · base <a [routerLink]="['/product', d.productSlug]" class="text-accent hover:underline">{{ d.productName }}</a>
                  · created {{ d.createdAt | date: 'MMM d, y' }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-ghost text-sm" (click)="toggleStatus(d)">
                  {{ d.status === 'running' ? 'Stop' : 'Start' }}
                </button>
                <button type="button" class="btn-ghost text-sm" (click)="toggleVisibility(d)">
                  {{ d.visibility === 'public' ? 'Unpublish' : 'Publish to Browser' }}
                </button>
                <button type="button" class="btn-ghost text-sm text-red-400" (click)="remove(d)">Delete</button>
              </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p class="text-[11px] uppercase tracking-wider text-muted">Endpoint</p>
                <p class="mt-1 select-all truncate rounded bg-line/30 px-2 py-1.5 font-mono text-xs text-ink">{{ d.endpoint }}</p>
              </div>
              <div>
                <p class="text-[11px] uppercase tracking-wider text-muted">API key</p>
                <p class="mt-1 select-all truncate rounded bg-line/30 px-2 py-1.5 font-mono text-xs text-ink">
                  {{ revealed() === d.id ? d.apiKey : '••••••••••••••••••••' }}
                  <button type="button" class="ml-2 text-accent" (click)="reveal(d)">{{ revealed() === d.id ? 'hide' : 'show' }}</button>
                </p>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-5 border-t border-line pt-4 text-sm">
              <span class="text-muted">Requests <strong class="text-ink">{{ d.totals.requests | number }}</strong></span>
              <span class="text-muted">Tokens in <strong class="text-ink">{{ d.totals.inputTokens | number }}</strong></span>
              <span class="text-muted">Tokens out <strong class="text-ink">{{ d.totals.outputTokens | number }}</strong></span>
              <span class="text-muted">Spend <strong class="text-ink">{{ d.totals.cost | currency: 'USD' }}</strong></span>
            </div>

            @if (d.status === 'running') {
              <div class="mt-4 rounded-lg border border-line bg-line/10 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted">Test playground (metered)</p>
                <div class="mt-2 flex gap-2">
                  <input
                    class="input flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink"
                    placeholder="Send a prompt — tokens & cost are metered for real"
                    [(ngModel)]="prompts[d.id]"
                    name="prompt-{{ d.id }}"
                    (keyup.enter)="invoke(d)"
                  />
                  <button type="button" class="btn-primary text-sm" [disabled]="invoking() === d.id" (click)="invoke(d)">
                    {{ invoking() === d.id ? 'Running…' : 'Run' }}
                  </button>
                </div>
                @if (results[d.id]; as r) {
                  <div class="mt-3 rounded bg-line/30 p-3 text-sm">
                    <p class="text-ink">{{ r.output }}</p>
                    <p class="mt-2 text-xs text-muted">
                      {{ r.inputTokens | number }} in + {{ r.outputTokens | number }} out =
                      <strong class="text-ink">{{ r.totalTokens | number }} tokens</strong>
                      · charged <strong class="text-ink">{{ r.cost | currency: 'USD' : 'symbol' : '1.2-4' }}</strong>
                      (seller nets {{ r.sellerNet | currency: 'USD' : 'symbol' : '1.2-4' }}, platform {{ r.platformFee | currency: 'USD' : 'symbol' : '1.2-4' }})
                    </p>
                  </div>
                }
              </div>
            }
          </article>
        } @empty {
          <div class="panel rounded-xl border border-line p-10 text-center text-muted">
            <p>Nothing deployed yet.</p>
            <a routerLink="/models" class="btn-primary mt-4 inline-flex">Browse AI Models</a>
          </div>
        }
      </div>
    </section>
  `,
})
export class MyDeploymentsComponent implements OnInit {
  private readonly deployments = inject(DeploymentService);
  private readonly seo = inject(SeoService);

  readonly items = signal<Deployment[]>([]);
  readonly status = signal('');
  readonly revealed = signal<string | null>(null);
  readonly invoking = signal<string | null>(null);
  prompts: Record<string, string> = {};
  results: Record<string, InvokeResult> = {};

  ngOnInit(): void {
    this.seo.set({ title: 'My Deployments' });
    this.reload();
  }

  reload(): void {
    this.deployments.mine().subscribe((rows) => this.items.set(rows));
  }

  reveal(d: Deployment): void {
    this.revealed.set(this.revealed() === d.id ? null : d.id);
  }

  toggleStatus(d: Deployment): void {
    const status = d.status === 'running' ? 'stopped' : 'running';
    this.deployments.update(d.id, { status }).subscribe(() => this.reload());
  }

  toggleVisibility(d: Deployment): void {
    const visibility = d.visibility === 'public' ? 'private' : 'public';
    this.deployments.update(d.id, { visibility }).subscribe(() => this.reload());
  }

  remove(d: Deployment): void {
    if (!confirm(`Delete deployment "${d.name}"? This cannot be undone.`)) return;
    this.deployments.remove(d.id).subscribe(() => {
      this.status.set(`Deleted ${d.name}.`);
      this.reload();
    });
  }

  invoke(d: Deployment): void {
    const input = (this.prompts[d.id] || '').trim();
    if (!input || this.invoking()) return;
    this.invoking.set(d.id);
    this.deployments.invoke(d.id, { input }).subscribe({
      next: (r) => {
        this.invoking.set(null);
        this.results[d.id] = r;
        this.reload();
      },
      error: (err) => {
        this.invoking.set(null);
        this.status.set(err?.error?.message || 'Invoke failed.');
      },
    });
  }
}
