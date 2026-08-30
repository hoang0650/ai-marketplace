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
  hire: 'Hire talent',
  apis: 'APIs & inference',
};

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  generate: 'Generate',
  apis: 'APIs & inference',
  platform: 'Platform',
  talent: 'Hire talent',
};

/** Extra hub links shown under Platform. */
export const NAV_PLATFORM_LINKS: ReadonlyArray<{
  labelKey: string;
  descKey: string;
  path: string;
}> = [
  { labelKey: 'hub.models', descKey: 'hub.modelsDesc', path: '/models' },
  { labelKey: 'hub.console', descKey: 'hub.consoleDesc', path: '/account/console' },
  { labelKey: 'hub.gpu', descKey: 'hub.gpuDesc', path: '/dashboard/gpu' },
];

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
    id: 'dataset',
    label: 'Dataset',
    description: 'Curated datasets for training and evaluation.',
    hubPath: '/dataset',
    group: 'models',
    navGroup: 'platform',
    lane: 'ai',
  },
  {
    id: 'skill-pack',
    label: 'Skill packs',
    description: 'Buy & sell OpenClaw / agent skill bundles.',
    hubPath: '/skill-pack',
    group: 'skills',
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
    description: 'Campaigns, ads, and growth specialists.',
    hubPath: '/hire-marketing',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-seo',
    label: 'SEO',
    description: 'Search growth and on-page specialists.',
    hubPath: '/hire-seo',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-creator',
    label: 'Creator',
    description: 'Content creators, editors, and UGC talent.',
    hubPath: '/hire-creator',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-workflow',
    label: 'Workflow automation',
    description: 'Automate ops with n8n, Zapier, Make, OpenClaw.',
    hubPath: '/hire-workflow',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-build-web',
    label: 'Build web',
    description: 'Marketing sites, dashboards, and web apps.',
    hubPath: '/hire-build-web',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
  {
    id: 'hire-build-app',
    label: 'Build app',
    description: 'Design and ship mobile / desktop apps.',
    hubPath: '/hire-build-app',
    group: 'hire',
    navGroup: 'talent',
    lane: 'ai',
  },
];

/** @deprecated Digital goods lane removed — AI marketplace only. */
export const DIGITAL_CATEGORIES: CategoryMeta[] = [];

export const CATEGORY_META: CategoryMeta[] = [...AI_CATEGORIES];

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
  return CATEGORY_META.filter((c) => c.navGroup === navGroup);
}

export function isHireCategory(id: ProductCategory): boolean {
  return CATEGORY_META.find((c) => c.id === id)?.group === 'hire';
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
