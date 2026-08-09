/** White-label hosts — buyers never see upstream provider domains. */
export const AIMARKETS_API_HOST = 'https://api.aimarkets.vn';
export const AIMARKETS_AI_HOST = 'https://ai.aimarkets.vn';

const PROVIDER_HOST_RE =
  /(api\.runpod\.ai|proxy\.runpod\.net|api\.featherless\.ai|ai-gateway\.vercel\.sh)/i;

export function isProviderUrl(url?: string | null): boolean {
  return !!url && PROVIDER_HOST_RE.test(url);
}

export function publicGatewayUrls(modelId: string) {
  const id = encodeURIComponent(String(modelId || 'model').replace(/^runpod-/, '') || 'model');
  return {
    publicEndpoint: `${AIMARKETS_API_HOST}/v1/models/${id}/runsync`,
    serverlessEndpoint: `${AIMARKETS_API_HOST}/v1/models/${id}/run`,
    tokenizeEndpoint: `${AIMARKETS_API_HOST}/v1/models/${id}/tokenize`,
    gatewayUrl: `${AIMARKETS_AI_HOST}/v1`,
    statusUrl: `${AIMARKETS_API_HOST}/v1/models/${id}/status/JOB_ID`,
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
