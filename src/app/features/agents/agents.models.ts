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
  availability?: { available: boolean; code?: string; message?: string };
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
  /** Same Launch click replayed: no second charge. */
  duplicate?: boolean;
  walletTxId?: string | null;
  chargedAmount?: number;
  chargedVnd?: number;
  chargedCurrency?: string;
  chargedAt?: string | null;
}

/** What a Launch did to the wallet (shown in the launch notice). */
export interface AgentRentalReceipt {
  charged: boolean;
  duplicate?: boolean;
  walletTxId?: string | null;
  chargedVnd: number;
  periodDays: number;
  paidUntil: string | null;
  autoRenew: boolean;
}

export interface AgentRentalRefund {
  refunded: boolean;
  alreadyRefunded?: boolean;
  feeVnd?: number;
  /** Refund request itself failed — support must reverse the charge. */
  failed?: boolean;
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
  /**
   * 'bootstrap': the URL carries a single-use, non-admin bootstrap token and the
   * Control UI pairs this browser by itself. 'token': classic launch (pairing
   * approved separately); bootstrapFallback says why bootstrap was not used.
   */
  pairingMode?: 'bootstrap' | 'token';
  bootstrapFallback?: string;
  bootstrapExpiresAt?: number | null;
  /** Set when this Launch rented the agent (wallet charge). */
  rental?: AgentRentalReceipt;
  /** Set when provisioning failed after a charge and the rental was refunded. */
  refund?: AgentRentalRefund;
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
  /** Machine-readable error, e.g. `ssh_not_isolated` when SSH is disabled server-side. */
  code?: string;
  active?: boolean;
  session?: OpenClawSshAccess | null;
}

/** One copyable command on the setup page; `scope` is `<runtime>:<userId>:<action>`. */
export interface AgentConnectCommand {
  id: string;
  title: string;
  description: string;
  command: string | null;
  /** Single-line variants per shell (Windows cmd.exe, PowerShell, macOS/Linux). */
  variants?: { cmd: string; powershell: string; posix: string };
  /** Literal token in the command to replace with the pairing request id. */
  placeholder?: string;
  scope: string;
  expiresAt: string | null;
}

export type TerminalShell = 'cmd' | 'powershell' | 'posix';

export interface PendingPairing {
  requestId: string;
  deviceId?: string;
  scopes?: string[];
  approvable: boolean;
  reason?: string;
}

export interface AgentConnectCommands {
  success: boolean;
  runtime?: string;
  userId?: string;
  features?: { label: string; pairing: boolean; ssh: boolean; sso: boolean };
  commands: AgentConnectCommand[];
  message?: string;
}
