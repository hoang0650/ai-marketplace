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

export interface AgentFee {
  vnd: number;
  amount: number;
  currency: string;
  periodDays: number;
}

/** Public price row from GET /agents/pricing. */
export interface AgentPricing {
  agentId: AgentRuntimeKind;
  fee: AgentFee;
  /** Markup over the provider price on AI Markets-provided models (0.25 = +25%). */
  tokenMarkup: number;
  /** Runs only on the buyer's own provider keys — never billed per token. */
  byokOnly: boolean;
}

/** Monthly plan of one hosted agent (GET/POST /agents/subscriptions/:agentId). */
export interface AgentSubscriptionStatus {
  agentId: AgentRuntimeKind;
  active: boolean;
  exempt: boolean;
  paidUntil: string | null;
  daysLeft: number;
  /** Wallet auto-renewal (on by default; renews ~1 day before expiry). */
  autoRenew: boolean;
  /** Set once the plan expired: workspace data is deleted at this time unless renewed. */
  purgeDueAt: string | null;
  purgedAt: string | null;
  retentionDays: number;
  fee: AgentFee;
  charged?: boolean;
}

export const AGENT_SUBSCRIPTION_REQUIRED = 'AGENT_SUBSCRIPTION_REQUIRED';

export interface OpenClawLaunchResult {
  success: boolean;
  code?: string;
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
