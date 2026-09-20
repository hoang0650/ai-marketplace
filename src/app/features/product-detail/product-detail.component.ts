import { Component, HostListener, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProductService,
  ReviewService,
  WishlistService,
  BillingService,
  CouponService,
  PlaygroundService,
  AgentChatService,
  DashboardService,
  UploadService,
  ContentService,
  ChatService,
} from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { Product, ProductCategory, Review, IssuedLicense, ContentEpisode, CouponPreview } from '../../models/marketplace.models';
import { isHireCategory, isSkillCategory, isComputeStreamCategory, isGpuComputeCategory, isLicenseCategory, isVoiceCategory, isVoiceCloneCategory, isVoicePresetCategory, isFilmCategory, isDatasetCategory, isDownloadLicenseCategory, isWatchContentCategory, isStoryCategory, needsEndpointDeploy as categoryNeedsEndpointDeploy } from '../../models/categories';
import { I18nService } from '../../i18n/i18n.service';
import { AppCurrency, CurrencyService } from '../../i18n/currency.service';
import { TPipe } from '../../i18n/t.pipe';
import { OpenClawGatewayService } from '../agents/openclaw-gateway.service';
import { isRunpodProduct, resolveRunpodEndpoint } from '../../models/runpod-playground';
import {
  RunpodField,
  RunpodModelSchema,
  buildRunpodInput,
  defaultValues,
  fallbackSchema,
  quoteRunpod,
  schemaFields,
} from '../../models/runpod-schema';

type WorkspaceTab = 'playground' | 'hire' | 'install' | 'api' | 'overview' | 'reviews' | 'stream' | 'watch';
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
  imports: [RouterLink, DatePipe, DecimalPipe, CurrencyPipe, FormsModule, NgTemplateOutlet, TPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly wishlistApi = inject(WishlistService);
  private readonly billing = inject(BillingService);
  private readonly couponsApi = inject(CouponService);
  private readonly playgroundApi = inject(PlaygroundService);
  private readonly agentChatApi = inject(AgentChatService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly currencySvc = inject(CurrencyService);
  private readonly openclaw = inject(OpenClawGatewayService);
  private readonly walletApi = inject(DashboardService);
  private readonly uploadApi = inject(UploadService);
  private readonly contentApi = inject(ContentService);
  private readonly chatApi = inject(ChatService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly product = signal<Product | null>(null);
  readonly wishlisted = computed(() => this.wishlistApi.saved(this.product()?.id));
  readonly reviews = signal<Review[]>([]);
  readonly related = signal<Product[]>([]);
  readonly mediaIndex = signal(0);
  readonly selectedPackage = signal('std');
  readonly workspaceTab = signal<WorkspaceTab>('playground');
  readonly resultView = signal<ResultView>('preview');
  readonly runStatus = signal<RunStatus>('idle');
  readonly checkoutMsg = signal('');
  readonly issuedLicense = signal<IssuedLicense | null>(null);
  readonly episodes = signal<ContentEpisode[]>([]);
  readonly selectedEpisode = signal<ContentEpisode | null>(null);
  readonly playUrl = signal('');
  readonly playKind = signal('');
  readonly playPages = signal<string[]>([]);
  readonly pageIndex = signal(0);
  readonly unlockError = signal('');
  readonly unlocking = signal(false);
  readonly checkingOut = signal(false);
  readonly chatStarting = signal(false);
  private playSeq = 0;
  readonly walletBalance = signal(0);
  readonly hasActiveLicense = computed(() => {
    const lic = this.issuedLicense();
    if (!lic) return false;
    if (lic.status === 'revoked' || lic.status === 'expired' || lic.valid === false) return false;
    if (lic.expiresAt && new Date(lic.expiresAt).getTime() <= Date.now()) return false;
    return true;
  });
  readonly isContentOwner = computed(() => {
    const p = this.product();
    const u = this.auth.user();
    if (!p || !u) return false;
    if (u.role === 'admin') return true;
    const uid = String(u.id || '');
    if (!uid) return false;
    return (!!p.creatorId && String(p.creatorId) === uid) || (!!p.creatorSlug && p.creatorSlug === u.creatorSlug);
  });
  readonly canPlayContent = computed(() => this.hasActiveLicense() || this.isContentOwner());
  /** Skill / dataset downloads unlock with the same AIM-xxxx license as film/story. */
  readonly canUnlockDownload = computed(() => this.canPlayContent());
  qty = 1;
  licenseTerm: 'day' | 'month' | 'year' = 'month';
  readonly licenseTerms = ['day', 'month', 'year'] as const;
  useCoupon = false;
  couponCode = '';
  readonly couponPreview = signal<CouponPreview | null>(null);
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
  systemPrompt = 'You are a helpful assistant.';

  /**
   * Every RunPod `input` field, keyed as in the model's docs. Dotted keys address
   * nested objects (`sampling_params.max_tokens`). Populated from the model schema
   * so the form always matches the endpoint the buyer is calling.
   */
  paramValues: Record<string, unknown> = {};
  readonly modelSchema = signal<RunpodModelSchema | null>(null);
  readonly uploadingKey = signal('');

  readonly fields = computed(() => schemaFields(this.modelSchema()));
  readonly primaryFields = computed(() => this.fields().filter((f) => !f.advanced));
  readonly advancedFields = computed(() => this.fields().filter((f) => f.advanced));
  readonly isChatModel = computed(() => !!this.modelSchema()?.chatStyle);

  /** Variants served by one endpoint (Kimi), else the endpoint/OpenAI model ids. */
  readonly modelOptions = computed<Array<{ value: string; label: string }>>(() => {
    const variants = this.modelSchema()?.params?.['model']?.enum;
    if (variants?.length) return variants.map((v) => ({ value: String(v), label: String(v) }));
    const ep = this.runpodEndpoint();
    if (ep) {
      const out = [{ value: ep.endpointId, label: ep.endpointId }];
      if (ep.openaiModel) out.push({ value: ep.openaiModel, label: ep.openaiModel });
      return out;
    }
    const p = this.product();
    return p ? [{ value: p.slug, label: p.slug }] : [];
  });

  /** fine-tune structured fields (not JSON-in-prompt) */
  ftBaseModel = '';
  ftMethod: 'qlora' | 'lora' | 'full' = 'qlora';
  ftEpochs = 3;
  enableSyncMode = false;
  previewRows = 20;

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

  previewText = '';
  resultJson = '';
  resultMediaUrl = '';
  resultMediaKind: 'image' | 'video' | 'audio' | 'text' | '' = '';
  lastLatencyMs = 0;
  lastCost = 0;
  voicePlayMode: 'tts' | 'stt' = 'tts';
  sttAudioBase64 = '';
  sttAudioName = '';

  reviewTitle = '';
  reviewBody = '';
  reviewRating = 5;

  readonly isRunpod = computed(() => isRunpodProduct(this.product()));
  readonly runpodEndpoint = computed(() => {
    const p = this.product();
    return p ? resolveRunpodEndpoint(p) ?? null : null;
  });

  /** The prompt lives in the schema bag, but plenty of shared code still reads it directly. */
  get prompt(): string {
    return String(this.paramValues['prompt'] ?? '');
  }
  set prompt(value: string) {
    this.paramValues['prompt'] = value;
  }

  get imageUrl(): string {
    return String(this.paramValues['image'] ?? '');
  }
  set imageUrl(value: string) {
    this.paramValues['image'] = value;
  }

  priceHint(): string {
    const p = this.product();
    if (!p) return '';
    const ep = this.runpodEndpoint();
    const schema = this.modelSchema();
    if (schema) {
      const quote = quoteRunpod(schema, this.runpodInput());
      if (quote?.cost !== null && quote?.cost !== undefined) {
        return quote.quantity > 1
          ? `${quote.rateLabel} · est. $${quote.cost.toFixed(4)} for ${quote.quantity}s`
          : `Est. $${quote.cost.toFixed(4)} per run`;
      }
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
        this.issuedLicense.set(null);
        this.episodes.set([]);
        this.selectedEpisode.set(null);
        this.playUrl.set('');
        this.playKind.set('');
        this.playPages.set([]);
        this.pageIndex.set(0);
        this.unlockError.set('');
        const term = p.contentMeta?.licenseTerm;
        if (term === 'day' || term === 'month' || term === 'year') this.licenseTerm = term;
        this.mediaIndex.set(0);
        this.selectedPackage.set('std');
        this.seo.set({ title: p.name, description: p.tagline, image: p.coverUrl });
        this.reviewsApi.list(p.id).subscribe((r) => this.reviews.set(r));
        this.productsApi.list({ category: p.category }).subscribe((items) => {
          this.related.set(items.filter((x) => x.id !== p.id).slice(0, 6));
        });
        this.resetPlayground(p);
        this.workspaceTab.set(
          isWatchContentCategory(p.category)
            ? 'watch'
            : isComputeStreamCategory(p.category)
              ? 'stream'
              : isHireCategory(p.category)
                ? 'hire'
                : isSkillCategory(p.category) || isDatasetCategory(p.category)
                  ? 'install'
                  : 'playground',
        );
        if (isWatchContentCategory(p.category)) {
          this.loadEpisodes(p.slug);
        }
        if (isLicenseCategory(p.category)) {
          this.loadMyLicense(p.id);
        }
        this.couponPreview.set(null);
        this.couponCode = '';
        this.useCoupon = false;
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
    const unitUsd = isLicenseCategory(p.category)
      ? this.licensePrice(p)
      : pr.model === 'usage'
        ? Number(pr.usageRate) || 0
        : Number(pr.price) || 0;
    const usd = unitUsd * (isLicenseCategory(p.category) ? 1 : qty);
    if (pr.model === 'usage' && qty === 1) {
      return this.currencySvc.formatUsageFromUsd(usd, pr.usageUnit || 'unit', this.displayCurrency);
    }
    if (pr.model === 'subscription' && qty === 1) {
      return `${this.currencySvc.formatFromUsd(usd, this.displayCurrency)}/${pr.interval}`;
    }
    return this.currencySvc.formatFromUsd(usd, this.displayCurrency);
  }

  unitUsd(p: Product): number {
    const pr = p.pricing;
    if (pr.model === 'free') return 0;
    return isLicenseCategory(p.category)
      ? this.licensePrice(p)
      : pr.model === 'usage'
        ? Number(pr.usageRate) || 0
        : Number(pr.price) || 0;
  }

  hasCompareAt(p: Product): boolean {
    const list = Number(p.pricing?.compareAtPrice) || 0;
    return list > this.unitUsd(p);
  }

  compareAtLabel(p: Product): string {
    return this.currencySvc.formatFromUsd(Number(p.pricing?.compareAtPrice) || 0, this.displayCurrency);
  }

  displayTotal(p: Product): string {
    const preview = this.couponPreview();
    if (preview && preview.code === this.couponCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      return this.currencySvc.formatFromUsd(preview.total, this.displayCurrency);
    }
    return this.displayPrice(p, this.qty);
  }

  couponDiscountLabel(): string {
    const preview = this.couponPreview();
    if (!preview) return '';
    return `−${this.currencySvc.formatFromUsd(preview.discount, this.displayCurrency)}`;
  }

  onCouponCodeChange(value: string): void {
    const preview = this.couponPreview();
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (preview && preview.code !== normalized) this.couponPreview.set(null);
  }

  bumpQty(delta: number): void {
    this.qty = Math.min(99, Math.max(1, this.qty + delta));
    this.couponPreview.set(null);
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
    const p = this.product();
    const code = this.couponCode.trim();
    if (!p || !code) {
      this.checkoutMsg.set(this.i18n.t('pd.couponNeedCode'));
      return;
    }
    if (!this.auth.user()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: `/product/${p.slug}` } });
      return;
    }
    this.couponsApi
      .preview({
        productId: p.id,
        code,
        quantity: isLicenseCategory(p.category) ? 1 : this.qty,
        licenseTerm: isLicenseCategory(p.category) ? this.licenseTerm : undefined,
      })
      .subscribe({
        next: (row) => {
          this.couponPreview.set(row);
          this.couponCode = row.code;
          this.checkoutMsg.set(this.i18n.t('pd.couponOk', { code: row.code }));
        },
        error: (err) => {
          this.couponPreview.set(null);
          this.checkoutMsg.set(err?.error?.message || this.i18n.t('pd.couponFail'));
        },
      });
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

  isComputeStream(cat: ProductCategory): boolean {
    return isComputeStreamCategory(cat);
  }

  isGpuCompute(cat: ProductCategory): boolean {
    return isGpuComputeCategory(cat);
  }

  isLicense(cat: ProductCategory): boolean {
    return isLicenseCategory(cat);
  }

  needsEndpointDeploy(cat: ProductCategory): boolean {
    return categoryNeedsEndpointDeploy(cat);
  }

  isFilm(cat: ProductCategory): boolean {
    return isFilmCategory(cat);
  }

  isDataset(cat: ProductCategory): boolean {
    return isDatasetCategory(cat);
  }

  isDownloadLicense(cat: ProductCategory): boolean {
    return isDownloadLicenseCategory(cat);
  }

  isVoice(cat: ProductCategory): boolean {
    return isVoiceCategory(cat);
  }

  isVoiceClone(cat: ProductCategory): boolean {
    return isVoiceCloneCategory(cat);
  }

  isVoicePreset(cat: ProductCategory): boolean {
    return isVoicePresetCategory(cat);
  }

  isStory(cat: ProductCategory): boolean {
    return isStoryCategory(cat);
  }

  isWatchContent(cat: ProductCategory): boolean {
    return isWatchContentCategory(cat);
  }

  loadEpisodes(slug: string): void {
    this.contentApi.episodes(slug).subscribe({
      next: (rows) => this.episodes.set(rows),
      error: () => this.episodes.set([]),
    });
  }

  loadMyLicense(productId: string): void {
    if (!this.auth.user()) return;
    this.walletApi.licenses().subscribe({
      next: (list) => {
        const pid = String(productId);
        const hit = list.find((l) => {
          if (String(l.productId || '') !== pid) return false;
          if (l.status === 'revoked' || l.status === 'expired' || l.valid === false) return false;
          if (l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now()) return false;
          return true;
        });
        if (hit) this.issuedLicense.set(hit);
      },
      error: () => undefined,
    });
  }

  private playSrc(res: { playToken?: string; playUrl?: string }, page?: number): string {
    const token = String(res.playToken || '').trim();
    let pageQ = page;
    const raw = String(res.playUrl || '').trim();
    if (pageQ == null && raw) {
      try {
        const u = new URL(raw, environment.apiUrl);
        const fromQuery = Number(u.searchParams.get('page') || 0);
        if (fromQuery >= 1) pageQ = fromQuery;
      } catch {
        /* ignore */
      }
    }
    if (token) {
      const q = new URLSearchParams({ token });
      if (pageQ && pageQ >= 1) q.set('page', String(pageQ));
      return `${environment.apiUrl}/content/play?${q.toString()}`;
    }
    if (!raw) return '';
    try {
      const u = new URL(raw, environment.apiUrl);
      const fromQuery = u.searchParams.get('token') || u.searchParams.get('t');
      if (fromQuery) {
        const q = new URLSearchParams({ token: fromQuery });
        const p = pageQ || Number(u.searchParams.get('page') || 0);
        if (p >= 1) q.set('page', String(p));
        return `${environment.apiUrl}/content/play?${q.toString()}`;
      }
      const marker = '/content/play/';
      const i = u.pathname.indexOf(marker);
      if (i >= 0) {
        const t = decodeURIComponent(u.pathname.slice(i + marker.length));
        if (t) return `${environment.apiUrl}/content/play?token=${encodeURIComponent(t)}`;
      }
    } catch {
      /* use raw */
    }
    return raw;
  }

  playEpisode(ep: ContentEpisode): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.user()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: `/product/${p.slug}` } });
      return;
    }
    if (!this.canPlayContent()) {
      this.unlockError.set(this.i18n.t('pd.licenseRequired'));
      return;
    }
    const seq = ++this.playSeq;
    this.unlocking.set(true);
    this.unlockError.set('');
    this.contentApi.unlock(ep.id, this.issuedLicense()?.licenseKey).subscribe({
      next: (res) => {
        if (seq !== this.playSeq) return;
        this.unlocking.set(false);
        this.selectedEpisode.set(ep);
        this.playKind.set(res.kind || ep.kind);
        const token = { playToken: res.playToken, playUrl: res.playUrl };
        const pages = (res.pages?.length ? res.pages : [{ index: 1, playUrl: res.playUrl }]).map((pg) =>
          this.playSrc({ playToken: res.playToken, playUrl: pg.playUrl }, pg.index),
        );
        this.playPages.set(pages.filter(Boolean));
        this.pageIndex.set(0);
        this.playUrl.set(pages[0] || this.playSrc(token));
        this.unlockError.set('');
      },
      error: (err) => {
        if (seq !== this.playSeq) return;
        this.unlocking.set(false);
        this.playUrl.set('');
        this.playPages.set([]);
        const code = err?.error?.code;
        this.unlockError.set(
          code === 'LICENSE_REQUIRED' || code === 'LICENSE_EXPIRED' || err?.status === 402
            ? this.i18n.t('pd.licenseRequired')
            : err?.error?.message || this.i18n.t('pd.playFailed'),
        );
      },
    });
  }

  goPage(i: number): void {
    const pages = this.playPages();
    if (!pages.length) return;
    const next = Math.min(pages.length - 1, Math.max(0, i));
    this.pageIndex.set(next);
    this.playUrl.set(pages[next] || '');
  }

  prevPage(): void {
    this.goPage(this.pageIndex() - 1);
  }

  nextPage(): void {
    this.goPage(this.pageIndex() + 1);
  }

  @HostListener('window:keydown', ['$event'])
  onStoryKey(ev: KeyboardEvent): void {
    if (this.playKind() !== 'image' || this.playPages().length < 2) return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.nextPage();
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.prevPage();
    }
  }

  onMediaError(): void {
    this.unlockError.set(this.i18n.t('pd.playFailed'));
  }

  blockCapture(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  lockPlayback(ev: Event): void {
    const el = ev.target as HTMLVideoElement;
    el.disableRemotePlayback = true;
    el.disablePictureInPicture = true;
  }

  @HostListener('document:contextmenu', ['$event'])
  onWatchContextMenu(ev: MouseEvent): void {
    if (!this.playUrl()) return;
    const node = ev.target as HTMLElement | null;
    if (node?.closest('.watch-layout, .watch-media, .story-reader')) {
      ev.preventDefault();
    }
  }

  downloadEpisode(ep: ContentEpisode): void {
    if (!this.canPlayContent()) {
      this.unlockError.set(this.i18n.t('pd.licenseRequired'));
      return;
    }
    this.contentApi.download(ep.id, this.issuedLicense()?.licenseKey).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `episode-${ep.index}.aimc`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.unlockError.set(
          err?.status === 402 ? this.i18n.t('pd.licenseRequired') : err?.error?.message || this.i18n.t('pd.playFailed'),
        );
      },
    });
  }

  voiceSampleSrc(p: Product): string {
    const sample = String(p.contentMeta?.voiceSampleUrl || '').trim();
    if (sample) return sample;
    return `${environment.apiUrl}/playground/voice/${p.slug}.mp3`;
  }

  licensePrice(p: Product, term: 'day' | 'month' | 'year' = this.licenseTerm): number {
    const map = p.contentMeta?.licensePrices || {};
    const n = Number(map[term]);
    if (n > 0) return n;
    return Number(p.pricing?.price) || 0;
  }

  launchComputeStream(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.user()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: `/play/${p.slug}` } });
      return;
    }
    void this.router.navigate(['/play', p.slug]);
  }

  installSkill(): void {
    if (!this.canUnlockDownload()) {
      this.checkout();
      return;
    }
    this.skillInstalled.set(true);
    const p = this.product();
    const key = this.issuedLicense()?.licenseKey || '';
    if (p && isDatasetCategory(p.category)) {
      this.checkoutMsg.set(
        key
          ? `Dataset unlocked with ${key}. Follow the download guide on the right.`
          : 'Dataset unlocked. Follow the download guide on the right.',
      );
      return;
    }
    this.checkoutMsg.set(
      key
        ? `Skill unlocked with ${key}. Copy install steps into your OpenClaw workspace.`
        : 'Skill unlocked. Copy install steps into your OpenClaw workspace.',
    );
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
    this.openclawStatus.set(`Opening OpenClaw at ${this.openclaw.aimarketsHost()}…`);
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
    if (isComputeStreamCategory(p.category)) {
      this.launchComputeStream();
      return;
    }
    // Only the OpenClaw Ops product launches Control UI; other hire-* listings stay hire form.
    if (p.slug === 'openclaw-ops-agent') {
      this.launchOpenClaw();
      return;
    }
    if (isHireCategory(p.category)) {
      this.setWorkspace('hire');
      return;
    }
    if (isSkillCategory(p.category) || isDatasetCategory(p.category)) {
      if (this.canUnlockDownload()) {
        this.setWorkspace('install');
        return;
      }
      this.checkout();
      return;
    }
    if (isWatchContentCategory(p.category)) {
      if (this.canPlayContent()) {
        this.setWorkspace('watch');
        return;
      }
      this.checkout();
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
    this.ftMethod = 'qlora';
    this.ftEpochs = 3;
    this.enableSyncMode = true;
    this.previewRows = 20;
    this.apiAction = 'runsync';
    this.voicePlayMode = 'tts';
    this.sttAudioBase64 = '';
    this.sttAudioName = '';

    if (!product) return;
    this.ftBaseModel = product.runtime?.baseModel || product.name;
    this.systemPrompt = `You are ${product.name}.`;
    this.loadSchema(product);
  }

  /**
   * Render the form from the endpoint's published schema, falling back to a
   * generic per-modality shape while the catalog request is in flight (or when
   * AI Markets AI (ai.aimarkets.vn) is unreachable).
   */
  private loadSchema(product: Product): void {
    const ep = this.runpodEndpoint();
    this.applySchema(fallbackSchema(product.category, ep), product, false);
    if (!ep) return;
    this.playgroundApi.modelSchema(ep.slug).subscribe({
      next: (schema) => this.applySchema(schema, product, true),
      error: () => {
        /* offline or catalog unavailable — the fallback form stays in place */
      },
    });
  }

  private applySchema(schema: RunpodModelSchema | null, product: Product, keepEdits: boolean): void {
    const previous = keepEdits ? this.paramValues : {};
    const next = defaultValues(schema);
    for (const key of Object.keys(next)) {
      const edited = previous[key];
      if (edited !== undefined && edited !== '' && !(Array.isArray(edited) && !edited.length)) {
        next[key] = edited;
      }
    }
    // Chat models express the prompt through `messages`, so it has no schema
    // entry of its own — carry it across anyway.
    if (next['prompt'] === undefined && previous['prompt'] !== undefined) {
      next['prompt'] = previous['prompt'];
    }

    this.modelSchema.set(schema);
    this.paramValues = next;
    this.modelVariant =
      (schema?.params?.['model']?.default as string) ||
      this.modelOptions()[0]?.value ||
      product.runtime?.baseModel ||
      product.slug;
    if (!keepEdits) this.seedSampleInput(product);
  }

  /** Prefill the same example inputs the RunPod Hub playground ships with. */
  private seedSampleInput(product: Product): void {
    const ep = this.runpodEndpoint();
    const samples: Partial<Record<ProductCategory, string>> = {
      'text-to-text': 'What is Runpod?',
      inference: 'What is Runpod?',
      'text-to-image': 'A beautiful sunset over mountains',
      'image-to-image': 'Keep composition, restyle as watercolor with warm pastel palette.',
      'text-to-video':
        'A kitten chases a bouncing rubber ball across a polished wooden floor, sliding slightly and bumping into a potted plant.',
      'image-to-video': 'The character slowly turns and smiles at the camera',
      'fine-tune': 'Train on customer-support dialogues (Vietnamese + English).',
      dataset: 'Request sample rows / schema preview.',
    };
    this.prompt = samples[product.category] ?? '';

    if ('image' in this.paramValues || 'images' in this.paramValues) {
      const reference =
        ep?.slug === 'seedance-1-5-pro'
          ? 'https://image.runpod.ai/asset/bytedance/seedance-v1-5-pro-i2.png'
          : product.coverUrl;
      if ('image' in this.paramValues) this.paramValues['image'] = reference;
      if ('images' in this.paramValues) this.paramValues['images'] = reference ? [reference] : [];
    }
  }

  // ------------------------------------------------------- dynamic fields --

  stringValue(key: string): string {
    const value = this.paramValues[key];
    return value === undefined || value === null ? '' : String(value);
  }

  /** null keeps optional numeric inputs blank instead of showing a misleading 0. */
  numberValue(key: string): number | null {
    const value = this.paramValues[key];
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  boolValue(key: string): boolean {
    return !!this.paramValues[key];
  }

  listValue(key: string): string[] {
    const value = this.paramValues[key];
    return Array.isArray(value) ? (value as string[]) : [];
  }

  loraValue(key: string): Array<{ path: string; scale: number }> {
    const value = this.paramValues[key];
    return Array.isArray(value) ? (value as Array<{ path: string; scale: number }>) : [];
  }

  setValue(key: string, value: unknown): void {
    this.paramValues[key] = value;
  }

  isSelected(key: string, option: string | number): boolean {
    const current = this.paramValues[key];
    return current !== undefined && String(current) === String(option);
  }

  bumpNumber(field: RunpodField, direction: 1 | -1): void {
    const step = field.spec.step ?? (field.spec.type === 'float' ? 0.1 : 1);
    const raw = Number(this.paramValues[field.key] ?? field.spec.default ?? 0) + step * direction;
    const rounded = Math.round(raw * 1e6) / 1e6;
    const min = field.spec.min ?? Number.NEGATIVE_INFINITY;
    const max = field.spec.max ?? Number.POSITIVE_INFINITY;
    this.paramValues[field.key] = Math.min(max, Math.max(min, rounded));
  }

  addListItem(key: string, url: string): void {
    const value = url.trim();
    if (!value) return;
    const list = this.listValue(key);
    if (list.includes(value)) return;
    this.paramValues[key] = [...list, value];
  }

  removeListItem(key: string, index: number): void {
    this.paramValues[key] = this.listValue(key).filter((_, i) => i !== index);
  }

  addLora(key: string, path: string): void {
    const value = path.trim();
    if (!value) return;
    this.paramValues[key] = [...this.loraValue(key), { path: value, scale: 1 }];
  }

  clearValue(key: string): void {
    const current = this.paramValues[key];
    this.paramValues[key] = Array.isArray(current) ? [] : '';
  }

  /** Upload to MinIO, then store the public URL in the field the buyer clicked. */
  onFieldImage(event: Event, key: string, asList = false): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      this.runStatus.set('error');
      this.previewText = 'Image must be 16MB or smaller.';
      return;
    }
    if (!this.auth.user()) {
      this.runStatus.set('error');
      this.previewText = 'Log in to upload images.';
      return;
    }

    this.uploadingKey.set(key);
    this.uploadApi.uploadImage(file).subscribe({
      next: (res) => {
        this.uploadingKey.set('');
        if (asList) this.addListItem(key, res.url);
        else this.paramValues[key] = res.url;
      },
      error: (e) => {
        this.uploadingKey.set('');
        this.runStatus.set('error');
        this.previewText = e?.error?.message || 'Image upload failed.';
      },
    });
  }

  /** Required schema fields the buyer has not filled in yet. */
  missingRequired(): RunpodField[] {
    return this.fields().filter((f) => {
      if (!f.required) return false;
      const value = this.paramValues[f.key];
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || String(value).trim() === '';
    });
  }

  onSttFile(ev: Event): void {
    const file = (ev.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      this.sttAudioBase64 = '';
      this.sttAudioName = '';
      return;
    }
    this.sttAudioName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const comma = raw.indexOf(',');
      this.sttAudioBase64 = comma >= 0 ? raw.slice(comma + 1) : raw;
    };
    reader.readAsDataURL(file);
  }

  canRun(): boolean {
    const p = this.product();
    if (!p || this.runStatus() === 'running') return false;
    if (isVoiceCategory(p.category) && this.voicePlayMode === 'stt') {
      return !!this.sttAudioBase64;
    }
    if (this.isChatModel() || !this.fields().length) {
      return p.category === 'fine-tune' || !!this.prompt.trim();
    }
    return this.missingRequired().length === 0;
  }

  run(): void {
    const p = this.product();
    if (!p) return;
    const missing = this.missingRequired();
    if (missing.length) {
      this.runStatus.set('error');
      this.previewText = `${missing.map((f) => f.label).join(', ')} is required for this model.`;
      this.resultJson = JSON.stringify(
        { error: 'missing_required', fields: missing.map((f) => f.name) },
        null,
        2,
      );
      return;
    }
    if (isVoiceCategory(p.category) && this.voicePlayMode === 'stt') {
      if (!this.sttAudioBase64) return;
    } else if (p.category !== 'fine-tune' && !this.isChatModel() && !this.fields().length && !this.prompt.trim()) {
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
    const input = this.runpodInput();
    const payload = { input };
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

  /** The `input` object exactly as the endpoint's docs describe it. */
  runpodInput(): Record<string, unknown> {
    const p = this.product();
    const schema = this.modelSchema();
    if (!p) return {};

    if (!schema) {
      if (isVoiceCategory(p.category)) {
        if (this.voicePlayMode === 'stt') {
          return {
            action: 'stt',
            audio_base64: this.sttAudioBase64,
            language: 'vi',
            voice_mode: 'stt',
          };
        }
        const preset = String(p.contentMeta?.presetVoiceName || '').trim();
        if (isVoicePresetCategory(p.category) || p.contentMeta?.voiceSource === 'preset') {
          return {
            prompt: this.prompt,
            voice: preset || 'Adam',
            format: 'wav',
            action: 'tts',
          };
        }
        return {
          prompt: this.prompt,
          audio_url: p.contentMeta?.voiceSampleUrl,
          format: 'wav',
          action: 'voice_clone',
        };
      }
      if (p.category === 'fine-tune') {
        return {
          base_model: this.ftBaseModel,
          method: this.ftMethod,
          epochs: this.ftEpochs,
          notes: this.prompt || undefined,
          wait_for_completion: this.enableSyncMode,
        };
      }
      if (p.category === 'dataset') {
        return {
          query: this.prompt,
          preview_rows: Math.min(100, Math.max(1, this.previewRows)),
        };
      }
      return { prompt: this.prompt };
    }

    const extra: Record<string, unknown> = {};
    if (schema.params['model']) extra['model'] = this.modelVariant;
    if (schema.chatStyle) {
      if (this.inputMode === 'messages') {
        extra['messages'] = [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: this.prompt },
        ];
      } else {
        extra['prompt'] = this.prompt;
      }
    }
    return buildRunpodInput(schema, this.paramValues, extra);
  }


  /** Which of image/video/audio/text the result is; the API reports it per RunPod model. */
  private resolveResultKind(p: Product, output: Record<string, unknown> | undefined): 'image' | 'video' | 'audio' | 'text' {
    if (isVoiceCategory(p.category) && (this.voicePlayMode === 'stt' || String(output?.['kind'] || '') === 'text')) {
      return 'text';
    }
    if (isVoiceCategory(p.category)) return 'audio';
    const reported = String(output?.['kind'] || '');
    if (reported === 'image' || reported === 'video' || reported === 'audio' || reported === 'text') {
      return reported;
    }
    if (output?.['video_url']) return 'video';
    if (output?.['audio_url']) return 'audio';
    if (output?.['image_url']) return 'image';
    if (p.category === 'text-to-video' || p.category === 'image-to-video') return 'video';
    if (p.category === 'text-to-text' || p.category === 'inference' || p.category === 'fine-tune' || p.category === 'dataset') {
      return 'text';
    }
    return 'image';
  }

  private applyPreview(p: Product, response: Record<string, unknown>): void {
    const output = response['output'] as Record<string, unknown> | undefined;
    this.lastCost = Number(output?.['cost'] ?? this.lastCost) || 0;
    const kind = this.resolveResultKind(p, output);
    this.resultMediaKind = kind;

    if (kind === 'text') {
      const choices = output?.['choices'] as Array<{ tokens?: string[]; message?: { content?: string } }> | undefined;
      const tokenText = choices?.[0]?.tokens?.join('') || choices?.[0]?.message?.content || '';
      this.previewText =
        String(output?.['text'] || '') || tokenText || String(output?.['ai_response_text'] || '');
      this.resultMediaUrl = '';
      return;
    }

    if (kind === 'video') {
      this.resultMediaUrl = String(output?.['video_url'] || p.coverUrl);
    } else if (kind === 'audio') {
      this.resultMediaUrl = String(output?.['audio_url'] || this.voiceSampleSrc(p) || '');
      const spoken = String(output?.['text'] || this.prompt || '').trim();
      this.previewText = spoken
        ? `${spoken}${this.lastCost ? ` · $${this.lastCost}` : ''}`
        : this.lastCost
          ? `Cost $${this.lastCost}`
          : 'MP3 ready.';
      return;
    } else {
      this.resultMediaUrl = String(output?.['image_url'] || output?.['url'] || this.imageUrl || p.coverUrl);
    }
    this.previewText = this.lastCost ? `Cost $${this.lastCost}` : 'Generation complete.';
  }

  apiEndpoint(_p: Product): string {
    // Customer-facing calls go through marketplace (which routes via AI Markets AI).
    return `${environment.apiUrl}/playground/run`;
  }

  downloadResult(): void {
    if (!this.resultMediaUrl || typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = this.resultMediaUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download =
      this.resultMediaKind === 'video'
        ? 'output.mp4'
        : this.resultMediaKind === 'audio'
          ? 'voice.mp3'
          : 'output.png';
    a.click();
  }

  apiSnippet(p: Product): string {
    const url = this.apiEndpoint(p);
    const wrapped = {
      productSlug: p.slug,
      input: this.runpodInput(),
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
    if (this.checkingOut()) return;
    if (this.hasActiveLicense()) {
      if (isSkillCategory(p.category) || isDatasetCategory(p.category)) {
        this.setWorkspace('install');
        return;
      }
      if (isWatchContentCategory(p.category)) {
        this.setWorkspace('watch');
        const first = this.episodes()[0];
        if (first) this.playEpisode(first);
      }
      return;
    }
    const quantity = isLicenseCategory(p.category)
      ? 1
      : Math.min(99, Math.max(1, Math.floor(this.qty) || 1));
    const licenseTerm = isLicenseCategory(p.category) ? this.licenseTerm : undefined;
    this.checkingOut.set(true);
    this.billing.checkout({
      productId: p.id,
      quantity,
      licenseTerm,
      couponCode: this.useCoupon ? this.couponCode.trim() || undefined : undefined,
    }).subscribe({
      next: (res) => {
        this.checkingOut.set(false);
        if (res.license?.licenseKey) {
          this.issuedLicense.set(res.license);
          this.checkoutMsg.set(
            this.i18n.t(isFilmCategory(p.category) ? 'pd.watchOk' : 'pd.licenseOk', {
              key: res.license.licenseKey,
              expires: res.license.expiresAt || '',
            }) +
              (res.emailSent
                ? ` ${this.i18n.t('cart.successEmail', { email: res.emailTo || '' })}`
                : ` ${this.i18n.t('cart.successTitle')}.`),
          );
          if (isWatchContentCategory(p.category)) {
            this.setWorkspace('watch');
            const first = this.episodes()[0];
            if (first) this.playEpisode(first);
          } else if (isSkillCategory(p.category) || isDatasetCategory(p.category)) {
            this.setWorkspace('install');
          }
        } else {
          this.checkoutMsg.set(
            res.emailSent
              ? this.i18n.t('cart.msg.paidEmail', {
                  orders: 1,
                  units: quantity,
                  email: res.emailTo || '',
                })
              : this.i18n.t('cart.successTitle'),
          );
        }
        if (typeof res.balance === 'number') this.walletBalance.set(res.balance);
        else this.loadWallet();
        this.product.update((cur) => {
          if (!cur) return cur;
          const sold = (cur.salesCount || 0) + quantity;
          return { ...cur, salesCount: sold, installCount: sold };
        });
      },
      error: (err) => {
        this.checkingOut.set(false);
        this.checkoutMsg.set(err?.error?.message || 'Thanh toán ví thất bại');
      },
    });
  }

  toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.wishlistApi.toggle(p.id).subscribe();
  }

  openSellerChat(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.isContentOwner()) {
      this.checkoutMsg.set(this.i18n.t('chat.self'));
      return;
    }
    this.chatStarting.set(true);
    this.chatApi.start({ productId: p.id }).subscribe({
      next: (c) => {
        this.chatStarting.set(false);
        void this.router.navigate(['/messages', c.id]);
      },
      error: (err) => {
        this.chatStarting.set(false);
        const code = err?.error?.code;
        if (code === 'CHAT_SELF') this.checkoutMsg.set(this.i18n.t('chat.self'));
        else if (code === 'LINKS_NOT_ALLOWED') this.checkoutMsg.set(this.i18n.t('chat.noLinks'));
        else this.checkoutMsg.set(err?.error?.message || this.i18n.t('chat.err.send'));
      },
    });
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.wishlistApi.saved(p.id)) {
      void this.router.navigate(['/cart']);
      return;
    }
    this.wishlistApi.toggle(p.id).subscribe({
      next: () => void this.router.navigate(['/cart']),
    });
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
