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
    description:
      'AI Markets Hermes dashboard on {userId}.hermes.aimarkets.vn — OpenRouter/Featherless models (provider cost + 25%).',
    icon: 'hermes',
    logoUrl: '/agents/hermes.png',
    version: '1.4.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://hermes-agent.nousresearch.com/docs/',
    public: true,
    hireProductSlug: 'hermes-ops-agent',
    hermesGateway: true,
  },
  {
    id: 'nano-claw',
    slug: 'nano-claw',
    name: 'Nano Claw',
    description:
      'AI Markets NanoClaw on {userId}.nanoclaw.aimarkets.vn — lightweight container agents (provider cost + 25%).',
    icon: 'nano',
    logoUrl: '/agents/nano-claw.png',
    version: '2.3.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://github.com/qwibitai/nanoclaw',
    public: true,
    hireProductSlug: 'nanoclaw-ops-agent',
    nanoclawGateway: true,
  },
  {
    id: 'openclaw',
    slug: 'openclaw',
    name: 'OpenClaw',
    description:
      'AI Markets OpenClaw Control UI on {userId}.openclaw.aimarkets.vn — OpenRouter/Featherless models (provider cost + 25%). PHHotel Nest models stay on phhotel.vn.',
    icon: 'openclaw',
    logoUrl: '/agents/openclaw.png',
    version: '2026.3.24',
    model: 'openrouter/openrouter/free',
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
    description:
      'AI Markets SpaceBot on {userId}.spacebot.aimarkets.vn — always-on community agent with Discord/Slack/Telegram/Twitch channels (provider cost + 25%).',
    icon: 'space',
    logoUrl: '/agents/space-bot.png',
    version: '2.1.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://docs.spacebot.sh',
    public: true,
    hireProductSlug: 'spacebot-ops-agent',
    spacebotGateway: true,
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
    const key = this.normalizeAgentKey(idOrSlug);
    if (!key) return undefined;
    return MARKETPLACE_AGENTS.find(
      (a) => this.normalizeAgentKey(a.id) === key || this.normalizeAgentKey(a.slug) === key,
    );
  }

  /** Case/punctuation-insensitive key so `nano-claw`, `nanoclaw`, and `hermes-agent` all resolve. */
  private normalizeAgentKey(value?: string | null): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  isOpenClawAgent(agent?: { id?: string; slug?: string; openclawGateway?: boolean } | null): boolean {
    if (!agent) return false;
    if (agent.openclawGateway) return true;
    const id = String(agent.id || agent.slug || '').toLowerCase();
    return id === 'openclaw';
  }

  isHermesAgent(agent?: { id?: string; slug?: string; hermesGateway?: boolean } | null): boolean {
    if (!agent) return false;
    if ((agent as MarketplaceAgent).hermesGateway) return true;
    const id = String(agent.id || agent.slug || '').toLowerCase();
    return id === 'hermes' || id === 'hermes-agent';
  }

  isNanoclawAgent(
    agent?: { id?: string; slug?: string; nanoclawGateway?: boolean } | null,
  ): boolean {
    if (!agent) return false;
    if ((agent as MarketplaceAgent).nanoclawGateway) return true;
    const id = String(agent.id || agent.slug || '').toLowerCase();
    return id === 'nano-claw' || id === 'nanoclaw';
  }

  isSpacebotAgent(
    agent?: { id?: string; slug?: string; spacebotGateway?: boolean } | null,
  ): boolean {
    if (!agent) return false;
    if ((agent as MarketplaceAgent).spacebotGateway) return true;
    const id = String(agent.id || agent.slug || '').toLowerCase();
    return id === 'space-bot' || id === 'spacebot';
  }

  /** OpenClaw, Hermes, NanoClaw, or SpaceBot — Launch enabled on marketplace. */
  isLaunchableAgent(
    agent?: {
      id?: string;
      slug?: string;
      openclawGateway?: boolean;
      hermesGateway?: boolean;
      nanoclawGateway?: boolean;
      spacebotGateway?: boolean;
    } | null,
  ): boolean {
    return (
      this.isOpenClawAgent(agent) ||
      this.isHermesAgent(agent) ||
      this.isNanoclawAgent(agent) ||
      this.isSpacebotAgent(agent)
    );
  }

  comingSoonMessage(agent?: MarketplaceAgent | null): string {
    const name = agent?.name || 'This agent';
    return `${name} setup is coming later. OpenClaw, Hermes, NanoClaw, and SpaceBot ({userId}.*.aimarkets.vn) are live now.`;
  }

  aimarketsHost(userId?: string, agent?: MarketplaceAgent | null): string {
    const id = String(userId || this.auth.user()?.id || '')
      .trim()
      .toLowerCase();
    const hermes = this.isHermesAgent(agent);
    const nanoclaw = this.isNanoclawAgent(agent);
    const spacebot = this.isSpacebotAgent(agent);
    const template = hermes
      ? String(environment.hermes?.publicUrlTemplate || 'https://{userId}.hermes.aimarkets.vn')
      : nanoclaw
        ? String(environment.nanoclaw?.publicUrlTemplate || 'https://{userId}.nanoclaw.aimarkets.vn')
        : spacebot
          ? String(environment.spacebot?.publicUrlTemplate || 'https://{userId}.spacebot.aimarkets.vn')
          : String(environment.openclaw?.publicUrlTemplate || 'https://{userId}.openclaw.aimarkets.vn');
    const fallback = hermes
      ? '{userId}.hermes.aimarkets.vn'
      : nanoclaw
        ? '{userId}.nanoclaw.aimarkets.vn'
        : spacebot
          ? '{userId}.spacebot.aimarkets.vn'
          : '{userId}.openclaw.aimarkets.vn';
    if (!id) return fallback;
    return template
      .replace(/\{userId\}/gi, id)
      .replace(/\{tenant\}/gi, id)
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
  }

  sshHostHint(userId?: string, agent?: MarketplaceAgent | null): string {
    return this.aimarketsHost(userId, agent);
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

  /**
   * Refresh the hired list from the API (source of truth, shared with the app)
   * and mirror it into the local cache for instant synchronous reads.
   */
  loadHired(): Observable<HiredAgent[]> {
    if (!this.auth.isAuthenticated()) return of(this.listHired());
    return this.http
      .get<HiredAgent[]>(`${environment.apiUrl}/agents/hired`, { headers: this.authHeaders() })
      .pipe(
        tap((rows) => this.persistHired(rows || [])),
        catchError(() => of(this.listHired())),
      );
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
    this.pushHired(row);
    return row;
  }

  archiveHired(id: string): void {
    const next = this.listHired().map((h) =>
      h.id === id || h.agentId === id
        ? { ...h, status: 'archived' as const, archivedAt: new Date().toISOString() }
        : h,
    );
    this.persistHired(next);
    const target = this.listHired().find((h) => h.id === id || h.agentId === id);
    if (target) this.pushArchive(target.agentId);
  }

  /** Fire-and-forget server upsert so web + app stay in sync. */
  private pushHired(row: HiredAgent): void {
    if (!this.auth.isAuthenticated()) return;
    this.http
      .post<HiredAgent>(
        `${environment.apiUrl}/agents/hired`,
        {
          agentId: row.agentId,
          slug: row.slug,
          name: row.name,
          status: row.status,
          version: row.version,
          model: row.model,
        },
        { headers: this.authHeaders() },
      )
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private pushArchive(agentId: string): void {
    if (!this.auth.isAuthenticated()) return;
    this.http
      .patch<HiredAgent>(
        `${environment.apiUrl}/agents/hired/${encodeURIComponent(agentId)}`,
        { status: 'archived' },
        { headers: this.authHeaders() },
      )
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /**
   * Same flow as hotelapp ai-chatbox `openOpenClawGateway`:
   * open blank tab → fetch direct-url → navigate → auto-approve pairing.
   */
  launchGateway(opts?: { agent?: MarketplaceAgent; userId?: string }): Observable<OpenClawLaunchResult> {
    if (opts?.agent && !this.isLaunchableAgent(opts.agent)) {
      return of({ success: false, message: this.comingSoonMessage(opts.agent) });
    }
    if (!this.auth.isAuthenticated()) {
      if (isPlatformBrowser(this.platformId)) {
        void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      }
      const hostHint = this.isHermesAgent(opts?.agent)
        ? '{userId}.hermes.aimarkets.vn'
        : this.isNanoclawAgent(opts?.agent)
          ? '{userId}.nanoclaw.aimarkets.vn'
          : this.isSpacebotAgent(opts?.agent)
            ? '{userId}.spacebot.aimarkets.vn'
            : '{userId}.openclaw.aimarkets.vn';
      return of({
        success: false,
        message: `Sign in to launch on ${hostHint}.`,
      });
    }
    const userId = opts?.userId || this.auth.user()?.id;
    if (!userId) {
      return of({
        success: false,
        message: 'A signed-in marketplace user id is required.',
      });
    }
    if (this.opening) {
      return of({ success: false, message: 'Agent is already launching…' });
    }
    this.opening = true;
    this.clearApproveTimers();

    // Open the tab only after we have a URL — blank→close feels like a broken Launch.
    const agent = opts?.agent || this.getAgent('openclaw');
    const hermes = this.isHermesAgent(agent);
    const nanoclaw = this.isNanoclawAgent(agent);
    const spacebot = this.isSpacebotAgent(agent);
    const skipApprove = hermes || nanoclaw || spacebot;

    return this.resolveLaunchUrl(userId, agent).pipe(
      tap((res) => {
        this.opening = false;
        if (res.success && res.url && isPlatformBrowser(this.platformId)) {
          if (opts?.agent) this.upsertHired(opts.agent, 'running');
          const tab = window.open(res.url, '_blank');
          if (!tab) {
            // Popup blocked — still surface the URL.
            window.location.href = res.url;
          }
          if (!skipApprove) {
            this.approveDelayTimer(800, () => this.triggerAutoApprove(30, 1000));
          }
        }
      }),
      catchError((err) => {
        this.opening = false;
        const fallbackMsg = hermes
          ? 'Failed to launch Hermes dashboard'
          : nanoclaw
            ? 'Failed to launch NanoClaw dashboard'
            : spacebot
              ? 'Failed to launch SpaceBot dashboard'
              : 'Failed to launch OpenClaw gateway';
        return of({
          success: false,
          message:
            err?.error?.detail || err?.error?.message || err?.message || fallbackMsg,
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

  approvePairing(
    requestId?: string | null,
    agent?: MarketplaceAgent | null,
  ): Observable<{ success: boolean; message?: string }> {
    const userId = this.auth.user()?.id || '';
    const path = this.agentApiPath(agent);
    return this.http
      .post<{ success: boolean; message?: string }>(
        `${environment.apiUrl}/${path}/device-pairings/approve`,
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
    const agentId = input?.agentId || 'openclaw';
    const path = this.agentApiPath({ id: agentId });
    return this.http
      .post<OpenClawSshAccess>(
        `${environment.apiUrl}/${path}/ssh/generate`,
        {
          agentId,
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
    const path = this.agentApiPath({ id: agentId });
    const params = new HttpParams().set('agentId', agentId);
    return this.http
      .get<OpenClawSshAccess>(`${environment.apiUrl}/${path}/ssh/active`, {
        params,
        headers: this.authHeaders(),
      })
      .pipe(catchError(() => of({ success: false, active: false, session: null })));
  }

  revokeSsh(agentId = 'openclaw'): Observable<{ success: boolean }> {
    const path = this.agentApiPath({ id: agentId });
    return this.http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/${path}/ssh/revoke`,
        { agentId },
        { headers: this.authHeaders() },
      )
      .pipe(catchError(() => of({ success: false })));
  }

  private agentApiPath(agent?: { id?: string; slug?: string } | null): string {
    if (this.isHermesAgent(agent)) return 'hermes';
    if (this.isNanoclawAgent(agent)) return 'nanoclaw';
    if (this.isSpacebotAgent(agent)) return 'spacebot';
    return 'openclaw';
  }

  private resolveLaunchUrl(
    userId?: string,
    agent?: MarketplaceAgent | null,
  ): Observable<OpenClawLaunchResult> {
    const hermes = this.isHermesAgent(agent);
    const nanoclaw = this.isNanoclawAgent(agent);
    const spacebot = this.isSpacebotAgent(agent);
    const path = this.agentApiPath(agent);
    return this.http
      .post<OpenClawLaunchResult>(
        `${environment.apiUrl}/${path}/launch`,
        { userId: userId || null },
        { headers: this.authHeaders() },
      )
      .pipe(
        catchError(() => {
          if (hermes) return of(this.fallbackHermesUrl(userId));
          if (nanoclaw) return of(this.fallbackNanoclawUrl(userId));
          if (spacebot) return of(this.fallbackSpacebotUrl(userId));
          return this.fetchDirectUrl(userId);
        }),
        map((res) => {
          if (res?.success && res.url) return res;
          if (hermes) return this.fallbackHermesUrl(userId);
          if (nanoclaw) return this.fallbackNanoclawUrl(userId);
          if (spacebot) return this.fallbackSpacebotUrl(userId);
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
    if (!id) {
      return { success: false, message: 'Sign in to launch OpenClaw.' };
    }
    const ui = String(oc.publicUrlTemplate || 'https://{userId}.openclaw.aimarkets.vn')
      .replace(/\{userId\}/g, id)
      .replace(/\{tenant\}/g, id)
      .replace(/\/$/, '');
    const gatewayUrl = oc.gatewayUrl || ui.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    const token = oc.gatewayToken || '';
    if (!token) {
      return {
        success: false,
        message: 'OpenClaw gateway token missing. Launch via API after signing in.',
      };
    }
    return {
      success: true,
      url: this.buildManualConnectUrl(gatewayUrl, token, token, id),
      gatewayUrl,
      token,
      autoLogin: true,
    };
  }

  private fallbackHermesUrl(userId?: string): OpenClawLaunchResult {
    const id = userId || this.auth.user()?.id || '';
    if (!id) {
      return { success: false, message: 'Sign in to launch Hermes.' };
    }
    // Per-buyer credentials are created by POST /hermes/launch — do not fall
    // back to shared admin Basic Auth (that would leak cross-tenant access).
    return {
      success: false,
      message: 'Hermes Launch requires the marketplace API (per-buyer account).',
    };
  }

  private fallbackNanoclawUrl(userId?: string): OpenClawLaunchResult {
    const id = userId || this.auth.user()?.id || '';
    if (!id) {
      return { success: false, message: 'Sign in to launch NanoClaw.' };
    }
    return {
      success: false,
      message:
        'NanoClaw Launch requires the marketplace API (NANOCLAW_DASHBOARD_SECRET + public URL template).',
    };
  }

  private fallbackSpacebotUrl(userId?: string): OpenClawLaunchResult {
    const id = userId || this.auth.user()?.id || '';
    if (!id) {
      return { success: false, message: 'Sign in to launch SpaceBot.' };
    }
    return {
      success: false,
      message:
        'SpaceBot Launch requires the marketplace API (SPACEBOT_DASHBOARD_SECRET + public URL template).',
    };
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.token() || environment.openclaw?.bearerToken || '';
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  /** Same as hotelapp ai-chatbox: tick immediately, then poll. */
  private triggerAutoApprove(maxAttempts: number, intervalMs: number): void {
    let attempts = 0;
    this.clearApproveTimers();
    const tick = () => {
      attempts += 1;
      this.approvePairing().subscribe((res) => {
        if (res.success || attempts >= maxAttempts) {
          this.clearApproveTimers();
        }
      });
    };
    tick();
    this.approveInterval = setInterval(() => {
      if (attempts >= maxAttempts) {
        this.clearApproveTimers();
        return;
      }
      tick();
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
