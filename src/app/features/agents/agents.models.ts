export type AgentStatus = 'running' | 'archived' | 'provisioning' | 'stopped';

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: 'openclaw' | 'hermes' | 'nano' | 'webui' | 'tavern' | 'space';
  logoUrl: string;
  version: string;
  model: string;
  docsUrl: string;
  public: boolean;
  hireProductSlug?: string;
  /** Launchable AI Markets agents (OpenClaw Control UI or Hermes dashboard). */
  openclawGateway?: boolean;
  hermesGateway?: boolean;
}

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
  host?: string;
  port?: number;
  username?: string;
  password?: string;
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
