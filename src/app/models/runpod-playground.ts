import { Product } from './marketplace.models';
import { findRunpodPublicEndpoint, RunpodPublicEndpoint } from './runpod-public-endpoints';
import { publicGatewayUrls } from './gateway-urls';

export function isRunpodProduct(p: Product | null | undefined): boolean {
  if (!p) return false;
  return (
    p.slug.startsWith('runpod-') ||
    p.tags?.includes('public-endpoint') ||
    p.tags?.includes('aimarkets') ||
    !!p.runtime?.publicEndpoint?.includes('aimarkets.vn') ||
    !!p.runtime?.publicEndpoint?.includes('api.runpod.ai') ||
    !!p.runtime?.serverlessEndpoint?.includes('api.runpod.ai')
  );
}

export function runpodCatalogSlug(p: Product): string {
  return p.slug.replace(/^runpod-/, '');
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

export const RUNPOD_VIDEO_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const RUNPOD_VIDEO_ASPECT = ['21:9', '16:9', '9:16', '1:1', '4:3', '3:4'] as const;

/** Seedance-style dual resolution rates when catalog only has a range. */
export function runpodVideoPriceHint(ep: RunpodPublicEndpoint | undefined, resolution: string): string {
  if (!ep) return '';
  if (ep.slug === 'seedance-1-5-pro' || ep.pricing.includes('0.024')) {
    return `$ 480p: $0.024 per second · 720p: $0.052 per second`;
  }
  return ep.pricing;
}

export function estimateSeedanceCost(duration: number, resolution: '480p' | '720p'): number {
  const rate = resolution === '480p' ? 0.024 : 0.052;
  return Math.round(rate * duration * 1000) / 1000;
}
