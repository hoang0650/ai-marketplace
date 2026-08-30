import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { HiredAgent, MarketplaceAgent, OpenClawLaunchResult, OpenClawSshAccess } from './agents.models';

const HIRED_KEY = 'phai.openclaw.hired';

export const MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  {
    id: 'hermes',
    slug: 'hermes-agent',
    name: 'Hermes Agent',
    description: 'General-purpose research and ops agent with multi-channel delivery.',
    icon: 'hermes',
    version: '1.4.0',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
  },
  {
    id: 'nano-claw',
    slug: 'nano-claw',
    name: 'Nano Claw',
    description: 'Lightweight OpenClaw profile for fast skill packs and chat bots.',
    icon: 'nano',
    version: '0.9.2',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
  },
  {
    id: 'openclaw',
    slug: 'openclaw',
    name: 'OpenClaw',
    description:
      'An AI-powered coding and hospitality agent with a web-based control UI, powered by Featherless inference.',
    icon: 'openclaw',
    version: '2026.3.24',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
    hireProductSlug: 'openclaw-ops-agent',
  },
  {
    id: 'open-webui',
    slug: 'open-webui',
    name: 'Open WebUI',
    description: 'Chat-first interface for private models and agent tooling.',
    icon: 'webui',
    version: '0.6.1',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openwebui.com',
    public: true,
  },
  {
    id: 'sillytavern',
    slug: 'sillytavern',
    name: 'SillyTavern',
    description: 'Character-driven conversational front-end for creative agents.',
    icon: 'tavern',
    version: '1.12.0',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.sillytavern.app',
    public: true,
  },
  {
    id: 'space-bot',
    slug: 'space-bot',
    name: 'Space Bot',
    description: 'Slack / Discord presence bot with scheduled digests and tools.',
    icon: 'space',
    version: '2.1.0',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
  },
];

@Injectable({ providedIn: 'root' })
export class OpenClawGatewayService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private approveTimer: ReturnType<typeof setTimeout> | null = null;
  private approveInterval: ReturnType<typeof setInterval> | null = null;
  private opening = false;

  listMarketplaceAgents(tab: 'public' | 'internal' = 'public'): MarketplaceAgent[] {
    return MARKETPLACE_AGENTS.filter((a) => (tab === 'public' ? a.public : !a.public));
  }

  getAgent(idOrSlug: string): MarketplaceAgent | undefined {
    return MARKETPLACE_AGENTS.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
  }

  listHired(): HiredAgent[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? (JSON.parse(raw) as HiredAgent[]) : [];
    } catch {
      return [];
    }
  }

  getHired(id: string): HiredAgent | undefined {
    return this.listHired().find((a) => a.id === id || a.slug === id || a.agentId === id);
  }

  upsertHired(agent: MarketplaceAgent, status: HiredAgent['status'] = 'running'): HiredAgent {
    const list = this.listHired();
    const existing = list.find((h) => h.agentId === agent.id);
    const row: HiredAgent = existing
      ? { ...existing, status, name: agent.name, version: agent.version, model: agent.model }
      : {
          id: `hired-${agent.id}-${Date.now().toString(36)}`,
          agentId: agent.id,
          slug: agent.slug,
          name: agent.name,
          status,
          version: agent.version,
          model: agent.model,
          launchedAt: new Date().toISOString(),
        };
    const next = existing
      ? list.map((h) => (h.agentId === agent.id ? row : h))
      : [row, ...list];
    this.persistHired(next);
    return row;
  }

  archiveHired(id: string): void {
    const next = this.listHired().map((h) =>
      h.id === id || h.agentId === id
        ? { ...h, status: 'archived' as const, archivedAt: new Date().toISOString() }
        : h,
    );
    this.persistHired(next);
  }

  /**
   * Same flow as hotelapp ai-chatbox `openOpenClawGateway`:
   * open blank tab → fetch direct-url → navigate → auto-approve pairing.
   */
  launchGateway(opts?: { agent?: MarketplaceAgent; userId?: string }): Observable<OpenClawLaunchResult> {
    if (this.opening) {
      return of({ success: false, message: 'OpenClaw is already launching…' });
    }
    this.opening = true;
    this.clearApproveTimers();

    const newTab = isPlatformBrowser(this.platformId) ? window.open('about:blank', '_blank') : null;
    const userId = opts?.userId || this.auth.user()?.id;

    return this.resolveLaunchUrl(userId).pipe(
      tap((res) => {
        this.opening = false;
        if (res.success && res.url && isPlatformBrowser(this.platformId)) {
          if (opts?.agent) this.upsertHired(opts.agent, 'running');
          if (newTab) newTab.location.href = res.url;
          else window.open(res.url, '_blank');
          this.approveDelayTimer(800, () => this.triggerAutoApprove(30, 1000));
        } else if (newTab) {
          newTab.close();
        }
      }),
      catchError((err) => {
        this.opening = false;
        if (newTab) newTab.close();
        return of({
          success: false,
          message:
            err?.error?.detail ||
            err?.error?.message ||
            err?.message ||
            'Failed to launch OpenClaw gateway',
        });
      }),
    );
  }

  buildManualConnectUrl(gatewayUrl: string, token: string, password = ''): string {
    const ui = (environment.openclaw?.uiBaseUrl || environment.openclaw?.gatewayUrl || '').replace(
      /\/$/,
      '',
    );
    const base = ui || gatewayUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
    const hash = new URLSearchParams({
      gatewayUrl,
      token,
      gatewayToken: token,
      password: password || '',
      autoConnect: 'true',
      autoApprove: 'true',
      session: 'main',
    });
    return `${base}/#${hash.toString()}`;
  }

  approvePairing(requestId?: string | null): Observable<{ success: boolean; message?: string }> {
    const oc = environment.openclaw || {};
    const tenantId = oc.tenantId || '';
    const params = new HttpParams()
      .set('tenant_id', tenantId)
      .set('current_hotel_id', tenantId)
      .set('selected_hotel_id', tenantId);
    const body = {
      request_id: requestId || null,
      requestId: requestId || null,
      client_id: null,
      clientId: null,
      client_mode: null,
      clientMode: null,
      role: 'operator',
      scopes: ['operator.read', 'operator.write', 'operator.admin', 'operator.pairing'],
      tenant_id: tenantId,
      current_hotel_id: tenantId,
      selected_hotel_id: tenantId,
    };
    return this.http
      .post<{ success: boolean; message?: string }>(
        `${environment.aiUrl}/admin/openclaw/device-pairings/approve`,
        body,
        { params, headers: this.authHeaders() },
      )
      .pipe(catchError(() => of({ success: false, message: 'Approve failed' })));
  }

  /** Generate temporary SSH command: desktop → user sandbox/server (60 min). */
  generateSsh(input?: {
    agentId?: string;
    host?: string;
    port?: number;
    username?: string;
  }): Observable<OpenClawSshAccess> {
    return this.http
      .post<OpenClawSshAccess>(
        `${environment.apiUrl}/openclaw/ssh/generate`,
        {
          agentId: input?.agentId || 'openclaw',
          host: input?.host || undefined,
          port: input?.port || undefined,
          username: input?.username || undefined,
        },
        { headers: this.authHeaders() },
      )
      .pipe(
        catchError((err) =>
          of({
            success: false,
            message: err?.error?.message || err?.message || 'Failed to generate SSH access',
          }),
        ),
      );
  }

  getActiveSsh(agentId = 'openclaw'): Observable<OpenClawSshAccess> {
    const params = new HttpParams().set('agentId', agentId);
    return this.http
      .get<OpenClawSshAccess>(`${environment.apiUrl}/openclaw/ssh/active`, {
        params,
        headers: this.authHeaders(),
      })
      .pipe(catchError(() => of({ success: false, active: false, session: null })));
  }

  revokeSsh(agentId = 'openclaw'): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/openclaw/ssh/revoke`,
        { agentId },
        { headers: this.authHeaders() },
      )
      .pipe(catchError(() => of({ success: false })));
  }

  private resolveLaunchUrl(userId?: string): Observable<OpenClawLaunchResult> {
    // 1) Marketplace API proxy (preferred when Nest/AI secrets live server-side)
    return this.http
      .post<OpenClawLaunchResult>(
        `${environment.apiUrl}/openclaw/launch`,
        { userId: userId || null },
        { headers: this.authHeaders() },
      )
      .pipe(
        catchError(() => this.fetchDirectUrl(userId)),
        map((res) => {
          if (res?.success && res.url) return res;
          return this.fallbackHashUrl();
        }),
      );
  }

  private fetchDirectUrl(userId?: string): Observable<OpenClawLaunchResult> {
    const oc = environment.openclaw || {};
    const tenantId = oc.tenantId || '';
    let params = new HttpParams()
      .set('tenant_id', tenantId)
      .set('current_hotel_id', tenantId)
      .set('selected_hotel_id', tenantId);
    if (userId) params = params.set('user_id', userId);

    return this.http
      .get<OpenClawLaunchResult>(`${environment.aiUrl}/admin/openclaw/direct-url`, {
        params,
        headers: this.authHeaders(),
      })
      .pipe(
        catchError(() => of(this.fallbackHashUrl())),
        map((res) => (res?.success && res.url ? res : this.fallbackHashUrl())),
      );
  }

  private fallbackHashUrl(): OpenClawLaunchResult {
    const oc = environment.openclaw || {};
    const gatewayUrl = oc.gatewayUrl || '';
    const token = oc.gatewayToken || '';
    if (!gatewayUrl || !token) {
      return {
        success: false,
        message:
          'OpenClaw gateway is not configured. Set openclaw.gatewayUrl + gatewayToken in environment, or configure /v1/openclaw/launch.',
      };
    }
    return {
      success: true,
      url: this.buildManualConnectUrl(gatewayUrl, token),
      gatewayUrl,
      token,
    };
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.token() || environment.openclaw?.bearerToken || '';
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  private triggerAutoApprove(maxAttempts: number, intervalMs: number): void {
    let attempts = 0;
    this.clearApproveTimers();
    this.approveInterval = setInterval(() => {
      attempts += 1;
      this.approvePairing().subscribe((res) => {
        if (res.success || attempts >= maxAttempts) {
          this.clearApproveTimers();
        }
      });
    }, intervalMs);
  }

  private approveDelayTimer(ms: number, fn: () => void): void {
    this.approveTimer = setTimeout(fn, ms);
  }

  private clearApproveTimers(): void {
    if (this.approveTimer) clearTimeout(this.approveTimer);
    if (this.approveInterval) clearInterval(this.approveInterval);
    this.approveTimer = null;
    this.approveInterval = null;
  }

  private storageKey(): string {
    const uid = this.auth.user()?.id || 'anon';
    return `${HIRED_KEY}.${uid}`;
  }

  private persistHired(list: HiredAgent[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.storageKey(), JSON.stringify(list));
  }
}
