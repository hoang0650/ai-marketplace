import { environment } from '../../environments/environment';

/** White-label API host (no version suffix). */
export const AIMARKETS_API_HOST = environment.apiUrl.replace(/\/v1\/?$/, '');
export const AIMARKETS_AI_HOST = environment.aiUrl.replace(/\/v1\/?$/, '');

const trimSlash = (url: string) => url.replace(/\/$/, '');

const PROVIDER_HOST_RE =
  /(api\.runpod\.ai|proxy\.runpod\.net|api\.featherless\.ai|openrouter\.ai|ai-gateway\.vercel\.sh)/i;

export function isProviderUrl(url?: string | null): boolean {
  return !!url && PROVIDER_HOST_RE.test(url);
}

export function publicGatewayUrls(modelId: string) {
  const id = encodeURIComponent(String(modelId || 'model').replace(/^runpod-/, '') || 'model');
  const v1 = trimSlash(environment.apiUrl);
  const v2 = trimSlash(environment.apiV2Url);
  const aiV1 = trimSlash(environment.aiV1Url);
  return {
    /** Sync inference — gateway v1 */
    publicEndpoint: `${v1}/models/${id}/runsync`,
    /** Async serverless — gateway v2 (RunPod-style) */
    serverlessEndpoint: `${v2}/${id}/run`,
    tokenizeEndpoint: `${v1}/models/${id}/tokenize`,
    gatewayUrl: aiV1,
    statusUrl: `${v2}/${id}/status/JOB_ID`,
  };
}

export function extractProviderEndpointId(url?: string): string {
  if (!url) return '';
  const m = url.match(/\/v2\/([^/]+)\//);
  return m ? m[1] : '';
}

/** Mask any leftover provider hosts in a runtime object for display. */
export function maskRuntimeUrls(
  runtime: {
    publicEndpoint?: string;
    serverlessEndpoint?: string;
    tokenizeEndpoint?: string;
    gatewayUrl?: string;
    baseModel?: string;
  } | null | undefined,
  modelId?: string,
) {
  const r = runtime || {};
  const id =
    modelId ||
    extractProviderEndpointId(r.publicEndpoint) ||
    extractProviderEndpointId(r.serverlessEndpoint) ||
    String(r.baseModel || 'model');
  const g = publicGatewayUrls(id);
  if (
    isProviderUrl(r.publicEndpoint) ||
    isProviderUrl(r.serverlessEndpoint) ||
    isProviderUrl(r.gatewayUrl) ||
    isProviderUrl(r.tokenizeEndpoint) ||
    !r.publicEndpoint
  ) {
    return {
      ...r,
      publicEndpoint: g.publicEndpoint,
      serverlessEndpoint: g.serverlessEndpoint,
      tokenizeEndpoint: g.tokenizeEndpoint,
      gatewayUrl: g.gatewayUrl,
    };
  }
  return {
    ...r,
    gatewayUrl: r.gatewayUrl || g.gatewayUrl,
  };
}
