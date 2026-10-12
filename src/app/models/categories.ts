import {
  CatalogLane,
  CategoryGroup,
  CategoryMeta,
  NavGroup,
  ProductCategory,
} from '../models/marketplace.models';

export const CATALOG_LANE_LABEL: Record<CatalogLane, string> = {
  ai: 'AI',
};

export const CATALOG_LANE_LABEL_VI: Record<CatalogLane, string> = {
  ai: 'Sàn AI',
};

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  models: 'AI models',
  skills: 'Skill packs',
  hire: 'Professional services',
  apis: 'APIs & inference',
};

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  generate: 'Generate',
  apis: 'APIs & inference',
  platform: 'Platform',
  talent: 'Professional services',
};

export interface NavLink {
  path: string;
  labelKey: string;
}

export interface NavSection {
  id: 'generate' | 'build' | 'apis' | 'platform' | 'talent';
  titleKey: string;
  links: NavLink[];
}

export const AI_CATEGORIES: CategoryMeta[] = [
  {
    id: 'text-to-text',
    label: 'Text to Text',
    description: 'LLMs, chat, embeddings, and reasoning models.',
    hubPath: '/text-to-text',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'text-to-image',
    label: 'Text to Image',
    description: 'Create images from text prompts.',
    hubPath: '/text-to-image',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'image-to-image',
    label: 'Image to Image',
    description: 'Edit, restyle, or transform existing images.',
    hubPath: '/image-to-image',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'text-to-video',
    label: 'Text to Video',
    description: 'Generate video from a text prompt.',
    hubPath: '/text-to-video',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'image-to-video',
    label: 'Image to Video',
    description: 'Animate a reference image with a prompt.',
    hubPath: '/image-to-video',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'voice-clone',
    label: 'Voice clone',
    description: 'Seller uploads an .mp3; VieNeu clones that voice. Buyers pay per character and/or day / month / year license. STT uses PhoWhisper-large.',
    hubPath: '/voice-clone',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'voice-preset',
    label: 'Voice presets',
    description: 'AI Markets sells VieNeu preset voices directly. Same billing: per character and/or day / month / year license. STT uses PhoWhisper-large.',
    hubPath: '/voice-preset',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'ai-film-series',
    label: 'Watch AI films',
    description: 'Watch multi-episode AI films. Access is unlocked with a day / month / year license key.',
    hubPath: '/ai-film-series',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'story-book',
    label: 'Stories & books',
    description: 'AI story and audiobook reading with a time-bound license key.',
    hubPath: '/story-book',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'skill-pack',
    label: 'Skill packs',
    description: 'Download OpenClaw / agent skill bundles. Unlocked with a day / month / year license key.',
    hubPath: '/skill-pack',
    group: 'skills',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'dataset',
    label: 'Dataset',
    description: 'Download training and evaluation datasets. Unlocked with a day / month / year license key.',
    hubPath: '/dataset',
    group: 'models',
    navGroup: 'generate',
    lane: 'ai',
  },
  {
    id: 'api-endpoint',
    label: 'Sell API',
    description: 'Metered OpenAI-compatible APIs for buyers.',
    hubPath: '/api-endpoint',
    group: 'apis',
    navGroup: 'apis',
    lane: 'ai',
  },
  {
    id: 'inference',
    label: 'Inference',
    description: 'Hosted inference endpoints and GPU runtimes.',
    hubPath: '/inference',
    group: 'apis',
    navGroup: 'apis',
    lane: 'ai',
  },
  {
    id: 'gpu-compute',
    label: 'GPU compute',
    description: 'Rent GPU by the hour from any registered provider.',
    hubPath: '/gpu-compute',
    group: 'apis',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'game-server',
    label: 'Game server',
    description: 'GPU game servers and live streams.',
    hubPath: '/game-server',
    group: 'apis',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'training-service',
    label: 'Training',
    description: 'Fine-tune and training jobs on provider GPUs.',
    hubPath: '/training-service',
    group: 'models',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'agent-runtime',
    label: 'Agent runtime',
    description: 'Deploy open-source agents as containers.',
    hubPath: '/agent-runtime',
    group: 'hire',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'fine-tune',
    label: 'Fine-tune',
    description: 'Fine-tune LLMs and vision models on your data.',
    hubPath: '/fine-tune',
    group: 'models',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'hire-agent',
    label: 'Agents',
    description: 'Hire & launch OpenClaw agents.',
    hubPath: '/hire-agent',
    group: 'hire',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'hire-marketing',
    label: 'Marketing',
    description: 'Fixed-package marketing: campaigns, ads and growth.',
    hubPath: '/hire-marketing',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-seo',
    label: 'SEO',
    description: 'Fixed-package SEO: audits, on-page and content.',
    hubPath: '/hire-seo',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-creator',
    label: 'Creator',
    description: 'Fixed-package content: video, design and copy.',
    hubPath: '/hire-creator',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-workflow',
    label: 'Workflow automation',
    description: 'Fixed-package automation with n8n, Zapier, Make, OpenClaw.',
    hubPath: '/hire-workflow',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-build-web',
    label: 'Build web',
    description: 'Fixed-package websites, dashboards and web apps.',
    hubPath: '/hire-build-web',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-build-app',
    label: 'Build app',
    description: 'Fixed-package mobile / desktop app builds.',
    hubPath: '/hire-build-app',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'template-web',
    label: 'Web templates',
    description: 'Seller-made website templates you restyle with AI.',
    hubPath: '/template-web',
    group: 'models',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'template-app',
    label: 'App templates',
    description: 'React Native app templates with a phone simulator.',
    hubPath: '/template-app',
    group: 'models',
    navGroup: 'platform',
    lane: 'ai',
  },
];

/**
 * Categories hidden from browsing and new listings (owners and admins can still open existing
 * listings). Empty since Quy chế 2.1 (05/10/2026): dataset is offered again, with no personal or
 * unlawfully collected data (khoản 1 Mục XV). Keep in sync with the app `HIDDEN_CATEGORIES`.
 */
export const HIDDEN_CATEGORIES: ReadonlySet<ProductCategory> = new Set<ProductCategory>([]);

export function isHiddenCategory(id?: ProductCategory | string | null): boolean {
  return HIDDEN_CATEGORIES.has(String(id || '') as ProductCategory);
}

function catLink(id: ProductCategory): NavLink {
  const cat = AI_CATEGORIES.find((c) => c.id === id);
  return { path: cat?.hubPath || `/${id}`, labelKey: `cat.${id}.label` };
}

const HIDDEN_PATHS = new Set(AI_CATEGORIES.filter((c) => isHiddenCategory(c.id)).map((c) => c.hubPath));

/** Header "Categories" menu and footer category columns — one list so both stay in sync. */
export const NAV_SECTIONS: NavSection[] = ([
  {
    id: 'generate',
    titleKey: 'group.generate',
    links: (
      [
        'text-to-text',
        'text-to-image',
        'image-to-image',
        'text-to-video',
        'image-to-video',
        'voice-clone',
        'voice-preset',
        'ai-film-series',
        'story-book',
      ] as ProductCategory[]
    ).map(catLink),
  },
  {
    id: 'build',
    titleKey: 'group.build',
    links: [
      { path: '/build', labelKey: 'nav.builder' },
      ...(['template-web', 'template-app', 'skill-pack', 'dataset'] as ProductCategory[]).map(catLink),
    ],
  },
  {
    id: 'apis',
    titleKey: 'group.apis',
    links: [
      { path: '/models', labelKey: 'hub.models' },
      ...(['api-endpoint', 'inference', 'fine-tune', 'training-service'] as ProductCategory[]).map(catLink),
    ],
  },
  {
    id: 'platform',
    titleKey: 'group.platform',
    links: [
      { path: '/hire-agent/marketplace', labelKey: 'cat.hire-agent.label' },
      catLink('agent-runtime'),
      catLink('gpu-compute'),
      catLink('game-server'),
      { path: '/gpu', labelKey: 'nav.gpuRent' },
      { path: '/training', labelKey: 'nav.training' },
      { path: '/account/console', labelKey: 'hub.console' },
    ],
  },
  {
    id: 'talent',
    titleKey: 'group.talent',
    links: (
      ['hire-build-web', 'hire-build-app', 'hire-marketing', 'hire-seo', 'hire-creator', 'hire-workflow'] as ProductCategory[]
    ).map(catLink),
  },
] as NavSection[]).map((s) => ({ ...s, links: s.links.filter((l) => !HIDDEN_PATHS.has(l.path)) }));

const TEMPLATE_KIND: Partial<Record<ProductCategory, 'web' | 'app'>> = {
  'template-web': 'web',
  'template-app': 'app',
};

/** Builder template listing → project kind ('' for other categories). */
export function templateKind(id?: ProductCategory | string): 'web' | 'app' | '' {
  return TEMPLATE_KIND[String(id || '') as ProductCategory] || '';
}

export function isTemplateCategory(id?: ProductCategory | string): boolean {
  return !!templateKind(id);
}

/** @deprecated Digital goods lane removed — AI marketplace only. */
export const DIGITAL_CATEGORIES: CategoryMeta[] = [];

export const CATEGORY_META: CategoryMeta[] = [...AI_CATEGORIES];

/** Categories buyers can browse and sellers can list in right now. */
export const VISIBLE_CATEGORIES: CategoryMeta[] = CATEGORY_META.filter((c) => !isHiddenCategory(c.id));

export function withoutHiddenProducts<T extends { category?: string }>(items: T[] | null | undefined): T[] {
  return (items || []).filter((p) => !isHiddenCategory(p.category));
}

export function categoryLabel(id: ProductCategory | string): string {
  if (id === 'openrouter' || id === 'featherless' || id === 'runpod-public') return 'Inference';
  return CATEGORY_META.find((c) => c.id === id)?.label ?? id;
}

export function categoriesByLane(lane: CatalogLane): CategoryMeta[] {
  return CATEGORY_META.filter((c) => c.lane === lane);
}

export function categoriesByGroup(group: CategoryGroup): CategoryMeta[] {
  return CATEGORY_META.filter((c) => c.group === group);
}

export function categoriesByNavGroup(navGroup: NavGroup): CategoryMeta[] {
  return VISIBLE_CATEGORIES.filter((c) => c.navGroup === navGroup);
}

export function isHireCategory(id: ProductCategory): boolean {
  return CATEGORY_META.find((c) => c.id === id)?.group === 'hire';
}

/**
 * Professional services (làm web, làm app, marketing, SEO, creator, tự động hóa): fixed packages paid
 * from the wallet at checkout like any product (Quy chế 2.1). Ids keep the legacy `hire-` prefix.
 * Talent accounts may list only these.
 */
export const HIRE_REQUEST_CATEGORIES: readonly ProductCategory[] = [
  'hire-build-web',
  'hire-build-app',
  'hire-marketing',
  'hire-seo',
  'hire-creator',
  'hire-workflow',
];

export function isHireRequestCategory(id?: ProductCategory | string): boolean {
  return HIRE_REQUEST_CATEGORIES.includes(id as ProductCategory);
}

export function isSkillCategory(id: ProductCategory): boolean {
  return CATEGORY_META.find((c) => c.id === id)?.group === 'skills';
}

export function isDigitalCategory(_id?: ProductCategory | string): boolean {
  return false;
}

export function isAiCategory(id: ProductCategory | string): boolean {
  return CATEGORY_META.some((c) => c.id === id);
}

const COMPUTE_STREAM_CATEGORIES = new Set<ProductCategory>(['gpu-compute', 'game-server']);
const LICENSE_CATEGORIES = new Set<ProductCategory>([
  'ai-film-series',
  'story-book',
  'skill-pack',
  'dataset',
  'voice-preset',
  'voice-clone',
]);
const FILM_CATEGORIES = new Set<ProductCategory>(['ai-film-series']);
const DOWNLOAD_LICENSE_CATEGORIES = new Set<ProductCategory>(['skill-pack', 'dataset']);
const VOICE_CATEGORIES = new Set<ProductCategory>(['voice-clone', 'voice-preset']);
const VOICE_CLONE_CATEGORIES = new Set<ProductCategory>(['voice-clone']);
const VOICE_PRESET_CATEGORIES = new Set<ProductCategory>(['voice-preset']);

export function isComputeStreamCategory(id: ProductCategory | string): boolean {
  return COMPUTE_STREAM_CATEGORIES.has(id as ProductCategory);
}

export function isGpuComputeCategory(id: ProductCategory | string): boolean {
  return id === 'gpu-compute';
}

export function isGameServerCategory(id: ProductCategory | string): boolean {
  return id === 'game-server';
}

export function isLicenseCategory(id: ProductCategory | string): boolean {
  return LICENSE_CATEGORIES.has(id as ProductCategory);
}

export function isFilmCategory(id: ProductCategory | string): boolean {
  return FILM_CATEGORIES.has(id as ProductCategory);
}

export function isDownloadLicenseCategory(id: ProductCategory | string): boolean {
  return DOWNLOAD_LICENSE_CATEGORIES.has(id as ProductCategory);
}

export function isDatasetCategory(id: ProductCategory | string): boolean {
  return id === 'dataset';
}

export function isVoiceCategory(id: ProductCategory | string): boolean {
  return VOICE_CATEGORIES.has(id as ProductCategory);
}

export function isVoiceCloneCategory(id: ProductCategory | string): boolean {
  return VOICE_CLONE_CATEGORIES.has(id as ProductCategory);
}

export function isVoicePresetCategory(id: ProductCategory | string): boolean {
  return VOICE_PRESET_CATEGORIES.has(id as ProductCategory);
}

export function isStoryCategory(id: ProductCategory | string): boolean {
  return id === 'story-book';
}

export function isWatchContentCategory(id: ProductCategory | string): boolean {
  return isFilmCategory(id) || isStoryCategory(id);
}

/** Seller workspaces — not every listing is a RunPod public endpoint. */
export type SellerWorkspaceKind = 'endpoint' | 'voice' | 'watch' | 'download' | 'hire' | 'compute';

const ENDPOINT_DEPLOY_CATEGORIES = new Set<ProductCategory>([
  'text-to-text',
  'text-to-image',
  'image-to-image',
  'text-to-video',
  'image-to-video',
  'inference',
  'api-endpoint',
  'fine-tune',
  'training-service',
  'agent-runtime',
]);

export function sellerWorkspaceKind(id?: ProductCategory | string): SellerWorkspaceKind {
  const cat = String(id || '') as ProductCategory;
  if (isVoiceCategory(cat)) return 'voice';
  if (isWatchContentCategory(cat)) return 'watch';
  if (isDownloadLicenseCategory(cat)) return 'download';
  if (isComputeStreamCategory(cat)) return 'compute';
  if (isHireCategory(cat)) return 'hire';
  return 'endpoint';
}

export function needsEndpointDeploy(id?: ProductCategory | string): boolean {
  return ENDPOINT_DEPLOY_CATEGORIES.has(String(id || '') as ProductCategory);
}
