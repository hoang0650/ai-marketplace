import { Creator, Product, User } from './marketplace.models';
import { publicGatewayUrls } from './gateway-urls';
import { RUNPOD_PUBLIC_ENDPOINTS, RunpodPublicEndpoint } from './runpod-public-endpoints';

const CREATOR_SLUG = 'aimarkets';

const COVER_BY_KIND: Record<string, string> = {
  image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&q=80',
  video: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&q=80',
  text: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  audio: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80',
};

const FEATURED = new Set([
  'flux-schnell',
  'flux-dev',
  'qwen3-32b',
  'moonshot-kimi',
  'wan-2-5',
  'kling-v2-1',
  'sora-2',
  'seedream-4-t2i',
]);

function usageUnitFromPricing(pricing: string, kind: string): string {
  const p = pricing.toLowerCase();
  if (p.includes('megapixel')) return 'megapixel';
  if (p.includes('1m token') || p.includes('tokens')) return '1M tokens';
  if (p.includes('1k char')) return '1K chars';
  if (p.includes('/second') || p.includes('per second') || p.includes('/s')) return 'second';
  if (kind === 'image') return 'image';
  if (kind === 'video') return 'video';
  if (kind === 'audio') return 'second';
  return 'request';
}

function usageRateFromPricing(pricing: string): number {
  const m = pricing.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : 0;
}

function apiDocs(ep: RunpodPublicEndpoint): string {
  const g = publicGatewayUrls(ep.slug);
  return `## ${ep.name}

Hosted on **AI Markets** (\`api.aimarkets.vn\` / \`ai.aimarkets.vn\`).

- **Sync:** \`POST ${g.publicEndpoint}\`
- **Async:** \`POST ${g.serverlessEndpoint}\`
- **OpenAI base:** \`${g.gatewayUrl}\`
- **Pricing:** ${ep.pricing}

Auth: marketplace JWT via \`POST /api/playground/run\`
`;
}

export function buildRunpodMarketplaceProducts(): Product[] {
  return RUNPOD_PUBLIC_ENDPOINTS.map((ep, index) => {
    const cover = COVER_BY_KIND[ep.kind] || COVER_BY_KIND['image'];
    return {
      id: `p-runpod-${ep.slug}`,
      slug: `runpod-${ep.slug}`,
      name: ep.name,
      tagline: `${ep.pricing} · AI Markets endpoint`,
      description: `${ep.description} Available on AI Markets via \`api.aimarkets.vn\` (model \`${ep.slug}\`).`,
      category: ep.modality,
      creatorId: 'c-runpod',
      creatorSlug: CREATOR_SLUG,
      creatorName: 'AI Markets Models',
      coverUrl: cover,
      gallery: [cover],
      pricing: {
        model: 'usage',
        price: 0,
        currency: 'USD',
        usageUnit: usageUnitFromPricing(ep.pricing, ep.kind),
        usageRate: usageRateFromPricing(ep.pricing),
      },
      runtime: (() => {
        const g = publicGatewayUrls(ep.slug);
        return {
          publicEndpoint: g.publicEndpoint,
          serverlessEndpoint: g.serverlessEndpoint,
          tokenizeEndpoint: g.tokenizeEndpoint,
          gatewayUrl: g.gatewayUrl,
          envKeys: ['MARKETPLACE_API_KEY', 'UPSTREAM_RUNSYNC', 'AI_PROVIDER'],
          skills: [],
          baseModel: ep.openaiModel || ep.name,
          systemPrompt: '',
          temperature: 0.7,
          maxTokens: 1024,
        };
      })(),
      rating: 4.6,
      reviewCount: 12 + (index % 40),
      installCount: 800 + index * 37,
      tags: ['aimarkets', 'public-endpoint', ep.kind, ep.modality, ep.endpointId],
      apiDocsMarkdown: apiDocs(ep),
      changelog: [
        {
          version: '1.0.0',
          date: '2026-08-09',
          notes: 'Listed on AI Markets gateway (api.aimarkets.vn).',
        },
      ],
      featured: FEATURED.has(ep.slug),
      publishedAt: '2026-08-09T00:00:00.000Z',
    };
  });
}

export function buildRunpodCreator(): Creator {
  return {
    id: 'c-runpod',
    slug: CREATOR_SLUG,
    name: 'AI Markets Models',
    bio: 'Hosted model endpoints on AI Markets — call via api.aimarkets.vn.',
    avatarUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=aimarkets',
    coverUrl: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=1600&q=80',
    verified: true,
    productCount: RUNPOD_PUBLIC_ENDPOINTS.length,
    rating: 4.9,
    totalSales: 50000,
  };
}

export function buildRunpodUser(): User {
  return {
    id: 'u-runpod',
    email: 'models@aimarkets.vn',
    name: 'AI Markets Models',
    role: 'creator',
    creatorSlug: CREATOR_SLUG,
    bio: 'Hosted models on AI Markets.',
    avatarUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=aimarkets',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Merge official RunPod listings into mock DB (dedupe by slug). */
export function mergeRunpodIntoMarketplace(db: {
  users: User[];
  creators: Creator[];
  products: Product[];
}): void {
  const user = buildRunpodUser();
  const creator = buildRunpodCreator();
  const products = buildRunpodMarketplaceProducts();

  if (!db.users.some((u) => u.id === user.id || u.email === user.email)) {
    db.users.push(user);
  }
  if (!db.creators.some((c) => c.slug === creator.slug)) {
    db.creators.push(creator);
  } else {
    const i = db.creators.findIndex((c) => c.slug === creator.slug);
    db.creators[i] = { ...db.creators[i], ...creator };
  }

  const bySlug = new Map(db.products.map((p) => [p.slug, p]));
  for (const p of products) {
    bySlug.set(p.slug, p);
  }
  db.products = [...bySlug.values()];
}
