export type DeploymentKind = 'model' | 'agent';
export type DeploymentStatus = 'provisioning' | 'running' | 'stopped';
export type DeploymentVisibility = 'private' | 'public';

export interface DeploymentConfig {
  baseModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
}

export interface DeploymentTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface Deployment {
  id: string;
  name: string;
  slug: string;
  kind: DeploymentKind;
  status: DeploymentStatus;
  visibility: DeploymentVisibility;
  productSlug: string;
  productName: string;
  ownerName?: string;
  config: DeploymentConfig;
  endpoint: string;
  apiKey?: string;
  totals: DeploymentTotals;
  createdAt?: string;
}

export interface InvokeResult {
  ok: boolean;
  eventId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  sellerNet: number;
  platformFee: number;
  currency: string;
  output: string;
}

export interface DeploymentUsage {
  totals: DeploymentTotals;
  events: Array<{
    id: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    sellerNet: number;
    createdAt: string;
  }>;
}
