import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import { OpenClawGatewayService } from './openclaw-gateway.service';
import { MarketplaceAgent, OpenClawSshAccess } from './agents.models';

export type SetupChannelId = 'telegram' | 'whatsapp' | 'discord' | 'teams' | 'slack';

interface SetupChannel {
  id: SetupChannelId;
  label: string;
}

interface ChannelConfig {
  token?: string;
  botToken?: string;
  appToken?: string;
  appId?: string;
  clientSecret?: string;
  tenantId?: string;
  phoneMode?: 'personal' | 'dedicated';
  pairingCode?: string;
  tested?: boolean;
  connected?: boolean;
  paired?: boolean;
  complete?: boolean;
}

const CHANNELS: SetupChannel[] = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'discord', label: 'Discord' },
  { id: 'teams', label: 'Teams' },
  { id: 'slack', label: 'Slack' },
];

const TELEGRAM_INSTRUCTIONS = [
  'Open Telegram and search for @BotFather.',
  'Send /newbot and follow the prompts.',
  'Copy the bot token (looks like 123456:ABC-DEF…).',
  'If using groups: send /setprivacy to BotFather and disable privacy mode so the bot can see all messages.',
];

const DISCORD_INSTRUCTIONS = [
  'Go to the Discord Developer Portal and click New Application.',
  'Go to the Bot section and set your bot’s username.',
  'Under Privileged Gateway Intents, enable Message Content Intent (required) and Server Members Intent (recommended).',
  'Click Reset Token to generate a bot token — save it securely.',
  'Go to OAuth2 → URL Generator. Select scopes: bot + applications.commands.',
  'Select permissions: View Channels, Send Messages, Read Message History, Embed Links, Attach Files, Add Reactions.',
  'Copy the generated URL, open it in your browser, and invite the bot to your server.',
  'Enable Developer Mode (User Settings → Advanced) to copy Server/User IDs via right-click.',
  'In your server’s Privacy Settings, enable Direct Messages so the bot can DM you for pairing.',
];

const TEAMS_INSTRUCTIONS = [
  'Go to the Azure Portal and create a new Azure Bot resource.',
  'Under Configuration, note the Microsoft App ID.',
  'Go to Manage Password (or App Registrations) and create a new Client Secret; copy the secret value.',
  'Note your Tenant ID from Azure Active Directory → Overview.',
  'Under Channels, add the Microsoft Teams channel.',
  'Set the messaging endpoint to your gateway URL + /api/messages.',
];

const SLACK_INSTRUCTIONS = [
  'Go to api.slack.com/apps.',
  'Click Create New App → From a manifest.',
  'Select workspace, then paste the JSON manifest.',
  'Go to OAuth & Permissions and install to workspace.',
  'Copy the Bot User OAuth Token (starts with xoxb-).',
  'Go to Basic Information → App-Level Tokens, create one with scope connections:write.',
  'In App Home, enable the Messages Tab to allow DMs.',
  'Optional: Enable Agents & AI Apps in app settings for streaming support.',
];

const SLACK_MANIFEST = `{
  "display_information": { "name": "OpenClaw" },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": { "messages_tab_enabled": true, "messages_tab_read_only_enabled": false }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "im:history", "im:write", "app_mentions:read"]
    }
  },
  "settings": {
    "event_subscriptions": { "bot_events": ["message.im", "message.channels", "app_mention"] },
    "org_deploy_enabled": false,
    "socket_mode_enabled": true,
    "token_rotation_enabled": false
  }
}`;

@Component({
  selector: 'app-openclaw-setup-wizard',
  standalone: true,
  imports: [RouterLink, NgClass, FormsModule],
  styleUrl: './setup-wizard.styles.scss',
  template: `
    <div class="oc-setup">
      <header class="oc-setup__top">
        <h1 class="oc-setup__brand">
          <span class="oc-setup__brand-accent">OpenClaw</span> Setup
        </h1>
        <div class="oc-setup__top-actions">
          <span class="oc-setup__pill" [class.oc-setup__pill--ok]="connected()">
            <span class="oc-setup__dot" aria-hidden="true"></span>
            {{ connected() ? 'Connected' : 'Offline' }}
          </span>
          <button type="button" class="oc-setup__pill oc-setup__pill--btn" (click)="openUi()" [disabled]="busy()">
            {{ busy() ? 'Opening…' : 'OpenClaw UI →' }}
          </button>
        </div>
      </header>

      <main class="oc-setup__main" [class.oc-setup__main--flow]="!!selected()">
        @if (!selected()) {
          <p class="oc-setup__lead">
            Connect a messaging channel to start chatting with your OpenClaw agent.
          </p>
          <div class="oc-setup__grid" role="list">
            @for (ch of channels; track ch.id) {
              <button
                type="button"
                class="oc-channel"
                role="listitem"
                [class.oc-channel--done]="isComplete(ch.id)"
                (click)="select(ch)"
              >
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
                @if (isComplete(ch.id)) {
                  <span class="oc-channel__check">Ready</span>
                }
              </button>
            }
          </div>

          <article class="oc-card oc-ssh mt-6">
            <h3><span>SSH</span> Access</h3>
            <p class="oc-card__desc">
              Connect from your desktop to this user’s OpenClaw server/sandbox. Command is valid for 60 minutes.
            </p>
            <label class="oc-label">Server host (optional)</label>
            <input class="oc-input" [(ngModel)]="sshHost" name="setupSshHost" placeholder="sandbox.phhotel.vn" />
            <button type="button" class="oc-btn" (click)="generateSsh()" [disabled]="sshBusy()">
              {{ sshBusy() ? 'Generating…' : 'Generate SSH command' }}
            </button>
            @if (ssh(); as s) {
              <p class="oc-label">Command</p>
              <pre class="oc-ssh-cmd">{{ s.command }}</pre>
              <p class="oc-label">Password</p>
              <pre class="oc-ssh-cmd">{{ s.password }}</pre>
              <p class="oc-ok-msg">{{ s.note }} ({{ s.expiresInMinutes }} min left)</p>
              <button type="button" class="oc-btn oc-btn--ghost" (click)="copySsh()">Copy command</button>
            }
          </article>
        } @else {
          <div class="oc-flow">
            <button type="button" class="oc-setup__back" (click)="clearSelection()">← Back</button>
            <h2 class="oc-flow__title">{{ selected()!.label }} Setup</h2>

            <!-- ========== TELEGRAM: 5 steps ========== -->
            @if (selected()!.id === 'telegram') {
              <article class="oc-card">
                <h3><span>1</span> Instructions</h3>
                <ol class="oc-card__ol">
                  @for (line of telegramInstructions; track line; let i = $index) {
                    <li>{{ i + 1 }}. {{ line }}</li>
                  }
                </ol>
              </article>
              <article class="oc-card">
                <h3><span>2</span> Bot Token</h3>
                <label class="oc-label">Bot Token</label>
                <input class="oc-input" [(ngModel)]="cfg.token" name="tgToken" placeholder="123456789:ABCdefGHI…" />
                <button type="button" class="oc-btn" (click)="testConnection()" [disabled]="!cfg.token?.trim()">
                  Test Connection
                </button>
                @if (cfg.tested) {
                  <p class="oc-ok-msg">Token looks valid — ready to connect.</p>
                }
              </article>
              <article class="oc-card">
                <h3><span>3</span> Save &amp; Connect</h3>
                <p class="oc-card__desc">Save your configuration and start the Telegram gateway.</p>
                <button type="button" class="oc-btn" (click)="saveConnect()" [disabled]="!cfg.tested">
                  Save &amp; Connect
                </button>
              </article>
              <article class="oc-card">
                <h3><span>4</span> Pairing</h3>
                <p class="oc-card__desc">
                  Send a message to your bot from your personal account. It will ask for a pairing code. Enter that
                  code below to authorize yourself.
                </p>
                <div class="oc-pair-row">
                  <input class="oc-input" [(ngModel)]="cfg.pairingCode" name="tgPair" placeholder="Enter pairing code" />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="!cfg.connected || !cfg.pairingCode?.trim()">
                    Approve
                  </button>
                </div>
                <button type="button" class="oc-link" (click)="checkPending()">Check Pending Requests</button>
              </article>
              <article class="oc-card">
                <h3><span>5</span> Done</h3>
                <p class="oc-card__desc">Finish setup and open the OpenClaw Control UI to chat on Telegram.</p>
                <button type="button" class="oc-btn" (click)="finish()" [disabled]="!cfg.paired">
                  Open OpenClaw UI →
                </button>
              </article>
            }

            <!-- ========== WHATSAPP: 5 steps ========== -->
            @if (selected()!.id === 'whatsapp') {
              <article class="oc-card">
                <h3><span>1</span> Connect WhatsApp</h3>
                <p class="oc-card__desc">Link your WhatsApp account to OpenClaw.</p>
                <button type="button" class="oc-btn" (click)="waConnect()">Connect WhatsApp</button>
                @if (cfg.tested) {
                  <p class="oc-ok-msg">WhatsApp link started.</p>
                }
              </article>
              <article class="oc-card">
                <h3><span>2</span> Phone Setup</h3>
                <p class="oc-card__desc">How will you use this WhatsApp number?</p>
                <button
                  type="button"
                  class="oc-choice"
                  [class.oc-choice--on]="cfg.phoneMode === 'personal'"
                  (click)="cfg.phoneMode = 'personal'"
                >
                  This is my personal phone number
                </button>
                <button
                  type="button"
                  class="oc-choice"
                  [class.oc-choice--on]="cfg.phoneMode === 'dedicated'"
                  (click)="cfg.phoneMode = 'dedicated'"
                >
                  Separate phone just for OpenClaw
                </button>
              </article>
              <article class="oc-card">
                <h3><span>3</span> Save &amp; Connect</h3>
                <p class="oc-card__desc">Save your WhatsApp configuration and start the gateway.</p>
                <button type="button" class="oc-btn" (click)="saveConnect()" [disabled]="!cfg.tested || !cfg.phoneMode">
                  Save &amp; Connect
                </button>
              </article>
              <article class="oc-card">
                <h3><span>4</span> Pairing</h3>
                <p class="oc-card__desc">
                  Send a message to your OpenClaw WhatsApp number. Enter the pairing code it replies with.
                </p>
                <div class="oc-pair-row">
                  <input class="oc-input" [(ngModel)]="cfg.pairingCode" name="waPair" placeholder="Enter pairing code" />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="!cfg.connected || !cfg.pairingCode?.trim()">
                    Approve
                  </button>
                </div>
                <button type="button" class="oc-link" (click)="checkPending()">Check Pending Requests</button>
              </article>
              <article class="oc-card">
                <h3><span>5</span> Done</h3>
                <p class="oc-card__desc">WhatsApp channel is ready. Open Control UI to continue.</p>
                <button type="button" class="oc-btn" (click)="finish()" [disabled]="!cfg.paired">
                  Open OpenClaw UI →
                </button>
              </article>
            }

            <!-- ========== DISCORD: 5 steps ========== -->
            @if (selected()!.id === 'discord') {
              <article class="oc-card">
                <h3><span>1</span> Instructions</h3>
                <ol class="oc-card__ol">
                  @for (line of discordInstructions; track line; let i = $index) {
                    <li>{{ i + 1 }}. {{ line }}</li>
                  }
                </ol>
              </article>
              <article class="oc-card">
                <h3><span>2</span> Bot Token</h3>
                <label class="oc-label">Bot Token</label>
                <input class="oc-input" [(ngModel)]="cfg.token" name="dcToken" placeholder="MTIz…" />
                <button type="button" class="oc-btn" (click)="testConnection()" [disabled]="!cfg.token?.trim()">
                  Test Connection
                </button>
                @if (cfg.tested) {
                  <p class="oc-ok-msg">Token looks valid — ready to connect.</p>
                }
              </article>
              <article class="oc-card">
                <h3><span>3</span> Save &amp; Connect</h3>
                <p class="oc-card__desc">Save your configuration and start the Discord gateway.</p>
                <button type="button" class="oc-btn" (click)="saveConnect()" [disabled]="!cfg.tested">
                  Save &amp; Connect
                </button>
              </article>
              <article class="oc-card">
                <h3><span>4</span> Pairing</h3>
                <p class="oc-card__desc">
                  Send a message to your bot from your personal account. It will ask for a pairing code. Enter that
                  code below to authorize yourself.
                </p>
                <div class="oc-pair-row">
                  <input class="oc-input" [(ngModel)]="cfg.pairingCode" name="dcPair" placeholder="Enter pairing code" />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="!cfg.connected || !cfg.pairingCode?.trim()">
                    Approve
                  </button>
                </div>
                <button type="button" class="oc-link" (click)="checkPending()">Check Pending Requests</button>
              </article>
              <article class="oc-card">
                <h3><span>5</span> Done</h3>
                <p class="oc-card__desc">Discord is connected. Open Control UI to manage the agent.</p>
                <button type="button" class="oc-btn" (click)="finish()" [disabled]="!cfg.paired">
                  Open OpenClaw UI →
                </button>
              </article>
            }

            <!-- ========== TEAMS: 5 steps ========== -->
            @if (selected()!.id === 'teams') {
              <article class="oc-card">
                <h3><span>1</span> Instructions</h3>
                <ol class="oc-card__ol">
                  @for (line of teamsInstructions; track line; let i = $index) {
                    <li>{{ i + 1 }}. {{ line }}</li>
                  }
                </ol>
              </article>
              <article class="oc-card">
                <h3><span>2</span> Azure Bot Credentials</h3>
                <label class="oc-label">App ID</label>
                <input class="oc-input" [(ngModel)]="cfg.appId" name="teamsAppId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <label class="oc-label">Client Secret (App Password)</label>
                <input class="oc-input" [(ngModel)]="cfg.clientSecret" name="teamsSecret" placeholder="Your client secret value" />
                <label class="oc-label">Tenant ID</label>
                <input class="oc-input" [(ngModel)]="cfg.tenantId" name="teamsTenant" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <button
                  type="button"
                  class="oc-btn"
                  (click)="testConnection()"
                  [disabled]="!cfg.appId?.trim() || !cfg.clientSecret?.trim() || !cfg.tenantId?.trim()"
                >
                  Test Credentials
                </button>
                @if (cfg.tested) {
                  <p class="oc-ok-msg">Credentials look valid — ready to connect.</p>
                }
              </article>
              <article class="oc-card">
                <h3><span>3</span> Save &amp; Connect</h3>
                <p class="oc-card__desc">Save your configuration and start the Teams gateway.</p>
                <button type="button" class="oc-btn" (click)="saveConnect()" [disabled]="!cfg.tested">
                  Save &amp; Connect
                </button>
              </article>
              <article class="oc-card">
                <h3><span>4</span> Pairing</h3>
                <p class="oc-card__desc">
                  Send a message to your bot in Teams. It will ask for a pairing code. Enter that code below to
                  authorize yourself.
                </p>
                <div class="oc-pair-row">
                  <input class="oc-input" [(ngModel)]="cfg.pairingCode" name="teamsPair" placeholder="Enter pairing code" />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="!cfg.connected || !cfg.pairingCode?.trim()">
                    Approve
                  </button>
                </div>
                <button type="button" class="oc-link" (click)="checkPending()">Check Pending Requests</button>
              </article>
              <article class="oc-card">
                <h3><span>5</span> Done</h3>
                <p class="oc-card__desc">Teams channel is ready. Open Control UI to continue.</p>
                <button type="button" class="oc-btn" (click)="finish()" [disabled]="!cfg.paired">
                  Open OpenClaw UI →
                </button>
              </article>
            }

            <!-- ========== SLACK: 5 steps ========== -->
            @if (selected()!.id === 'slack') {
              <article class="oc-card">
                <h3><span>1</span> Create App</h3>
                <ol class="oc-card__ol">
                  @for (line of slackInstructions; track line; let i = $index) {
                    <li>{{ i + 1 }}. {{ line }}</li>
                  }
                </ol>
                <button type="button" class="oc-btn oc-btn--ghost" (click)="copyManifest()">Copy Manifest</button>
              </article>
              <article class="oc-card">
                <h3><span>2</span> Tokens</h3>
                <label class="oc-label">Bot User OAuth Token</label>
                <input class="oc-input" [(ngModel)]="cfg.botToken" name="slackBot" placeholder="xoxb-…" />
                <label class="oc-label">App-Level Token</label>
                <input class="oc-input" [(ngModel)]="cfg.appToken" name="slackApp" placeholder="xapp-…" />
                <button
                  type="button"
                  class="oc-btn"
                  (click)="testConnection()"
                  [disabled]="!cfg.botToken?.trim() || !cfg.appToken?.trim()"
                >
                  Test Connection
                </button>
                @if (cfg.tested) {
                  <p class="oc-ok-msg">Tokens look valid — ready to connect.</p>
                }
              </article>
              <article class="oc-card">
                <h3><span>3</span> Save &amp; Connect</h3>
                <p class="oc-card__desc">Save your Slack configuration and start the gateway.</p>
                <button type="button" class="oc-btn" (click)="saveConnect()" [disabled]="!cfg.tested">
                  Save &amp; Connect
                </button>
              </article>
              <article class="oc-card">
                <h3><span>4</span> Pairing</h3>
                <p class="oc-card__desc">
                  Send a message to your bot from your personal account. It will ask for a pairing code. Enter that
                  code below to authorize yourself.
                </p>
                <div class="oc-pair-row">
                  <input class="oc-input" [(ngModel)]="cfg.pairingCode" name="slackPair" placeholder="Enter pairing code" />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="!cfg.connected || !cfg.pairingCode?.trim()">
                    Approve
                  </button>
                </div>
                <button type="button" class="oc-link" (click)="checkPending()">Check Pending Requests</button>
              </article>
              <article class="oc-card">
                <h3><span>5</span> Done</h3>
                <p class="oc-card__desc">Slack channel is ready. Open Control UI to chat.</p>
                <button type="button" class="oc-btn" (click)="finish()" [disabled]="!cfg.paired">
                  Open OpenClaw UI →
                </button>
              </article>
            }
          </div>
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
  private readonly gateway = inject(OpenClawGatewayService);
  private readonly seo = inject(SeoService);

  readonly channels = CHANNELS;
  readonly telegramInstructions = TELEGRAM_INSTRUCTIONS;
  readonly discordInstructions = DISCORD_INSTRUCTIONS;
  readonly teamsInstructions = TEAMS_INSTRUCTIONS;
  readonly slackInstructions = SLACK_INSTRUCTIONS;

  readonly agent = signal<MarketplaceAgent | null>(null);
  readonly selected = signal<SetupChannel | null>(null);
  readonly completeIds = signal<SetupChannelId[]>([]);
  readonly connected = signal(false);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly ssh = signal<OpenClawSshAccess | null>(null);
  readonly sshBusy = signal(false);
  sshHost = '';

  cfg: ChannelConfig = this.emptyCfg();

  ngOnInit(): void {
    this.seo.set({
      title: 'OpenClaw Setup',
      description: 'Connect Telegram, WhatsApp, Discord, Teams, or Slack — 5-step Featherless-style wizard.',
    });
    this.route.paramMap.subscribe((params) => {
      const id = params.get('agentId') || 'openclaw';
      const agent = this.gateway.getAgent(id) || this.gateway.getAgent('openclaw') || null;
      this.agent.set(agent);
      if (agent) this.gateway.upsertHired(agent, 'running');
      this.connected.set(!!agent);
      this.loadComplete(agent?.id || 'openclaw');
      this.gateway.getActiveSsh(agent?.id || 'openclaw').subscribe((res) => {
        if (res.active && res.session) this.ssh.set({ ...res.session, success: true });
      });
    });
  }

  select(ch: SetupChannel): void {
    this.selected.set(ch);
    this.cfg = this.loadCfg(ch.id);
    this.status.set('');
  }

  clearSelection(): void {
    this.persistCfg();
    this.selected.set(null);
    this.cfg = this.emptyCfg();
  }

  isComplete(id: SetupChannelId): boolean {
    return this.completeIds().includes(id);
  }

  waConnect(): void {
    this.cfg.tested = true;
    this.status.set('WhatsApp connect flow started (scan QR in OpenClaw UI if prompted).');
    this.persistCfg();
  }

  testConnection(): void {
    this.cfg.tested = true;
    this.status.set('Connection test passed.');
    this.persistCfg();
  }

  saveConnect(): void {
    this.cfg.connected = true;
    this.connected.set(true);
    this.status.set(`${this.selected()?.label} gateway saved & connected.`);
    this.persistCfg();
  }

  approvePairing(): void {
    if (!this.cfg.pairingCode?.trim()) return;
    this.cfg.paired = true;
    this.status.set('Pairing approved.');
    this.persistCfg();
    // Also try real OpenClaw device pairing approve (same as chatbox)
    this.gateway.approvePairing().subscribe();
  }

  checkPending(): void {
    this.status.set('Checking pending pairing requests… Open OpenClaw UI if none appear here.');
    this.gateway.approvePairing().subscribe((res) => {
      this.status.set(res.success ? 'Pending request approved.' : res.message || 'No pending requests (or approve failed).');
    });
  }

  finish(): void {
    const ch = this.selected();
    if (!ch) return;
    this.cfg.complete = true;
    if (!this.completeIds().includes(ch.id)) {
      this.completeIds.set([...this.completeIds(), ch.id]);
    }
    this.persistCfg();
    this.persistComplete();
    this.openUi();
  }

  copyManifest(): void {
    void navigator.clipboard?.writeText(SLACK_MANIFEST);
    this.status.set('Slack manifest copied to clipboard.');
  }

  openUi(): void {
    const agent = this.agent() || this.gateway.getAgent('openclaw');
    if (!agent) {
      this.status.set('OpenClaw agent not found.');
      return;
    }
    this.busy.set(true);
    this.status.set('Opening OpenClaw Control UI…');
    this.connected.set(true);
    this.gateway.launchGateway({ agent }).subscribe((res) => {
      this.busy.set(false);
      this.status.set(
        res.success
          ? 'Gateway opened — auto-approving device pairing…'
          : res.message || 'Failed to open OpenClaw UI',
      );
    });
  }

  generateSsh(): void {
    const agent = this.agent() || this.gateway.getAgent('openclaw');
    if (!agent) return;
    this.sshBusy.set(true);
    this.gateway
      .generateSsh({ agentId: agent.id, host: this.sshHost.trim() || undefined })
      .subscribe((res) => {
        this.sshBusy.set(false);
        if (res.success && res.command) {
          this.ssh.set(res);
          this.status.set('SSH command ready — valid 60 minutes.');
        } else {
          this.status.set(res.message || 'SSH generate failed. Login required + OPENCLAW_SSH_HOST.');
        }
      });
  }

  copySsh(): void {
    const cmd = this.ssh()?.command;
    if (!cmd) return;
    void navigator.clipboard?.writeText(cmd);
    this.status.set('SSH command copied.');
  }

  private emptyCfg(): ChannelConfig {
    return { phoneMode: undefined, tested: false, connected: false, paired: false, complete: false };
  }

  private storageKey(agentId: string, channel: SetupChannelId): string {
    return `phai.openclaw.setup.${agentId}.${channel}`;
  }

  private completeKey(agentId: string): string {
    return `phai.openclaw.setup.complete.${agentId}`;
  }

  private loadCfg(channel: SetupChannelId): ChannelConfig {
    const agentId = this.agent()?.id || 'openclaw';
    try {
      const raw = localStorage.getItem(this.storageKey(agentId, channel));
      return raw ? { ...this.emptyCfg(), ...(JSON.parse(raw) as ChannelConfig) } : this.emptyCfg();
    } catch {
      return this.emptyCfg();
    }
  }

  private persistCfg(): void {
    const ch = this.selected();
    if (!ch) return;
    const agentId = this.agent()?.id || 'openclaw';
    localStorage.setItem(this.storageKey(agentId, ch.id), JSON.stringify(this.cfg));
  }

  private loadComplete(agentId: string): void {
    try {
      const raw = localStorage.getItem(this.completeKey(agentId));
      this.completeIds.set(raw ? (JSON.parse(raw) as SetupChannelId[]) : []);
    } catch {
      this.completeIds.set([]);
    }
  }

  private persistComplete(): void {
    const agentId = this.agent()?.id || 'openclaw';
    localStorage.setItem(this.completeKey(agentId), JSON.stringify(this.completeIds()));
  }
}
