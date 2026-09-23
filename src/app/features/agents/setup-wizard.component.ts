import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import { OpenClawGatewayService } from './openclaw-gateway.service';
import { MarketplaceAgent, OpenClawSshAccess } from './agents.models';

export type SetupChannelId = 'telegram' | 'whatsapp' | 'discord' | 'teams' | 'slack';

interface ChannelGuide {
  id: SetupChannelId;
  label: string;
  /** token = bot token / app credentials, qr = QR login (WhatsApp Web). */
  kind: 'token' | 'qr';
  envVars: string[];
  /** `openclaw channels …` command to run inside the user sandbox. */
  cli: string;
  steps: string[];
}

const OPENCLAW_CHANNELS: ChannelGuide[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
    cli: 'openclaw channels add --channel telegram --token <BOT_TOKEN>',
    steps: [
      'Open Telegram and message @BotFather → /newbot, then copy the bot token.',
      'Add the channel with the command below (or paste the token in Control UI → Settings → Channels).',
      'DM policy defaults to “pairing”: message your bot, then approve the pairing code in the Pairing card below.',
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'qr',
    envVars: [],
    cli: 'openclaw channels login --channel whatsapp',
    steps: [
      'OpenClaw links WhatsApp Web via QR — no token needed.',
      'Run the command below in the sandbox, or open Control UI → Settings → Channels → WhatsApp and scan the QR.',
      'Keep the QR on screen until the phone scans it (it expires quickly).',
      'Approve the first DM with the Pairing card below. A dedicated number is recommended.',
    ],
  },
  {
    id: 'discord',
    label: 'Discord',
    kind: 'token',
    envVars: ['DISCORD_BOT_TOKEN'],
    cli: 'openclaw channels add --channel discord --token <BOT_TOKEN>',
    steps: [
      'Create an app + bot in the Discord Developer Portal and enable the Message Content intent.',
      'Invite the bot to your server (OAuth2 URL Generator: bot + applications.commands).',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
  {
    id: 'teams',
    label: 'Teams',
    kind: 'token',
    envVars: ['MSTEAMS_APP_ID', 'MSTEAMS_APP_PASSWORD', 'MSTEAMS_TENANT_ID'],
    cli: 'openclaw channels add --channel msteams',
    steps: [
      'Create an Azure Bot resource and note the Microsoft App ID.',
      'Create a client secret under Manage Password and note your Tenant ID.',
      'Add the Microsoft Teams channel and point the messaging endpoint at your gateway.',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    kind: 'token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
    cli: 'openclaw channels add --channel slack --bot-token xoxb-… --app-token xapp-…',
    steps: [
      'Create an app at api.slack.com/apps (manifest or from scratch).',
      'Install to your workspace and copy the Bot User OAuth Token (xoxb-…).',
      'Create an App-Level Token with the connections:write scope (xapp-…).',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
];

interface AgentSetupProfile {
  id: 'openclaw' | 'hermes' | 'nanoclaw';
  brand: string;
  /** Label of the primary launch button, e.g. "OpenClaw UI". */
  uiName: string;
  docsUrl: string;
  hostTemplate: string;
  /** Whether this agent supports the OpenClaw channel grid. */
  channels: boolean;
  /** One-line summary of what this wizard does for the agent. */
  lead: string;
  launchBlurb: string;
  /** How channels/config are managed for this agent. */
  configNote: string;
}

const PROFILES: Record<AgentSetupProfile['id'], AgentSetupProfile> = {
  openclaw: {
    id: 'openclaw',
    brand: 'OpenClaw',
    uiName: 'OpenClaw UI',
    docsUrl: 'https://docs.openclaw.ai',
    hostTemplate: '{userId}.openclaw.aimarkets.vn',
    channels: true,
    lead: 'Launch your OpenClaw gateway, connect messaging channels, and open an SSH session to the sandbox.',
    launchBlurb:
      'Opens the OpenClaw Control UI with your marketplace token — the gateway auto-connects and pairs this browser.',
    configNote:
      'Channels live under channels.<id> in openclaw.json; DM policy defaults to “pairing”. Secrets can also come from env (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN/SLACK_APP_TOKEN, MSTEAMS_*).',
  },
  hermes: {
    id: 'hermes',
    brand: 'Hermes',
    uiName: 'Hermes Dashboard',
    docsUrl: 'https://hermes-agent.nousresearch.com/docs/',
    hostTemplate: '{userId}.hermes.aimarkets.vn',
    channels: false,
    lead: 'Launch your Hermes dashboard with a per-buyer account, then open an SSH session to the sandbox.',
    launchBlurb:
      'Creates (or reuses) your personal Hermes account and opens the dashboard already signed in. No shared operator password is ever used.',
    configNote:
      'Models and channels live in the Hermes home (~/.hermes/config.yaml + .env). Run `hermes gateway setup` or `hermes setup` in the sandbox to add a platform such as Telegram, Discord, Slack, WhatsApp or Teams.',
  },
  nanoclaw: {
    id: 'nanoclaw',
    brand: 'NanoClaw',
    uiName: 'NanoClaw Dashboard',
    docsUrl: 'https://github.com/qwibitai/nanoclaw',
    hostTemplate: '{userId}.nanoclaw.aimarkets.vn',
    channels: false,
    lead: 'Launch your NanoClaw dashboard and open an SSH session to the sandbox.',
    launchBlurb:
      'Opens the NanoClaw dashboard scoped to your session. Auth uses the dashboard bearer secret — no OpenClaw-style device pairing.',
    configNote:
      'NanoClaw has no config files and does not require device pairing. Channels are installed per agent with the `/add-<channel>` skill in Claude Code (e.g. /add-telegram, /add-slack).',
  },
};

@Component({
  selector: 'app-openclaw-setup-wizard',
  standalone: true,
  imports: [RouterLink, NgClass, FormsModule],
  styleUrl: './setup-wizard.styles.scss',
  template: `
    <div class="oc-setup">
      <header class="oc-setup__top">
        <h1 class="oc-setup__brand">
          <span class="oc-setup__brand-accent">{{ profile().brand }}</span> Setup
        </h1>
        <div class="oc-setup__top-actions">
          <span class="oc-setup__pill" [class.oc-setup__pill--ok]="launched()">
            <span class="oc-setup__dot" aria-hidden="true"></span>
            {{ busy() ? 'Launching…' : launched() ? 'Launched' : 'Ready' }}
          </span>
          <button
            type="button"
            class="oc-setup__pill oc-setup__pill--btn"
            (click)="openUi()"
            [disabled]="busy() || !isLaunchable()"
          >
            {{ busy() ? 'Opening…' : profile().uiName + ' →' }}
          </button>
        </div>
      </header>

      <main class="oc-setup__main">
        @if (!isLaunchable()) {
          <p class="oc-setup__lead">{{ gateway.comingSoonMessage(agent()) }}</p>
          <a routerLink="/hire-agent/openclaw/setup" class="oc-btn">Open OpenClaw setup</a>
          <a routerLink="/hire-agent/hermes/setup" class="oc-btn oc-btn--ghost">Open Hermes setup</a>
        } @else {
          <p class="oc-setup__lead">{{ profile().lead }}</p>

          <!-- ========== LAUNCH ========== -->
          <article class="oc-card">
            <h3><span>1</span> Launch {{ profile().brand }}</h3>
            <p class="oc-card__desc">{{ profile().launchBlurb }}</p>
            <p class="oc-card__desc">
              Host: <code class="oc-code">{{ host() }}</code>
            </p>
            <button type="button" class="oc-btn" (click)="openUi()" [disabled]="busy() || !isLaunchable()">
              {{ busy() ? 'Opening…' : profile().uiName + ' →' }}
            </button>
            @if (launchError()) {
              <p class="oc-err-msg">{{ launchError() }}</p>
            }
            @if (creds(); as c) {
              <div class="oc-creds">
                <p class="oc-card__desc">Your per-buyer credentials (auto-filled on launch — keep them private):</p>
                <label class="oc-label">Username</label>
                <pre class="oc-ssh-cmd">{{ c.username }}</pre>
                <label class="oc-label">Password</label>
                <pre class="oc-ssh-cmd">{{ c.password }}</pre>
                <button type="button" class="oc-btn oc-btn--ghost" (click)="copyCreds()">Copy credentials</button>
              </div>
            }
          </article>

          <!-- ========== CHANNELS (OpenClaw only) ========== -->
          @if (profile().channels) {
            @if (!selectedChannel()) {
              <article class="oc-card">
                <h3><span>2</span> Messaging channels</h3>
                <p class="oc-card__desc">
                  Choose a channel for step-by-step instructions. Channels are configured on the gateway (Control UI →
                  Settings → Channels, or the <code class="oc-code">openclaw channels add</code> CLI).
                </p>
                <div class="oc-setup__grid" role="list">
                  @for (ch of channels; track ch.id) {
                    <button type="button" class="oc-channel" role="listitem" (click)="selectChannel(ch)">
                      <span class="oc-channel__icon" [ngClass]="'oc-channel__icon--' + ch.id" aria-hidden="true">
                        @switch (ch.id) {
                          @case ('telegram') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                          }
                          @case ('whatsapp') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/><path d="M12.04 2C6.5 2 2.01 6.49 2 12.03c0 1.78.47 3.51 1.36 5.03L2 22l5.08-1.33A9.98 9.98 0 0012.04 22C17.57 22 22 17.53 22 12S17.57 2 12.04 2zm0 18.15c-1.58 0-3.13-.42-4.48-1.22l-.32-.19-3.01.79.8-2.94-.21-.34a8.12 8.12 0 01-1.25-4.34c0-4.5 3.66-8.16 8.17-8.16 4.5 0 8.16 3.66 8.16 8.16 0 4.5-3.66 8.16-8.16 8.16z"/></svg>
                          }
                          @case ('discord') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 00-4.8 0c-.14-.34-.37-.76-.54-1.09-.02-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.32-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.32.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.03.09.32.61.68 1.19 1.07 1.74.02.02.05.03.08.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>
                          }
                          @case ('teams') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.63 8.08V6.53a1.9 1.9 0 00-1.9-1.9h-3.45a2.82 2.82 0 00-5.28-.92 2.06 2.06 0 00-1.88.99H5.27A1.9 1.9 0 003.37 6.6v9.87c0 1.05.85 1.9 1.9 1.9h4.07v1.52c0 1.05.85 1.9 1.9 1.9h7.5c1.05 0 1.9-.85 1.9-1.9V9.98a1.9 1.9 0 00-1.9-1.9h-.11z"/></svg>
                          }
                          @case ('slack') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.2 15.1a1.6 1.6 0 11-1.6 1.6v-1.6h1.6zm.8 0A1.6 1.6 0 018.6 13.5h4.7a1.6 1.6 0 010 3.2H8.6a1.6 1.6 0 01-1.6-1.6z"/><path d="M8.9 6.2a1.6 1.6 0 11-1.6-1.6h1.6v1.6zm0 .8A1.6 1.6 0 0110.5 8.6v4.7a1.6 1.6 0 01-3.2 0V8.6A1.6 1.6 0 018.9 7z"/><path d="M17.8 8.9a1.6 1.6 0 111.6-1.6v1.6h-1.6zm-.8 0a1.6 1.6 0 01-1.6 1.6h-4.7a1.6 1.6 0 010-3.2h4.7a1.6 1.6 0 011.6 1.6z"/><path d="M15.1 17.8a1.6 1.6 0 111.6 1.6h-1.6v-1.6zm0-.8a1.6 1.6 0 01-1.6-1.6v-4.7a1.6 1.6 0 013.2 0v4.7a1.6 1.6 0 01-1.6 1.6z"/></svg>
                          }
                        }
                      </span>
                      <span class="oc-channel__label">{{ ch.label }}</span>
                    </button>
                  }
                </div>
              </article>
            } @else {
              <div class="oc-flow">
                <button type="button" class="oc-setup__back" (click)="clearChannel()">← All channels</button>
                <h2 class="oc-flow__title">{{ selectedChannel()!.label }} channel</h2>
                <article class="oc-card">
                  <h3><span>1</span> Steps</h3>
                  <ol class="oc-card__ol">
                    @for (line of selectedChannel()!.steps; track line; let i = $index) {
                      <li>{{ i + 1 }}. {{ line }}</li>
                    }
                  </ol>
                </article>
                <article class="oc-card">
                  <h3><span>2</span> Command</h3>
                  <p class="oc-card__desc">Run this inside your {{ profile().brand }} sandbox:</p>
                  <pre class="oc-ssh-cmd">{{ selectedChannel()!.cli }}</pre>
                  <div class="oc-row">
                    <button type="button" class="oc-btn oc-btn--ghost" (click)="copyText(selectedChannel()!.cli, 'Command copied')">
                      Copy command
                    </button>
                    <button type="button" class="oc-btn" (click)="openUi()" [disabled]="busy()">
                      Open Control UI →
                    </button>
                  </div>
                  @if (selectedChannel()!.envVars.length) {
                    <label class="oc-label">Equivalent environment variables</label>
                    <pre class="oc-ssh-cmd">{{ selectedChannel()!.envVars.join('\n') }}</pre>
                  }
                </article>
              </div>
            }
          }

          <!-- ========== PAIRING (OpenClaw only) ========== -->
          @if (profile().channels) {
            <article class="oc-card">
              <h3><span>{{ profile().channels ? 3 : 2 }}</span> Device &amp; DM pairing</h3>
              <p class="oc-card__desc">
                New browsers/nodes must be approved. Approve the pending request, or enter the pairing code your bot
                replied with (DM policy “pairing”).
              </p>
              <div class="oc-pair-row">
                <input class="oc-input" [(ngModel)]="pairingCode" name="ocPair" placeholder="Enter pairing code (optional)" />
                <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="pairingBusy()">
                  Approve
                </button>
              </div>
              <button type="button" class="oc-link" (click)="checkPending()" [disabled]="pairingBusy()">
                Check pending requests
              </button>
            </article>
          }

          <!-- ========== SSH ========== -->
          <article class="oc-card oc-ssh">
            <h3><span>{{ profile().channels ? 4 : 2 }}</span> SSH access</h3>
            <p class="oc-card__desc">
              Connect from your desktop to this user’s {{ profile().brand }} server/sandbox. Command is valid for 60
              minutes.
            </p>
            <label class="oc-label">Server host (optional)</label>
            <input class="oc-input" [(ngModel)]="sshHost" name="setupSshHost" [placeholder]="sshPlaceholder" />
            <button type="button" class="oc-btn" (click)="generateSsh()" [disabled]="sshBusy()">
              {{ sshBusy() ? 'Generating…' : 'Generate SSH command' }}
            </button>
            @if (ssh(); as s) {
              <p class="oc-label">Command</p>
              <pre class="oc-ssh-cmd">{{ s.command }}</pre>
              <p class="oc-label">Password</p>
              <pre class="oc-ssh-cmd">{{ s.password }}</pre>
              @if (s.expiresInMinutes != null) {
                <p class="oc-ok-msg">{{ s.note }} ({{ s.expiresInMinutes }} min left)</p>
              }
              <div class="oc-row">
                <button type="button" class="oc-btn oc-btn--ghost" (click)="copySsh()">Copy command</button>
                <button type="button" class="oc-btn oc-btn--ghost" (click)="revokeSsh()" [disabled]="sshBusy()">
                  Revoke
                </button>
              </div>
            }
          </article>

          <!-- ========== CONFIG / ABOUT ========== -->
          <article class="oc-card">
            <h3><span>{{ profile().channels ? 5 : 3 }}</span> Configuration</h3>
            <p class="oc-card__desc">{{ profile().configNote }}</p>
            <a class="oc-link" [href]="profile().docsUrl" target="_blank" rel="noopener">Documentation ↗</a>
            <a class="oc-link oc-link--spaced" routerLink="/hire-agent">My Agents</a>
          </article>
        }

        @if (status()) {
          <p class="oc-setup__status">{{ status() }}</p>
        }
      </main>

      <footer class="oc-setup__foot">
        <span class="oc-setup__feather" aria-hidden="true">✦</span>
        featherless.ai style · PH AI Market
        <a routerLink="/hire-agent" class="oc-setup__foot-link">My Agents</a>
      </footer>
    </div>
  `,
})
export class OpenClawSetupWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);

  readonly channels = OPENCLAW_CHANNELS;

  readonly agent = signal<MarketplaceAgent | null>(null);
  readonly selectedChannel = signal<ChannelGuide | null>(null);
  readonly launched = signal(false);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly launchError = signal('');
  readonly creds = signal<{ username: string; password: string } | null>(null);
  readonly pairingBusy = signal(false);

  readonly ssh = signal<OpenClawSshAccess | null>(null);
  readonly sshBusy = signal(false);
  sshHost = '';
  sshPlaceholder = '{userId}.openclaw.aimarkets.vn';
  pairingCode = '';

  readonly profile = signal<AgentSetupProfile>(PROFILES.openclaw);

  isLaunchable(): boolean {
    return this.gateway.isLaunchableAgent(this.agent());
  }

  host(): string {
    return this.sshPlaceholder;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('agentId') || 'openclaw';
      const agent = this.gateway.getAgent(id) || this.gateway.getAgent('openclaw') || null;
      this.agent.set(agent);
      this.profile.set(PROFILES[this.profileId(agent)]);
      this.launched.set(false);
      this.launchError.set('');
      this.creds.set(null);
      this.selectedChannel.set(null);
      this.status.set('');

      this.seo.set({
        title: `${this.profile().brand} Setup`,
        description: `${this.profile().brand} setup — launch your dashboard, connect channels, and get temporary SSH access.`,
      });

      this.sshPlaceholder = this.gateway.sshHostHint(undefined, agent);
      const hint = this.sshPlaceholder;
      this.sshHost = hint.includes('{userId}') ? '' : hint;

      if (agent && this.gateway.isLaunchableAgent(agent)) {
        this.gateway.getActiveSsh(agent.id).subscribe((res) => {
          if (res.active && res.session) this.ssh.set({ ...res.session, success: true });
        });
      }
    });
  }

  selectChannel(ch: ChannelGuide): void {
    this.selectedChannel.set(ch);
    this.status.set('');
  }

  clearChannel(): void {
    this.selectedChannel.set(null);
  }

  copyText(text: string, message: string): void {
    void navigator.clipboard?.writeText(text);
    this.status.set(message);
  }

  copyCreds(): void {
    const c = this.creds();
    if (!c) return;
    this.copyText(`username: ${c.username}\npassword: ${c.password}`, 'Credentials copied');
  }

  copySsh(): void {
    const cmd = this.ssh()?.commandWithPassword || this.ssh()?.command;
    if (!cmd) return;
    this.copyText(cmd, 'SSH command copied');
  }

  openUi(): void {
    const agent = this.agent();
    if (!agent || !this.gateway.isLaunchableAgent(agent)) {
      this.launchError.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.busy.set(true);
    this.launchError.set('');
    this.status.set(`Opening ${agent.name} at ${this.host()}…`);
    this.gateway.launchGateway({ agent }).subscribe((res) => {
      this.busy.set(false);
      if (res.success) {
        this.launched.set(true);
        if (res.username && res.password) {
          this.creds.set({ username: res.username, password: res.password });
        }
        this.status.set('Opened — check the new tab.');
      } else {
        const msg = res.message || 'Failed to open the dashboard';
        this.launchError.set(msg);
        this.status.set(msg);
      }
    });
  }

  approvePairing(): void {
    if (this.pairingBusy()) return;
    this.pairingBusy.set(true);
    this.status.set('Approving pairing request…');
    this.gateway.approvePairing(this.pairingCode.trim() || null, this.agent()).subscribe((res) => {
      this.pairingBusy.set(false);
      if (res.success) {
        this.pairingCode = '';
        this.status.set(res.message || 'Pairing approved.');
      } else {
        this.status.set(res.message || 'Approve failed.');
      }
    });
  }

  checkPending(): void {
    if (this.pairingBusy()) return;
    this.pairingBusy.set(true);
    this.status.set('Checking pending pairing requests…');
    this.gateway.approvePairing(null, this.agent()).subscribe((res) => {
      this.pairingBusy.set(false);
      this.status.set(
        res.success
          ? res.message || 'Pending request approved.'
          : res.message || 'No pending requests (or approve failed).',
      );
    });
  }

  generateSsh(): void {
    const agent = this.agent() || this.gateway.getAgent('openclaw');
    if (!agent || !this.gateway.isLaunchableAgent(agent)) {
      this.status.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    this.sshBusy.set(true);
    this.gateway
      .generateSsh({ agentId: agent.id, host: this.sshHost.trim() || undefined })
      .subscribe((res) => {
        this.sshBusy.set(false);
        if (res.success && res.command) {
          this.ssh.set(res);
          this.status.set('SSH command ready — valid 60 minutes.');
        } else {
          this.status.set(res.message || 'SSH generate failed. Login required, or the host template is not set.');
        }
      });
  }

  revokeSsh(): void {
    const agent = this.agent() || this.gateway.getAgent('openclaw');
    this.sshBusy.set(true);
    this.gateway.revokeSsh(agent?.id || 'openclaw').subscribe(() => {
      this.sshBusy.set(false);
      this.ssh.set(null);
      this.status.set('SSH session revoked.');
    });
  }

  private profileId(agent: MarketplaceAgent | null): AgentSetupProfile['id'] {
    if (this.gateway.isHermesAgent(agent)) return 'hermes';
    if (this.gateway.isNanoclawAgent(agent)) return 'nanoclaw';
    return 'openclaw';
  }
}
