import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AffiliateStats,
  AdminOverview,
  AdminProductDetail,
  AdminUserDetail,
  ModerationStatus,
  Creator,
  DashboardSummary,
  NotificationItem,
  Order,
  Product,
  Review,
  UsageStat,
  WalletSummary,
  WalletTx,
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
    return this.http.get<RunpodPublicEndpoint[]>(`${this.base}/runpod/public-endpoints`, { params });
  }

  bySlug(slug: string): Observable<RunpodPublicEndpoint> {
    if (environment.useMockApi) {
      const hit = RUNPOD_PUBLIC_ENDPOINTS.find((e) => e.slug === slug);
      return hit ? of(hit) : throwError(() => ({ status: 404 }));
    }
    return this.http.get<RunpodPublicEndpoint>(`${this.base}/runpod/public-endpoints/${slug}`);
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

  list(productId?: string): Observable<Review[]> {
    let params = new HttpParams();
    if (productId) params = params.set('productId', productId);
    return this.http.get<Review[]>(`${this.base}/reviews`, { params });
  }

  create(review: Omit<Review, 'id' | 'createdAt'>): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews`, review);
  }
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/wishlist`);
  }

  toggle(productId: string): Observable<{ wishlist: Product[]; added: boolean }> {
    return this.http.post<{ wishlist: Product[]; added: boolean }>(`${this.base}/wishlist/toggle`, {
      productId,
    });
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

  wallet(): Observable<WalletTx[]> {
    return this.http.get<WalletTx[]>(`${this.base}/wallet`);
  }

  walletSummary(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`${this.base}/wallet/summary`);
  }

  withdraw(amount: number): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/withdraw`, { amount });
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

  deposit(amount: number): Observable<WalletTx> {
    return this.http.post<WalletTx>(`${this.base}/wallet/deposit`, { amount });
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
  }): Observable<{
    checkoutId: string;
    provider: string;
    status: string;
    quantity?: number;
    amount?: number;
    currency?: string;
    balance?: number;
  }> {
    return this.http.post<{
      checkoutId: string;
      provider: string;
      status: string;
      quantity?: number;
      amount?: number;
      currency?: string;
      balance?: number;
    }>(`${this.base}/billing/checkout`, {
      productId: input.productId,
      quantity: input.quantity,
      provider: 'wallet',
    });
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
  sandbox?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PlaygroundService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Platform-mediated run → ai-marketplace-api → denglish-api → providers */
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

  /** Hire-agent chat with persistent memory (Postgres/Redis/Qdrant/Neo4j via denglish-api). */
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

  createGameSession(serverId: string, projectId = 'default'): Observable<GameSessionInfo> {
    return this.http.post<GameSessionInfo>(`${this.base}/game-sessions`, { serverId, projectId });
  }

  closeGameSession(sessionId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/game-sessions/${sessionId}`);
  }

  wsUrl(sessionId: string, token: string): string {
    const origin = this.base.replace(/\/v1\/?$/, '');
    const ws = origin.replace(/^http/, 'ws');
    return `${ws}/ws/terminal/${encodeURIComponent(sessionId)}?access_token=${encodeURIComponent(token)}`;
  }
}
