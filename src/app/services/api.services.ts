import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  AffiliateStats,
  AdminOverview,
  AdminProductDetail,
  AdminUserDetail,
  ModerationStatus,
  Creator,
  DashboardSummary,
  HomeFeed,
  Coupon,
  CouponPreview,
  NotificationItem,
  Order,
  Product,
  Review,
  UsageStat,
  BuyerUsageFeed,
  WalletSummary,
  WalletTx,
  AdminWalletTxList,
  SellerProfile,
  LegalDocumentMeta,
  IssuedLicense,
  Complaint,
  KycProfile,
  KycSide,
  KycSubmitBody,
  KycSubjectType,
  KycReviewStatus,
  KycQueueResponse,
  GpayConfig,
  GpayCheckoutResponse,
  GpayOrder,
  GpayQrResponse,
  PayoutPolicy,
  PayoutPolicyResponse,
  PayoutQuote,
  ComplaintKind,
  ChatConversation,
  ChatMessage,
  ContentEpisode,
  ContentUnlock,
} from '../models/marketplace.models';
import { CategoryMeta } from '../models/marketplace.models';
import {
  Deployment,
  DeploymentRuntime,
  DeploymentUsage,
  InvokeResult,
} from '../models/deployment.models';
import {
  RUNPOD_PUBLIC_ENDPOINTS,
  RunpodEndpointKind,
  RunpodPublicEndpoint,
} from '../models/runpod-public-endpoints';
import { RunpodModelSchema } from '../models/runpod-schema';

export type { RunpodModelSchema, RunpodParamSpec } from '../models/runpod-schema';

@Injectable({ providedIn: 'root' })
export class RunpodService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Official RunPod Public Endpoints (docs catalog). Falls back to bundled JSON offline/mock. */
  publicEndpoints(filter: {
    kind?: RunpodEndpointKind | string;
    modality?: string;
    q?: string;
  } = {}): Observable<RunpodPublicEndpoint[]> {
    if (environment.useMockApi) {
      let rows = RUNPOD_PUBLIC_ENDPOINTS;
      if (filter.kind) rows = rows.filter((e) => e.kind === filter.kind);
      if (filter.modality) rows = rows.filter((e) => e.modality === filter.modality);
      if (filter.q) {
        const q = filter.q.toLowerCase();
        rows = rows.filter((e) =>
          `${e.name} ${e.slug} ${e.endpointId} ${e.description}`.toLowerCase().includes(q),
        );
      }
      return of(rows);
    }
    let params = new HttpParams();
    if (filter.kind) params = params.set('kind', filter.kind);
    if (filter.modality) params = params.set('modality', filter.modality);
    if (filter.q) params = params.set('q', filter.q);
    return this.http.get<RunpodPublicEndpoint[]>(`${this.base}/endpoints/public-endpoints`, { params });
  }

  bySlug(slug: string): Observable<RunpodPublicEndpoint> {
    if (environment.useMockApi) {
      const hit = RUNPOD_PUBLIC_ENDPOINTS.find((e) => e.slug === slug);
      return hit ? of(hit) : throwError(() => ({ status: 404 }));
    }
    return this.http.get<RunpodPublicEndpoint>(`${this.base}/endpoints/public-endpoints/${slug}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(filter: {
    category?: string;
    q?: string;
    featured?: boolean;
    creatorSlug?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<Product[]> {
    let params = new HttpParams();
    if (filter.category) params = params.set('category', filter.category);
    if (filter.q) params = params.set('q', filter.q);
    if (filter.featured) params = params.set('featured', 'true');
    if (filter.creatorSlug) params = params.set('creatorSlug', filter.creatorSlug);
    if (filter.limit != null) params = params.set('limit', String(filter.limit));
    if (filter.offset != null) params = params.set('offset', String(filter.offset));
    return this.http.get<Product[]>(`${this.base}/products`, { params });
  }

  bySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/${slug}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, product);
  }

  update(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, product);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/products/${id}`);
  }

  categories(): Observable<CategoryMeta[]> {
    return this.http.get<CategoryMeta[]>(`${this.base}/categories`);
  }

  home(): Observable<HomeFeed> {
    return this.http.get<HomeFeed>(`${this.base}/home`);
  }
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  episodes(slug: string): Observable<ContentEpisode[]> {
    return this.http.get<ContentEpisode[]>(`${this.base}/content/products/${slug}/episodes`);
  }

  createEpisode(productId: string, input: { title: string; file?: File; files?: File[]; sourceUrl?: string }): Observable<ContentEpisode> {
    const form = new FormData();
    form.append('title', input.title);
    const many = input.files?.filter(Boolean) || [];
    if (many.length) {
      for (const file of many) form.append('files', file, file.name);
    } else if (input.file) {
      form.append('file', input.file, input.file.name);
    }
    if (input.sourceUrl) form.append('sourceUrl', input.sourceUrl);
    return this.http.post<ContentEpisode>(`${this.base}/content/products/${productId}/episodes`, form);
  }

  removeEpisode(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/content/episodes/${id}`);
  }

  unlock(episodeId: string, licenseKey?: string): Observable<ContentUnlock> {
    return this.http.post<ContentUnlock>(`${this.base}/content/unlock`, {
      episodeId,
      licenseKey: licenseKey || undefined,
    });
  }

  download(episodeId: string, licenseKey?: string): Observable<Blob> {
    return this.http.get(`${this.base}/content/episodes/${episodeId}/download`, {
      responseType: 'blob',
      headers: licenseKey ? { 'x-license-key': licenseKey } : undefined,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CreatorService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<Creator[]> {
    return this.http.get<Creator[]>(`${this.base}/creators`);
  }

  bySlug(slug: string): Observable<Creator> {
    return this.http.get<Creator>(`${this.base}/creators/${slug}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(productId?: string, creatorSlug?: string): Observable<Review[]> {
    let params = new HttpParams();
    if (productId) params = params.set('productId', productId);
    if (creatorSlug) params = params.set('creatorSlug', creatorSlug);
    return this.http.get<Review[]>(`${this.base}/reviews`, { params });
  }

  create(review: Omit<Review, 'id' | 'createdAt'>): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews`, review);
  }
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;
  private readonly itemsSignal = signal<Product[]>([]);

  readonly items = this.itemsSignal.asReadonly();
  readonly ids = computed(() => new Set(this.itemsSignal().map((p) => p.id)));
  readonly count = computed(() => this.itemsSignal().length);

  saved(productId?: string | null): boolean {
    if (!productId) return false;
    return this.ids().has(productId);
  }

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/wishlist`);
  }

  load(): void {
    if (!this.auth.isAuthenticated()) {
      this.itemsSignal.set([]);
      return;
    }
    this.list()
      .pipe(catchError(() => of([] as Product[])))
      .subscribe((items) => this.itemsSignal.set(items));
  }

  toggle(productId: string): Observable<{ wishlist: Product[]; added: boolean; productId?: string }> {
    return this.http
      .post<{ wishlist: Product[]; added: boolean; productId?: string }>(`${this.base}/wishlist/toggle`, {
        productId,
      })
      .pipe(tap((res) => this.itemsSignal.set(res.wishlist || [])));
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`);
  }

  orders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/orders`);
  }

  usage(): Observable<UsageStat[]> {
    return this.http.get<UsageStat[]>(`${this.base}/usage`);
  }

  myUsage(limit = 100): Observable<BuyerUsageFeed> {
    return this.http.get<BuyerUsageFeed>(`${this.base}/usage/me`, { params: { limit: String(limit) } });
  }

  wallet(): Observable<WalletTx[]> {
    return this.http.get<WalletTx[]>(`${this.base}/wallet`);
  }

  walletSummary(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`${this.base}/wallet/summary`);
  }

  withdraw(amount: number, persona?: string): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/withdraw`, { amount, persona });
  }

  payoutPolicy(persona?: string, amount?: number): Observable<PayoutPolicyResponse> {
    let params = new HttpParams();
    if (persona) params = params.set('persona', persona);
    if (amount !== undefined && amount !== null) params = params.set('amount', String(amount));
    return this.http.get<PayoutPolicyResponse>(`${this.base}/wallet/payout-policy`, { params });
  }

  openDispute(orderId: string, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.base}/orders/${orderId}/dispute`, { reason });
  }

  disputes(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/orders/disputes`);
  }

  adminDisputes(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.base}/admin/disputes`);
  }

  resolveDispute(orderId: string, resolution: 'seller' | 'buyer', note?: string): Observable<Order> {
    return this.http.patch<Order>(`${this.base}/admin/disputes/${orderId}`, { resolution, note });
  }

  complaints(as?: 'mine' | 'seller' | 'admin' | 'work'): Observable<Complaint[]> {
    let params = new HttpParams();
    if (as) params = params.set('as', as);
    return this.http.get<Complaint[]>(`${this.base}/complaints`, { params });
  }

  complaint(id: string): Observable<Complaint> {
    return this.http.get<Complaint>(`${this.base}/complaints/${id}`);
  }

  createComplaint(body: {
    kind: ComplaintKind;
    body: string;
    requestedAction?: string;
    evidenceUrls?: string;
    orderId?: string;
    jobApplicationId?: string;
    productId?: string;
    productName?: string;
    name?: string;
    email?: string;
    openOrderDispute?: boolean;
  }): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.base}/complaints`, body);
  }

  sellerRespondComplaint(id: string, body: string): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.base}/complaints/${id}/seller-response`, { body });
  }

  appealComplaint(id: string, reason: string): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.base}/complaints/${id}/appeal`, { reason });
  }

  adminUpdateComplaint(
    id: string,
    body: {
      action: 'advance' | 'skip_seller' | 'decide' | 'close';
      note?: string;
      decision?: 'upheld' | 'rejected' | 'mediated';
      decisionNote?: string;
    },
  ): Observable<Complaint> {
    return this.http.patch<Complaint>(`${this.base}/complaints/${id}`, body);
  }

  deposit(amount: number): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/deposit`, { amount });
  }

  paypalConfig(): Observable<{
    enabled: boolean;
    clientId: string;
    sandbox: boolean;
    merchantName?: string;
  }> {
    return this.http.get<{
      enabled: boolean;
      clientId: string;
      sandbox: boolean;
      merchantName?: string;
    }>(`${this.base}/paypal/config`);
  }

  paypalCreateOrder(amount: number, currency: string, fundingSource?: string): Observable<{
    success: boolean;
    orderId: string;
    amountUsd: string;
    paymentHistoryId: string;
  }> {
    return this.http.post<{
      success: boolean;
      orderId: string;
      amountUsd: string;
      paymentHistoryId: string;
    }>(`${this.base}/paypal/create-order`, { amount, currency, fundingSource });
  }

  paypalCaptureOrder(orderId: string): Observable<{ success: boolean; status: string; wallet?: WalletTx }> {
    return this.http.post<{ success: boolean; status: string; wallet?: WalletTx }>(
      `${this.base}/paypal/capture-order`,
      { orderId },
    );
  }

  gpayConfig(): Observable<GpayConfig> {
    return this.http.get<GpayConfig>(`${this.base}/gpay/config`);
  }

  /** GPay payment gateway: returns `billUrl` to redirect the payer to. */
  gpayCheckout(amountVnd: number): Observable<GpayCheckoutResponse> {
    return this.http.post<GpayCheckoutResponse>(`${this.base}/gpay/checkout`, { amountVnd, platform: 'web' });
  }

  /** GPay QR Payment: dynamic VietQR for one top-up. */
  gpayQr(amountVnd: number): Observable<GpayQrResponse> {
    return this.http.post<GpayQrResponse>(`${this.base}/gpay/qr`, { amountVnd });
  }

  gpayOrder(requestId: string): Observable<{ success: boolean; order: GpayOrder }> {
    return this.http.get<{ success: boolean; order: GpayOrder }>(
      `${this.base}/gpay/orders/${encodeURIComponent(requestId)}`,
    );
  }

  gpayTransactions(): Observable<WalletTx[]> {
    return this.http.get<WalletTx[]>(`${this.base}/gpay/transactions`);
  }

  adminWalletTxs(params?: {
    type?: 'deposit' | 'withdraw';
    status?: 'pending' | 'completed' | 'failed' | 'cancelled' | '';
    q?: string;
  }): Observable<AdminWalletTxList> {
    let httpParams = new HttpParams();
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    return this.http.get<AdminWalletTxList>(`${this.base}/admin/wallet-txs`, { params: httpParams });
  }

  reviewWalletTx(
    id: string,
    status: 'completed' | 'failed' | 'cancelled',
    note?: string,
  ): Observable<WalletTx> {
    return this.http.put<WalletTx>(`${this.base}/admin/wallet-txs/${id}`, { status, note });
  }

  affiliate(): Observable<AffiliateStats> {
    return this.http.get<AffiliateStats>(`${this.base}/affiliate`);
  }

  notifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.base}/notifications`);
  }

  readAllNotifications(): Observable<NotificationItem[]> {
    return this.http.post<NotificationItem[]>(`${this.base}/notifications/read-all`, {});
  }

  adminOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.base}/admin/overview`);
  }

  licenses(): Observable<IssuedLicense[]> {
    return this.http.get<IssuedLicense[]>(`${this.base}/licenses/me`);
  }

  adminUser(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.base}/admin/users/${id}`);
  }

  updateUserStatus(
    id: string,
    body: { status: ModerationStatus; days?: number; reason?: string },
  ): Observable<AdminUserDetail> {
    return this.http.patch<AdminUserDetail>(`${this.base}/admin/users/${id}/status`, body);
  }

  deleteUser(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/admin/users/${id}`);
  }

  adminProduct(id: string): Observable<AdminProductDetail> {
    return this.http.get<AdminProductDetail>(`${this.base}/admin/products/${id}`);
  }

  updateProductStatus(
    id: string,
    body: { status: ModerationStatus; days?: number; reason?: string },
  ): Observable<AdminProductDetail> {
    return this.http.patch<AdminProductDetail>(`${this.base}/admin/products/${id}/status`, body);
  }

  deleteProduct(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/admin/products/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class DeploymentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  deploy(input: {
    productId: string;
    name?: string;
    visibility?: 'private' | 'public';
    syncProduct?: boolean;
    /** env/skills accept .env string or CSV — API normalizes. */
    runtime?: Partial<Omit<DeploymentRuntime, 'env' | 'skills'>> & {
      env?: DeploymentRuntime['env'] | string;
      skills?: DeploymentRuntime['skills'] | string;
    };
  }): Observable<Deployment> {
    return this.http.post<Deployment>(`${this.base}/deployments`, input);
  }

  mine(): Observable<Deployment[]> {
    return this.http.get<Deployment[]>(`${this.base}/deployments/mine`);
  }

  browser(): Observable<Deployment[]> {
    return this.http.get<Deployment[]>(`${this.base}/deployments/browser`);
  }

  update(
    id: string,
    patch: Partial<{
      name: string;
      status: 'running' | 'stopped';
      visibility: 'private' | 'public';
      syncProduct: boolean;
      runtime: Partial<Omit<DeploymentRuntime, 'env' | 'skills'>> & {
        env?: DeploymentRuntime['env'] | string;
        skills?: DeploymentRuntime['skills'] | string;
      };
    }>,
  ): Observable<Deployment> {
    return this.http.patch<Deployment>(`${this.base}/deployments/${id}`, patch);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/deployments/${id}`);
  }

  invoke(
    id: string,
    input: { input?: string; inputTokens?: number; outputTokens?: number },
  ): Observable<InvokeResult> {
    return this.http.post<InvokeResult>(`${this.base}/deployments/${id}/invoke`, input);
  }

  usage(id: string): Observable<DeploymentUsage> {
    return this.http.get<DeploymentUsage>(`${this.base}/deployments/${id}/usage`);
  }
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  checkout(input: {
    productId: string;
    quantity?: number;
    licenseTerm?: 'day' | 'month' | 'year';
    couponCode?: string;
  }): Observable<{
    checkoutId: string;
    provider: string;
    status: string;
    quantity?: number;
    amount?: number;
    currency?: string;
    couponCode?: string;
    couponDiscount?: number;
    balance?: number;
    license?: IssuedLicense | null;
    emailSent?: boolean;
    emailTo?: string | null;
    emailReason?: string;
  }> {
    return this.http.post<{
      checkoutId: string;
      provider: string;
      status: string;
      quantity?: number;
      amount?: number;
      currency?: string;
      couponCode?: string;
      couponDiscount?: number;
      balance?: number;
      license?: IssuedLicense | null;
      emailSent?: boolean;
      emailTo?: string | null;
      emailReason?: string;
    }>(`${this.base}/billing/checkout`, {
      productId: input.productId,
      quantity: input.quantity,
      licenseTerm: input.licenseTerm,
      couponCode: input.couponCode,
      provider: 'wallet',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.base}/coupons`);
  }

  create(body: Partial<Coupon> & { code: string; type: 'percent' | 'amount'; value: number }): Observable<Coupon> {
    return this.http.post<Coupon>(`${this.base}/coupons`, body);
  }

  update(id: string, body: Partial<Coupon>): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.base}/coupons/${id}`, body);
  }

  deactivate(id: string): Observable<Coupon> {
    return this.http.delete<Coupon>(`${this.base}/coupons/${id}`);
  }

  preview(input: {
    productId: string;
    code: string;
    quantity?: number;
    licenseTerm?: string;
  }): Observable<CouponPreview> {
    return this.http.post<CouponPreview>(`${this.base}/coupons/preview`, input);
  }
}

export interface PlaygroundRunResult {
  ok: boolean;
  id: string;
  status: string;
  provider: string;
  model?: string;
  endpointId?: string;
  delayTime?: number;
  executionTime?: number;
  output: Record<string, unknown>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    unit?: string;
    quantity?: number;
  };
  cost?: number;
  /** Sell price for the generation: RunPod's cost plus the platform markup. */
  providerCost?: number;
  /** What RunPod itself charged, before the markup. */
  upstreamCost?: number;
  /** Markup applied over the upstream cost, as a fraction (0.25 = +25%). */
  markup?: number;
  platformFee?: number;
  sellerNet?: number;
  currency?: string;
  /** Inputs that were coerced or dropped because the model does not accept them. */
  warnings?: string[];
  sandbox?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PlaygroundService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Platform-mediated run → ai-marketplace-api → AI Markets AI (ai.aimarkets.vn) → providers */
  run(input: {
    productSlug: string;
    productId?: string;
    input: Record<string, unknown>;
    provider?: string;
    model?: string;
    endpointId?: string;
    action?: string;
  }): Observable<PlaygroundRunResult> {
    return this.http.post<PlaygroundRunResult>(`${this.base}/playground/run`, input);
  }

  /** Exact `input` schema + pricing formula for a RunPod Public Endpoint. */
  modelSchema(slugOrEndpointId: string): Observable<RunpodModelSchema> {
    return this.http.get<RunpodModelSchema>(
      `${this.base}/endpoints/public-endpoints/${encodeURIComponent(slugOrEndpointId)}/schema`,
    );
  }
}

export interface AgentChatResult {
  ok: boolean;
  id?: string;
  reply: string;
  sessionId: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    unit?: string;
  };
  cost?: number;
  provider?: string;
  latencyMs?: number;
  memoryApplied?: boolean;
  memoryRecalled?: number;
  memoryWritten?: number;
  sandbox?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AgentChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Hire-agent chat with persistent memory (Postgres/Redis/Qdrant/Neo4j via AI Markets AI). */
  chat(input: {
    productSlug: string;
    productId?: string;
    message: string;
    sessionId?: string;
  }): Observable<AgentChatResult> {
    return this.http.post<AgentChatResult>(`${this.base}/agents/chat`, input);
  }
}

export interface GpuServer {
  id: string;
  projectId: string;
  name: string;
  provider: string;
  kind: 'compute' | 'game';
  status: string;
  gpu: string;
  createdAt?: string;
}

export interface TerminalSessionInfo {
  sessionId: string;
  projectId: string;
  serverId: string;
  provider: string;
  status: string;
}

export interface GameSessionInfo {
  sessionId: string;
  projectId: string;
  serverId: string;
  provider: string;
  status: string;
  streamKind: string;
  playerUrl: string;
  publicUrl?: string;
  productSlug?: string;
  hosting?: 'external' | 'aimarkets';
  playerMode?: 'terminal' | 'game';
}

export interface ComputeNode {
  id: string;
  productSlug?: string;
  productName?: string;
  name: string;
  kind: 'compute' | 'game';
  provider: string;
  status: string;
  external: boolean;
  hosting?: 'external' | 'aimarkets' | 'lab';
  region: string;
  webhookUrl: boolean;
  hasStream: boolean;
  maxConcurrent: number;
  createdAt: string;
  updatedAt: string;
}

export interface GpuOffer {
  id: string;
  name: string;
  memoryGb: number;
  pricePerHour: number;
  availability: 'high' | 'medium' | 'low' | 'unknown';
}

export interface GpuOffersResponse {
  offers: GpuOffer[];
  currency: 'USD';
  wallet: { available: number };
  limits: {
    minPrepayHours: number;
    maxGpuCount: number;
    maxActive: number;
    volumeGb: { min: number; max: number; default: number };
    diskGb: number;
    warnMinutes: number;
    terminateGraceHours: number;
  };
}

export type GpuRentalStatus = 'creating' | 'running' | 'stopped' | 'terminated' | 'error';

export interface GpuRental {
  id: string;
  name: string;
  gpu: { id: string; name: string; memoryGb: number; count: number };
  diskGb: number;
  volumeGb: number;
  status: GpuRentalStatus;
  ready: boolean;
  pricePerHour: number;
  stoppedPricePerHour: number;
  currency: 'USD';
  billedMinutes: number;
  billedTotal: number;
  stoppedReason: '' | 'user' | 'insufficient_funds' | 'admin';
  terminateAfter: string | null;
  createdAt: string;
  stoppedAt: string | null;
  terminatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class GpuRentalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/gpu`;

  offers(): Observable<GpuOffersResponse> {
    return this.http.get<GpuOffersResponse>(`${this.base}/offers`);
  }

  list(): Observable<{ rentals: GpuRental[] }> {
    return this.http.get<{ rentals: GpuRental[] }>(`${this.base}/rentals`);
  }

  get(id: string): Observable<{ rental: GpuRental }> {
    return this.http.get<{ rental: GpuRental }>(`${this.base}/rentals/${id}`);
  }

  create(body: { offerId: string; name?: string; volumeGb?: number; gpuCount?: number }): Observable<{ rental: GpuRental }> {
    return this.http.post<{ rental: GpuRental }>(`${this.base}/rentals`, body);
  }

  start(id: string): Observable<{ rental: GpuRental }> {
    return this.http.post<{ rental: GpuRental }>(`${this.base}/rentals/${id}/start`, {});
  }

  stop(id: string): Observable<{ rental: GpuRental }> {
    return this.http.post<{ rental: GpuRental }>(`${this.base}/rentals/${id}/stop`, {});
  }

  remove(id: string): Observable<{ rental: GpuRental }> {
    return this.http.delete<{ rental: GpuRental }>(`${this.base}/rentals/${id}`);
  }

  /** Absolute URL of the workspace (JupyterLab or its terminal) on the API origin. */
  open(id: string, target: 'lab' | 'terminal'): Observable<{ path: string; expiresIn: number }> {
    return this.http.post<{ path: string; expiresIn: number }>(`${this.base}/rentals/${id}/open`, { target });
  }

  absoluteUrl(path: string): string {
    return `${new URL(environment.apiUrl).origin}${path}`;
  }
}

@Injectable({ providedIn: 'root' })
export class GpuGatewayService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listServers(projectId = 'default'): Observable<GpuServer[]> {
    return this.http.get<GpuServer[]>(`${this.base}/servers`, { params: { projectId } });
  }

  createServer(body: {
    name: string;
    kind: 'compute' | 'game';
    projectId?: string;
    gpuType?: string;
    provider?: string;
  }): Observable<GpuServer> {
    return this.http.post<GpuServer>(`${this.base}/servers`, body);
  }

  startServer(id: string): Observable<GpuServer> {
    return this.http.post<GpuServer>(`${this.base}/servers/${id}/start`, {});
  }

  stopServer(id: string): Observable<GpuServer> {
    return this.http.post<GpuServer>(`${this.base}/servers/${id}/stop`, {});
  }

  deleteServer(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/servers/${id}`);
  }

  createTerminal(serverId: string, projectId = 'default'): Observable<TerminalSessionInfo> {
    return this.http.post<TerminalSessionInfo>(`${this.base}/terminal/sessions`, { serverId, projectId });
  }

  closeTerminal(sessionId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/terminal/sessions/${sessionId}`);
  }

  createGameSession(
    serverIdOrOpts: string | { serverId?: string; productSlug?: string; projectId?: string },
    projectId = 'default',
  ): Observable<GameSessionInfo> {
    if (typeof serverIdOrOpts === 'string') {
      return this.http.post<GameSessionInfo>(`${this.base}/game-sessions`, {
        serverId: serverIdOrOpts,
        projectId,
      });
    }
    const opts = serverIdOrOpts;
    const body: Record<string, string> = { projectId: opts.projectId ?? 'default' };
    if (opts.productSlug) body['productSlug'] = opts.productSlug;
    if (opts.serverId) body['serverId'] = opts.serverId;
    return this.http.post<GameSessionInfo>(`${this.base}/game-sessions`, body);
  }

  closeGameSession(sessionId: string): Observable<{ ok: boolean; billedCost?: number }> {
    return this.http.delete<{ ok: boolean; billedCost?: number }>(
      `${this.base}/game-sessions/${sessionId}`,
    );
  }

  wsUrl(sessionId: string, token: string): string {
    const origin = this.base.replace(/\/v1\/?$/, '');
    const ws = origin.replace(/^http/, 'ws');
    return `${ws}/ws/terminal/${encodeURIComponent(sessionId)}?access_token=${encodeURIComponent(token)}`;
  }
}

@Injectable({ providedIn: 'root' })
export class SellerComputeService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listNodes(): Observable<ComputeNode[]> {
    return this.http.get<ComputeNode[]>(`${this.base}/seller/compute/nodes`);
  }

  registerNode(body: {
    productSlug: string;
    hosting?: 'external' | 'aimarkets' | 'hosted' | 'internal';
    name?: string;
    kind?: 'compute' | 'game';
    gpuType?: string;
    provider?: string;
    nodeId?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    streamHost?: string;
    streamPort?: number;
    streamPath?: string;
    streamKind?: string;
    streamTls?: boolean;
    iframeUrl?: string;
    healthUrl?: string;
    region?: string;
    maxConcurrent?: number;
  }): Observable<ComputeNode> {
    return this.http.post<ComputeNode>(`${this.base}/seller/compute/nodes`, body);
  }

  updateNode(
    id: string,
    body: Partial<{
      name: string;
      status: string;
      webhookUrl: string;
      webhookSecret: string;
      streamHost: string;
      streamPort: number;
      streamPath: string;
      streamKind: string;
      streamTls: boolean;
      iframeUrl: string;
      healthUrl: string;
      region: string;
      maxConcurrent: number;
    }>,
  ): Observable<ComputeNode> {
    return this.http.patch<ComputeNode>(`${this.base}/seller/compute/nodes/${id}`, body);
  }

  deleteNode(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/seller/compute/nodes/${id}`);
  }

  pingNode(id: string): Observable<{ ok: boolean; via?: string; message?: string; status?: number }> {
    return this.http.post<{ ok: boolean; via?: string; message?: string; status?: number }>(
      `${this.base}/seller/compute/nodes/${id}/ping`,
      {},
    );
  }

  schema(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/seller/compute/schema`);
  }
}

export interface UploadImageResult {
  ok: boolean;
  url: string;
  objectName?: string;
  bucket?: string;
  filename?: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  uploadImage(file: File): Observable<UploadImageResult> {
    const form = new FormData();
    form.append('image', file, file.name);
    return this.http.post<UploadImageResult>(`${this.base}/uploads/image`, form);
  }

  uploadAudio(file: File): Observable<UploadImageResult> {
    const form = new FormData();
    form.append('audio', file, file.name);
    return this.http.post<UploadImageResult>(`${this.base}/uploads/audio`, form);
  }
}

@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  me(): Observable<KycProfile> {
    return this.http.get<KycProfile>(`${this.base}/kyc/me`);
  }

  uploadDocument(side: KycSide, file: File): Observable<{ ok: boolean; side: string; previewUrl?: string; kyc: KycProfile }> {
    const form = new FormData();
    form.append('image', file, file.name);
    return this.http.post<{ ok: boolean; side: string; previewUrl?: string; kyc: KycProfile }>(
      `${this.base}/kyc/documents/${side}`,
      form,
    );
  }

  documentUrl(side: KycSide, userId?: string): Observable<{ side: string; url: string; expiresIn: number }> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get<{ side: string; url: string; expiresIn: number }>(`${this.base}/kyc/documents/${side}`, {
      params,
    });
  }

  submit(body: KycSubmitBody): Observable<{ ok: boolean; kyc: KycProfile }> {
    return this.http.post<{ ok: boolean; kyc: KycProfile }>(`${this.base}/kyc/submit`, body);
  }

  adminQueue(query: { status?: KycReviewStatus; subjectType?: KycSubjectType | ''; q?: string } = {}): Observable<KycQueueResponse> {
    let params = new HttpParams().set('status', query.status || 'pending');
    if (query.subjectType) params = params.set('subjectType', query.subjectType);
    if (query.q) params = params.set('q', query.q);
    return this.http.get<KycQueueResponse>(`${this.base}/kyc/admin/queue`, { params });
  }

  adminDecide(userId: string, decision: 'verified' | 'rejected', rejectReason?: string): Observable<{ ok: boolean; kyc: KycProfile }> {
    return this.http.patch<{ ok: boolean; kyc: KycProfile }>(`${this.base}/kyc/admin/${userId}`, {
      decision,
      rejectReason,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  conversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.base}/chat/conversations`);
  }

  conversation(id: string): Observable<ChatConversation> {
    return this.http.get<ChatConversation>(`${this.base}/chat/conversations/${id}`);
  }

  start(body: {
    productId?: string;
    jobId?: string;
    jobSlug?: string;
    applicantId?: string;
    applicationId?: string;
    talentSlug?: string;
    body?: string;
    imageUrl?: string;
  }): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.base}/chat/conversations`, body);
  }

  messages(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/chat/conversations/${conversationId}/messages`);
  }

  send(conversationId: string, body: { body?: string; imageUrl?: string }): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/chat/conversations/${conversationId}/messages`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  me(): Observable<SellerProfile | null> {
    return this.http.get<SellerProfile | null>(`${this.base}/sellers/me`);
  }

  apply(payload: Partial<SellerProfile>): Observable<SellerProfile> {
    return this.http.post<SellerProfile>(`${this.base}/sellers/apply`, payload);
  }

  acceptAgreement(): Observable<SellerProfile> {
    return this.http.post<SellerProfile>(`${this.base}/sellers/accept-agreement`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<LegalDocumentMeta[]> {
    return this.http.get<LegalDocumentMeta[]>(`${this.base}/legal`);
  }

  get(documentType: string): Observable<LegalDocumentMeta> {
    return this.http.get<LegalDocumentMeta>(`${this.base}/legal/${documentType}`);
  }

  accept(documentType: string, context = 'manual'): Observable<{ documentType: string; version: string; acceptedAt: string }> {
    return this.http.post<{ documentType: string; version: string; acceptedAt: string }>(
      `${this.base}/legal/${documentType}/accept`,
      { context },
    );
  }
}
