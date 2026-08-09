import catalog from '../../assets/runpod-public-endpoints.json';
import { ProductCategory } from './marketplace.models';
import { publicGatewayUrls } from './gateway-urls';

/** Official RunPod Public Endpoint kinds from docs.runpod.io/public-endpoints */
export type RunpodEndpointKind = 'image' | 'video' | 'text' | 'audio';

export interface RunpodPublicEndpoint {
  slug: string;
  name: string;
  description: string;
  kind: RunpodEndpointKind;
  /** Marketplace modality used when attaching to a product/deployment. */
  modality: ProductCategory;
  endpointId: string;
  /** Sync request URL — docs primary Public Endpoint. */
  runsyncUrl: string;
  /** Async job submit URL. */
  runUrl: string;
  /** Poll template; replace `{JOB_ID}`. */
  statusUrlTemplate: string;
  /** Present for OpenAI-compatible text models. */
  openaiBaseUrl: string | null;
  openaiModel: string | null;
  pricing: string;
  docsUrl: string;
}

export const RUNPOD_PUBLIC_ENDPOINTS = catalog as RunpodPublicEndpoint[];

export const RUNPOD_ENDPOINT_KIND_LABEL: Record<RunpodEndpointKind, string> = {
  image: 'Image',
  video: 'Video',
  text: 'Text',
  audio: 'Audio',
};

export function runpodEndpointsByKind(kind?: RunpodEndpointKind | null): RunpodPublicEndpoint[] {
  if (!kind) return RUNPOD_PUBLIC_ENDPOINTS;
  return RUNPOD_PUBLIC_ENDPOINTS.filter((e) => e.kind === kind);
}

export function runpodEndpointsByModality(modality?: ProductCategory | null): RunpodPublicEndpoint[] {
  if (!modality) return RUNPOD_PUBLIC_ENDPOINTS;
  return RUNPOD_PUBLIC_ENDPOINTS.filter((e) => e.modality === modality);
}

export function findRunpodPublicEndpoint(slugOrId: string): RunpodPublicEndpoint | undefined {
  const key = slugOrId.trim().toLowerCase();
  return RUNPOD_PUBLIC_ENDPOINTS.find(
    (e) =>
      e.slug === key ||
      e.endpointId === key ||
      e.runsyncUrl === slugOrId.trim() ||
      e.runUrl === slugOrId.trim(),
  );
}

/** Map a catalog pick onto Product/Deployment runtime fields (buyer-facing aimarkets.vn). */
export function runtimeFromRunpodPublicEndpoint(ep: RunpodPublicEndpoint) {
  const g = publicGatewayUrls(ep.slug);
  return {
    /** White-label sync URL — never expose upstream provider hosts. */
    publicEndpoint: g.publicEndpoint,
    /** White-label async URL. */
    serverlessEndpoint: g.serverlessEndpoint,
    /** OpenAI-compatible base on ai.aimarkets.vn. */
    gatewayUrl: g.gatewayUrl,
    tokenizeEndpoint: g.tokenizeEndpoint,
    baseModel: ep.openaiModel || ep.name,
    /** Internal upstream (seller .env) — not shown as public endpoint fields. */
    _upstream: {
      runsync: ep.runsyncUrl,
      run: ep.runUrl,
      gateway: ep.openaiBaseUrl || '',
      endpointId: ep.endpointId,
    },
  };
}
