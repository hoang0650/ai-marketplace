import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeploymentService, ProductService, RunpodService, UploadService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { Deployment, InvokeResult } from '../../models/deployment.models';
import {
  RUNPOD_ENDPOINT_KIND_LABEL,
  RUNPOD_PUBLIC_ENDPOINTS,
  RunpodEndpointKind,
  RunpodPublicEndpoint,
  runtimeFromRunpodPublicEndpoint,
} from '../../models/runpod-public-endpoints';
import {
  categoryLabel,
  isVoiceCloneCategory,
  isVoicePresetCategory,
  needsEndpointDeploy,
  sellerWorkspaceKind,
  SellerWorkspaceKind,
} from '../../models/categories';

const MODEL_CATEGORIES = [
  'text-to-text',
  'text-to-video',
  'image-to-video',
  'text-to-image',
  'image-to-image',
  'inference',
  'fine-tune',
];

const RUNPOD_KINDS: RunpodEndpointKind[] = ['image', 'video', 'text', 'audio'];

function emptyRuntimeForm() {
  return {
    serverlessEndpoint: '',
    tokenizeEndpoint: '',
    gatewayUrl: '',
    publicEndpoint: '',
    envText: '',
    skillsText: '',
    baseModel: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1024,
  };
}

function runtimePayload(form: ReturnType<typeof emptyRuntimeForm>) {
  return {
    serverlessEndpoint: form.serverlessEndpoint.trim(),
    tokenizeEndpoint: form.tokenizeEndpoint.trim(),
    gatewayUrl: form.gatewayUrl.trim(),
    publicEndpoint: form.publicEndpoint.trim(),
    env: form.envText,
    skills: form.skillsText,
    baseModel: form.baseModel.trim(),
    systemPrompt: form.systemPrompt,
    temperature: Number(form.temperature),
    maxTokens: Number(form.maxTokens),
  };
}

function fillRuntimeFromProduct(form: ReturnType<typeof emptyRuntimeForm>, p: Product) {
  const r = p.runtime;
  form.baseModel = r?.baseModel || p.name;
  form.systemPrompt = r?.systemPrompt || '';
  form.temperature = r?.temperature ?? 0.7;
  form.maxTokens = r?.maxTokens ?? 1024;
  form.serverlessEndpoint = r?.serverlessEndpoint || '';
  form.tokenizeEndpoint = r?.tokenizeEndpoint || '';
  form.gatewayUrl = r?.gatewayUrl || '';
  form.publicEndpoint = r?.publicEndpoint || '';
  form.skillsText = (r?.skills || []).join(', ');
  form.envText = (r?.env || []).map((e) => `${e.key}=${e.value}`).join('\n');
}

/* ------------------------------------------------------------------ */
/*  AI MODELS HUB                                                       */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-models-hub',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">AI Markets Public Endpoints</p>
          <h1 class="section-title mt-1">AI Models</h1>
          <p class="mt-2 max-w-2xl text-muted">
            Pre-deployed models on the
            <a class="text-accent underline" routerLink="/docs/models">AI Markets gateway</a>
            — call with <code class="text-xs">Authorization: Bearer mk_live_…</code> via
            <code class="text-xs">/runsync</code> or <code class="text-xs">/run</code>.
          </p>
        </div>
        <a routerLink="/deployments" class="btn-ghost">Seller deployments →</a>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs transition"
          [class.border-accent]="tab() === 'public'"
          [class.text-accent]="tab() === 'public'"
          [class.border-line]="tab() !== 'public'"
          (click)="tab.set('public')"
        >
          Public Endpoints ({{ publicFiltered().length }})
        </button>
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs transition"
          [class.border-accent]="tab() === 'sellers'"
          [class.text-accent]="tab() === 'sellers'"
          [class.border-line]="tab() !== 'sellers'"
          (click)="tab.set('sellers')"
        >
          Seller catalog ({{ sellerFiltered().length }})
        </button>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          class="input w-full max-w-sm rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink"
          placeholder="Search models…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        @if (tab() === 'public') {
          @for (k of kinds; track k) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs transition"
              [class.border-accent]="kind() === k"
              [class.text-accent]="kind() === k"
              [class.border-line]="kind() !== k"
              [class.text-muted]="kind() !== k"
              (click)="toggleKind(k)"
            >
              {{ kindLabel[k] }}
            </button>
          }
        } @else {
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
        }
      </div>

      @if (tab() === 'public') {
        <div class="mt-8 overflow-hidden rounded-xl border border-line">
          <div class="hidden grid-cols-12 gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
            <span class="col-span-4">Model</span>
            <span class="col-span-2">Kind</span>
            <span class="col-span-3">Endpoint</span>
            <span class="col-span-2 text-right">Pricing</span>
            <span class="col-span-1 text-right">Docs</span>
          </div>
          @for (e of publicFiltered(); track e.slug) {
            <div class="grid grid-cols-1 items-center gap-3 border-b border-line px-4 py-4 transition hover:bg-line/20 md:grid-cols-12">
              <div class="col-span-4">
                <p class="font-medium text-ink">{{ e.name }}</p>
                <p class="mt-0.5 line-clamp-2 text-xs text-muted">{{ e.description }}</p>
                <p class="mt-1 text-[11px] text-muted">modality · {{ e.modality }}</p>
              </div>
              <div class="col-span-2">
                <span class="rounded bg-line/40 px-2 py-0.5 text-xs text-muted">{{ kindLabel[e.kind] }}</span>
              </div>
              <div class="col-span-3 min-w-0">
                <p class="truncate font-mono text-[11px] text-muted" [title]="e.runsyncUrl">{{ e.runsyncUrl }}</p>
                @if (e.openaiBaseUrl) {
                  <p class="mt-0.5 truncate font-mono text-[11px] text-accent" [title]="e.openaiBaseUrl">OpenAI · {{ e.openaiBaseUrl }}</p>
                }
              </div>
              <div class="col-span-2 text-left text-sm text-ink md:text-right">{{ e.pricing }}</div>
              <div class="col-span-1 md:text-right">
                <a class="text-sm text-accent hover:underline" [href]="e.docsUrl" target="_blank" rel="noopener">Docs</a>
              </div>
            </div>
          } @empty {
            <p class="px-4 py-10 text-center text-muted">No public endpoints match your filters.</p>
          }
        </div>
      } @else {
        <div class="mt-8 overflow-hidden rounded-xl border border-line">
          <div class="hidden grid-cols-12 gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
            <span class="col-span-4">Model</span>
            <span class="col-span-2">Modality</span>
            <span class="col-span-2">Creator</span>
            <span class="col-span-2 text-right">Price</span>
            <span class="col-span-2 text-right">Deploy</span>
          </div>
          @for (p of sellerFiltered(); track p.id) {
            <div class="grid grid-cols-1 items-center gap-3 border-b border-line px-4 py-4 transition hover:bg-line/20 md:grid-cols-12">
              <div class="col-span-4">
                <a [routerLink]="['/product', p.slug]" class="font-medium text-ink hover:text-accent">{{ p.name }}</a>
                <p class="mt-0.5 line-clamp-1 text-xs text-muted">{{ p.tagline }}</p>
                @if (p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint) {
                  <p class="mt-1 truncate font-mono text-[11px] text-muted">
                    {{ p.runtime?.publicEndpoint || p.runtime?.serverlessEndpoint }}
                  </p>
                }
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
                }
              </div>
              <div class="col-span-2 md:text-right">
                <a [routerLink]="['/deploy', p.slug]" class="btn-primary inline-flex text-sm">Configure deploy</a>
              </div>
            </div>
          } @empty {
            <p class="px-4 py-10 text-center text-muted">No seller models match your filters.</p>
          }
        </div>
      }
    </section>
  `,
})
export class ModelsHubComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly runpodApi = inject(RunpodService);
  private readonly seo = inject(SeoService);

  readonly categories = MODEL_CATEGORIES;
  readonly kinds = RUNPOD_KINDS;
  readonly kindLabel = RUNPOD_ENDPOINT_KIND_LABEL;
  readonly products = signal<Product[]>([]);
  readonly publicEndpoints = signal<RunpodPublicEndpoint[]>(RUNPOD_PUBLIC_ENDPOINTS);
  readonly q = signal('');
  readonly cat = signal<string | null>(null);
  readonly kind = signal<RunpodEndpointKind | null>(null);
  readonly tab = signal<'public' | 'sellers'>('public');

  readonly publicFiltered = computed(() => {
    const q = this.q().toLowerCase();
    const kind = this.kind();
    return this.publicEndpoints().filter(
      (e) =>
        (!kind || e.kind === kind) &&
        (!q || `${e.name} ${e.slug} ${e.endpointId} ${e.description} ${e.modality}`.toLowerCase().includes(q)),
    );
  });

  readonly sellerFiltered = computed(() => {
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
      title: 'AI Models — AI Markets Public Endpoints',
      description: 'Browse pre-deployed AI Markets endpoints and seller-deployed models.',
    });
    this.runpodApi.publicEndpoints().subscribe({
      next: (items) => this.publicEndpoints.set(items),
      error: () => this.publicEndpoints.set(RUNPOD_PUBLIC_ENDPOINTS),
    });
    this.productsApi.list().subscribe((items) => {
      this.products.set(items.filter((p) => MODEL_CATEGORIES.includes(p.category)));
    });
  }

  toggleCat(c: string): void {
    this.cat.set(this.cat() === c ? null : c);
  }

  toggleKind(k: RunpodEndpointKind): void {
    this.kind.set(this.kind() === k ? null : k);
  }
}

/* ------------------------------------------------------------------ */
/*  DEPLOY WIZARD — category-aware seller workspace                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-deploy-wizard',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <section class="page route-enter mx-auto max-w-3xl">
      <p class="text-xs text-muted">
        <a routerLink="/dashboard/products" class="hover:text-accent">Products</a>
        /
        {{ kindLabel() }}
      </p>

      @if (saved(); as p) {
        <div class="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-6">
          <h1 class="text-xl font-semibold text-ink">Đã lưu {{ p.name }}</h1>
          <p class="mt-1 text-sm text-muted">{{ kindHint() }}</p>
          <div class="mt-5 flex gap-3">
            <a routerLink="/dashboard/products" class="btn-primary">Về products</a>
            <a [routerLink]="['/product', p.slug]" class="btn-ghost">Xem listing</a>
          </div>
        </div>
      } @else if (created(); as dep) {
        <div class="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-6">
          <h1 class="text-xl font-semibold text-ink">{{ dep.name }} is live</h1>
          <p class="mt-1 text-sm text-muted">Status: {{ dep.status }} · Visibility: {{ dep.visibility }}</p>
          <dl class="mt-4 space-y-3 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wider text-muted">Public / serverless endpoint</dt>
              <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.endpoint }}</dd>
            </div>
            @if (dep.runtime.tokenizeEndpoint) {
              <div>
                <dt class="text-xs uppercase tracking-wider text-muted">Tokenize meter</dt>
                <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.runtime.tokenizeEndpoint }}</dd>
              </div>
            }
            @if (dep.runtime.gatewayUrl) {
              <div>
                <dt class="text-xs uppercase tracking-wider text-muted">Gateway</dt>
                <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.runtime.gatewayUrl }}</dd>
              </div>
            }
            <div>
              <dt class="text-xs uppercase tracking-wider text-muted">Platform API key</dt>
              <dd class="mt-1 select-all rounded bg-line/30 px-3 py-2 font-mono text-xs text-ink">{{ dep.apiKey }}</dd>
            </div>
          </dl>
          <div class="mt-5 flex gap-3">
            <a routerLink="/deployments" class="btn-primary">Manage deployments</a>
            @if (dep.visibility === 'public') {
              <a routerLink="/agent-browser" class="btn-ghost">Agent Browser</a>
            }
          </div>
        </div>
      } @else if (product(); as p) {
        <h1 class="section-title mt-2">{{ pageTitle() }}</h1>
        <p class="mt-2 text-sm text-muted">{{ kindHint() }}</p>

        @if (workspace() === 'voice') {
          <form class="mt-8 space-y-5" (ngSubmit)="saveVoice()">
            @if (isPreset()) {
              <div class="rounded-xl border border-line p-4 text-sm text-muted">
                Giọng sàn <strong class="text-ink">{{ p.contentMeta?.presetVoiceName || p.name }}</strong> do AI Markets vận hành
                (VieNeu-TTS-v3-Turbo + vinai/PhoWhisper-large). Seller không gắn model public bên ngoài.
              </div>
            } @else {
              <fieldset class="space-y-3 rounded-xl border border-line p-4">
                <legend class="px-1 text-sm font-semibold text-ink">Sample giọng (MP3)</legend>
                <p class="text-xs text-muted">Upload 10–60 giây. VieNeu nhân bản giọng này cho TTS. STT dùng PhoWhisper-large — không dùng file này làm audio nhận dạng.</p>
                <input class="input w-full" type="file" accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav,.m4a" (change)="onVoiceFile($event)" />
                @if (voiceUploading()) {
                  <p class="text-xs text-muted">Đang tải MP3…</p>
                }
                @if (voiceError()) {
                  <p class="text-sm text-red-500">{{ voiceError() }}</p>
                }
                @if (voiceForm.voiceSampleUrl) {
                  <audio class="mt-2 w-full" [src]="voiceForm.voiceSampleUrl" controls preload="metadata"></audio>
                  <p class="break-all font-mono text-[11px] text-muted">{{ voiceForm.voiceSampleUrl }}</p>
                }
                <p class="text-xs text-muted">Trạng thái clone: <strong class="text-ink">{{ p.contentMeta?.cloneStatus || 'pending' }}</strong></p>
              </fieldset>
              <div class="flex flex-wrap gap-4 text-sm">
                <label class="flex items-center gap-2"><input type="checkbox" name="voiceTts" [(ngModel)]="voiceForm.voiceTts" /> TTS (VieNeu đọc)</label>
                <label class="flex items-center gap-2"><input type="checkbox" name="voiceStt" [(ngModel)]="voiceForm.voiceStt" /> STT (PhoWhisper nhận giọng)</label>
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase text-muted" for="chars">Ký tự / 1 credit</label>
                <input id="chars" name="charactersPerCredit" class="input w-full" type="number" min="1" [(ngModel)]="voiceForm.charactersPerCredit" />
              </div>
              <div class="grid gap-3 md:grid-cols-3">
                <div>
                  <label class="mb-1 block text-xs uppercase text-muted">Giá / ngày</label>
                  <input class="input w-full" type="number" min="0" step="0.01" name="priceDay" [(ngModel)]="voiceForm.priceDay" />
                </div>
                <div>
                  <label class="mb-1 block text-xs uppercase text-muted">Giá / tháng</label>
                  <input class="input w-full" type="number" min="0" step="0.01" name="priceMonth" [(ngModel)]="voiceForm.priceMonth" />
                </div>
                <div>
                  <label class="mb-1 block text-xs uppercase text-muted">Giá / năm</label>
                  <input class="input w-full" type="number" min="0" step="0.01" name="priceYear" [(ngModel)]="voiceForm.priceYear" />
                </div>
              </div>
            }
            @if (error()) {
              <p class="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">{{ error() }}</p>
            }
            @if (!isPreset()) {
              <button type="submit" class="btn-primary w-full py-3" [disabled]="busy() || voiceUploading()">
                {{ busy() ? 'Đang lưu…' : 'Lưu giọng' }}
              </button>
            }
          </form>
        } @else if (workspace() === 'watch') {
          <div class="mt-8 rounded-xl border border-line p-5 text-sm text-muted">
            Phim / truyện bán license AIM-xxxx. Tải tập hoặc chương (ảnh, video) trên trang products — không gắn Chatterbox hay tokenize endpoint.
            <div class="mt-4 flex gap-3">
              <a class="btn-primary" routerLink="/dashboard/products">Quản lý tập / chương</a>
              <a class="btn-ghost" [routerLink]="['/product', p.slug]">Xem listing</a>
            </div>
          </div>
        } @else if (workspace() === 'download') {
          <div class="mt-8 rounded-xl border border-line p-5 text-sm text-muted">
            Skill pack / dataset mở bằng license ngày · tháng · năm. Buyer nhận AIM-xxxx; không deploy API model.
            <div class="mt-4 flex gap-3">
              <a class="btn-primary" routerLink="/dashboard/licenses">License keys</a>
              <a class="btn-ghost" [routerLink]="['/product', p.slug]">Xem listing</a>
            </div>
          </div>
        } @else if (workspace() === 'hire') {
          <div class="mt-8 rounded-xl border border-line p-5 text-sm text-muted">
            Listing thuê ({{ categoryLabel(p.category) }}). Buyer gửi brief / hire — không cấu hình public endpoint.
            <div class="mt-4">
              <a class="btn-primary" [routerLink]="['/product', p.slug]">Mở listing</a>
            </div>
          </div>
        } @else if (workspace() === 'compute') {
          <div class="mt-8 rounded-xl border border-line p-5 text-sm text-muted">
            GPU compute / game server quản lý phiên stream, không phải TTS hay LLM endpoint.
            <div class="mt-4">
              <a class="btn-primary" routerLink="/dashboard/gpu">Mở GPU</a>
            </div>
          </div>
        } @else {
          <p class="mt-2 text-sm text-muted">
            Gắn AI Markets endpoints (api.aimarkets.vn). Chỉ seller của product mới deploy.
            @if (p.pricing.model === 'usage') {
              — billed at <strong class="text-ink">\${{ p.pricing.usageRate | number: '1.2-4' }} / 1K tokens</strong>
            }
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-name">Deployment name</label>
              <input id="dep-name" name="name" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.name" required maxlength="120" />
            </div>

            <fieldset class="space-y-3 rounded-xl border border-line p-4">
              <legend class="px-1 text-sm font-semibold text-ink">AI Markets networking</legend>
              <div>
                <label class="mb-1 block text-xs uppercase tracking-wider text-muted" for="dep-catalog">Pick hosted model</label>
                <select
                  id="dep-catalog"
                  name="catalogSlug"
                  class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink"
                  [(ngModel)]="catalogSlug"
                  (ngModelChange)="applyCatalog($event)"
                >
                  <option value="">— Custom / paste URLs —</option>
                  @for (e of catalogOptions(); track e.slug) {
                    <option [value]="e.slug">{{ e.name }} · {{ e.pricing }}</option>
                  }
                </select>
                <p class="mt-1 text-[11px] text-muted">
                  Chỉ hiện model đúng modality của listing. Voice / phim / thuê không dùng catalog này.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase tracking-wider text-muted" for="dep-public">Public endpoint (/runsync)</label>
                <input id="dep-public" name="publicEndpoint" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" [(ngModel)]="form.publicEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/runsync" />
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase tracking-wider text-muted" for="dep-serverless">Async endpoint (/run)</label>
                <input id="dep-serverless" name="serverlessEndpoint" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" [(ngModel)]="form.serverlessEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/run" />
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase tracking-wider text-muted" for="dep-tokenize">Tokenize endpoint (meter)</label>
                <input id="dep-tokenize" name="tokenizeEndpoint" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" [(ngModel)]="form.tokenizeEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/tokenize" />
              </div>
              <div>
                <label class="mb-1 block text-xs uppercase tracking-wider text-muted" for="dep-gateway">Gateway / OpenAI base</label>
                <input id="dep-gateway" name="gatewayUrl" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" [(ngModel)]="form.gatewayUrl" placeholder="https://ai.aimarkets.vn/v1" />
              </div>
            </fieldset>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-env">.env (KEY=VALUE per line)</label>
              <textarea id="dep-env" name="envText" rows="4" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" [(ngModel)]="form.envText" placeholder="MARKETPLACE_API_KEY=&#10;UPSTREAM_RUNSYNC="></textarea>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-skills">Skills (comma-separated)</label>
              <input id="dep-skills" name="skillsText" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.skillsText" placeholder="web-search, code-exec, memory" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-model">Base model</label>
              <input id="dep-model" name="baseModel" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.baseModel" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink" for="dep-prompt">System prompt</label>
              <textarea id="dep-prompt" name="systemPrompt" rows="3" class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" [(ngModel)]="form.systemPrompt"></textarea>
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
                  <span><strong class="text-ink">Private</strong><br /><span class="text-xs text-muted">Seller only</span></span>
                </label>
                <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-3 text-sm" [class.border-accent]="form.visibility === 'public'">
                  <input type="radio" name="visibility" value="public" [(ngModel)]="form.visibility" />
                  <span><strong class="text-ink">Publish to Agent Browser</strong><br /><span class="text-xs text-muted">Buyers can discover &amp; invoke</span></span>
                </label>
              </div>
            </fieldset>

            <label class="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="syncProduct" [(ngModel)]="form.syncProduct" />
              Sync runtime back to Product catalog
            </label>

            @if (error()) {
              <p class="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">{{ error() }}</p>
            }

            <button type="submit" class="btn-primary w-full py-3" [disabled]="busy()">
              {{ busy() ? 'Deploying…' : 'Deploy as seller' }}
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
  private readonly runpodApi = inject(RunpodService);
  private readonly uploads = inject(UploadService);
  private readonly seo = inject(SeoService);

  readonly product = signal<Product | null>(null);
  readonly created = signal<Deployment | null>(null);
  readonly saved = signal<Product | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly voiceUploading = signal(false);
  readonly voiceError = signal('');
  readonly catalog = signal<RunpodPublicEndpoint[]>(RUNPOD_PUBLIC_ENDPOINTS);
  catalogSlug = '';
  readonly categoryLabel = categoryLabel;

  readonly workspace = computed<SellerWorkspaceKind>(() => sellerWorkspaceKind(this.product()?.category));
  readonly isPreset = computed(() => isVoicePresetCategory(this.product()?.category || ''));

  readonly catalogOptions = computed(() => {
    const modality = this.product()?.category;
    const all = this.catalog();
    if (!modality || !needsEndpointDeploy(modality)) return [];
    return all.filter((e) => e.modality === modality);
  });

  form = {
    name: '',
    visibility: 'private' as 'private' | 'public',
    syncProduct: true,
    ...emptyRuntimeForm(),
  };

  voiceForm = {
    voiceTts: true,
    voiceStt: true,
    voiceSampleUrl: '',
    charactersPerCredit: 1000,
    priceDay: 1.49,
    priceMonth: 9.99,
    priceYear: 79,
  };

  kindLabel(): string {
    const k = this.workspace();
    if (k === 'voice') return 'Giọng';
    if (k === 'watch') return 'Phim / truyện';
    if (k === 'download') return 'License';
    if (k === 'hire') return 'Listing thuê';
    if (k === 'compute') return 'GPU';
    return 'Deploy API';
  }

  pageTitle(): string {
    const p = this.product();
    const name = p?.name || '…';
    const k = this.workspace();
    if (k === 'voice') return `Giọng · ${name}`;
    if (k === 'watch') return `Nội dung · ${name}`;
    if (k === 'download') return `License · ${name}`;
    if (k === 'hire') return `Listing · ${name}`;
    if (k === 'compute') return `GPU · ${name}`;
    return `Deploy ${name}`;
  }

  kindHint(): string {
    const k = this.workspace();
    if (k === 'voice') {
      return 'Giọng preset bán theo ký tự và/hoặc license ngày/tháng/năm. TTS: VieNeu-TTS-v3-Turbo. STT: vinai/PhoWhisper-large. Không gắn Chatterbox hay tokenize.';
    }
    if (k === 'watch') return 'Buyer xem khi có AIM-xxxx còn hạn. Upload tập/chương trên dashboard products.';
    if (k === 'download') return 'Skill / dataset mở bằng AIM-xxxx — không phải public endpoint.';
    if (k === 'hire') return 'Listing thuê chuyên gia / workflow. Không deploy model.';
    if (k === 'compute') return 'Phiên GPU / game server.';
    return 'Attach AI Markets endpoints. Only the product seller can deploy.';
  }

  ngOnInit(): void {
    this.seo.set({ title: 'Seller workspace' });
    this.runpodApi.publicEndpoints().subscribe({
      next: (items) => this.catalog.set(items),
      error: () => this.catalog.set(RUNPOD_PUBLIC_ENDPOINTS),
    });
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.productsApi.bySlug(slug).subscribe((p) => {
      this.product.set(p);
      this.form.name = `${p.name} — production`;
      fillRuntimeFromProduct(this.form, p);
      const hit = this.catalog().find((e) => e.runsyncUrl === this.form.publicEndpoint);
      this.catalogSlug = hit?.slug || '';
      this.fillVoice(p);
      this.seo.set({ title: this.pageTitle() });
      if (isVoiceCloneCategory(p.category)) {
        const ep = `${p.runtime?.baseModel || ''} ${p.runtime?.publicEndpoint || ''}`;
        if (!/vieneu|phowhisper/i.test(ep)) {
          this.productsApi.update(p.id, { contentMeta: p.contentMeta || {} }).subscribe({
            next: (fresh) => this.product.set(fresh),
          });
        }
      }
    });
  }

  fillVoice(p: Product): void {
    const meta = p.contentMeta || {};
    const modes = meta.voiceModes || ['tts', 'stt'];
    this.voiceForm = {
      voiceTts: modes.includes('tts'),
      voiceStt: modes.includes('stt'),
      voiceSampleUrl: String(meta.voiceSampleUrl || ''),
      charactersPerCredit: Number(meta.charactersPerCredit) || 1000,
      priceDay: Number(meta.licensePrices?.day) || 1.49,
      priceMonth: Number(meta.licensePrices?.month) || Number(p.pricing?.price) || 9.99,
      priceYear: Number(meta.licensePrices?.year) || 79,
    };
  }

  onVoiceFile(ev: Event): void {
    const file = (ev.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.voiceError.set('');
    this.voiceUploading.set(true);
    this.uploads.uploadAudio(file).subscribe({
      next: (res) => {
        this.voiceForm.voiceSampleUrl = res.url;
        this.voiceUploading.set(false);
      },
      error: (err) => {
        this.voiceUploading.set(false);
        this.voiceError.set(err?.error?.message || 'Upload MP3 thất bại.');
      },
    });
  }

  saveVoice(): void {
    const p = this.product();
    if (!p || this.busy() || this.isPreset()) return;
    if (!this.voiceForm.voiceSampleUrl.trim()) {
      this.error.set('Upload MP3 giọng trước khi lưu.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const modes = [
      ...(this.voiceForm.voiceTts ? (['tts'] as const) : []),
      ...(this.voiceForm.voiceStt ? (['stt'] as const) : []),
    ];
    this.productsApi
      .update(p.id, {
        contentMeta: {
          ...p.contentMeta,
          voiceSource: 'clone',
          voiceModes: modes.length ? [...modes] : ['tts', 'stt'],
          voiceSampleUrl: this.voiceForm.voiceSampleUrl,
          charactersPerCredit: this.voiceForm.charactersPerCredit,
          licenseTerm: 'month',
          licensePrices: {
            day: this.voiceForm.priceDay,
            month: this.voiceForm.priceMonth,
            year: this.voiceForm.priceYear,
          },
        },
        pricing: {
          ...p.pricing,
          model: 'usage',
          usageUnit: '1K characters',
          interval: 'month',
          price: this.voiceForm.priceMonth,
        },
      })
      .subscribe({
        next: (fresh) => {
          this.busy.set(false);
          this.product.set(fresh);
          this.saved.set(fresh);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'Không lưu được giọng.');
        },
      });
  }

  applyCatalog(slug: string): void {
    if (!slug) return;
    const ep = this.catalog().find((e) => e.slug === slug);
    if (!ep) return;
    const mapped = runtimeFromRunpodPublicEndpoint(ep);
    this.form.publicEndpoint = mapped.publicEndpoint;
    this.form.serverlessEndpoint = mapped.serverlessEndpoint;
    this.form.gatewayUrl = mapped.gatewayUrl;
    this.form.tokenizeEndpoint = mapped.tokenizeEndpoint;
    this.form.baseModel = mapped.baseModel;
    const up = mapped._upstream;
    const lines = [
      'AI_PROVIDER=runpod_public',
      `PROVIDER_ENDPOINT_ID=${up.endpointId}`,
      `UPSTREAM_RUNSYNC=${up.runsync}`,
      `UPSTREAM_RUN=${up.run}`,
      up.gateway ? `UPSTREAM_GATEWAY=${up.gateway}` : '',
      'MARKETPLACE_API_KEY=',
    ].filter(Boolean);
    this.form.envText = lines.join('\n');
  }

  submit(): void {
    const p = this.product();
    if (!p || this.busy()) return;
    if (!needsEndpointDeploy(p.category)) {
      this.error.set('Listing này không deploy API endpoint.');
      return;
    }
    if (!this.form.serverlessEndpoint.trim() && !this.form.publicEndpoint.trim()) {
      this.error.set('Cần ít nhất serverless hoặc public endpoint (api.aimarkets.vn).');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.deployments
      .deploy({
        productId: p.id,
        name: this.form.name,
        visibility: this.form.visibility,
        syncProduct: this.form.syncProduct,
        runtime: runtimePayload(this.form),
      })
      .subscribe({
        next: (dep) => {
          this.busy.set(false);
          this.created.set(dep);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'Deploy failed. Chỉ seller của product mới được deploy.');
        },
      });
  }
}

/* ------------------------------------------------------------------ */
/*  AGENT BROWSER                                                       */
/* ------------------------------------------------------------------ */

@Component({
  selector: 'app-agent-browser',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Seller deployments</p>
          <h1 class="section-title mt-1">Agent Browser</h1>
          <p class="mt-2 max-w-2xl text-muted">
            Public endpoints &amp; agents published by sellers. Skills and gateways shown when configured.
          </p>
        </div>
        <a routerLink="/models" class="btn-primary">+ Deploy your product</a>
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
              by {{ d.ownerName || 'Seller' }} ·
              <a [routerLink]="['/product', d.productSlug]" class="text-accent hover:underline">{{ d.productName }}</a>
            </p>
            @if (d.runtime.systemPrompt) {
              <p class="mt-3 line-clamp-2 text-sm text-muted">“{{ d.runtime.systemPrompt }}”</p>
            }
            @if (d.runtime.skills.length) {
              <div class="mt-3 flex flex-wrap gap-1">
                @for (s of d.runtime.skills; track s) {
                  <span class="rounded bg-line/40 px-2 py-0.5 text-[11px] text-muted">{{ s }}</span>
                }
              </div>
            }
            <div class="mt-4 space-y-1 text-[11px] text-muted">
              @if (d.endpoint) {
                <p class="truncate font-mono" title="{{ d.endpoint }}">↗ {{ d.endpoint }}</p>
              }
              @if (d.runtime.gatewayUrl) {
                <p class="truncate font-mono">gateway {{ d.runtime.gatewayUrl }}</p>
              }
              @if (d.runtime.tokenizeEndpoint) {
                <p class="truncate font-mono">tokenize {{ d.runtime.tokenizeEndpoint }}</p>
              }
            </div>
            <div class="mt-4 flex flex-wrap gap-3 text-xs text-muted">
              <span>{{ d.totals.requests | number }} runs</span>
              <span>{{ d.totals.inputTokens + d.totals.outputTokens | number }} tokens</span>
            </div>
            <a [routerLink]="['/product', d.productSlug]" class="btn-ghost mt-auto pt-5 w-full justify-center text-sm">View product</a>
          </article>
        } @empty {
          <div class="panel col-span-full rounded-xl border border-line p-10 text-center text-muted">
            <p>No public seller deployments yet.</p>
            <a routerLink="/models" class="btn-primary mt-4 inline-flex">Configure a deploy</a>
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
    this.seo.set({ title: 'Agent Browser', description: 'Browse seller-published AI agents.' });
    this.deployments.browser().subscribe((rows) => this.items.set(rows));
  }
}

/* ------------------------------------------------------------------ */
/*  MY DEPLOYMENTS — seller edit runtime                               */
/* ------------------------------------------------------------------ */
@Component({
  selector: 'app-my-deployments',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
    <section class="page route-enter">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="section-title">Seller Deployments</h1>
          <p class="mt-2 text-muted">Update serverless runtime, tokenize, gateway, public endpoint, .env &amp; skills.</p>
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
                <h2 class="flex flex-wrap items-center gap-2 font-medium text-ink">
                  {{ d.name }}
                  <span class="rounded-full px-2 py-0.5 text-[11px]" [class]="d.status === 'running' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-line/40 text-muted'">{{ d.status }}</span>
                  <span class="rounded-full bg-line/40 px-2 py-0.5 text-[11px] text-muted">{{ d.visibility }}</span>
                </h2>
                <p class="mt-1 text-xs text-muted">
                  {{ d.kind }} · <a [routerLink]="['/product', d.productSlug]" class="text-accent hover:underline">{{ d.productName }}</a>
                  · {{ d.createdAt | date: 'MMM d, y' }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-ghost text-sm" (click)="toggleEdit(d)">
                  {{ editing() === d.id ? 'Close edit' : 'Edit runtime' }}
                </button>
                <button type="button" class="btn-ghost text-sm" (click)="toggleStatus(d)">{{ d.status === 'running' ? 'Stop' : 'Start' }}</button>
                <button type="button" class="btn-ghost text-sm" (click)="toggleVisibility(d)">{{ d.visibility === 'public' ? 'Unpublish' : 'Publish' }}</button>
                <button type="button" class="btn-ghost text-sm text-red-400" (click)="remove(d)">Delete</button>
              </div>
            </div>

            <div class="mt-4 grid gap-2 text-[11px] text-muted md:grid-cols-2">
              <p class="truncate font-mono" title="{{ d.runtime.serverlessEndpoint }}">serverless {{ d.runtime.serverlessEndpoint || '—' }}</p>
              <p class="truncate font-mono" title="{{ d.runtime.publicEndpoint }}">public {{ d.runtime.publicEndpoint || '—' }}</p>
              <p class="truncate font-mono" title="{{ d.runtime.tokenizeEndpoint }}">tokenize {{ d.runtime.tokenizeEndpoint || '—' }}</p>
              <p class="truncate font-mono" title="{{ d.runtime.gatewayUrl }}">gateway {{ d.runtime.gatewayUrl || '—' }}</p>
            </div>

            @if (editing() === d.id) {
              <form class="mt-4 space-y-3 rounded-lg border border-line bg-line/10 p-4" (ngSubmit)="saveRuntime(d)">
                <div class="grid gap-3 md:grid-cols-2">
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" name="public" [(ngModel)]="editForm.publicEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/runsync" />
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" name="serverless" [(ngModel)]="editForm.serverlessEndpoint" placeholder="https://api.aimarkets.vn/v1/models/…/run" />
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" name="tokenize" [(ngModel)]="editForm.tokenizeEndpoint" placeholder="Tokenize endpoint" />
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" name="gateway" [(ngModel)]="editForm.gatewayUrl" placeholder="Gateway" />
                </div>
                <textarea class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs text-ink" rows="3" name="env" [(ngModel)]="editForm.envText" placeholder=".env KEY=VALUE"></textarea>
                <input class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" name="skills" [(ngModel)]="editForm.skillsText" placeholder="Skills comma-separated" />
                <div class="grid gap-3 md:grid-cols-2">
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" name="baseModel" [(ngModel)]="editForm.baseModel" placeholder="Base model" />
                  <input class="input rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" type="number" name="maxTokens" [(ngModel)]="editForm.maxTokens" placeholder="Max tokens" />
                </div>
                <textarea class="input w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink" rows="2" name="prompt" [(ngModel)]="editForm.systemPrompt" placeholder="System prompt"></textarea>
                <label class="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="sync" [(ngModel)]="editForm.syncProduct" />
                  Sync to Product catalog
                </label>
                <button type="submit" class="btn-primary text-sm" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save runtime' }}</button>
              </form>
            }

            <div class="mt-4 flex flex-wrap gap-5 border-t border-line pt-4 text-sm">
              <span class="text-muted">Requests <strong class="text-ink">{{ d.totals.requests | number }}</strong></span>
              <span class="text-muted">Tokens <strong class="text-ink">{{ d.totals.inputTokens + d.totals.outputTokens | number }}</strong></span>
              <span class="text-muted">Spend <strong class="text-ink">{{ d.totals.cost | currency: 'USD' }}</strong></span>
              @if (d.runtime.skills.length) {
                <span class="text-muted">Skills <strong class="text-ink">{{ d.runtime.skills.join(', ') }}</strong></span>
              }
            </div>

            @if (d.status === 'running') {
              <div class="mt-4 rounded-lg border border-line bg-line/10 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted">Self-test (metered, no self-charge)</p>
                <div class="mt-2 flex gap-2">
                  <input
                    class="input flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink"
                    placeholder="Prompt to exercise tokenize + billing path"
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
                      {{ r.totalTokens | number }} tokens · cost {{ r.cost | currency: 'USD' : 'symbol' : '1.2-4' }}
                      @if (r.endpoint) { · via {{ r.endpoint }} }
                    </p>
                  </div>
                }
              </div>
            }
          </article>
        } @empty {
          <div class="panel rounded-xl border border-line p-10 text-center text-muted">
            <p>No seller deployments yet. Publish a product, then configure its GPU runtime.</p>
            <a routerLink="/dashboard/products" class="btn-primary mt-4 inline-flex">Go to Products</a>
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
  readonly editing = signal<string | null>(null);
  readonly saving = signal(false);
  readonly invoking = signal<string | null>(null);
  prompts: Record<string, string> = {};
  results: Record<string, InvokeResult> = {};
  editForm = { ...emptyRuntimeForm(), syncProduct: true };

  ngOnInit(): void {
    this.seo.set({ title: 'Seller Deployments' });
    this.reload();
  }

  reload(): void {
    this.deployments.mine().subscribe({
      next: (rows) => this.items.set(rows),
      error: (err) => this.status.set(err?.error?.message || 'Failed to load deployments (seller only).'),
    });
  }

  toggleEdit(d: Deployment): void {
    if (this.editing() === d.id) {
      this.editing.set(null);
      return;
    }
    const r = d.runtime;
    this.editForm = {
      ...emptyRuntimeForm(),
      syncProduct: true,
      serverlessEndpoint: r?.serverlessEndpoint || '',
      tokenizeEndpoint: r?.tokenizeEndpoint || '',
      gatewayUrl: r?.gatewayUrl || '',
      publicEndpoint: r?.publicEndpoint || '',
      baseModel: r?.baseModel || '',
      systemPrompt: r?.systemPrompt || '',
      temperature: r?.temperature ?? 0.7,
      maxTokens: r?.maxTokens ?? 1024,
      skillsText: (r?.skills || []).join(', '),
      envText: (r?.env || []).map((e) => `${e.key}=${e.value}`).join('\n'),
    };
    this.editing.set(d.id);
  }

  saveRuntime(d: Deployment): void {
    if (!this.editForm.serverlessEndpoint.trim() && !this.editForm.publicEndpoint.trim()) {
      this.status.set('Cần serverless hoặc public endpoint (api.aimarkets.vn).');
      return;
    }
    this.saving.set(true);
    this.deployments
      .update(d.id, {
        syncProduct: this.editForm.syncProduct,
        runtime: runtimePayload(this.editForm),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(null);
          this.status.set(`Updated runtime for ${d.name}.`);
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.status.set(err?.error?.message || 'Update failed.');
        },
      });
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
    if (!confirm(`Delete deployment "${d.name}"?`)) return;
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
