export type DeploymentKind = 'model' | 'agent';
export type DeploymentStatus = 'provisioning' | 'running' | 'stopped';
export type DeploymentVisibility = 'private' | 'public';

/** Live seller runtime — mirrors Product.runtime. */
export interface DeploymentRuntime {
  serverlessEndpoint: string;
  tokenizeEndpoint: string;
  gatewayUrl: string;
  publicEndpoint: string;
  env?: Array<{ key: string; value: string }>;
  envKeys?: string[];
  skills: string[];
  baseModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

/** @deprecated use DeploymentRuntime — kept for older template bindings */
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
  productId?: string;
  productSlug: string;
  productName: string;
  ownerName?: string;
  /** Public/serverless URL exposed to buyers. */
  endpoint: string;
  runtime: DeploymentRuntime;
  /** Legacy alias — same inference fields as runtime.skills → tools. */
  config?: DeploymentConfig;
  apiKey?: string;
  totals: DeploymentTotals;
  createdAt?: string;
  updatedAt?: string;
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
  endpoint?: string;
  tokenizeEndpoint?: string;
  gatewayUrl?: string;
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
