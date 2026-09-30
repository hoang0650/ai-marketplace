import { Product } from './marketplace.models';
import { findRunpodPublicEndpoint, RunpodPublicEndpoint } from './runpod-public-endpoints';
import { publicGatewayUrls } from './gateway-urls';

export function isRunpodProduct(p: Product | null | undefined): boolean {
  if (!p) return false;
  return (
    /^(?:aim|runpod)-/.test(p.slug) ||
    p.tags?.includes('public-endpoint') ||
    p.tags?.includes('aimarkets') ||
    !!p.runtime?.publicEndpoint?.includes('aimarkets.vn') ||
    !!p.runtime?.publicEndpoint?.includes('api.runpod.ai') ||
    !!p.runtime?.serverlessEndpoint?.includes('api.runpod.ai')
  );
}

export function runpodCatalogSlug(p: Product): string {
  return p.slug.replace(/^(?:aim|runpod)-/, '');
}

export function resolveRunpodEndpoint(p: Product): RunpodPublicEndpoint | undefined {
  return (
    findRunpodPublicEndpoint(runpodCatalogSlug(p)) ||
    findRunpodPublicEndpoint(p.runtime?.publicEndpoint || '') ||
    findRunpodPublicEndpoint(p.runtime?.serverlessEndpoint || '')
  );
}

/** Buyer-facing operation URL on api.aimarkets.vn (never upstream provider hosts). */
export function runpodOperationUrl(
  p: Product,
  action: 'run' | 'runsync' | 'status',
  jobId = 'JOB_ID',
): string {
  const ep = resolveRunpodEndpoint(p);
  const modelId = ep?.slug || runpodCatalogSlug(p) || p.slug;
  const g = publicGatewayUrls(modelId);
  if (action === 'runsync') {
    return p.runtime?.publicEndpoint?.includes('aimarkets.vn')
      ? p.runtime.publicEndpoint
      : g.publicEndpoint;
  }
  if (action === 'run') {
    return p.runtime?.serverlessEndpoint?.includes('aimarkets.vn')
      ? p.runtime.serverlessEndpoint
      : g.serverlessEndpoint;
  }
  return g.statusUrl.replace('JOB_ID', jobId);
}

