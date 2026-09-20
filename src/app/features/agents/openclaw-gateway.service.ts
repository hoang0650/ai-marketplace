import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
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
    description: 'Building persistent, self-improving AI systems with multi-channel delivery.',
    icon: 'hermes',
    logoUrl: '/agents/hermes.png',
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
    logoUrl: '/agents/nano-claw.png',
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
    logoUrl: '/agents/openclaw.png',
    version: '2026.3.24',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
    hireProductSlug: 'openclaw-ops-agent',
    openclawGateway: true,
  },
  {
    id: 'open-webui',
    slug: 'open-webui',
    name: 'Open WebUI',
    description: 'Chat-first interface for private models and agent tooling.',
    icon: 'webui',
    logoUrl: '/agents/open-webui.png',
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
    logoUrl: '/agents/sillytavern.png',
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
    logoUrl: '/agents/space-bot.png',
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
  private readonly router = inject(Router);
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

  isOpenClawAgent(agent?: { id?: string; slug?: string; openclawGateway?: boolean } | null): boolean {
    if (!agent) return false;
    if (agent.openclawGateway) return true;
    const id = String(agent.id || agent.slug || '').toLowerCase();
    return id === 'openclaw';
  }

  comingSoonMessage(agent?: MarketplaceAgent | null): string {
    const name = agent?.name || 'This agent';
    return `${name} setup is coming later. Only OpenClaw launches Control UI at {userId}.openclaw.aimarkets.vn for now.`;
  }

  aimarketsHost(userId?: string): string {
    const id = String(userId || this.auth.user()?.id || '')
      .trim()
      .toLowerCase();
    const template = String(environment.openclaw?.publicUrlTemplate || 'https://{userId}.openclaw.aimarkets.vn');
    if (!id) return '{userId}.openclaw.aimarkets.vn';
    return template
      .replace(/\{userId\}/gi, id)
      .replace(/\{tenant\}/gi, id)
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
  }

  sshHostHint(userId?: string): string {
    return this.aimarketsHost(userId);
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
    if (opts?.agent && !this.isOpenClawAgent(opts.agent)) {
      return of({ success: false, message: this.comingSoonMessage(opts.agent) });
    }
    if (!this.auth.isAuthenticated()) {
      if (isPlatformBrowser(this.platformId)) {
        void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      }
      return of({
        success: false,
        message: 'Sign in to launch OpenClaw on {userId}.openclaw.aimarkets.vn.',
      });
    }
    const userId = opts?.userId || this.auth.user()?.id;
    if (!userId) {
      return of({
        success: false,
        message: 'OpenClaw needs a signed-in marketplace user id for {userId}.openclaw.aimarkets.vn.',
      });
    }
    if (this.opening) {
      return of({ success: false, message: 'OpenClaw is already launching…' });
    }
    this.opening = true;
    this.clearApproveTimers();

    const newTab = isPlatformBrowser(this.platformId) ? window.open('about:blank', '_blank') : null;

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

  buildManualConnectUrl(gatewayUrl: string, token: string, password = '', userId = ''): string {
    const id = userId || this.auth.user()?.id || '';
    const templated = String(environment.openclaw?.publicUrlTemplate || 'https://{userId}.openclaw.aimarkets.vn')
      .replace(/\{userId\}/g, id)
      .replace(/\{tenant\}/g, id)
      .replace(/\/$/, '');
    const ui = (environment.openclaw?.uiBaseUrl || templated || environment.openclaw?.gatewayUrl || '').replace(
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
      session: id ? `market-${id}` : 'main',
      audience: 'aimarkets',
    });
    if (id) hash.set('userId', id);
    return `${base}/#${hash.toString()}`;
  }

  approvePairing(requestId?: string | null): Observable<{ success: boolean; message?: string }> {
    const userId = this.auth.user()?.id || '';
    return this.http
      .post<{ success: boolean; message?: string }>(
        `${environment.apiUrl}/openclaw/device-pairings/approve`,
        {
          request_id: requestId || null,
          requestId: requestId || null,
          role: 'operator',
          scopes: ['operator.read', 'operator.write', 'operator.admin', 'operator.pairing'],
          user_id: userId,
        },
        { headers: this.authHeaders() },
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
          return this.fallbackHashUrl(userId);
        }),
      );
  }

  private fetchDirectUrl(userId?: string): Observable<OpenClawLaunchResult> {
    const id = userId || this.auth.user()?.id || '';
    let params = new HttpParams().set('audience', 'aimarkets');
    if (id) params = params.set('user_id', id);

    return this.http
      .get<OpenClawLaunchResult>(`${environment.aiUrl}/admin/openclaw/direct-url`, {
        params,
        headers: this.authHeaders(),
      })
      .pipe(
        catchError(() => of(this.fallbackHashUrl(id))),
        map((res) => (res?.success && res.url ? res : this.fallbackHashUrl(id))),
      );
  }

  private fallbackHashUrl(userId?: string): OpenClawLaunchResult {
    const oc = environment.openclaw || {};
    const id = userId || this.auth.user()?.id || '';
    const ui = String(oc.publicUrlTemplate || 'https://{userId}.openclaw.aimarkets.vn')
      .replace(/\{userId\}/g, id)
      .replace(/\{tenant\}/g, id)
      .replace(/\/$/, '');
    const gatewayUrl = oc.gatewayUrl || (id ? ui.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') : '');
    const token = oc.gatewayToken || '';
    if (!gatewayUrl || !token || !id) {
      return {
        success: false,
        message:
          'OpenClaw gateway is not configured. Sign in and set OPENCLAW_GATEWAY_TOKEN, or configure /v1/openclaw/launch.',
      };
    }
    return {
      success: true,
      url: this.buildManualConnectUrl(gatewayUrl, token, token, id),
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
