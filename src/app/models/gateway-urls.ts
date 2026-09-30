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
  const id = encodeURIComponent(String(modelId || 'model').replace(/^(?:aim|runpod)-/, '') || 'model');
  const slug = decodeURIComponent(id);
  const v1 = trimSlash(environment.apiUrl);
  const v2 = trimSlash(environment.apiV2Url);
  const aiV1 = trimSlash(environment.aiV1Url);
  const web = environment.production ? 'https://aimarkets.vn' : '';
  return {
    /** Sync inference — marketplace gateway */
    publicEndpoint: `${v1}/models/${id}/runsync`,
    /** Async job submit — same gateway (v2 alias also works) */
    serverlessEndpoint: `${v1}/models/${id}/run`,
    tokenizeEndpoint: `${v1}/models/${id}/tokenize`,
    gatewayUrl: aiV1,
    statusUrl: `${v1}/models/${id}/status/JOB_ID`,
    statusUrlTemplate: `${v1}/models/${id}/status/{JOB_ID}`,
    docsUrl: web ? `${web}/docs/models/${slug}` : `/docs/models/${slug}`,
    v2RunUrl: `${v2}/${id}/run`,
    v2StatusUrl: `${v2}/${id}/status/JOB_ID`,
  };
}

/** Internal RunPod hosts — seller .env only, never shown as public catalog URLs. */
export function upstreamRunpodUrls(endpointId: string, openai = false) {
  const id = String(endpointId || '').trim();
  if (!id) return { runsync: '', run: '', gateway: '' };
  return {
    runsync: `https://api.runpod.ai/v2/${id}/runsync`,
    run: `https://api.runpod.ai/v2/${id}/run`,
    gateway: openai ? `https://api.runpod.ai/v2/${id}/openai/v1` : '',
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
