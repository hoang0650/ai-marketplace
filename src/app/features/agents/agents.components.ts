import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import {
  AgentPricing,
  AgentSubscriptionStatus,
  HiredAgent,
  MarketplaceAgent,
  OpenClawSshAccess,
} from './agents.models';
import { OpenClawGatewayService } from './openclaw-gateway.service';
import { NanoclawProviderComponent } from './nanoclaw-provider.component';

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
                @if (planFor(a); as p) {
                  @if (p.exempt) {
                    <span class="badge badge--ghost">Plan included</span>
                  } @else if (p.active) {
                    <span class="badge badge--ok">Paid until {{ p.paidUntil | date: 'MMM d, y' }}</span>
                  } @else if (p.paidUntil) {
                    <span class="badge badge--muted">Plan expired {{ p.paidUntil | date: 'MMM d, y' }}</span>
                  } @else {
                    <span class="badge badge--muted">No monthly plan</span>
                  }
                }
              </div>
            </div>
            <div class="agent-row__actions">
              @if (isOpenClawHired(a)) {
                <a class="agents-btn agents-btn--ghost" [routerLink]="['/hire-agent', a.agentId, 'setup']">Setup</a>
                <button type="button" class="agents-btn agents-btn--ghost" (click)="launch(a)">Launch</button>
              }
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
  readonly plans = signal<AgentSubscriptionStatus[]>([]);
  readonly status = signal('');

  ngOnInit(): void {
    this.seo.set({ title: 'My Agents' });
    this.reload();
  }

  reload(): void {
    this.hired.set(this.gateway.listHired());
    this.gateway.loadHired().subscribe((rows) => this.hired.set(rows));
    this.gateway.loadSubscriptions().subscribe((rows) => this.plans.set(rows));
  }

  planFor(row: HiredAgent): AgentSubscriptionStatus | undefined {
    const kind = this.gateway.runtimeKind(this.gateway.getAgent(row.agentId) || { id: row.agentId, slug: row.slug });
    return this.plans().find((p) => p.agentId === kind);
  }

  isOpenClawHired(row: HiredAgent): boolean {
    return this.gateway.isLaunchableAgent(this.gateway.getAgent(row.agentId) || { id: row.agentId, slug: row.slug });
  }

  launch(row: HiredAgent): void {
    const agent = this.gateway.getAgent(row.agentId);
    if (!agent) {
      this.status.set('Agent definition not found.');
      return;
    }
    if (!this.gateway.isLaunchableAgent(agent)) {
      this.status.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.status.set(`Opening ${agent.name} at ${this.gateway.aimarketsHost(undefined, agent)}…`);
    this.gateway.launchWithPlan(agent).subscribe((res) => {
      this.status.set(res.success ? 'Opened — check the new tab.' : res.message || 'Launch failed');
      if (!res.success && typeof window !== 'undefined' && res.message) {
        window.alert(res.message);
      }
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
            @if (priceFor(agent); as p) {
              <p class="agent-card__hint">
                <strong>{{ gateway.formatVnd(p.fee.vnd) }}</strong> / {{ p.fee.periodDays }} days ·
                {{ p.byokOnly ? 'your own API keys (BYOK), no token fee' : 'tokens at provider price +' + markupPct(p) + '% or BYOK free' }}
              </p>
            }
            <div class="agent-card__actions">
              <button
                type="button"
                class="agents-btn agents-btn--launch"
                (click)="launch(agent)"
                [disabled]="busyId() === agent.id || !canLaunch(agent)"
                [attr.title]="canLaunch(agent) ? 'Open Control UI / Dashboard' : gateway.comingSoonMessage(agent)"
              >
                {{ canLaunch(agent) ? '🚀 Launch' : 'Soon' }}
              </button>
              <a class="agents-btn agents-btn--ghost" [routerLink]="['/hire-agent', agent.id]">Details</a>
            </div>
            @if (canLaunch(agent)) {
              <p class="agent-card__hint">Opens {{ hostFor(agent) }}</p>
            } @else {
              <p class="agent-card__hint">Setup later — other agents are live now</p>
            }
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
  readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);
  readonly tab = signal<'public' | 'internal'>('public');
  readonly agents = signal<MarketplaceAgent[]>([]);
  readonly busyId = signal('');
  readonly status = signal('');
  readonly hostExample = '{userId}.openclaw.aimarkets.vn';
  readonly pricing = signal<AgentPricing[]>([]);
  publicCount = 0;
  internalCount = 0;

  canLaunch(agent: MarketplaceAgent): boolean {
    return this.gateway.isLaunchableAgent(agent);
  }

  priceFor(agent: MarketplaceAgent): AgentPricing | undefined {
    const kind = this.gateway.runtimeKind(agent);
    return this.pricing().find((p) => p.agentId === kind);
  }

  markupPct(p: AgentPricing): number {
    return Math.round((p.tokenMarkup || 0) * 100);
  }

  hostFor(agent: MarketplaceAgent): string {
    return this.gateway.aimarketsHost(undefined, agent) || this.hostExample;
  }

  ngOnInit(): void {
    this.seo.set({ title: 'Agent Marketplace' });
    this.publicCount = this.gateway.listMarketplaceAgents('public').length;
    this.internalCount = this.gateway.listMarketplaceAgents('internal').length;
    this.refresh();
    this.gateway.loadPricing().subscribe((rows) => this.pricing.set(rows));
  }

  setTab(tab: 'public' | 'internal'): void {
    this.tab.set(tab);
    this.refresh();
  }

  refresh(): void {
    this.agents.set(this.gateway.listMarketplaceAgents(this.tab()));
  }

  launch(agent: MarketplaceAgent): void {
    if (!this.gateway.isLaunchableAgent(agent)) {
      this.status.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.busyId.set(agent.id);
    this.status.set(`Opening ${agent.name} at ${this.gateway.aimarketsHost(undefined, agent)}…`);
    this.gateway.launchWithPlan(agent).subscribe((res) => {
      this.busyId.set('');
      this.status.set(res.success ? 'Opened — check the new tab.' : res.message || 'Launch failed');
      if (!res.success && typeof window !== 'undefined' && res.message) {
        window.alert(res.message);
      }
    });
  }
}

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, NanoclawProviderComponent],
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
            @if (isLaunchable()) {
              <button type="button" class="agents-btn agents-btn--primary" (click)="launch()" [disabled]="busy()">
                {{ busy() ? 'Opening…' : 'Launch ' + brandName() }}
              </button>
            }
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

            @if (isLaunchable()) {
              <div class="panel agents-panel mt-4">
                <h2 class="font-display text-xl">Monthly plan</h2>
                @if (pricing(); as pr) {
                  <p class="mt-2 text-sm">
                    <strong>{{ gateway.formatVnd(pr.fee.vnd) }}</strong> / {{ pr.fee.periodDays }} days per agent,
                    prepaid from your wallet.
                  </p>
                }
                @if (plan(); as p) {
                  <p class="mt-1 text-sm text-muted">
                    @if (p.exempt) {
                      Included for your account.
                    } @else if (p.active) {
                      Active until {{ p.paidUntil | date: 'MMM d, y' }} ({{ p.daysLeft }} days left). Renewing adds
                      {{ p.fee.periodDays }} days on top.
                    } @else if (p.purgedAt) {
                      Expired — the workspace data was deleted on {{ p.purgedAt | date: 'MMM d, y' }}. Renting
                      again starts a fresh workspace.
                    } @else if (p.paidUntil) {
                      Expired on {{ p.paidUntil | date: 'MMM d, y' }} — renew to launch this agent again.
                      @if (p.purgeDueAt) {
                        Your data is kept until {{ p.purgeDueAt | date: 'MMM d, y' }}, then deleted.
                      }
                    } @else {
                      Not rented yet — rent the agent to launch it.
                    }
                  </p>
                  @if (!p.exempt) {
                    <button
                      type="button"
                      class="agents-btn agents-btn--primary mt-3"
                      (click)="subscribe()"
                      [disabled]="planBusy()"
                    >
                      {{ planBusy() ? 'Processing…' : p.active ? 'Renew 1 month' : 'Rent 1 month' }}
                    </button>
                    @if (p.paidUntil) {
                      <label class="mt-3 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          [checked]="p.autoRenew"
                          [disabled]="planBusy()"
                          (change)="toggleAutoRenew($any($event.target).checked)"
                        />
                        Auto-renew from wallet (charged 1 day before expiry; reminder 3 days before)
                      </label>
                    }
                  }
                } @else {
                  <p class="mt-1 text-sm text-muted">Sign in to rent this agent.</p>
                }
                <p class="mt-3 text-sm text-muted">
                  @if (pricing()?.byokOnly) {
                    Runs on your own API keys (BYOK) — no token fee is charged by AI Markets.
                  } @else {
                    Token usage: AI Markets-provided models are billed per call at the provider price +{{
                      markupPct()
                    }}%. Use your own API key (BYOK) and no token fee is charged.
                  }
                </p>
              </div>
            }

            @if (isNanoclaw() && isLaunchable()) {
              <app-nanoclaw-provider />
            }

            <div class="panel agents-panel mt-4">
              <h2 class="font-display text-xl">Web Endpoints</h2>
              <p class="text-sm text-muted">Access your agent's web interfaces.</p>
              <div class="mt-4 flex flex-wrap gap-2">
                @if (isLaunchable()) {
                  <a class="agents-btn agents-btn--outline" [routerLink]="['/hire-agent', a.id, 'setup']">Setup Wizard</a>
                  <button type="button" class="agents-btn agents-btn--outline" (click)="launch()">
                    {{ uiName() }}
                  </button>
                } @else {
                  <p class="text-sm text-muted">{{ gateway.comingSoonMessage(a) }}</p>
                }
              </div>
            </div>

            @if (supportsSsh()) {
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
                  [placeholder]="sshPlaceholder"
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
                  }
                </div>
              </div>
              @if (ssh(); as s) {
                <div class="ssh-box mt-4">
                  <p class="text-xs uppercase tracking-wider text-muted">Username</p>
                  <div class="ssh-copy-row">
                    <pre class="ssh-cmd">{{ s.username }}</pre>
                    <button type="button" class="agents-btn agents-btn--ghost" (click)="copyValue(s.username, 'user')">
                      {{ copied() === 'user' ? 'Copied' : 'Copy' }}
                    </button>
                  </div>

                  @if (s.authMethod === 'key' || s.privateKey) {
                    <p class="mt-3 text-xs uppercase tracking-wider text-muted">
                      Private key{{ s.keyName ? ' (' + s.keyName + ')' : '' }}
                    </p>
                    <div class="ssh-copy-row">
                      <pre class="ssh-cmd ssh-cmd--select">{{ s.privateKey }}</pre>
                      <button
                        type="button"
                        class="agents-btn agents-btn--ghost"
                        (click)="copyValue(s.privateKey, 'key', 'Private key copied — save it to a file before using.')"
                      >
                        {{ copied() === 'key' ? 'Copied' : 'Copy key' }}
                      </button>
                    </div>
                    @if (s.fingerprint) {
                      <p class="mt-2 text-sm text-muted">
                        Fingerprint: <code class="font-mono">{{ s.fingerprint }}</code>
                      </p>
                    }
                  } @else {
                    <p class="mt-3 text-xs uppercase tracking-wider text-muted">Password</p>
                    <div class="ssh-copy-row">
                      <pre class="ssh-cmd ssh-cmd--select">{{ s.password }}</pre>
                      <button
                        type="button"
                        class="agents-btn agents-btn--ghost"
                        (click)="copyValue(s.password, 'pass', 'Password copied.')"
                      >
                        {{ copied() === 'pass' ? 'Copied' : 'Copy password' }}
                      </button>
                    </div>
                  }

                  <p class="mt-3 text-xs uppercase tracking-wider text-muted">Command</p>
                  <div class="ssh-copy-row">
                    <pre class="ssh-cmd">{{ s.command }}</pre>
                    <button type="button" class="agents-btn agents-btn--ghost" (click)="copyValue(s.command, 'cmd')">
                      {{ copied() === 'cmd' ? 'Copied' : 'Copy' }}
                    </button>
                  </div>

                  <p class="mt-3 text-sm text-muted">
                    Expires in {{ s.expiresInMinutes }} min
                    @if (s.expiresAt) {
                      ({{ s.expiresAt | date: 'short' }})
                    }
                    . {{ s.note }}
                  </p>
                  @if (s.authMethod === 'key' || s.privateKey) {
                    <p class="mt-3 text-sm text-muted">
                      <strong>Key tip:</strong> save the key as
                      <code class="font-mono">{{ s.keyName || 'spacebot_key' }}</code>, then restrict it — on Windows run
                      <code class="font-mono"
                        >icacls {{ s.keyName || 'spacebot_key' }} /inheritance:r /grant:r "%USERNAME%:R"</code
                      >; on macOS/Linux run <code class="font-mono">chmod 600 {{ s.keyName || 'spacebot_key' }}</code>.
                    </p>
                  } @else {
                    <p class="mt-3 text-sm text-muted">
                      <strong>Windows tip:</strong> paste the command into Command Prompt, then paste the password when it
                      asks <em>“…password:”</em> (login is <code class="font-mono">ssh</code>, not
                      <code class="font-mono">sshpass</code>). Right-click the terminal window to paste.
                    </p>
                  }
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
                <input class="input" [(ngModel)]="wsUrl" name="wsUrl" [placeholder]="'wss://' + sshPlaceholder" />
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
            }

          </div>

          <aside class="panel agents-panel detail-guide">
            <p class="text-xs uppercase tracking-wider text-muted">Contextual Guide</p>
            <p class="mt-1 text-sm text-muted">Viewing: Marketplace Item</p>
            <div class="guide-video mt-4">Getting Started with {{ brandName() }}</div>
            <div class="mt-4 space-y-4 text-sm text-muted">
              <div>
                <p class="font-semibold text-ink">What is {{ brandName() }}?</p>
                <p>{{ brandSummary() }}</p>
              </div>
              <div>
                <p class="font-semibold text-ink">Host</p>
                <p>
                  {{ surfaceName() }}:
                  {{ '{' }}userId{{ '}' }}.{{ subdomain() }}.aimarkets.vn
                  (session market-{{ '{' }}userId{{ '}' }}).
                </p>
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
  readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);

  readonly agent = signal<MarketplaceAgent | null>(null);
  readonly hired = signal<HiredAgent | null>(null);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly now = new Date().toISOString();
  readonly ssh = signal<OpenClawSshAccess | null>(null);
  readonly sshBusy = signal(false);
  readonly plan = signal<AgentSubscriptionStatus | null>(null);
  readonly pricing = signal<AgentPricing | null>(null);
  readonly planBusy = signal(false);
  sshHost = '';
  sshPlaceholder = '{userId}.openclaw.aimarkets.vn';

  wsUrl = '';
  token = '';
  password = '';

  /** Key of the field most recently copied to the clipboard. */
  copied = signal('');
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  isOpenClaw(): boolean {
    return this.gateway.isOpenClawAgent(this.agent());
  }

  isHermes(): boolean {
    return this.gateway.isHermesAgent(this.agent());
  }

  isNanoclaw(): boolean {
    return this.gateway.isNanoclawAgent(this.agent());
  }

  isSpacebot(): boolean {
    return this.gateway.isSpacebotAgent(this.agent());
  }

  isLaunchable(): boolean {
    return this.gateway.isLaunchableAgent(this.agent());
  }

  supportsSsh(): boolean {
    return this.gateway.supportsSsh(this.agent());
  }

  /** Product name for the current agent — OpenClaw, Hermes, NanoClaw, SpaceBot, Open WebUI, or Paperclip. */
  brandName(): string {
    return this.gateway.runtimeInfo(this.agent()).label;
  }

  /** Label of the launch button / web endpoint. */
  uiName(): string {
    if (this.isOpenClaw()) return 'OpenClaw UI';
    const kind = this.gateway.runtimeKind(this.agent());
    if (kind === 'openwebui') return 'Open WebUI';
    return `${this.brandName()} Dashboard`;
  }

  /** Control UI (OpenClaw) vs Dashboard (the other runtimes). */
  surfaceName(): string {
    return this.isOpenClaw() ? 'Control UI' : 'Dashboard';
  }

  /** {userId}.<subdomain>.aimarkets.vn */
  subdomain(): string {
    return this.gateway.runtimeInfo(this.agent()).subdomain;
  }

  brandSummary(): string {
    const kind = this.gateway.runtimeKind(this.agent());
    if (kind === 'openwebui') {
      return 'Private ChatGPT-style workspace — your own account, chats, knowledge and model keys (BYOK).';
    }
    if (kind === 'paperclip') {
      return 'Control plane for a company of AI agents — goals, org chart, tickets, budgets and heartbeats.';
    }
    if (this.isHermes()) {
      return 'Self-improving agent with a web dashboard, messaging gateway, and skills.';
    }
    if (this.isNanoclaw()) {
      return 'Isolated container agents with a dashboard — channels installed per agent via skills.';
    }
    if (this.isSpacebot()) {
      return 'Always-on community agent with a dashboard, memory graph, and Discord/Slack/Telegram/Twitch channels.';
    }
    return 'Operator agent with Control UI, skills, and multi-channel tools.';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('agentId') || '';
      const agent = this.gateway.getAgent(id) || null;
      this.agent.set(agent);
      this.hired.set(this.gateway.getHired(id) || null);
      this.ssh.set(null);
      this.sshPlaceholder = this.gateway.sshHostHint(undefined, agent);
      this.sshHost = this.sshPlaceholder.includes('{userId}') ? '' : this.sshPlaceholder;
      const host = this.gateway.aimarketsHost(undefined, agent);
      this.wsUrl = host.includes('{userId}') ? '' : `wss://${host}`;
      if (agent) {
        this.seo.set({ title: agent.name, description: agent.description });
        if (this.gateway.isLaunchableAgent(agent) && !this.hired()) {
          this.gateway.upsertHired(agent, 'running');
        }
        this.hired.set(this.gateway.getHired(agent.id) || null);
        this.loadPlan(agent);
        if (this.gateway.supportsSsh(agent)) {
          this.gateway.getActiveSsh(agent.id).subscribe((res) => {
            if (res.active && res.session) {
              this.ssh.set({ ...res.session, success: true });
            }
          });
        }
      }
    });
  }

  launch(): void {
    const agent = this.agent();
    if (!agent || !this.gateway.isLaunchableAgent(agent)) {
      this.status.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.busy.set(true);
    this.status.set(`Opening ${agent.name} at ${this.gateway.aimarketsHost(undefined, agent)}…`);
    this.gateway.launchWithPlan(agent).subscribe((res) => {
      this.busy.set(false);
      this.hired.set(this.gateway.getHired(agent.id) || null);
      this.loadPlan(agent);
      this.status.set(res.success ? 'Opened — check the new tab.' : res.message || 'Launch failed');
      if (!res.success && typeof window !== 'undefined' && res.message) {
        window.alert(res.message);
      }
    });
  }

  markupPct(): number {
    return Math.round((this.pricing()?.tokenMarkup || 0) * 100);
  }

  private loadPlan(agent: MarketplaceAgent): void {
    this.plan.set(null);
    this.pricing.set(null);
    if (!this.gateway.isLaunchableAgent(agent)) return;
    const kind = this.gateway.runtimeKind(agent);
    this.gateway.loadPricing().subscribe((rows) => this.pricing.set(rows.find((r) => r.agentId === kind) || null));
    this.gateway.getSubscription(agent).subscribe((p) => this.plan.set(p));
  }

  subscribe(): void {
    const agent = this.agent();
    const p = this.plan();
    if (!agent || !p) return;
    const label = this.brandName();
    const ok =
      typeof window === 'undefined' ||
      window.confirm(
        `${p.active ? 'Renew' : 'Rent'} ${label} for ${this.gateway.formatVnd(p.fee.vnd)} / ${p.fee.periodDays} days, paid from your wallet?` +
          (p.paidUntil ? '' : '\nAuto-renew from the wallet is on by default — you can turn it off anytime.'),
      );
    if (!ok) return;
    this.planBusy.set(true);
    this.gateway.subscribe(agent).subscribe((res) => {
      this.planBusy.set(false);
      if (res.ok && res.status) {
        this.plan.set(res.status);
        this.status.set(`${label} plan active until ${String(res.status.paidUntil || '').slice(0, 10)}.`);
      } else {
        this.status.set(res.message || 'Payment failed');
        if (typeof window !== 'undefined' && res.message) window.alert(res.message);
      }
    });
  }

  toggleAutoRenew(on: boolean): void {
    const agent = this.agent();
    if (!agent) return;
    this.planBusy.set(true);
    this.gateway.setAutoRenew(agent, on).subscribe((next) => {
      this.planBusy.set(false);
      if (next) {
        this.plan.set(next);
        this.status.set(on ? 'Auto-renew is on.' : 'Auto-renew is off — the plan ends on its expiry date.');
      } else {
        this.status.set('Could not update auto-renew.');
      }
    });
  }

  generateSsh(): void {
    const agent = this.agent();
    if (!agent || !this.gateway.supportsSsh(agent)) {
      this.status.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.sshBusy.set(true);
    this.status.set('Generating temporary SSH access…');
    this.gateway
      .generateSsh({
        agentId: agent.id,
      })
      .subscribe((res) => {
        this.sshBusy.set(false);
        if (res.success && res.command) {
          this.ssh.set(res);
          this.status.set('SSH command ready — valid 60 minutes.');
        } else {
          const prefix = this.subdomain().toUpperCase();
          const hint = `${prefix}_SSH_HOST_TEMPLATE={userId}.${this.subdomain()}.aimarkets.vn`;
          this.status.set(res.message || `SSH generate failed. Login and set ${hint}.`);
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
    this.copyValue(cmd, 'cmd', 'SSH command copied.');
  }

  /** Copy a single SSH field (username / password / command) with reliable fallback. */
  copyValue(text: string | undefined, key: string, message?: string): void {
    const value = String(text ?? '');
    if (!value) return;
    void this.writeClipboard(value).then((ok) => {
      if (!ok) {
        this.status.set('Copy failed — select the text and press Ctrl+C.');
        return;
      }
      this.copied.set(key);
      this.status.set(message || `${key} copied.`);
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(''), 2000);
    });
  }

  /**
   * navigator.clipboard needs a secure context; fall back to a hidden textarea so
   * copy still works over plain HTTP (e.g. a LAN dev host).
   */
  private async writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the legacy path
    }
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
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
