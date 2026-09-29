export type AgentStatus = 'running' | 'archived' | 'provisioning' | 'stopped';

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: 'openclaw' | 'hermes' | 'nano' | 'webui' | 'paperclip' | 'space';
  logoUrl: string;
  version: string;
  model: string;
  docsUrl: string;
  public: boolean;
  hireProductSlug?: string;
  /** Launchable AI Markets agents (OpenClaw Control UI, Hermes, NanoClaw, SpaceBot, Open WebUI, Paperclip). */
  openclawGateway?: boolean;
  hermesGateway?: boolean;
  nanoclawGateway?: boolean;
  spacebotGateway?: boolean;
  /** Per-buyer account on {userId}.openwebui.aimarkets.vn, signed in by a launch SSO ticket. */
  openwebuiGateway?: boolean;
  /** Per-buyer account on {userId}.paperclip.aimarkets.vn, signed in by a launch SSO ticket. */
  paperclipGateway?: boolean;
}

export type AgentRuntimeKind = 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot' | 'openwebui' | 'paperclip';

export interface HiredAgent {
  id: string;
  agentId: string;
  slug: string;
  name: string;
  status: AgentStatus;
  version: string;
  model: string;
  launchedAt: string;
  archivedAt?: string;
}

export interface OpenClawLaunchResult {
  success: boolean;
  url?: string;
  message?: string;
  gatewayUrl?: string;
  token?: string;
  gatewayToken?: string;
  username?: string;
  password?: string;
  autoLogin?: boolean;
  audience?: string;
  userId?: string;
}

export interface OpenClawSshAccess {
  success: boolean;
  id?: string;
  agentId?: string;
  authMethod?: 'password' | 'key';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  publicKey?: string;
  fingerprint?: string;
  keyName?: string;
  installed?: boolean;
  command?: string;
  commandWithPassword?: string;
  expiresAt?: string;
  expiresInMinutes?: number;
  note?: string;
  howTo?: string[];
  message?: string;
  active?: boolean;
  session?: OpenClawSshAccess | null;
}
