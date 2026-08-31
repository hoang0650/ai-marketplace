import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProductService,
  ReviewService,
  WishlistService,
  BillingService,
  PlaygroundService,
  AgentChatService,
  DashboardService,
} from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { Product, ProductCategory, Review } from '../../models/marketplace.models';
import { isHireCategory, isSkillCategory } from '../../models/categories';
import { I18nService } from '../../i18n/i18n.service';
import { AppCurrency, CurrencyService } from '../../i18n/currency.service';
import { TPipe } from '../../i18n/t.pipe';
import { OpenClawGatewayService } from '../agents/openclaw-gateway.service';
import {
  RUNPOD_VIDEO_ASPECT,
  RUNPOD_VIDEO_DURATIONS,
  estimateSeedanceCost,
  isRunpodProduct,
  resolveRunpodEndpoint,
  runpodVideoPriceHint,
} from '../../models/runpod-playground';

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
  imports: [RouterLink, DatePipe, DecimalPipe, CurrencyPipe, FormsModule, TPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly wishlistApi = inject(WishlistService);
  private readonly billing = inject(BillingService);
  private readonly playgroundApi = inject(PlaygroundService);
  private readonly agentChatApi = inject(AgentChatService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currencySvc = inject(CurrencyService);
  private readonly openclaw = inject(OpenClawGatewayService);
  private readonly walletApi = inject(DashboardService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly product = signal<Product | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly related = signal<Product[]>([]);
  readonly mediaIndex = signal(0);
  readonly selectedPackage = signal('std');
  readonly workspaceTab = signal<WorkspaceTab>('playground');
  readonly resultView = signal<ResultView>('preview');
  readonly runStatus = signal<RunStatus>('idle');
  readonly checkoutMsg = signal('');
  readonly walletBalance = signal(0);
  qty = 1;
  useCoupon = false;
  couponCode = '';
  displayCurrency: AppCurrency = 'USD';

  readonly mediaList = computed(() => {
    const p = this.product();
    if (!p) return [] as string[];
    const list = [p.coverUrl, ...(p.gallery || [])].filter(Boolean);
    return list.length ? list : [p.coverUrl].filter(Boolean);
  });

  readonly activeMedia = computed(() => {
    const list = this.mediaList();
    if (!list.length) return '';
    return list[Math.min(this.mediaIndex(), list.length - 1)];
  });

  readonly packages = computed(() => {
    const p = this.product();
    if (!p) return [] as Array<{ id: string; title: string; subtitle: string; priceLabel: string }>;
    const price = this.displayPrice(p);
    return [
      {
        id: 'std',
        title: p.name,
        subtitle: 'Standard processing',
        priceLabel: price,
      },
      {
        id: 'pro',
        title: `${p.name} · Pro`,
        subtitle: 'Priority queue + higher limits',
        priceLabel: price,
      },
    ];
  });
  inputMode: InputMode = 'messages';
  modelVariant = '';
  prompt = '';
  systemPrompt = 'You are a helpful assistant.';
  negativePrompt = '';
  /** RunPod video duration (seconds), e.g. Seedance 4–12. */
  duration = 5;
  imageUrl = '';
  endImageUrl = '';
  temperature = 1;
  maxTokens = 2048;
  seed = '-1';

  /** fine-tune structured fields (not JSON-in-prompt) */
  ftBaseModel = '';
  ftMethod: 'qlora' | 'lora' | 'full' = 'qlora';
  ftEpochs = 3;

  /** text/image-to-video advanced (RunPod field names) */
  videoResolution: '480p' | '720p' | '1080p' = '720p';
  aspectRatio: (typeof RUNPOD_VIDEO_ASPECT)[number] | '3:2' | '2:3' = '16:9';
  fps = 24;
  enableSafetyChecker = false;
  draftMode = false;
  saveAudio = true;
  promptUpsampling = true;
  cameraFixed = false;
  generateAudio = false;

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

  /** Persistent-memory agent chat (hire-agent) */
  agentDraft = '';
  agentSessionId = '';
  readonly agentBusy = signal(false);
  readonly agentError = signal('');
  readonly agentMessages = signal<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      memoryRecalled?: number;
      memoryWritten?: number;
      cost?: number;
    }>
  >([]);
  readonly skillInstalled = signal(false);
  readonly openclawBusy = signal(false);
  readonly openclawStatus = signal('');

  readonly isOpenClawHire = computed(() => {
    const p = this.product();
    return !!p && (p.category === 'hire-agent' || p.slug === 'openclaw-ops-agent');
  });

  apiClient: ApiClient = 'curl';
  apiMethod: 'POST' | 'GET' = 'POST';
  apiAction: ApiAction = 'runsync';
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

  readonly videoAspectOptions = RUNPOD_VIDEO_ASPECT;
  readonly videoDurationOptions = RUNPOD_VIDEO_DURATIONS;
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
  resultMediaKind: 'image' | 'video' | 'audio' | 'text' | '' = '';
  lastLatencyMs = 0;
  lastCost = 0;

  reviewTitle = '';
  reviewBody = '';
  reviewRating = 5;

  readonly isRunpod = computed(() => isRunpodProduct(this.product()));
  readonly runpodEndpoint = computed(() => {
    const p = this.product();
    return p ? resolveRunpodEndpoint(p) ?? null : null;
  });

  priceHint(): string {
    const p = this.product();
    if (!p) return '';
    const ep = this.runpodEndpoint();
    if (isRunpodProduct(p) && (p.category === 'image-to-video' || p.category === 'text-to-video')) {
      const hint = runpodVideoPriceHint(ep ?? undefined, this.videoResolution);
      if (ep?.slug === 'seedance-1-5-pro' || hint.includes('0.024')) {
        const res = this.videoResolution === '480p' ? '480p' : '720p';
        const est = estimateSeedanceCost(this.duration, res);
        return `${hint} · Est. $${est.toFixed(3)} for ${this.duration}s ${res}`;
      }
      return hint || ep?.pricing || p.tagline;
    }
    if (isRunpodProduct(p) && ep?.pricing) {
      return `RunPod Public Endpoint · ${ep.pricing}`;
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
  }

  ngOnInit(): void {
    this.displayCurrency = this.currencySvc.currency();
    this.loadWallet();
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || '';
      this.productsApi.bySlug(slug).subscribe((p) => {
        this.product.set(p);
        this.mediaIndex.set(0);
        this.selectedPackage.set('std');
        this.seo.set({ title: p.name, description: p.tagline, image: p.coverUrl });
        this.reviewsApi.list(p.id).subscribe((r) => this.reviews.set(r));
        this.productsApi.list({ category: p.category }).subscribe((items) => {
          this.related.set(items.filter((x) => x.id !== p.id).slice(0, 6));
        });
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

  displayPrice(p: Product, units = 1): string {
    const pr = p.pricing;
    if (pr.model === 'free') {
      return this.displayCurrency === 'VND' ? '0 đ' : this.i18n.t('card.free');
    }
    const qty = Math.max(1, Number(units) || 1);
    const usd = (pr.model === 'usage' ? Number(pr.usageRate) || 0 : Number(pr.price) || 0) * qty;
    if (pr.model === 'usage' && qty === 1) {
      return this.currencySvc.formatUsageFromUsd(usd, pr.usageUnit || 'unit', this.displayCurrency);
    }
    if (pr.model === 'subscription' && qty === 1) {
      return `${this.currencySvc.formatFromUsd(usd, this.displayCurrency)}/${pr.interval}`;
    }
    return this.currencySvc.formatFromUsd(usd, this.displayCurrency);
  }

  bumpQty(delta: number): void {
    this.qty = Math.min(99, Math.max(1, this.qty + delta));
  }

  prevMedia(): void {
    const n = this.mediaList().length;
    if (!n) return;
    this.mediaIndex.update((i) => (i - 1 + n) % n);
  }

  nextMedia(): void {
    const n = this.mediaList().length;
    if (!n) return;
    this.mediaIndex.update((i) => (i + 1) % n);
  }

  applyCoupon(): void {
    if (!this.couponCode.trim()) {
      this.checkoutMsg.set('Enter a discount code first.');
      return;
    }
    this.checkoutMsg.set(`Coupon "${this.couponCode.trim()}" noted (demo — not applied).`);
  }

  label(cat: ProductCategory): string {
    return this.i18n.catLabel(cat);
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

  sendAgentMessage(): void {
    const p = this.product();
    const text = this.agentDraft.trim();
    if (!p || !text || this.agentBusy()) return;
    if (!this.auth.user()) {
      this.agentError.set('Log in to chat with this agent (memory + wallet billing).');
      return;
    }
    this.agentError.set('');
    this.agentBusy.set(true);
    this.agentMessages.update((list) => [...list, { role: 'user', content: text }]);
    this.agentDraft = '';
    this.agentChatApi
      .chat({
        productSlug: p.slug,
        productId: p.id,
        message: text,
        sessionId: this.agentSessionId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.agentBusy.set(false);
          if (res.sessionId) this.agentSessionId = res.sessionId;
          this.agentMessages.update((list) => [
            ...list,
            {
              role: 'assistant',
              content: res.reply || '',
              memoryRecalled: res.memoryRecalled,
              memoryWritten: res.memoryWritten,
              cost: res.cost,
            },
          ]);
        },
        error: (err) => {
          this.agentBusy.set(false);
          const msg = err?.error?.message || err?.message || 'Agent chat failed';
          this.agentError.set(msg);
          this.agentMessages.update((list) => [
            ...list,
            { role: 'assistant', content: `Error: ${msg}` },
          ]);
        },
      });
  }

  clearAgentChat(): void {
    this.agentMessages.set([]);
    this.agentSessionId = '';
    this.agentError.set('');
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
    this.resultMediaKind = '';
    this.lastLatencyMs = 0;
    this.lastCost = 0;
    this.resultView.set('preview');
    this.inputMode = 'messages';
    this.temperature = 1;
    this.maxTokens = 2048;
    this.seed = '-1';
    this.duration = 5;
    this.negativePrompt = '';
    this.imageUrl = '';
    this.endImageUrl = '';
    this.videoResolution = '720p';
    this.aspectRatio = '16:9';
    this.fps = 24;
    this.enableSafetyChecker = false;
    this.draftMode = false;
    this.saveAudio = true;
    this.promptUpsampling = true;
    this.cameraFixed = false;
    this.generateAudio = false;
    this.imageSize = '1024×1024';
    this.outputFormat = 'jpeg';
    this.enableBase64Output = false;
    this.enableSyncMode = true;
    this.loraIds = [];
    this.loraDraft = '';
    this.textImageSize = '1024×1024';
    this.ftMethod = 'qlora';
    this.ftEpochs = 3;
    this.apiAction = 'runsync';

    if (!product) return;
    const ep = resolveRunpodEndpoint(product);
    this.modelVariant = ep?.endpointId || product.runtime?.baseModel || product.slug;
    this.ftBaseModel = product.runtime?.baseModel || product.name;
    this.systemPrompt = `You are ${product.name}.`;

    switch (product.category) {
      case 'text-to-text':
        this.prompt = 'What is Runpod?';
        break;
      case 'text-to-video':
        this.prompt =
          'A kitten chases a bouncing rubber ball across a polished wooden floor, sliding slightly and bumping into a potted plant.';
        break;
      case 'image-to-video':
        this.prompt = 'The character slowly turns and smiles at the camera';
        this.imageUrl =
          ep?.slug === 'seedance-1-5-pro'
            ? 'https://image.runpod.ai/asset/bytedance/seedance-v1-5-pro-i2.png'
            : product.coverUrl;
        this.duration = 5;
        this.videoResolution = '720p';
        break;
      case 'text-to-image':
        this.prompt = 'A beautiful sunset over mountains';
        break;
      case 'image-to-image':
        this.prompt = 'Keep composition, restyle as watercolor with warm pastel palette.';
        this.imageUrl = product.coverUrl;
        break;
      case 'fine-tune':
        this.prompt = 'Train on customer-support dialogues (Vietnamese + English).';
        this.ftBaseModel = product.runtime?.baseModel || 'sea-flash';
        break;
      case 'dataset':
        this.prompt = 'Request sample rows / schema preview.';
        break;
      case 'inference':
        this.prompt = 'What is Runpod?';
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
    if (p.category !== 'fine-tune' && !this.prompt.trim()) return;
    if ((p.category === 'image-to-video' || p.category === 'image-to-image') && !this.imageUrl.trim()) {
      this.runStatus.set('error');
      this.previewText = 'Image is required for this modality.';
      this.resultJson = JSON.stringify({ error: 'image_required' }, null, 2);
      return;
    }
    if (!this.auth.user()) {
      this.runStatus.set('error');
      this.previewText = 'Log in to run playground (billed via marketplace wallet).';
      this.resultJson = JSON.stringify({ error: 'auth_required' }, null, 2);
      return;
    }

    const requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
    this.runStatus.set('running');
    this.previewText = '';
    this.resultJson = '';
    this.resultMediaUrl = '';
    this.resultMediaKind = '';
    this.lastCost = 0;

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const payload = this.buildRequestPayload(p);
    const input = (payload['input'] as Record<string, unknown>) || payload;
    const ep = resolveRunpodEndpoint(p);

    this.playgroundApi
      .run({
        productSlug: p.slug,
        productId: p.id,
        input,
        model: this.modelVariant || ep?.openaiModel || undefined,
        endpointId: ep?.endpointId,
        action: this.apiAction === 'run' ? 'run' : 'runsync',
      })
      .subscribe({
        next: (res) => {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          this.lastLatencyMs = res.executionTime || Math.round(now - started);
          this.lastCost = Number(res.cost || 0);
          const response: Record<string, unknown> = {
            id: res.id || requestId,
            status: res.status || 'COMPLETED',
            delayTime: res.delayTime ?? 0,
            executionTime: this.lastLatencyMs,
            provider: res.provider,
            model: res.model,
            endpointId: res.endpointId,
            output: res.output,
            usage: res.usage,
            cost: res.cost,
            sandbox: res.sandbox,
          };
          this.resultJson = JSON.stringify(response, null, 2);
          this.applyPreview(p, response);
          this.runStatus.set('done');
          this.pushLog(p, requestId, payload, 'COMPLETED', 0);
        },
        error: (err) => {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          this.lastLatencyMs = Math.round(now - started);
          const message =
            err?.error?.message || err?.message || 'Playground run failed via marketplace API';
          this.previewText = message;
          this.resultJson = JSON.stringify(
            { error: message, status: err?.status, detail: err?.error },
            null,
            2,
          );
          this.runStatus.set('error');
          this.pushLog(p, requestId, payload, 'FAILED', 0);
        },
      });
  }

  private pushLog(
    p: Product,
    requestId: string,
    payload: Record<string, unknown>,
    status: 'COMPLETED' | 'FAILED',
    delayMs: number,
  ): void {
    const entry: RequestLogEntry = {
      id: requestId,
      productId: p.id,
      productSlug: p.slug,
      status,
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
    const ep = resolveRunpodEndpoint(p);
    const model = this.modelVariant || ep?.openaiModel || ep?.endpointId || p.slug;
    const seedNum = this.seed === '' || this.seed === undefined ? -1 : Number(this.seed);
    const imageRef = this.imageUrl.startsWith('data:') ? this.imageUrl : this.imageUrl;

    if (p.category === 'text-to-text' || p.category === 'inference') {
      const useMessages = this.inputMode === 'messages';
      const input: Record<string, unknown> = useMessages
        ? {
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: this.prompt },
            ],
            sampling_params: {
              max_tokens: this.maxTokens,
              temperature: this.temperature,
              seed: seedNum,
            },
          }
        : {
            prompt: this.prompt,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
          };
      if (ep?.openaiModel || model) input['model'] = model;
      return { input };
    }

    if (p.category === 'text-to-video') {
      return {
        input: {
          prompt: this.prompt,
          duration: this.duration,
          seed: seedNum,
          resolution: this.videoResolution,
          aspect_ratio: this.aspectRatio,
          enable_safety_checker: this.enableSafetyChecker,
          prompt_expansion: this.promptUpsampling,
        },
      };
    }

    if (p.category === 'image-to-video') {
      return {
        input: {
          prompt: this.prompt,
          image: imageRef,
          last_image: this.endImageUrl || undefined,
          duration: this.duration,
          resolution: this.videoResolution === '1080p' ? '720p' : this.videoResolution,
          aspect_ratio: this.aspectRatio,
          camera_fixed: this.cameraFixed,
          generate_audio: this.generateAudio,
          seed: seedNum,
        },
      };
    }

    if (p.category === 'text-to-image') {
      const [w, h] = this.textImageSize.split('×').map(Number);
      return {
        input: {
          prompt: this.prompt,
          negative_prompt: this.negativePrompt || undefined,
          width: w || 1024,
          height: h || 1024,
          seed: seedNum,
          output_format: this.outputFormat,
        },
      };
    }

    if (p.category === 'fine-tune') {
      return {
        input: {
          base_model: this.ftBaseModel,
          method: this.ftMethod,
          epochs: this.ftEpochs,
          notes: this.prompt || undefined,
          seed: seedNum,
          wait_for_completion: this.enableSyncMode,
        },
      };
    }

    if (p.category === 'dataset') {
      return {
        input: { query: this.prompt, preview_rows: Math.min(100, Math.max(1, this.maxTokens)) },
      };
    }

    // image-to-image
    return {
      input: {
        prompt: this.prompt,
        image: imageRef,
        seed: seedNum,
        size: this.imageSize,
        output_format: this.outputFormat,
        loras: this.loraIds.length ? this.loraIds : undefined,
        enable_base64_output: this.enableBase64Output,
      },
    };
  }

  private applyPreview(p: Product, response: Record<string, unknown>): void {
    const output = response['output'] as Record<string, unknown> | undefined;
    this.lastCost = Number(output?.['cost'] ?? this.lastCost) || 0;

    if (p.category === 'text-to-text' || p.category === 'inference' || p.category === 'fine-tune' || p.category === 'dataset') {
      const choices = output?.['choices'] as Array<{ tokens?: string[]; message?: { content?: string } }> | undefined;
      const tokenText = choices?.[0]?.tokens?.join('') || choices?.[0]?.message?.content || '';
      this.previewText =
        tokenText ||
        String(output?.['text'] || output?.['ai_response_text'] || '');
      this.resultMediaUrl = '';
      this.resultMediaKind = 'text';
      return;
    }
    if (p.category === 'text-to-video' || p.category === 'image-to-video') {
      this.resultMediaUrl = String(output?.['video_url'] || p.coverUrl);
      this.resultMediaKind = 'video';
      this.previewText = this.lastCost ? `Cost $${this.lastCost}` : 'Generation complete.';
      return;
    }
    this.resultMediaUrl = String(output?.['image_url'] || output?.['url'] || this.imageUrl || p.coverUrl);
    this.resultMediaKind = 'image';
    this.previewText = this.lastCost ? `Cost $${this.lastCost}` : 'Generation complete.';
  }

  apiEndpoint(_p: Product): string {
    // Customer-facing calls go through marketplace (which routes via denglish-api).
    return `${environment.apiUrl}/playground/run`;
  }

  downloadResult(): void {
    if (!this.resultMediaUrl || typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = this.resultMediaUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = this.resultMediaKind === 'video' ? 'output.mp4' : 'output.png';
    a.click();
  }

  apiSnippet(p: Product): string {
    const url = this.apiEndpoint(p);
    const wrapped = {
      productSlug: p.slug,
      input: (this.buildRequestPayload(p)['input'] as Record<string, unknown>) || {},
      action: this.apiAction === 'run' ? 'run' : 'runsync',
    };
    const auth = 'Authorization: Bearer $MARKETPLACE_JWT';
    if (this.apiClient === 'python') {
      return [
        'import requests',
        '',
        `url = "${url}"`,
        'headers = {',
        '  "Content-Type": "application/json",',
        '  "Authorization": f"Bearer {MARKETPLACE_JWT}",',
        '}',
        `payload = ${JSON.stringify(wrapped, null, 2)}`,
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
        '    Authorization: `Bearer ${MARKETPLACE_JWT}`,',
        '  },',
        `  body: JSON.stringify(${JSON.stringify(wrapped, null, 2)}),`,
        '});',
        'const data = await res.json();',
        'console.log(data);',
      ].join('\n');
    }
    const body = JSON.stringify(wrapped);
    return [
      `curl -X POST "${url}" \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H '${auth}' \\`,
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

  loadWallet(): void {
    if (!this.auth.user()) {
      this.walletBalance.set(0);
      return;
    }
    this.walletApi.wallet().subscribe({
      next: (list) => {
        const bal = list.reduce(
          (s, t) => s + (t.type === 'debit' || t.type === 'withdraw' ? -t.amount : t.amount),
          0,
        );
        this.walletBalance.set(bal);
      },
      error: () => this.walletBalance.set(0),
    });
  }

  checkout(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.user()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: `/product/${p.slug}` } });
      return;
    }
    const quantity = Math.min(99, Math.max(1, Math.floor(this.qty) || 1));
    this.billing.checkout({ productId: p.id, quantity }).subscribe({
      next: (res) => {
        this.checkoutMsg.set(`Đã thanh toán bằng ví aimarkets.vn · ${quantity} đơn vị`);
        if (typeof res.balance === 'number') this.walletBalance.set(res.balance);
        else this.loadWallet();
        this.product.update((cur) => {
          if (!cur) return cur;
          const sold = (cur.salesCount || 0) + quantity;
          return { ...cur, salesCount: sold, installCount: sold };
        });
      },
      error: (err) => this.checkoutMsg.set(err?.error?.message || 'Thanh toán ví thất bại'),
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
