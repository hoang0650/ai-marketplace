import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import {
  DashboardSummary,
  Order,
  Product,
  ProductCategory,
  PricingModel,
  UsageStat,
  WalletTx,
} from '../../models/marketplace.models';
import { CATEGORY_META, categoryLabel } from '../../models/categories';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Creator dashboard</h1>
      <nav class="mt-6 flex flex-wrap gap-2" aria-label="Dashboard">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="btn-fill" class="btn btn-outline text-xs">{{ l.label }}</a>
        }
      </nav>
      <div class="mt-8">
        <router-outlet />
      </div>
    </section>
  `,
})
export class DashboardShellComponent {
  readonly links = [
    { path: '/dashboard', label: 'Overview' },
    { path: '/dashboard/orders', label: 'Orders' },
    { path: '/dashboard/usage', label: 'Usage' },
    { path: '/dashboard/tokens', label: 'Tokens' },
    { path: '/dashboard/gpu', label: 'GPU' },
    { path: '/dashboard/analytics', label: 'Analytics' },
    { path: '/dashboard/products', label: 'Products' },
    { path: '/dashboard/withdraw', label: 'Withdraw' },
  ];
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    @if (summary(); as s) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="panel"><p class="text-xs uppercase text-muted">Revenue</p><p class="mt-2 font-display text-3xl">{{ s.revenue | currency: s.currency }}</p></div>
        <div class="panel"><p class="text-xs uppercase text-muted">Orders</p><p class="mt-2 font-display text-3xl">{{ s.orders | number }}</p></div>
        <div class="panel"><p class="text-xs uppercase text-muted">Token usage</p><p class="mt-2 font-display text-3xl">{{ s.tokenUsage | number }}</p></div>
        <div class="panel"><p class="text-xs uppercase text-muted">GPU hours</p><p class="mt-2 font-display text-3xl">{{ s.gpuHours | number:'1.1-1' }}</p></div>
      </div>
    }
  `,
})
export class DashboardHomeComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly summary = signal<DashboardSummary | null>(null);

  ngOnInit(): void {
    this.seo.set({ title: 'Dashboard' });
    this.api.summary().subscribe((s) => this.summary.set(s));
  }
}

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="panel overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="text-xs uppercase text-muted">
          <tr><th class="pb-3">Order</th><th>Product</th><th>Buyer</th><th>Amount</th><th>Provider</th><th>Date</th></tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr class="border-t border-line">
              <td class="py-3 font-mono text-xs">{{ o.id }}</td>
              <td>{{ o.productName }}</td>
              <td>{{ o.buyerName }}</td>
              <td>{{ o.amount | currency: o.currency }}</td>
              <td>{{ o.provider }}</td>
              <td>{{ o.createdAt | date: 'short' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DashboardOrdersComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly orders = signal<Order[]>([]);
  ngOnInit(): void {
    this.api.orders().subscribe((o) => this.orders.set(o));
  }
}

@Component({
  selector: 'app-dashboard-usage',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe],
  template: `
    <div class="grid gap-3">
      @for (u of usage(); track u.date) {
        <div class="panel flex flex-wrap items-center justify-between gap-3 text-sm">
          <span class="font-mono">{{ u.date }}</span>
          <span>{{ u.requests | number }} req</span>
          <span>{{ u.tokens | number }} tokens</span>
          <span>{{ u.gpuHours | number:'1.1-1' }} GPU h</span>
          <span>{{ u.revenue | currency:'USD' }}</span>
        </div>
      }
    </div>
  `,
})
export class DashboardUsageComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => this.usage.set(u));
  }
}

@Component({
  selector: 'app-dashboard-tokens',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="panel">
      <h2 class="font-display text-2xl">Token usage</h2>
      <p class="mt-2 text-muted">Last 7 days total: {{ total() | number }} tokens</p>
      <ul class="mt-6 space-y-2">
        @for (u of usage(); track u.date) {
          <li class="flex justify-between border-b border-line py-2 text-sm">
            <span>{{ u.date }}</span><span class="font-mono">{{ u.tokens | number }}</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DashboardTokensComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  readonly total = signal(0);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.total.set(u.reduce((s, x) => s + x.tokens, 0));
    });
  }
}

@Component({
  selector: 'app-dashboard-gpu',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="panel">
      <h2 class="font-display text-2xl">GPU usage</h2>
      <p class="mt-2 text-muted">Last 7 days: {{ total() | number:'1.1-1' }} hours</p>
      <ul class="mt-6 space-y-2">
        @for (u of usage(); track u.date) {
          <li class="flex justify-between border-b border-line py-2 text-sm">
            <span>{{ u.date }}</span><span class="font-mono">{{ u.gpuHours | number:'1.1-1' }} h</span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class DashboardGpuComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  readonly total = signal(0);
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.total.set(u.reduce((s, x) => s + x.gpuHours, 0));
    });
  }
}

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="panel">
        <h2 class="font-display text-2xl">Revenue trend</h2>
        <div class="mt-6 flex h-40 items-end gap-2">
          @for (u of usage(); track u.date) {
            <div class="flex-1 rounded-t bg-accent/80" [style.height.%]="bar(u.revenue)" [title]="u.date + ': $' + u.revenue"></div>
          }
        </div>
      </div>
      <div class="panel">
        <h2 class="font-display text-2xl">Requests</h2>
        <ul class="mt-4 space-y-2 text-sm">
          @for (u of usage(); track u.date) {
            <li class="flex justify-between"><span>{{ u.date }}</span><span>{{ u.requests | number }}</span></li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DashboardAnalyticsComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly usage = signal<UsageStat[]>([]);
  private max = 1;
  ngOnInit(): void {
    this.api.usage().subscribe((u) => {
      this.usage.set(u);
      this.max = Math.max(...u.map((x) => x.revenue), 1);
    });
  }
  bar(v: number): number {
    return Math.max(8, (v / this.max) * 100);
  }
}

@Component({
  selector: 'app-dashboard-products',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="mb-4 flex justify-between gap-3">
      <h2 class="font-display text-2xl">Your products</h2>
      <button type="button" class="btn btn-fill" (click)="showForm = !showForm">{{ showForm ? 'Close' : 'New product' }}</button>
    </div>
    @if (showForm) {
      <form class="panel mb-6 grid gap-3 md:grid-cols-2" (ngSubmit)="create()">
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Name</label>
          <input class="input" [(ngModel)]="draft.name" name="name" placeholder="e.g. Hailuo 02 Standard" required />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tagline</label>
          <input class="input" [(ngModel)]="draft.tagline" name="tagline" placeholder="One-line value prop" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Description</label>
          <textarea class="input min-h-24" [(ngModel)]="draft.description" name="description" placeholder="What buyers get + how to call the API"></textarea>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Modality (RunPod-style)</label>
          <select class="input" [(ngModel)]="draft.category" name="category" required>
            @for (c of categories; track c.id) {
              <option [ngValue]="c.id">{{ c.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Pricing model</label>
          <select class="input" [(ngModel)]="draft.pricingModel" name="pricingModel">
            <option value="usage">Usage</option>
            <option value="subscription">Subscription</option>
            <option value="one-time">One-time</option>
            <option value="free">Free</option>
          </select>
        </div>
        @if (draft.pricingModel === 'usage') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Rate (USD)</label>
            <input class="input" type="number" min="0" step="0.001" [(ngModel)]="draft.usageRate" name="usageRate" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Per unit</label>
            <input class="input" [(ngModel)]="draft.usageUnit" name="usageUnit" placeholder="1M tokens / second / image" />
          </div>
        }
        @if (draft.pricingModel === 'subscription' || draft.pricingModel === 'one-time') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Price (USD)</label>
            <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.price" name="price" />
          </div>
        }
        @if (draft.pricingModel === 'subscription') {
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Interval</label>
            <select class="input" [(ngModel)]="draft.interval" name="interval">
              <option value="month">month</option>
              <option value="year">year</option>
            </select>
          </div>
        }
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Cover image URL</label>
          <input class="input" [(ngModel)]="draft.coverUrl" name="coverUrl" placeholder="https://…" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tags (comma-separated)</label>
          <input class="input" [(ngModel)]="draft.tags" name="tags" placeholder="llm, vietnamese, text-to-text" />
        </div>
        <div class="md:col-span-2 border-t border-line pt-3">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">RunPod runtime (optional — editable later in Deployments)</p>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Serverless endpoint</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.serverlessEndpoint" name="serverlessEndpoint" placeholder="https://api.runpod.ai/v2/…/runsync" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Public endpoint</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.publicEndpoint" name="publicEndpoint" placeholder="https://….proxy.runpod.net/v1" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Tokenize endpoint</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.tokenizeEndpoint" name="tokenizeEndpoint" placeholder="https://…/tokenize" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Gateway</label>
          <input class="input font-mono text-xs" [(ngModel)]="draft.gatewayUrl" name="gatewayUrl" placeholder="wss://… or https://gateway…" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">.env (KEY=VALUE per line)</label>
          <textarea class="input min-h-20 font-mono text-xs" [(ngModel)]="draft.envText" name="envText" placeholder="RUNPOD_API_KEY=&#10;HF_TOKEN="></textarea>
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Skills (comma-separated)</label>
          <input class="input" [(ngModel)]="draft.skillsText" name="skillsText" placeholder="web-search, code-exec, memory" />
        </div>
        <div class="md:col-span-2">
          <button class="btn btn-fill" type="submit">Publish</button>
        </div>
      </form>
    }
    <div class="grid gap-3">
      @for (p of products(); track p.id) {
        <div class="panel flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-muted">{{ categoryLabel(p.category) }}</p>
            <a [routerLink]="['/product', p.slug]" class="font-display text-xl no-underline">{{ p.name }}</a>
            <p class="text-sm text-muted">{{ p.installCount | number }} installs · ★ {{ p.rating | number:'1.1-1' }}</p>
            @if (p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint) {
              <p class="mt-1 max-w-xl truncate font-mono text-[11px] text-muted">
                {{ p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint }}
              </p>
            }
          </div>
          <div class="flex gap-2">
            <a class="btn btn-outline" [routerLink]="['/deploy', p.slug]">Deploy</a>
            <button type="button" class="btn btn-outline" (click)="remove(p.id)">Delete</button>
          </div>
        </div>
      }
      @if (!products().length) {
        <p class="text-muted">No products yet — publish one with the correct modality.</p>
      }
    </div>
  `,
})
export class DashboardProductsComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  readonly products = signal<Product[]>([]);
  readonly categories = CATEGORY_META;
  readonly categoryLabel = categoryLabel;
  showForm = false;
  draft = this.emptyDraft();

  ngOnInit(): void {
    this.reload();
  }

  emptyDraft() {
    return {
      name: '',
      tagline: '',
      description: '',
      category: 'text-to-text' as ProductCategory,
      pricingModel: 'usage' as PricingModel,
      price: 29,
      usageRate: 0.05,
      usageUnit: '1K tokens',
      interval: 'month' as 'month' | 'year',
      coverUrl: '',
      tags: '',
      serverlessEndpoint: '',
      publicEndpoint: '',
      tokenizeEndpoint: '',
      gatewayUrl: '',
      envText: '',
      skillsText: '',
    };
  }

  reload(): void {
    const slug = this.auth.user()?.creatorSlug || 'nova-labs';
    this.productsApi.list({ creatorSlug: slug }).subscribe((items) => this.products.set(items));
  }

  create(): void {
    const user = this.auth.user();
    const tags = this.draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.includes(this.draft.category)) {
      tags.push(this.draft.category);
    }
    const pricing =
      this.draft.pricingModel === 'usage'
        ? {
            model: 'usage' as const,
            price: 0,
            currency: 'USD',
            usageUnit: this.draft.usageUnit || 'request',
            usageRate: Number(this.draft.usageRate) || 0,
          }
        : this.draft.pricingModel === 'subscription'
          ? {
              model: 'subscription' as const,
              price: Number(this.draft.price) || 0,
              currency: 'USD',
              interval: this.draft.interval,
            }
          : this.draft.pricingModel === 'one-time'
            ? {
                model: 'one-time' as const,
                price: Number(this.draft.price) || 0,
                currency: 'USD',
              }
            : { model: 'free' as const, price: 0, currency: 'USD' };

    this.productsApi
      .create({
        name: this.draft.name,
        tagline: this.draft.tagline,
        description: this.draft.description,
        creatorSlug: user?.creatorSlug || 'nova-labs',
        creatorName: user?.name || 'Creator',
        category: this.draft.category,
        pricing,
        runtime: {
          serverlessEndpoint: this.draft.serverlessEndpoint.trim(),
          publicEndpoint: this.draft.publicEndpoint.trim(),
          tokenizeEndpoint: this.draft.tokenizeEndpoint.trim(),
          gatewayUrl: this.draft.gatewayUrl.trim(),
          env: this.draft.envText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && line.includes('='))
            .map((line) => {
              const i = line.indexOf('=');
              return { key: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
            }),
          skills: this.draft.skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          baseModel: this.draft.name,
          systemPrompt: '',
          temperature: 0.7,
          maxTokens: 1024,
        },
        coverUrl: this.draft.coverUrl || undefined,
        gallery: this.draft.coverUrl ? [this.draft.coverUrl] : undefined,
        tags,
        apiDocsMarkdown: `## ${this.draft.name}\n\nModality: \`${this.draft.category}\`\n\nPOST \`/v1/${this.draft.category}/run\``,
        changelog: [{ version: '1.0.0', date: new Date().toISOString().slice(0, 10), notes: 'Initial release.' }],
      })
      .subscribe(() => {
        this.draft = this.emptyDraft();
        this.showForm = false;
        this.reload();
      });
  }

  remove(id: string): void {
    this.productsApi.remove(id).subscribe(() => this.reload());
  }
}

@Component({
  selector: 'app-dashboard-withdraw',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="grid gap-6 lg:grid-cols-2">
      <form class="panel grid gap-3" (ngSubmit)="withdraw()">
        <h2 class="font-display text-2xl">Withdraw</h2>
        <input class="input" type="number" min="1" [(ngModel)]="amount" name="amount" />
        <button class="btn btn-fill w-fit" type="submit">Request payout</button>
        @if (msg()) { <p class="text-sm text-accent">{{ msg() }}</p> }
      </form>
      <div class="panel">
        <h2 class="font-display text-2xl">Wallet history</h2>
        <ul class="mt-4 space-y-3 text-sm">
          @for (t of txs(); track t.id) {
            <li class="flex justify-between border-b border-line pb-2">
              <span>{{ t.type }} · {{ t.note }}</span>
              <span>{{ t.amount | currency: t.currency }} · {{ t.createdAt | date:'shortDate' }}</span>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DashboardWithdrawComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly txs = signal<WalletTx[]>([]);
  readonly msg = signal('');
  amount = 100;

  ngOnInit(): void {
    this.api.wallet().subscribe((t) => this.txs.set(t));
  }

  withdraw(): void {
    this.api.withdraw(this.amount).subscribe((tx) => {
      this.txs.update((list) => [tx, ...list]);
      this.msg.set(`Withdraw ${tx.amount} queued`);
    });
  }
}
