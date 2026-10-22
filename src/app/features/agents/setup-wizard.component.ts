import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import { LaunchNoticeService } from './launch-notice.service';
import { OpenClawGatewayService } from './openclaw-gateway.service';
import { AgentConnectCommand, MarketplaceAgent, OpenClawSshAccess, PendingPairing, TerminalShell } from './agents.models';

export type SetupChannelId =
  | 'telegram'
  | 'whatsapp'
  | 'discord'
  | 'teams'
  | 'slack'
  | 'twitch';

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

/**
 * SpaceBot channels are configured inside its own dashboard (Config → Channels)
 * or via `config.toml`; there is no CLI `channels add`. Tokens are the same
 * platform credentials, stored as `[messaging.<platform>]`.
 */
const SPACEBOT_CHANNELS: ChannelGuide[] = [
  {
    id: 'discord',
    label: 'Discord',
    kind: 'token',
    envVars: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CHANNEL_IDS'],
    cli: 'config.toml → [messaging.discord]',
    steps: [
      'Create an app + bot in the Discord Developer Portal and enable the Message Content intent.',
      'Invite the bot to your server (OAuth2 URL Generator: bot + applications.commands).',
      'In the SpaceBot dashboard open Config → Channels → Discord and paste the bot token.',
      'Optionally add a guild binding (guild_id + channel_ids) to scope the agent to specific channels.',
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'token',
    envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    cli: 'config.toml → [messaging.telegram]',
    steps: [
      'Open Telegram and message @BotFather → /newbot, then copy the bot token.',
      'In the SpaceBot dashboard open Config → Channels → Telegram and paste the token.',
      'Add a telegram binding with the chat_id you want the agent to listen on.',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    kind: 'token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
    cli: 'config.toml → [messaging.slack]',
    steps: [
      'Create an app at api.slack.com/apps (manifest or from scratch).',
      'Install to your workspace and copy the Bot User OAuth Token (xoxb-…).',
      'Create an App-Level Token with the connections:write scope (xapp-…).',
      'Paste both tokens in the SpaceBot dashboard under Config → Channels → Slack.',
    ],
  },
  {
    id: 'twitch',
    label: 'Twitch',
    kind: 'token',
    envVars: ['TWITCH_OAUTH_TOKEN', 'TWITCH_USERNAME', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'],
    cli: 'config.toml → [messaging.twitch]',
    steps: [
      'Register an application in the Twitch Developer Console to get a Client ID + Secret.',
      'Generate a chat OAuth token with the chat:read + chat:write scopes.',
      'In the SpaceBot dashboard open Config → Channels → Twitch and enter username + OAuth token.',
      'Add the channels (without the # prefix) the bot should join.',
    ],
  },
];

interface AgentSetupProfile {
  id: 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot' | 'openwebui' | 'paperclip';
  brand: string;
  /** Label of the primary launch button, e.g. "OpenClaw UI". */
  uiName: string;
  docsUrl: string;
  hostTemplate: string;
  /** Whether this wizard shows the messaging channel grid. */
  channels: boolean;
  /** Which channel guide set to render when `channels` is true. */
  channelSet?: 'openclaw' | 'spacebot';
  /** Whether the device/DM pairing card applies (OpenClaw only). */
  pairing?: boolean;
  /** SSH auth model: password (OpenClaw/Hermes/NanoClaw) or key (SpaceBot); unset = no SSH card. */
  sshAuth?: 'password' | 'key';
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
    channelSet: 'openclaw',
    pairing: true,
    sshAuth: 'password',
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
    sshAuth: 'password',
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
    sshAuth: 'password',
    lead: 'Launch your NanoClaw dashboard and open an SSH session to the sandbox.',
    launchBlurb:
      'Opens the NanoClaw dashboard scoped to your session. Auth uses the dashboard bearer secret — no OpenClaw-style device pairing.',
    configNote:
      'NanoClaw has no config files and does not require device pairing. Channels are installed per agent with the `/add-<channel>` skill in Claude Code (e.g. /add-telegram, /add-slack).',
  },
  spacebot: {
    id: 'spacebot',
    brand: 'SpaceBot',
    uiName: 'SpaceBot Dashboard',
    docsUrl: 'https://docs.spacebot.sh',
    hostTemplate: '{userId}.spacebot.aimarkets.vn',
    channels: true,
    channelSet: 'spacebot',
    pairing: false,
    sshAuth: 'key',
    lead: 'Launch your SpaceBot dashboard, connect messaging channels, and get a temporary SSH key for the sandbox.',
    launchBlurb:
      'Opens the SpaceBot dashboard scoped to your session. The marketplace token is passed in the URL hash and stored automatically — no device pairing.',
    configNote:
      'SpaceBot is a single Rust binary; configuration lives in config.toml ([messaging.*] blocks, [[agents]], [[bindings]]). Edit it from the dashboard (Config → Channels) or over SSH, then the daemon hot-reloads. SSH is key-based on port 2222.',
  },
  openwebui: {
    id: 'openwebui',
    brand: 'Open WebUI',
    uiName: 'Open WebUI',
    docsUrl: 'https://docs.openwebui.com',
    hostTemplate: '{userId}.openwebui.aimarkets.vn',
    channels: false,
    lead: 'Launch your private Open WebUI workspace, then add your own model provider keys.',
    launchBlurb:
      'Creates (or reuses) your personal Open WebUI account and opens it already signed in with a one-time ticket. Chats, knowledge and settings are only visible to you.',
    configNote:
      'Add your own OpenAI-compatible endpoint and API key under Settings → Connections (Direct Connections). Keys stay in your account; AI Markets does not charge token fees for BYOK usage.',
  },
  paperclip: {
    id: 'paperclip',
    brand: 'Paperclip',
    uiName: 'Paperclip Dashboard',
    docsUrl: 'https://github.com/paperclipai/paperclip',
    hostTemplate: '{userId}.paperclip.aimarkets.vn',
    channels: false,
    lead: 'Launch your Paperclip control plane and set up your first AI company.',
    launchBlurb:
      'Creates (or reuses) your personal Paperclip account and opens the board already signed in with a one-time ticket.',
    configNote:
      'Create a company, set its goal, then hire agents (Claude Code, Codex, OpenAI-compatible HTTP…) with your own API keys stored as company secrets. Budgets and heartbeats are managed per agent in the dashboard.',
  },
};

@Component({
  selector: 'app-openclaw-setup-wizard',
  standalone: true,
  imports: [RouterLink, NgClass, FormsModule, DatePipe],
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

          <nav class="oc-steps" aria-label="Setup steps">
            @for (st of steps(); track st.id; let i = $index) {
              <a class="oc-steps__item" [href]="'#step-' + st.id" (click)="scrollTo($event, st.id)">
                <span class="oc-steps__num">{{ i + 1 }}</span>{{ st.title }}
              </a>
            }
          </nav>

          <!-- ========== LAUNCH ========== -->
          <article class="oc-card" id="step-launch">
            <h3><span>{{ stepNo('launch') }}</span> Launch {{ profile().brand }}</h3>
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

          <!-- ========== CHANNELS (OpenClaw / SpaceBot) ========== -->
          @if (profile().channels) {
            @if (!selectedChannel()) {
              <article class="oc-card" id="step-channels">
                <h3><span>{{ stepNo('channels') }}</span> Messaging channels</h3>
                <p class="oc-card__desc">
                  @if (profile().channelSet === 'spacebot') {
                    Choose a channel for step-by-step instructions. Channels are configured on the SpaceBot dashboard
                    (Config → Channels) or in <code class="oc-code">config.toml</code>.
                  } @else {
                    Choose a channel for step-by-step instructions. Channels are configured on the gateway (Control UI
                    → Settings → Channels, or the <code class="oc-code">openclaw channels add</code> CLI).
                  }
          </p>
          <div class="oc-setup__grid" role="list">
                  @for (ch of activeChannels(); track ch.id) {
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
                          @case ('twitch') {
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.3 3 3 6.4v12.2h3.8V22h2.9l3.2-3.4h3.5l4.6-4.6V3H4.3zm15.1 10.2-2.6 2.6h-4.1l-2.3 2.4v-2.4H6.9V4.5h12.5v8.7zM15.4 7.2h1.6v4.5h-1.6V7.2zm-4.2 0h1.6v4.5h-1.6V7.2z"/></svg>
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
                  <p class="oc-card__desc">
                    @if (profile().channelSet === 'spacebot') {
                      Open the SpaceBot dashboard and add this block to <code class="oc-code">config.toml</code>:
                    } @else {
                      Run this inside your {{ profile().brand }} sandbox:
                    }
                  </p>
                  <pre class="oc-ssh-cmd">{{ selectedChannel()!.cli }}</pre>
                  <div class="oc-row">
                    <button type="button" class="oc-btn oc-btn--ghost" (click)="copyText(selectedChannel()!.cli, 'Command copied')">
                      Copy command
                    </button>
                    <button type="button" class="oc-btn" (click)="openUi()" [disabled]="busy()">
                      {{ profile().channelSet === 'spacebot' ? 'Open dashboard →' : 'Open Control UI →' }}
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
          @if (profile().pairing) {
              <article class="oc-card" id="step-pairing">
              <h3><span>{{ stepNo('pairing') }}</span> Device &amp; DM pairing</h3>
              <p class="oc-card__desc">
                Opening the Control UI from this page approves this browser automatically.
                Only a request opened on <code class="oc-code">{{ host() }}</code> can be approved.
                Do not paste the gateway token.
              </p>
              @if (pendingPairings().length) {
                <ul class="oc-pending">
                  @for (p of pendingPairings(); track p.requestId) {
                    <li class="oc-pending__item">
                      <code class="oc-code">{{ p.requestId }}</code>
                      <button
                        type="button"
                        class="oc-btn oc-btn--sm"
                        (click)="approvePairing(p.requestId)"
                        [disabled]="pairingBusy() || !p.approvable"
                      >
                        {{ p.approvable ? 'Approve' : 'Not allowed' }}
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="oc-card__desc">No pending request yet. Open the Control UI, then come back — this page approves it for you.</p>
              }
              <div class="oc-row">
                <button type="button" class="oc-btn" (click)="approveLatest()" [disabled]="pairingBusy()">
                  {{ pairingBusy() ? 'Approving...' : 'Approve this browser' }}
                </button>
                <button type="button" class="oc-btn oc-btn--ghost" (click)="refreshPairings(true)" [disabled]="pairingLookupBusy()">
                  {{ pairingLookupBusy() ? 'Looking...' : 'Refresh' }}
                </button>
              </div>
              @if (pairingMsg(); as m) {
                <p [class]="m.ok ? 'oc-ok-msg' : 'oc-err-msg'">{{ m.text }}</p>
              }
              <details class="oc-details">
                <summary>Paste a request id</summary>
                <div class="oc-pair-row">
                  <input
                    class="oc-input"
                    [(ngModel)]="pairingCode"
                    name="ocPair"
                    placeholder="Request id from the Control UI, not the gateway token"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <button type="button" class="oc-btn" (click)="approvePairing()" [disabled]="pairingBusy() || !pairingCode.trim()">
                    Approve id
                  </button>
                </div>
              </details>
            </article>
            }

          <!-- ========== SSH ========== -->
          @if (profile().sshAuth) {
          <article class="oc-card oc-ssh" id="step-ssh">
            <h3><span>{{ stepNo('ssh') }}</span> SSH access</h3>
            <p class="oc-card__desc">
              @if (profile().sshAuth === 'key') {
                Connect from your desktop to <strong>your own</strong> {{ profile().brand }} sandbox with a temporary SSH key. The key
                is installed on the instance automatically and is valid for 60 minutes.
              } @else {
                Connect from your desktop to <strong>your own</strong> {{ profile().brand }} server/sandbox. Credentials are valid for
                60 minutes.
              }
            </p>
            @if (sshUnavailable()) {
              <p class="oc-card__desc oc-ssh-unavailable" role="status">
                SSH access isn't available for {{ profile().brand }} yet. We're rolling out isolated per-buyer sandboxes; until
                then, use the dashboard instead.
              </p>
            }
            <button type="button" class="oc-btn" (click)="generateSsh()" [disabled]="sshBusy() || sshUnavailable()">
              {{ sshBusy() ? 'Generating…' : profile().sshAuth === 'key' ? 'Generate SSH key' : 'Generate SSH command' }}
                </button>
            @if (ssh(); as s) {
              <div class="oc-field">
                <p class="oc-label">Username</p>
                <div class="oc-copy-row">
                  <pre class="oc-ssh-cmd">{{ s.username }}</pre>
                <button
                  type="button"
                    class="oc-btn oc-btn--ghost oc-btn--sm"
                    (click)="copyValue(s.username, 'user')"
                  >
                    {{ copied() === 'user' ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </div>

              @if (s.authMethod === 'key' || s.privateKey) {
                <div class="oc-field">
                  <p class="oc-label">Private key {{ s.keyName ? '(' + s.keyName + ')' : '' }}</p>
                  <div class="oc-copy-row">
                    <pre class="oc-ssh-cmd oc-ssh-cmd--select">{{ s.privateKey }}</pre>
                    <button
                      type="button"
                      class="oc-btn oc-btn--ghost oc-btn--sm"
                      (click)="copyValue(s.privateKey, 'key', 'Private key copied — save it to a file before using.')"
                    >
                      {{ copied() === 'key' ? 'Copied' : 'Copy key' }}
                </button>
                  </div>
                  <p class="oc-tip">
                    Save this key to a file (e.g. <code class="oc-code">{{ s.keyName || 'spacebot_key' }}</code>) and
                    restrict its permissions before connecting.
                  </p>
                </div>
              } @else {
                <div class="oc-field">
                  <p class="oc-label">Password</p>
                  <div class="oc-copy-row">
                    <pre class="oc-ssh-cmd oc-ssh-cmd--select">{{ s.password || 'Shown only once when generated. Generate again if you lost it.' }}</pre>
                <button
                  type="button"
                      class="oc-btn oc-btn--ghost oc-btn--sm"
                      (click)="copyValue(s.password, 'pass', 'Password copied — paste it at the ssh password prompt.')"
                >
                      {{ copied() === 'pass' ? 'Copied' : 'Copy password' }}
                </button>
                  </div>
                </div>
              }

              <div class="oc-field">
                <p class="oc-label">Command</p>
                <div class="oc-copy-row">
                  <pre class="oc-ssh-cmd">{{ s.command }}</pre>
                  <button type="button" class="oc-btn oc-btn--ghost oc-btn--sm" (click)="copyValue(s.command, 'cmd')">
                    {{ copied() === 'cmd' ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </div>

              @if (s.expiresInMinutes != null) {
                <p class="oc-ok-msg">{{ s.note }} ({{ s.expiresInMinutes }} min left)</p>
              }
              @if (s.fingerprint) {
                <p class="oc-card__desc">Fingerprint: <code class="oc-code">{{ s.fingerprint }}</code></p>
              }

              @if (s.commandWithPassword) {
                <details class="oc-details">
                  <summary>Linux / macOS (sshpass)</summary>
                  <div class="oc-copy-row">
                    <pre class="oc-ssh-cmd">{{ s.commandWithPassword }}</pre>
                <button
                  type="button"
                      class="oc-btn oc-btn--ghost oc-btn--sm"
                      (click)="copyValue(s.commandWithPassword ?? '', 'sshpass')"
                >
                      {{ copied() === 'sshpass' ? 'Copied' : 'Copy' }}
                </button>
                  </div>
                </details>
              }

              <p class="oc-tip">
                @if (s.authMethod === 'key' || s.privateKey) {
                  <strong>Windows tip:</strong> save the key as <code class="oc-code">{{ s.keyName || 'spacebot_key' }}</code>,
                  then run <code class="oc-code">icacls {{ s.keyName || 'spacebot_key' }} /inheritance:r /grant:r "%USERNAME%:R"</code>
                  so OpenSSH accepts it. macOS/Linux: <code class="oc-code">chmod 600 {{ s.keyName || 'spacebot_key' }}</code>.
                } @else {
                  <strong>Windows tip:</strong> paste the command into Command Prompt, then paste the password when it
                  asks <em>“…password:”</em> (login is <code class="oc-code">ssh</code>, not
                  <code class="oc-code">sshpass</code>). Right-click the terminal window to paste.
                }
              </p>

              <div class="oc-row">
                <button type="button" class="oc-btn oc-btn--ghost" (click)="revokeSsh()" [disabled]="sshBusy()">
                  Revoke
                  </button>
                </div>
            }
          </article>
          }

          <!-- ========== CONNECT FROM TERMINAL (all agent types) ========== -->
          <article class="oc-card" id="step-commands">
            <h3><span>{{ stepNo('commands') }}</span> Connect from your terminal</h3>
            <p class="oc-card__desc">
              Personal commands for <strong>your</strong> {{ profile().brand }} only. Each one carries a short-lived token
              bound to your account and this agent - it cannot touch other users or the platform. Do not share them.
            </p>
            @if (commandsBusy()) {
              <p class="oc-card__desc">Loading your commands...</p>
            } @else if (commandsError()) {
              <p class="oc-err-msg">{{ commandsError() }}</p>
            } @else {
              <details class="oc-details">
                <summary>Show terminal commands</summary>
              <div class="oc-shell-tabs" role="tablist" aria-label="Terminal type">
                @for (t of shellTabs; track t.id) {
                  <button
                    type="button"
                    role="tab"
                    class="oc-shell-tab"
                    [class.oc-shell-tab--active]="shell() === t.id"
                    [attr.aria-selected]="shell() === t.id"
                    (click)="shell.set(t.id)"
                  >{{ t.label }}</button>
                }
              </div>
              @for (c of commands(); track c.id) {
                <div class="oc-cmd">
                  <div class="oc-cmd__head">
                    <p class="oc-cmd__title">{{ c.title }}</p>
                    @if (c.expiresAt) {
                      <span class="oc-cmd__exp">expires {{ c.expiresAt | date: 'HH:mm' }}</span>
                    }
                  </div>
                  <p class="oc-card__desc">{{ c.description }}</p>
                  @if (c.command) {
                    <div class="oc-copy-row">
                      <pre class="oc-ssh-cmd oc-ssh-cmd--select oc-ssh-cmd--wrap">{{ commandText(c) }}</pre>
                      <button type="button" class="oc-btn oc-btn--ghost oc-btn--sm" (click)="copyValue(commandText(c), 'cmd-' + c.id, 'Command copied.')">
                        {{ copied() === 'cmd-' + c.id ? 'Copied' : 'Copy' }}
                      </button>
                    </div>
                  }
                  <p class="oc-cmd__scope">Scope: <code class="oc-code">{{ c.scope }}</code></p>
                </div>
              } @empty {
                <p class="oc-card__desc">No terminal commands for {{ profile().brand }} - use the launch button above.</p>
              }
              <button type="button" class="oc-link" (click)="loadCommands()">Refresh commands</button>
              </details>
            }
          </article>

          <!-- ========== CONFIG / ABOUT ========== -->
          <article class="oc-card" id="step-config">
            <h3><span>{{ stepNo('config') }}</span> Configuration</h3>
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
        AI Markets
        <a routerLink="/hire-agent" class="oc-setup__foot-link">My Agents</a>
      </footer>
    </div>
  `,
})
export class OpenClawSetupWizardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly gateway = inject(OpenClawGatewayService);
  private readonly notice = inject(LaunchNoticeService);
  private readonly seo = inject(SeoService);

  readonly channels = OPENCLAW_CHANNELS;
  /** Channel grid shown by the current profile (OpenClaw vs SpaceBot). */
  readonly activeChannels = computed<ChannelGuide[]>(() =>
    this.profile().channelSet === 'spacebot' ? SPACEBOT_CHANNELS : OPENCLAW_CHANNELS,
  );
  /** Same step list for every agent type; cards that do not apply are simply omitted. */
  readonly steps = computed<{ id: string; title: string }[]>(() => {
    const p = this.profile();
    const list = [{ id: 'launch', title: 'Launch' }];
    if (p.channels) list.push({ id: 'channels', title: 'Channels' });
    if (p.pairing) list.push({ id: 'pairing', title: 'Device & DM pairing' });
    if (p.sshAuth) list.push({ id: 'ssh', title: 'SSH access' });
    list.push({ id: 'commands', title: 'Terminal' });
    list.push({ id: 'config', title: 'Configuration' });
    return list;
  });

  stepNo(id: string): number {
    return this.steps().findIndex((s) => s.id === id) + 1;
  }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  readonly commands = signal<AgentConnectCommand[]>([]);
  readonly commandsBusy = signal(false);
  readonly commandsError = signal('');
  readonly pairingMsg = signal<{ ok: boolean; text: string } | null>(null);

  readonly shellTabs: { id: TerminalShell; label: string }[] = [
    { id: 'cmd', label: 'Windows (cmd)' },
    { id: 'powershell', label: 'PowerShell' },
    { id: 'posix', label: 'macOS / Linux' },
  ];
  readonly shell = signal<TerminalShell>(this.detectShell());
  readonly pairingLookupBusy = signal(false);

  private detectShell(): TerminalShell {
    const ua = typeof navigator === 'undefined' ? '' : `${navigator.userAgent} ${navigator.platform || ''}`;
    return /Win/i.test(ua) ? 'cmd' : 'posix';
  }

  hasPlaceholderCommand(): boolean {
    return this.commands().some((c) => Boolean(c.placeholder && c.command));
  }

  /** Single-line command for the selected shell. Only a real pending request id is filled in. */
  commandText(c: AgentConnectCommand): string {
    const base = c.variants?.[this.shell()] || c.command || '';
    const rid = this.pairingCode.trim();
    const known = this.pendingPairings().some((p) => p.requestId === rid);
    if (c.placeholder && known) return base.split(c.placeholder).join(rid);
    return base;
  }

  /** Loads this buyer's own pending requests. Approves the newest one while the page is open. */
  refreshPairings(userInitiated = false, autoApprove = false): void {
    const agent = this.agent();
    if (!this.profile().pairing || this.pairingLookupBusy()) return;
    this.pairingLookupBusy.set(true);
    this.gateway.getPendingPairings(agent).subscribe((res) => {
      this.pairingLookupBusy.set(false);
      const pending = res.pending || [];
      this.pendingPairings.set(pending);
      const own = pending.filter((p) => p.approvable);
      if (autoApprove && own.length && !this.pairingBusy()) {
        this.approvePairing(own[own.length - 1].requestId, true);
        return;
      }
      if (!userInitiated) return;
      this.pairingMsg.set(
        own.length
          ? { ok: true, text: own.length === 1 ? 'Found your pending request.' : `Found ${own.length} requests from your workspace.` }
          : {
              ok: false,
              text: res.success
                ? 'No pending request from your workspace. Open the Control UI from aimarkets.vn, then click Approve this browser.'
                : res.message || 'Could not load pairing requests.',
            },
      );
    });
  }

  private startPairingWatch(): void {
    this.stopPairingWatch();
    if (!this.profile().pairing) return;
    let left = 12;
    const tick = () => {
      if (left <= 0) {
        this.stopPairingWatch();
        return;
      }
      left -= 1;
      this.refreshPairings(false, true);
    };
    tick();
    this.pairingWatch = setInterval(tick, 4000);
  }

  private stopPairingWatch(): void {
    if (this.pairingWatch) clearInterval(this.pairingWatch);
    this.pairingWatch = null;
  }

  loadCommands(): void {
    const agent = this.agent();
    if (!agent || !this.isLaunchable()) return;
    this.commandsBusy.set(true);
    this.commandsError.set('');
    this.gateway.getConnectCommands(agent).subscribe((res) => {
      this.commandsBusy.set(false);
      this.commands.set(res.success ? res.commands : []);
      if (!res.success) this.commandsError.set(res.message || 'Sign in to see your personal commands.');
      if (res.success && this.hasPlaceholderCommand() && !this.pendingPairings().length) this.refreshPairings();
    });
  }

  readonly agent = signal<MarketplaceAgent | null>(null);
  readonly selectedChannel = signal<ChannelGuide | null>(null);
  readonly launched = signal(false);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly launchError = signal('');
  readonly creds = signal<{ username: string; password: string } | null>(null);
  readonly pairingBusy = signal(false);
  readonly pendingPairings = signal<PendingPairing[]>([]);
  /** Key of the field most recently copied to the clipboard. */
  readonly copied = signal('');
  private copyTimer: ReturnType<typeof setTimeout> | null = null;


  readonly ssh = signal<OpenClawSshAccess | null>(null);
  readonly sshBusy = signal(false);
  /** Server answered 403 `ssh_not_isolated`: SSH is off until per-buyer sandboxes exist. */
  readonly sshUnavailable = signal(false);
  sshPlaceholder = '{userId}.openclaw.aimarkets.vn';
  pairingCode = '';
  private pairingWatch: ReturnType<typeof setInterval> | null = null;

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
      this.pairingMsg.set(null);
      this.pendingPairings.set([]);
      this.pairingCode = '';
      this.loadCommands();
      this.startPairingWatch();

      if (agent && this.gateway.supportsSsh(agent)) {
        this.gateway.getActiveSsh(agent.id).subscribe((res) => {
          if (res.active && res.session) this.ssh.set({ ...res.session, success: true });
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPairingWatch();
  }

  selectChannel(ch: ChannelGuide): void {
    this.selectedChannel.set(ch);
    this.status.set('');
  }

  clearChannel(): void {
    this.selectedChannel.set(null);
  }

  copyText(text: string, message: string): void {
    if (!text) return;
    this.status.set(message);
    void this.writeClipboard(text);
  }

  /** Copy a single SSH field (username / password / command) with inline "Copied" feedback. */
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

  copyCreds(): void {
    const c = this.creds();
    if (!c) return;
    this.copyText(`username: ${c.username}\npassword: ${c.password}`, 'Credentials copied');
  }

  openUi(): void {
    const agent = this.agent();
    if (!agent || !this.gateway.isLaunchableAgent(agent)) {
      this.launchError.set(this.gateway.comingSoonMessage(agent));
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.launchError.set('');
    this.status.set(`Opening ${agent.name} at ${this.host()}…`);
    // OpenClaw: open the Control UI with a single-use, non-admin bootstrap token so
    // this browser pairs itself (the API falls back to the classic launch).
    this.gateway.launchWithPlan(agent, { bootstrap: true }).subscribe((res) => {
      this.busy.set(false);
      this.notice.report(agent, this.gateway.runtimeInfo(agent).label, res, () => this.openUi());
      if (res.success) {
        this.launched.set(true);
        if (res.username && res.password) {
          this.creds.set({ username: res.username, password: res.password });
        }
        this.status.set(
          res.rental
            ? 'Rented — use “Open” in the notice to start it.'
            : res.pairingMode === 'bootstrap'
              ? 'Opened. This browser pairs itself with standard (non-admin) access. Link valid for 10 minutes, one use.'
              : 'Opened — this browser will be approved automatically.',
        );
        if (res.pairingMode !== 'bootstrap') this.startPairingWatch();
      } else if (res.code !== 'RENT_CANCELLED') {
        const msg = res.message || 'Failed to open the dashboard';
        this.launchError.set(msg);
        this.status.set(msg);
      }
    });
  }

  approveLatest(): void {
    const own = this.pendingPairings().filter((p) => p.approvable);
    this.approvePairing(own.length ? own[own.length - 1].requestId : '');
  }

  approvePairing(requestId = this.pairingCode.trim(), silent = false): void {
    const id = String(requestId || '').trim();
    if (this.pairingBusy()) return;
    this.pairingBusy.set(true);
    if (!silent) this.pairingMsg.set(null);
    this.gateway.approvePairing(id || null, this.agent()).subscribe((res) => {
      this.pairingBusy.set(false);
      if (res.success) {
        this.pairingCode = '';
        this.pendingPairings.update((list) => list.filter((p) => p.requestId !== id));
        this.pairingMsg.set({ ok: true, text: res.message || 'Device approved. Reload the Control UI tab.' });
        this.stopPairingWatch();
        this.refreshPairings();
      } else if (!silent) {
        this.pairingMsg.set({ ok: false, text: res.message || 'Approve failed.' });
      }
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
      .generateSsh({ agentId: agent.id })
      .subscribe((res) => {
        this.sshBusy.set(false);
        if (res.success && res.command) {
          this.ssh.set(res);
          this.status.set('SSH command ready — valid 60 minutes.');
          this.loadCommands();
        } else if (res.code === 'ssh_not_isolated') {
          this.sshUnavailable.set(true);
          this.ssh.set(null);
          this.status.set('SSH access is not available yet for this agent.');
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
    if (this.gateway.isSpacebotAgent(agent)) return 'spacebot';
    if (this.gateway.isOpenWebuiAgent(agent)) return 'openwebui';
    if (this.gateway.isPaperclipAgent(agent)) return 'paperclip';
    return 'openclaw';
  }
}
