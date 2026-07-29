import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, ReviewService, WishlistService, BillingService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { PaymentProvider, Product, ProductCategory, Review } from '../../models/marketplace.models';
import { categoryLabel, isHireCategory, isSkillCategory } from '../../models/categories';
import { OpenClawGatewayService } from '../agents/openclaw-gateway.service';

type WorkspaceTab = 'playground' | 'hire' | 'install' | 'api' | 'overview' | 'reviews';
type ResultView = 'preview' | 'json';
type InputMode = 'messages' | 'prompt';
type RunStatus = 'idle' | 'running' | 'done' | 'error';
type ApiClient = 'curl' | 'python' | 'javascript';
type ApiAction = 'run' | 'runsync' | 'status';
type LogsTab = 'session' | 'history';
type HistoryRange = '24h' | '7d' | '30d' | 'all';

interface RequestLogEntry {
  id: string;
  productId: string;
  productSlug: string;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  delayMs: number;
  executionMs: number;
  createdAt: string;
  model: string;
  promptPreview: string;
  requestJson: string;
  responseJson: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly wishlistApi = inject(WishlistService);
  private readonly billing = inject(BillingService);
  private readonly seo = inject(SeoService);
  private readonly openclaw = inject(OpenClawGatewayService);
  readonly auth = inject(AuthService);

  readonly product = signal<Product | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly workspaceTab = signal<WorkspaceTab>('playground');
  readonly resultView = signal<ResultView>('preview');
  readonly runStatus = signal<RunStatus>('idle');
  readonly checkoutMsg = signal('');
  provider: PaymentProvider = 'stripe';
  inputMode: InputMode = 'messages';
  modelVariant = '';
  prompt = '';
  systemPrompt = 'You are a helpful assistant.';
  negativePrompt = '';
  duration: 6 | 10 = 6;
  imageUrl = '';
  temperature = 1;
  maxTokens = 2048;
  seed = '-1';

  /** text-to-video advanced */
  videoSize: '720p' | '1080p' = '720p';
  aspectRatio: '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '1:1' = '16:9';
  fps = 24;
  enableSafetyChecker = false;
  draftMode = false;
  saveAudio = true;
  promptUpsampling = true;

  /** image-to-image advanced */
  imageSize: '1024×1024' | '1024×1280' | '1280×1024' | '1280×1280' | '1280×1536' | '1536×1080' =
    '1024×1024';
  outputFormat: 'png' | 'jpeg' = 'jpeg';
  enableBase64Output = false;
  enableSyncMode = false;
  loraIds: string[] = [];
  loraDraft = '';
  textImageSize: '1024×1024' | '1024×1280' | '1280×1024' = '1024×1024';

  hireBrief = '';
  hireBudget = '';
  hireTimeline = '2 weeks';
  hireContact = '';
  hireSent = signal(false);
  readonly skillInstalled = signal(false);
  readonly openclawBusy = signal(false);
  readonly openclawStatus = signal('');

  readonly isOpenClawHire = computed(() => {
    const p = this.product();
    return !!p && (p.category === 'hire-agent' || p.slug === 'openclaw-ops-agent');
  });

  apiClient: ApiClient = 'curl';
  apiMethod: 'POST' | 'GET' = 'POST';
  apiAction: ApiAction = 'run';
  readonly apiCopied = signal(false);
  readonly apiKeys = signal<{ id: string; name: string; prefix: string; createdAt: string }[]>([]);
  readonly showApiKeys = signal(false);

  readonly logsOpen = signal(false);
  readonly logsTab = signal<LogsTab>('session');
  readonly sessionLogs = signal<RequestLogEntry[]>([]);
  readonly historyLogs = signal<RequestLogEntry[]>([]);
  readonly selectedLog = signal<RequestLogEntry | null>(null);
  readonly historyRange = signal<HistoryRange>('24h');
  readonly logsPageSize = signal(10);
  readonly logsPage = signal(1);

  readonly videoAspectOptions = ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'] as const;
  readonly imageSizeOptions = [
    '1024×1024',
    '1024×1280',
    '1280×1024',
    '1280×1280',
    '1280×1536',
    '1536×1080',
  ] as const;
  readonly fpsOptions = [8, 12, 16, 24, 30] as const;

  previewText = '';
  resultJson = '';
  resultMediaUrl = '';
  lastLatencyMs = 0;

  reviewTitle = '';
  reviewBody = '';
  reviewRating = 5;

  readonly priceHint = computed(() => {
    const p = this.product();
    if (!p) return '';
    if (p.category === 'text-to-video') {
      return this.videoSize === '1080p'
        ? '720p · $0.02/sec · 1080p · $0.04/sec (sandbox estimate).'
        : '720p · $0.02/sec · 1080p · $0.04/sec (sandbox estimate).';
    }
    const pr = p.pricing;
    if (pr.model === 'usage') {
      return `Runs are billed at ${pr.usageRate} ${pr.currency} per ${pr.usageUnit}.`;
    }
    if (pr.model === 'subscription') {
      return `Included with ${pr.price} ${pr.currency}/${pr.interval} subscription.`;
    }
    if (pr.model === 'free') return 'Free sandbox — no charge for demo runs.';
    return `One-time purchase ${pr.price} ${pr.currency}.`;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || '';
      this.productsApi.bySlug(slug).subscribe((p) => {
        this.product.set(p);
        this.seo.set({ title: p.name, description: p.tagline, image: p.coverUrl });
        this.reviewsApi.list(p.id).subscribe((r) => this.reviews.set(r));
        this.resetPlayground(p);
        this.workspaceTab.set(
          isHireCategory(p.category) ? 'hire' : isSkillCategory(p.category) ? 'install' : 'playground',
        );
        this.hireSent.set(false);
        this.skillInstalled.set(false);
        this.sessionLogs.set([]);
        this.selectedLog.set(null);
        this.logsPage.set(1);
        this.loadHistory(p.id);
      });
    });
  }

  label(cat: ProductCategory): string {
    return categoryLabel(cat);
  }

  isHire(cat: ProductCategory): boolean {
    return isHireCategory(cat);
  }

  isSkill(cat: ProductCategory): boolean {
    return isSkillCategory(cat);
  }

  installSkill(): void {
    this.skillInstalled.set(true);
    this.checkoutMsg.set('Skill pack marked installed (mock). Copy install steps from the Install tab.');
  }

  submitHireRequest(): void {
    if (!this.hireBrief.trim() || !this.hireContact.trim()) return;
    this.hireSent.set(true);
    this.checkoutMsg.set('Hire request sent — seller will reply in-app (mock).');
  }

  launchOpenClaw(): void {
    if (this.openclawBusy()) return;
    this.openclawBusy.set(true);
    this.openclawStatus.set('Opening OpenClaw gateway…');
    const agent = this.openclaw.getAgent('openclaw');
    this.openclaw.launchGateway({ agent: agent || undefined }).subscribe((res) => {
      this.openclawBusy.set(false);
      this.openclawStatus.set(
        res.success
          ? 'Gateway opened — auto-approving device pairing…'
          : res.message || 'Launch failed',
      );
      if (res.success) {
        this.checkoutMsg.set('OpenClaw Control UI launched.');
      }
    });
  }

  primaryCta(): void {
    const p = this.product();
    if (!p) return;
    if (p.category === 'hire-agent' || p.slug === 'openclaw-ops-agent') {
      this.launchOpenClaw();
      return;
    }
    if (isHireCategory(p.category)) {
      this.setWorkspace('hire');
      return;
    }
    if (isSkillCategory(p.category)) {
      this.setWorkspace('install');
      return;
    }
    this.checkout();
  }

  setWorkspace(tab: WorkspaceTab): void {
    this.workspaceTab.set(tab);
  }

  setResultView(view: ResultView): void {
    this.resultView.set(view);
  }

  resetPlayground(p?: Product | null): void {
    const product = p ?? this.product();
    this.runStatus.set('idle');
    this.previewText = '';
    this.resultJson = '';
    this.resultMediaUrl = '';
    this.lastLatencyMs = 0;
    this.resultView.set('preview');
    this.inputMode = 'messages';
    this.temperature = 1;
    this.maxTokens = 2048;
    this.seed = product?.category === 'text-to-video' ? '0' : '-1';
    this.duration = 6;
    this.negativePrompt = '';
    this.imageUrl = '';
    this.videoSize = '720p';
    this.aspectRatio = '16:9';
    this.fps = 24;
    this.enableSafetyChecker = false;
    this.draftMode = false;
    this.saveAudio = true;
    this.promptUpsampling = true;
    this.imageSize = '1024×1024';
    this.outputFormat = 'jpeg';
    this.enableBase64Output = false;
    this.enableSyncMode = false;
    this.loraIds = [];
    this.loraDraft = '';
    this.textImageSize = '1024×1024';

    if (!product) return;
    this.modelVariant = product.slug;
    this.systemPrompt = `You are ${product.name}.`;

    switch (product.category) {
      case 'text-to-text':
        this.prompt = 'What is PH AI Market?';
        break;
      case 'text-to-video':
        this.prompt =
          'A kitten chases a bouncing rubber ball across a polished wooden floor, sliding slightly and bumping into a potted plant.';
        break;
      case 'image-to-video':
        this.prompt = 'Subtle camera push-in, soft natural motion, cinematic lighting.';
        this.imageUrl = product.coverUrl;
        break;
      case 'text-to-image':
        this.prompt = 'Minimal product photo of a ceramic mug on linen, soft daylight, 85mm.';
        break;
      case 'image-to-image':
        this.prompt = 'Keep composition, restyle as watercolor with warm pastel palette.';
        this.imageUrl = product.coverUrl;
        break;
      case 'fine-tune':
        this.prompt = '{\n  "base_model": "sea-flash",\n  "method": "qlora",\n  "epochs": 3\n}';
        break;
      case 'dataset':
        this.prompt = 'Request sample rows / schema preview.';
        break;
      case 'inference':
        this.prompt = 'What is PH AI Market?';
        this.systemPrompt = `You are ${product.name}.`;
        break;
    }
  }

  bumpMaxTokens(delta: number): void {
    this.maxTokens = Math.min(8192, Math.max(16, this.maxTokens + delta));
  }

  bumpTemperature(delta: number): void {
    const next = Math.round((this.temperature + delta) * 100) / 100;
    this.temperature = Math.min(2, Math.max(0, next));
  }

  addLora(): void {
    const id = this.loraDraft.trim();
    if (!id || this.loraIds.includes(id)) return;
    this.loraIds = [...this.loraIds, id];
    this.loraDraft = '';
  }

  removeLora(id: string): void {
    this.loraIds = this.loraIds.filter((x) => x !== id);
  }

  onImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.imageUrl = '';
  }

  run(): void {
    const p = this.product();
    if (!p) return;
    if (!this.prompt.trim()) return;
    if ((p.category === 'image-to-video' || p.category === 'image-to-image') && !this.imageUrl.trim()) {
      this.runStatus.set('error');
      this.previewText = 'Image is required for this modality.';
      this.resultJson = JSON.stringify({ error: 'image_required' }, null, 2);
      return;
    }

    const requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
    const delayMs = Math.round(40 + Math.random() * 120);
    this.runStatus.set('running');
    this.previewText = '';
    this.resultJson = '';
    this.resultMediaUrl = '';

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const payload = this.buildRequestPayload(p);

    setTimeout(() => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.lastLatencyMs = Math.round(now - started);
      const response = this.buildMockResponse(p, payload);
      response['id'] = requestId;
      this.resultJson = JSON.stringify(response, null, 2);
      this.applyPreview(p, response);
      this.runStatus.set('done');

      const entry: RequestLogEntry = {
        id: requestId,
        productId: p.id,
        productSlug: p.slug,
        status: 'COMPLETED',
        delayMs,
        executionMs: this.lastLatencyMs,
        createdAt: new Date().toISOString(),
        model: this.modelVariant || p.slug,
        promptPreview: this.prompt.trim().slice(0, 120),
        requestJson: JSON.stringify(payload, null, 2),
        responseJson: this.resultJson,
      };
      this.sessionLogs.update((list) => [entry, ...list]);
      this.persistHistory(entry);
      this.historyLogs.update((list) => [entry, ...list.filter((x) => x.id !== entry.id)]);
    }, 700 + Math.random() * 500);
  }

  openLogs(tab: LogsTab = 'session'): void {
    this.logsTab.set(tab);
    this.logsPage.set(1);
    this.selectedLog.set(null);
    this.logsOpen.set(true);
  }

  closeLogs(): void {
    this.logsOpen.set(false);
    this.selectedLog.set(null);
  }

  setLogsTab(tab: LogsTab): void {
    this.logsTab.set(tab);
    this.logsPage.set(1);
    this.selectedLog.set(null);
  }

  setHistoryRange(range: HistoryRange): void {
    this.historyRange.set(range);
    this.logsPage.set(1);
    this.selectedLog.set(null);
  }

  selectLog(entry: RequestLogEntry): void {
    this.selectedLog.set(entry);
  }

  clearSessionLogs(): void {
    this.sessionLogs.set([]);
    this.selectedLog.set(null);
    this.logsPage.set(1);
  }

  filteredHistory(): RequestLogEntry[] {
    const all = this.historyLogs();
    const now = Date.now();
    const range = this.historyRange();
    const ms =
      range === '24h'
        ? 24 * 3600_000
        : range === '7d'
          ? 7 * 24 * 3600_000
          : range === '30d'
            ? 30 * 24 * 3600_000
            : Number.POSITIVE_INFINITY;
    return all.filter((e) => now - new Date(e.createdAt).getTime() <= ms);
  }

  pagedLogs(): RequestLogEntry[] {
    const list = this.logsTab() === 'session' ? this.sessionLogs() : this.filteredHistory();
    const start = (this.logsPage() - 1) * this.logsPageSize();
    return list.slice(start, start + this.logsPageSize());
  }

  logsTotalPages(): number {
    const total =
      this.logsTab() === 'session' ? this.sessionLogs().length : this.filteredHistory().length;
    return Math.max(1, Math.ceil(total / this.logsPageSize()) || 1);
  }

  prevLogsPage(): void {
    this.logsPage.set(Math.max(1, this.logsPage() - 1));
  }

  nextLogsPage(): void {
    this.logsPage.set(Math.min(this.logsTotalPages(), this.logsPage() + 1));
  }

  formatMs(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  }

  private loadHistory(productId: string): void {
    try {
      if (typeof localStorage === 'undefined') {
        this.historyLogs.set([]);
        return;
      }
      const raw = localStorage.getItem(this.historyStorageKey(productId));
      const parsed = raw ? (JSON.parse(raw) as RequestLogEntry[]) : [];
      this.historyLogs.set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.historyLogs.set([]);
    }
  }

  private persistHistory(entry: RequestLogEntry): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const key = this.historyStorageKey(entry.productId);
      const prev = this.historyLogs().filter((x) => x.id !== entry.id);
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }

  private historyStorageKey(productId: string): string {
    return `phai.requestLogs.${productId}`;
  }

  private buildRequestPayload(p: Product): Record<string, unknown> {
    const model = this.modelVariant || p.slug;

    if (p.category === 'text-to-text' || p.category === 'inference') {
      const useMessages = this.inputMode === 'messages' || p.category === 'inference';
      const input: Record<string, unknown> = useMessages
        ? {
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: this.prompt },
            ],
          }
        : { prompt: this.prompt, system_prompt: this.systemPrompt };
      input['sampling_params'] = {
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      };
      return { input, model };
    }

    if (p.category === 'text-to-video') {
      return {
        input: {
          prompt: this.prompt,
          duration: this.duration,
          seed: this.seed === '' ? undefined : Number(this.seed),
          size: this.videoSize,
          aspect_ratio: this.aspectRatio,
          fps: this.fps,
          enable_safety_checker: this.enableSafetyChecker,
          draft: this.draftMode,
          save_audio: this.saveAudio,
          prompt_upsampling: this.promptUpsampling,
        },
        model,
      };
    }

    if (p.category === 'image-to-video') {
      return {
        input: {
          prompt: this.prompt,
          duration: this.duration,
          image: this.imageUrl.startsWith('data:') ? 'data:image/...;base64,…' : this.imageUrl,
          seed: this.seed === '' ? undefined : Number(this.seed),
          size: this.videoSize,
          aspect_ratio: this.aspectRatio,
          fps: this.fps,
        },
        model,
      };
    }

    if (p.category === 'text-to-image') {
      return {
        input: {
          prompt: this.prompt,
          negative_prompt: this.negativePrompt || undefined,
          seed: this.seed === '' ? undefined : Number(this.seed),
          size: this.textImageSize,
          output_format: this.outputFormat,
        },
        model,
      };
    }

    if (p.category === 'fine-tune') {
      return {
        input: {
          config: this.prompt,
          seed: this.seed === '' ? undefined : Number(this.seed),
          wait_for_completion: this.enableSyncMode,
        },
        model,
      };
    }

    if (p.category === 'dataset') {
      return {
        input: { query: this.prompt, preview_rows: Math.min(100, Math.max(1, this.maxTokens)) },
        model,
      };
    }

    return {
      input: {
        prompt: this.prompt,
        image: this.imageUrl.startsWith('data:') ? 'data:image/...;base64,…' : this.imageUrl,
        seed: this.seed === '' ? undefined : Number(this.seed),
        size: this.imageSize,
        output_format: this.outputFormat,
        loras: this.loraIds,
        enable_base64_output: this.enableBase64Output,
        enable_sync_mode: this.enableSyncMode,
      },
      model,
    };
  }

  private buildMockResponse(p: Product, request: Record<string, unknown>): Record<string, unknown> {
    const id = `run_${Math.random().toString(36).slice(2, 10)}`;
    if (p.category === 'text-to-text' || p.category === 'inference') {
      return {
        id,
        status: 'completed',
        latencyMs: this.lastLatencyMs,
        output: {
          text: `${p.name} reply:\n\n${this.prompt.trim()}\n\n—\nThis is a sandbox completion. Wire your RunPod / Nest endpoint to replace the mock.`,
        },
        usage: { input_tokens: 42, output_tokens: 96 },
        request,
      };
    }
    if (p.category === 'fine-tune') {
      return {
        id,
        status: 'completed',
        latencyMs: this.lastLatencyMs,
        output: {
          text: `Fine-tune job queued.\nAdapter: adapter_${id}.safetensors\nEval loss: 0.42 (mock)`,
        },
        request,
      };
    }
    if (p.category === 'dataset') {
      return {
        id,
        status: 'completed',
        latencyMs: this.lastLatencyMs,
        output: {
          text: `Schema preview (mock)\n- turn_id: string\n- channel: zalo|fanpage|web\n- intent: book|faq|escalate\n- text: string\n\nShowing 5 / 40000 rows.`,
        },
        request,
      };
    }
    if (p.category === 'text-to-video' || p.category === 'image-to-video') {
      return {
        id,
        status: 'completed',
        latencyMs: this.lastLatencyMs,
        output: {
          type: 'video',
          duration: this.duration,
          url: p.coverUrl,
          note: 'Mock preview uses cover art — replace with job.poll video URL.',
        },
        request,
      };
    }
    return {
      id,
      status: 'completed',
      latencyMs: this.lastLatencyMs,
      output: {
        type: 'image',
        url: this.imageUrl || p.coverUrl,
        note: 'Mock image output — replace with generation URL.',
      },
      request,
    };
  }

  private applyPreview(p: Product, response: Record<string, unknown>): void {
    const output = response['output'] as Record<string, unknown> | undefined;
    if (
      p.category === 'text-to-text' ||
      p.category === 'inference' ||
      p.category === 'fine-tune' ||
      p.category === 'dataset'
    ) {
      this.previewText = String(output?.['text'] || '');
      this.resultMediaUrl = '';
      return;
    }
    this.previewText = String(output?.['note'] || 'Generation complete.');
    this.resultMediaUrl = String(output?.['url'] || p.coverUrl);
  }

  apiEndpoint(p: Product): string {
    return `https://api.phaimarket.com/v2/${p.slug}/${this.apiAction}`;
  }

  apiSnippet(p: Product): string {
    const url = this.apiEndpoint(p);
    const body = JSON.stringify(this.buildRequestPayload(p));
    if (this.apiClient === 'python') {
      return [
        'import requests',
        '',
        `url = "${url}"`,
        'headers = {',
        '  "Content-Type": "application/json",',
        '  "Authorization": "Bearer YOUR_API_KEY",',
        '}',
        `payload = ${JSON.stringify(this.buildRequestPayload(p), null, 2)}`,
        '',
        'response = requests.post(url, headers=headers, json=payload)',
        'print(response.json())',
      ].join('\n');
    }
    if (this.apiClient === 'javascript') {
      return [
        `const res = await fetch("${url}", {`,
        '  method: "POST",',
        '  headers: {',
        '    "Content-Type": "application/json",',
        '    "Authorization": "Bearer YOUR_API_KEY",',
        '  },',
        `  body: JSON.stringify(${JSON.stringify(this.buildRequestPayload(p), null, 2)}),`,
        '});',
        'const data = await res.json();',
        'console.log(data);',
      ].join('\n');
    }
    return [
      `curl -X ${this.apiMethod} ${url} \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Authorization: Bearer YOUR_API_KEY' \\`,
      `  -d '${body.replace(/'/g, "'\\''")}'`,
    ].join('\n');
  }

  createApiKey(): void {
    const id = `key_${Math.random().toString(36).slice(2, 10)}`;
    const secret = `phai_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    this.apiKeys.update((list) => [
      {
        id,
        name: `Key ${list.length + 1}`,
        prefix: `${secret.slice(0, 12)}…`,
        createdAt: new Date().toISOString(),
      },
      ...list,
    ]);
    this.showApiKeys.set(true);
    this.checkoutMsg.set(`API key created (mock): ${secret} — copy now, shown once.`);
  }

  copyApiSnippet(p: Product): void {
    const text = this.apiSnippet(p);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        this.apiCopied.set(true);
        setTimeout(() => this.apiCopied.set(false), 1600);
      });
      return;
    }
    this.apiCopied.set(true);
    setTimeout(() => this.apiCopied.set(false), 1600);
  }

  checkout(): void {
    const p = this.product();
    if (!p) return;
    this.billing.checkout({ productId: p.id, provider: this.provider }).subscribe((res) => {
      this.checkoutMsg.set(`Checkout ${res.checkoutId} via ${res.provider} (${res.status})`);
    });
  }

  toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    this.wishlistApi.toggle(p.id).subscribe();
  }

  submitReview(): void {
    const p = this.product();
    const user = this.auth.user();
    if (!p || !user) return;
    this.reviewsApi
      .create({
        productId: p.id,
        userId: user.id,
        userName: user.name,
        rating: this.reviewRating,
        title: this.reviewTitle,
        body: this.reviewBody,
      })
      .subscribe((r) => {
        this.reviews.update((list) => [r, ...list]);
        this.reviewTitle = '';
        this.reviewBody = '';
      });
  }
}
