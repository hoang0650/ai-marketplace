import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import { HiredAgent, MarketplaceAgent, OpenClawSshAccess } from './agents.models';
import { OpenClawGatewayService } from './openclaw-gateway.service';

@Component({
  selector: 'app-my-agents',
  standalone: true,
  imports: [RouterLink, DatePipe],
  styleUrl: './agents.styles.scss',
  template: `
    <section class="agents-page route-enter">
      <p class="agents-crumb">Agents</p>
      <div class="agents-header">
        <h1 class="agents-title">My Agents</h1>
        <a routerLink="/hire-agent/marketplace" class="agents-btn agents-btn--primary">Browse Marketplace</a>
      </div>

      <div class="agents-banner">
        <strong>Agents is in Beta</strong>
        <p>
          Hire and launch OpenClaw agents from the marketplace. Launch opens the gateway Control UI
          with auto-connect — same flow as PHHotel AI chatbox.
        </p>
      </div>

      <div class="agents-list">
        @for (a of hired(); track a.id) {
          <article class="agent-row">
            <div>
              <h2 class="agent-row__name">{{ a.name }}</h2>
              <div class="agent-row__meta">
                <span class="badge" [class.badge--muted]="a.status === 'archived'" [class.badge--ok]="a.status === 'running'">
                  {{ a.status === 'running' ? 'Running' : a.status === 'archived' ? 'Archived' : a.status }}
                </span>
                <span class="badge badge--ghost">
                  <span aria-hidden="true">📅</span>
                  {{ a.launchedAt | date: 'MMM d, y' }}
                </span>
              </div>
            </div>
            <div class="agent-row__actions">
              <a class="agents-btn agents-btn--ghost" [routerLink]="['/hire-agent', a.agentId, 'setup']">Setup</a>
              <button type="button" class="agents-btn agents-btn--ghost" (click)="launch(a)">Launch</button>
              <a class="agents-btn" [routerLink]="['/hire-agent', a.agentId]">Manage</a>
            </div>
          </article>
        } @empty {
          <div class="agents-empty panel">
            <p>No agents yet. Browse the marketplace and launch OpenClaw.</p>
            <a routerLink="/hire-agent/marketplace" class="agents-btn agents-btn--primary mt-4 inline-flex">
              Browse Marketplace
            </a>
          </div>
        }
      </div>

      @if (status()) {
        <p class="agents-status">{{ status() }}</p>
      }
    </section>
  `,
})
export class MyAgentsComponent implements OnInit {
  private readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);
  readonly hired = signal<HiredAgent[]>([]);
  readonly status = signal('');

  ngOnInit(): void {
    this.seo.set({ title: 'My Agents' });
    this.reload();
  }

  reload(): void {
    this.hired.set(this.gateway.listHired());
  }

  launch(row: HiredAgent): void {
    const agent = this.gateway.getAgent(row.agentId);
    if (!agent) {
      this.status.set('Agent definition not found.');
      return;
    }
    this.status.set('Opening OpenClaw gateway…');
    this.gateway.launchGateway({ agent }).subscribe((res) => {
      this.status.set(res.success ? 'Gateway opened — auto-approving device pairing…' : res.message || 'Launch failed');
      this.reload();
    });
  }
}

@Component({
  selector: 'app-agent-marketplace',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './agents.styles.scss',
  template: `
    <section class="agents-page route-enter">
      <p class="agents-crumb"><a routerLink="/hire-agent">Agents</a> / Marketplace</p>
      <div class="agents-header">
        <h1 class="agents-title">Agent Marketplace</h1>
        <div class="agents-header__actions">
          <a routerLink="/hire-agent" class="agents-btn agents-btn--ghost">Manage agents</a>
          <a routerLink="/product/openclaw-ops-agent" class="agents-btn agents-btn--primary">+ Hire OpenClaw</a>
        </div>
      </div>

      <div class="agents-tabs">
        <button type="button" class="agents-tab" [class.active]="tab() === 'public'" (click)="setTab('public')">
          Public ({{ publicCount }})
        </button>
        <button type="button" class="agents-tab" [class.active]="tab() === 'internal'" (click)="setTab('internal')">
          Internal ({{ internalCount }})
        </button>
      </div>

      <div class="agents-grid">
        @for (agent of agents(); track agent.id) {
          <article class="agent-card">
            <div class="agent-card__head">
              <img class="agent-icon" [src]="agent.logoUrl" [alt]="agent.name" width="40" height="40" loading="lazy" />
              <h2>{{ agent.name }}</h2>
            </div>
            <p class="agent-card__desc">{{ agent.description }}</p>
            <div class="agent-card__actions">
              <button
                type="button"
                class="agents-btn agents-btn--launch"
                (click)="launch(agent)"
                [disabled]="busyId() === agent.id"
              >
                🚀 Launch
              </button>
              <a class="agents-btn agents-btn--ghost" [routerLink]="['/hire-agent', agent.id]">Details</a>
            </div>
          </article>
        } @empty {
          <p class="text-muted">No agents in this tab.</p>
        }
      </div>

      @if (status()) {
        <p class="agents-status">{{ status() }}</p>
      }
    </section>
  `,
})
export class AgentMarketplaceComponent implements OnInit {
  private readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);
  readonly tab = signal<'public' | 'internal'>('public');
  readonly agents = signal<MarketplaceAgent[]>([]);
  readonly busyId = signal('');
  readonly status = signal('');
  publicCount = 0;
  internalCount = 0;

  ngOnInit(): void {
    this.seo.set({ title: 'Agent Marketplace' });
    this.publicCount = this.gateway.listMarketplaceAgents('public').length;
    this.internalCount = this.gateway.listMarketplaceAgents('internal').length;
    this.refresh();
  }

  setTab(tab: 'public' | 'internal'): void {
    this.tab.set(tab);
    this.refresh();
  }

  refresh(): void {
    this.agents.set(this.gateway.listMarketplaceAgents(this.tab()));
  }

  launch(agent: MarketplaceAgent): void {
    this.busyId.set(agent.id);
    this.status.set(`Launching ${agent.name} gateway…`);
    this.gateway.launchGateway({ agent }).subscribe((res) => {
      this.busyId.set('');
      this.status.set(
        res.success
          ? `${agent.name} Control UI opened — auto-approving pairing…`
          : res.message || 'Launch failed',
      );
    });
  }
}

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  styleUrl: './agents.styles.scss',
  template: `
    <section class="agents-page agents-detail route-enter">
      @if (agent(); as a) {
        <p class="agents-crumb"><a routerLink="/hire-agent">Agents</a> / Detail</p>
        <div class="agents-header">
          <div class="agents-header__title">
            <img class="agent-icon agent-icon--lg" [src]="a.logoUrl" [alt]="a.name" width="48" height="48" />
            <h1 class="agents-title">{{ hired()?.name || a.name }}</h1>
          </div>
          <div class="agents-header__actions">
            <button type="button" class="agents-btn agents-btn--primary" (click)="launch()" [disabled]="busy()">
              {{ busy() ? 'Opening…' : 'Launch OpenClaw' }}
            </button>
          </div>
        </div>

        <div class="detail-layout">
          <div class="detail-main">
            <div class="panel agents-panel">
              <div class="badge-row">
                <span class="badge badge--ok">● {{ hired()?.status === 'archived' ? 'Archived' : 'Running' }}</span>
                <span class="badge badge--ghost">{{ a.version }}</span>
                <span class="badge badge--ghost">
                  Launched {{ (hired()?.launchedAt || now) | date: 'MMM d, y' }}
                </span>
                <span class="badge badge--ghost">{{ a.model }}</span>
              </div>
              <p class="mt-4 text-muted">{{ a.description }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <a class="agents-btn agents-btn--ghost" [href]="a.docsUrl" target="_blank" rel="noopener">View Docs</a>
                @if (a.hireProductSlug) {
                  <a class="agents-btn agents-btn--ghost" [routerLink]="['/product', a.hireProductSlug]">Hire seat</a>
                }
              </div>
            </div>

            <div class="panel agents-panel mt-4">
              <h2 class="font-display text-xl">Web Endpoints</h2>
              <p class="text-sm text-muted">Access your agent's web interfaces.</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <a class="agents-btn agents-btn--outline" [routerLink]="['/hire-agent', a.id, 'setup']">Setup Wizard</a>
                <button type="button" class="agents-btn agents-btn--outline" (click)="launch()">OpenClaw UI</button>
              </div>
            </div>

            <div class="panel agents-panel mt-4">
              <h2 class="font-display text-xl">SSH Access</h2>
              <p class="text-sm text-muted">
                Generate a temporary SSH command to connect from your desktop to this agent’s server/sandbox.
              </p>
              <div class="mt-4 grid gap-3">
                <label class="text-xs uppercase tracking-wider text-muted">Server host (optional override)</label>
                <input
                  class="input"
                  [(ngModel)]="sshHost"
                  name="sshHost"
                  placeholder="e.g. sandbox.phhotel.vn or your-vps.example.com"
                />
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="agents-btn agents-btn--primary"
                    (click)="generateSsh()"
                    [disabled]="sshBusy()"
                  >
                    {{ sshBusy() ? 'Generating…' : 'Generate SSH command' }}
                  </button>
                  @if (ssh(); as s) {
                    <button type="button" class="agents-btn agents-btn--ghost" (click)="revokeSsh()">Revoke</button>
                    <button type="button" class="agents-btn agents-btn--ghost" (click)="copySsh()">Copy command</button>
                  }
                </div>
              </div>
              @if (ssh(); as s) {
                <div class="ssh-box mt-4">
                  <p class="text-xs uppercase tracking-wider text-muted">Command</p>
                  <pre class="ssh-cmd">{{ s.command }}</pre>
                  <p class="mt-3 text-xs uppercase tracking-wider text-muted">Password</p>
                  <pre class="ssh-cmd">{{ s.password }}</pre>
                  <p class="mt-3 text-sm text-muted">
                    Expires in {{ s.expiresInMinutes }} min
                    @if (s.expiresAt) {
                      ({{ s.expiresAt | date: 'short' }})
                    }
                    . {{ s.note }}
                  </p>
                  @if (s.howTo?.length) {
                    <ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
                      @for (line of s.howTo; track line) {
                        <li>{{ line }}</li>
                      }
                    </ol>
                  }
                </div>
              }
            </div>

            <div class="panel agents-panel mt-4">
              <h2 class="font-display text-xl">Gateway connect</h2>
              <p class="text-sm text-muted">
                Same as OpenClaw Control: paste WebSocket URL + gateway token, or use Launch for auto-login.
              </p>
              <form class="mt-4 grid gap-3" (ngSubmit)="manualConnect()">
                <label class="text-xs uppercase tracking-wider text-muted">WebSocket URL</label>
                <input class="input" [(ngModel)]="wsUrl" name="wsUrl" placeholder="wss://…" />
                <label class="text-xs uppercase tracking-wider text-muted">Gateway Token</label>
                <input class="input" [(ngModel)]="token" name="token" type="password" />
                <label class="text-xs uppercase tracking-wider text-muted">Password (optional)</label>
                <input class="input" [(ngModel)]="password" name="password" type="password" placeholder="optional" />
                <button type="submit" class="agents-btn agents-btn--connect">Connect</button>
              </form>
              <div class="howto mt-6 text-sm text-muted">
                <p class="font-semibold text-ink">How to connect</p>
                <ol class="mt-2 list-decimal space-y-2 pl-5">
                  <li>Start the gateway: <code class="font-mono">openclaw gateway run</code></li>
                  <li>Get a tokenized URL: <code class="font-mono">openclaw dashboard --no-open</code></li>
                  <li>Paste WebSocket URL + token above, or click Launch OpenClaw.</li>
                </ol>
              </div>
            </div>
          </div>

          <aside class="panel agents-panel detail-guide">
            <p class="text-xs uppercase tracking-wider text-muted">Contextual Guide</p>
            <p class="mt-1 text-sm text-muted">Viewing: Marketplace Item</p>
            <div class="guide-video mt-4">Getting Started with OpenClaw</div>
            <div class="mt-4 space-y-4 text-sm text-muted">
              <div>
                <p class="font-semibold text-ink">What is OpenClaw?</p>
                <p>Operator agent with Control UI, skills, and multi-channel tools.</p>
              </div>
              <div>
                <p class="font-semibold text-ink">Managed OpenClaw</p>
                <p>Launch opens the gateway with token hash + auto device pairing.</p>
              </div>
              <div>
                <p class="font-semibold text-ink">Channels</p>
                <p>Slack, Discord, Telegram, WhatsApp, and hotel chatbox.</p>
              </div>
              <div>
                <p class="font-semibold text-ink">Pricing</p>
                <p>Hire via OpenClaw Ops Agent product or launch a sandbox seat.</p>
              </div>
            </div>
          </aside>
        </div>

        @if (status()) {
          <p class="agents-status">{{ status() }}</p>
        }
      } @else {
        <p class="text-muted">Agent not found. <a routerLink="/hire-agent/marketplace">Back to marketplace</a></p>
      }
    </section>
  `,
})
export class AgentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);

  readonly agent = signal<MarketplaceAgent | null>(null);
  readonly hired = signal<HiredAgent | null>(null);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly now = new Date().toISOString();
  readonly ssh = signal<OpenClawSshAccess | null>(null);
  readonly sshBusy = signal(false);
  sshHost = '';

  wsUrl = '';
  token = '';
  password = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('agentId') || '';
      const agent = this.gateway.getAgent(id) || null;
      this.agent.set(agent);
      this.hired.set(this.gateway.getHired(id) || null);
      this.ssh.set(null);
      if (agent) {
        this.seo.set({ title: agent.name, description: agent.description });
        if (!this.hired()) this.gateway.upsertHired(agent, 'running');
        this.hired.set(this.gateway.getHired(agent.id) || null);
        this.gateway.getActiveSsh(agent.id).subscribe((res) => {
          if (res.active && res.session) {
            this.ssh.set({ ...res.session, success: true });
          }
        });
      }
    });
  }

  launch(): void {
    const agent = this.agent();
    if (!agent) return;
    this.busy.set(true);
    this.status.set('Opening OpenClaw gateway…');
    this.gateway.launchGateway({ agent }).subscribe((res) => {
      this.busy.set(false);
      this.hired.set(this.gateway.getHired(agent.id) || null);
      this.status.set(
        res.success ? 'Gateway opened — auto-approving device pairing…' : res.message || 'Launch failed',
      );
    });
  }

  generateSsh(): void {
    const agent = this.agent();
    if (!agent) return;
    this.sshBusy.set(true);
    this.status.set('Generating temporary SSH access…');
    this.gateway
      .generateSsh({
        agentId: agent.id,
        host: this.sshHost.trim() || undefined,
      })
      .subscribe((res) => {
        this.sshBusy.set(false);
        if (res.success && res.command) {
          this.ssh.set(res);
          this.status.set('SSH command ready — valid 60 minutes.');
        } else {
          this.status.set(res.message || 'SSH generate failed. Login and configure OPENCLAW_SSH_HOST.');
        }
      });
  }

  revokeSsh(): void {
    const agent = this.agent();
    if (!agent) return;
    this.gateway.revokeSsh(agent.id).subscribe(() => {
      this.ssh.set(null);
      this.status.set('SSH access revoked.');
    });
  }

  copySsh(): void {
    const cmd = this.ssh()?.command;
    if (!cmd) return;
    void navigator.clipboard?.writeText(cmd);
    this.status.set('SSH command copied.');
  }

  manualConnect(): void {
    if (!this.wsUrl.trim() || !this.token.trim()) {
      this.status.set('WebSocket URL and gateway token are required.');
      return;
    }
    const url = this.gateway.buildManualConnectUrl(this.wsUrl.trim(), this.token.trim(), this.password);
    const agent = this.agent();
    if (agent) this.gateway.upsertHired(agent, 'running');
    window.open(url, '_blank');
    this.status.set('Opened Control UI with your gateway credentials.');
    void this.router;
  }
}
