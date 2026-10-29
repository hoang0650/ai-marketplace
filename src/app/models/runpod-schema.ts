/**
 * Turns a RunPod Public Endpoint `input` schema into playground form fields.
 *
 * The schema itself comes from `GET /v1/endpoints/public-endpoints/:slug/schema`,
 * which proxies the catalog in the AI Markets AI API (the mirror of docs.runpod.io).
 * Every model accepts a different subset of parameters, so the form is built
 * from that schema rather than from the marketplace category — a Seedance run
 * exposes camera_fixed and generate_audio, Hailuo exposes an end frame and
 * prompt expansion, Kimi exposes messages plus sampling_params.
 */

import { ProductCategory } from './marketplace.models';
import { RunpodPublicEndpoint } from './runpod-public-endpoints';

export interface RunpodParamSpec {
  type: string;
  required?: boolean;
  default?: unknown;
  enum?: Array<string | number>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  format?: string;
  doc?: string;
  item_keys?: string[];
  min_items?: number;
  max_items?: number;
  from_single?: string;
  from_alias?: string;
}

export interface RunpodPricing {
  type?: string;
  rate?: number;
  rates?: Record<string, number | Record<string, number>>;
  key?: string;
  resolve_key?: string;
  default?: number | Record<string, number>;
  draft_multiplier?: number;
  source?: string;
}

export interface RunpodModelSchema {
  slug: string;
  name: string;
  kind: 'image' | 'video' | 'text' | 'audio';
  modality: string;
  endpointId: string;
  output: 'image_url' | 'video_url' | 'audio_url' | 'text';
  runsyncUrl?: string;
  runUrl?: string;
  statusUrlTemplate?: string;
  openaiBaseUrl?: string | null;
  openaiModel?: string | null;
  /** Model takes `messages` + `sampling_params` instead of a flat prompt. */
  chatStyle?: boolean;
  params: Record<string, RunpodParamSpec>;
  pricing: RunpodPricing;
  /** Platform margin over the documented RunPod price, as a fraction. */
  markup?: number;
  docsUrl?: string;
}

export type RunpodControl =
  | 'textarea'
  | 'text'
  | 'number'
  | 'stepper'
  | 'toggle'
  | 'chips'
  | 'select'
  | 'image'
  | 'imageList'
  | 'mediaUrl'
  | 'loras';

export interface RunpodOption {
  value: string | number;
  label: string;
}

export interface RunpodField {
  /** Path into the payload; dotted for nested objects (`sampling_params.max_tokens`). */
  key: string;
  name: string;
  spec: RunpodParamSpec;
  control: RunpodControl;
  label: string;
  help: string;
  required: boolean;
  advanced: boolean;
  options: RunpodOption[];
}

export interface RunpodQuote {
  /** Buyer-facing price with the platform markup applied; null when unknown. */
  cost: number | null;
  unit: string;
  quantity: number;
  /** Rate as shown to the buyer, e.g. "$0.065 per second". */
  rateLabel: string;
}

/** Rendered by dedicated controls (model picker, prompt composer), not the generic loop. */
const HANDLED_ELSEWHERE = new Set(['model', 'messages']);

/** Shown above "Additional settings", mirroring the RunPod Hub playground layout. */
const PRIMARY_FIELDS = new Set(['prompt', 'duration', 'image', 'images', 'audio', 'video']);

const IMAGE_FIELDS = new Set(['image', 'images', 'last_image']);
const MEDIA_URL_FIELDS = new Set(['audio', 'video', 'audio_url', 'fallback_audio_url']);
const TEXTAREA_FIELDS = new Set(['prompt', 'negative_prompt', 'system', 'system_prompt']);

const LABELS: Record<string, string> = {
  aspect_ratio: 'Aspect ratio',
  audio_url: 'Reference audio',
  bgm: 'Background music',
  fps: 'FPS',
  guidance_scale: 'Guidance scale',
  high_noise_loras: 'High-noise LoRAs',
  image_format: 'Image format',
  images: 'Images',
  last_image: 'End image',
  loras: 'LoRAs',
  low_noise_loras: 'Low-noise LoRAs',
  max_tokens: 'Max tokens',
  num_inference_steps: 'Inference steps',
  output_format: 'Output format',
  reasoning_effort: 'Reasoning effort',
  top_k: 'Top K',
  top_p: 'Top P',
  video: 'Reference video',
  voice_id: 'Voice ID',
};

const HELP: Record<string, string> = {
  audio: 'URL of the driving audio file.',
  duration: 'Duration in seconds.',
  image: 'jpeg, jpg, png up to 16MB (single file).',
  images: 'jpeg, jpg, png up to 16MB each.',
  last_image: 'Target end frame URL, for guided transition sequences.',
  max_tokens: 'Maximum number of tokens to generate.',
  seed: 'Random seed for reproducible results. Use -1 for random seed.',
  temperature: 'Controls randomness. Lower values are more deterministic.',
  top_p: 'Nucleus sampling threshold.',
  top_k: 'Restricts sampling to the top K most probable tokens.',
};

/** Specs for the keys inside object-typed params such as `sampling_params`. */
const OBJECT_CHILD_SPECS: Record<string, RunpodParamSpec> = {
  max_tokens: { type: 'int', default: 2048, min: 1, max: 32768, step: 1 },
  temperature: { type: 'float', default: 1, min: 0, max: 2, step: 0.1 },
  seed: { type: 'int', default: -1 },
  top_k: { type: 'int', min: 1 },
  top_p: { type: 'float', min: 0, max: 1, step: 0.05 },
  reasoning_effort: {
    type: 'enum',
    enum: ['low', 'high', 'max'],
    doc: 'Extended thinking budget before the final answer.',
  },
};

const SIZE_TO_RESOLUTION: Record<string, string> = {
  '832*480': '480p',
  '480*832': '480p',
  '960*540': '540p',
  '1280*720': '720p',
  '720*1280': '720p',
  '1920*1080': '1080p',
  '1080*1920': '1080p',
};

function humanize(name: string): string {
  const text = name.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function labelFor(name: string): string {
  return LABELS[name] ?? humanize(name);
}

function helpFor(name: string, spec: RunpodParamSpec): string {
  if (spec.doc) return spec.doc;
  if (HELP[name]) return HELP[name];
  if (spec.format) return `Format: ${spec.format}`;
  return '';
}

/** Duration renders as second chips even when the docs express it as a range. */
function durationOptions(spec: RunpodParamSpec): RunpodOption[] {
  if (spec.enum?.length) {
    return spec.enum.map((v) => ({ value: v, label: `${v}s` }));
  }
  const min = Math.max(1, Math.floor(spec.min ?? 1));
  const max = Math.min(min + 23, Math.floor(spec.max ?? min));
  const out: RunpodOption[] = [];
  for (let v = min; v <= max; v += 1) out.push({ value: v, label: `${v}s` });
  return out;
}

function controlFor(name: string, spec: RunpodParamSpec): RunpodControl {
  if (name === 'duration') return 'chips';
  switch (spec.type) {
    case 'bool':
      return 'toggle';
    case 'enum':
      return (spec.enum?.length ?? 0) > 8 ? 'select' : 'chips';
    case 'list[obj]':
      return 'loras';
    case 'list[str]':
      return 'imageList';
    case 'int':
    case 'float':
      // A bounded range gets a stepper; open-ended values (seed) get a plain input.
      return name !== 'seed' && (spec.min !== undefined || spec.max !== undefined)
        ? 'stepper'
        : 'number';
    default:
      if (IMAGE_FIELDS.has(name)) return 'image';
      if (MEDIA_URL_FIELDS.has(name)) return 'mediaUrl';
      if (TEXTAREA_FIELDS.has(name)) return 'textarea';
      return 'text';
  }
}

function toField(key: string, name: string, spec: RunpodParamSpec): RunpodField {
  const control = controlFor(name, spec);
  return {
    key,
    name,
    spec,
    control,
    label: labelFor(name),
    help: helpFor(name, spec),
    required: !!spec.required,
    advanced: !PRIMARY_FIELDS.has(name),
    options:
      name === 'duration'
        ? durationOptions(spec)
        : (spec.enum ?? []).map((v) => ({ value: v, label: String(v) })),
  };
}

/** Flatten the schema into renderable fields, expanding object params inline. */
export function schemaFields(schema: RunpodModelSchema | null): RunpodField[] {
  if (!schema?.params) return [];
  const fields: RunpodField[] = [];

  for (const [name, spec] of Object.entries(schema.params)) {
    if (HANDLED_ELSEWHERE.has(name) || (schema.kind === 'text' && name === 'prompt')) continue;

    if (spec.type === 'obj') {
      // Only the parent's documented defaults are pre-filled, so the request
      // carries exactly the keys the docs example sends.
      const defaults = (spec.default as Record<string, unknown>) || {};
      for (const child of spec.item_keys ?? []) {
        const childSpec = OBJECT_CHILD_SPECS[child] ?? { type: 'str' };
        fields.push(
          toField(`${name}.${child}`, child, { ...childSpec, default: defaults[child] }),
        );
      }
      continue;
    }

    fields.push(toField(name, name, spec));
  }

  return fields;
}

export function defaultValues(schema: RunpodModelSchema | null): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of schemaFields(schema)) {
    if (field.spec.default !== undefined) values[field.key] = field.spec.default;
    else if (field.control === 'toggle') values[field.key] = false;
    else if (field.control === 'imageList' || field.control === 'loras') values[field.key] = [];
    else values[field.key] = '';
  }
  return values;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function coerce(field: RunpodField, value: unknown): unknown {
  const { spec } = field;
  if (spec.type === 'int') {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : undefined;
  }
  if (spec.type === 'float') {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }
  if (spec.type === 'bool') return !!value;
  if (spec.type === 'enum' && typeof spec.enum?.[0] === 'number') {
    const num = Number(value);
    return Number.isFinite(num) ? num : value;
  }
  return value;
}

/**
 * Build the `input` object exactly as the model's docs describe it.
 * `extra` carries values owned by dedicated controls (prompt, model, messages).
 */
export function buildRunpodInput(
  schema: RunpodModelSchema | null,
  values: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const input: Record<string, unknown> = {};

  for (const field of schemaFields(schema)) {
    const raw = values[field.key];
    if (isEmpty(raw)) continue;
    const coerced = coerce(field, raw);
    if (coerced === undefined) continue;

    const [head, child] = field.key.split('.');
    if (child) {
      const group = (input[head] as Record<string, unknown>) || {};
      group[child] = coerced;
      input[head] = group;
    } else {
      input[field.key] = coerced;
    }
  }

  for (const [key, value] of Object.entries(extra)) {
    if (!isEmpty(value)) input[key] = value;
  }
  return input;
}

// ---------------------------------------------------------------- pricing --

function resolutionOf(pricing: RunpodPricing, input: Record<string, unknown>): string {
  const key = pricing.key || 'resolution';
  const raw = input[key] ?? input['resolution'] ?? input['size'];
  const text = String(raw ?? '').trim().toLowerCase();
  if (pricing.resolve_key === 'resolution' && text.includes('*')) {
    return SIZE_TO_RESOLUTION[text] ?? text;
  }
  return text;
}

function nearestTier(duration: number, rates: Record<string, number>): number {
  const tiers = Object.keys(rates)
    .map(Number)
    .sort((a, b) => a - b);
  const hit = tiers.find((t) => duration <= t) ?? tiers[tiers.length - 1];
  return Number(rates[String(hit)]);
}

function durationOf(input: Record<string, unknown>): number {
  return Number(input['duration']) || 5;
}

/** Mirrors `estimate_base_cost` in the AI Markets AI API; returns the documented RunPod price. */
function baseCost(pricing: RunpodPricing, input: Record<string, unknown>): number | null {
  const rates = (pricing.rates ?? {}) as Record<string, number | Record<string, number>>;

  switch (pricing.type) {
    case 'megapixel': {
      const width = Number(input['width']) || 1024;
      const height = Number(input['height']) || 1024;
      return ((width * height) / 1_000_000) * (pricing.rate ?? 0);
    }
    case 'per_image':
      return pricing.rate ?? 0;
    case 'per_image_by_resolution':
    case 'per_video_by_resolution': {
      const hit = rates[resolutionOf(pricing, input)];
      return Number(hit ?? pricing.default ?? 0);
    }
    case 'per_second':
      return durationOf(input) * (pricing.rate ?? 0);
    case 'per_second_by_resolution': {
      let rate = Number(rates[resolutionOf(pricing, input)] ?? pricing.default ?? 0);
      if (pricing.draft_multiplier && input['draft_mode']) rate *= pricing.draft_multiplier;
      return durationOf(input) * rate;
    }
    case 'duration_table':
      return nearestTier(durationOf(input), rates as Record<string, number>);
    case 'resolution_duration_table': {
      const table =
        (rates[resolutionOf(pricing, input)] as Record<string, number>) ??
        (Object.values(rates)[0] as Record<string, number>);
      return table ? nearestTier(durationOf(input), table) : null;
    }
    case 'tokens': {
      const total = Number(input['max_tokens']) || 512;
      return (total / 1_000_000) * (pricing.rate ?? 0);
    }
    case 'tokens_by_variant': {
      const variant = String(input[pricing.key || 'model'] ?? '');
      const tier = (rates[variant] ?? pricing.default) as
        | { input: number; output: number }
        | undefined;
      if (!tier) return null;
      const sampling = (input['sampling_params'] as Record<string, unknown>) || {};
      const outTokens = Number(sampling['max_tokens']) || 2048;
      return (outTokens / 1_000_000) * tier.output;
    }
    case 'per_1k_chars': {
      const source = String(input[pricing.source || 'prompt'] ?? '');
      return (source.length / 1000) * (pricing.rate ?? 0);
    }
    default:
      return null;
  }
}

function unitOf(pricing: RunpodPricing, kind: string): string {
  if (pricing.type?.includes('second') || pricing.type === 'duration_table') return 'second';
  if (pricing.type?.includes('token')) return '1M tokens';
  if (pricing.type === 'per_1k_chars') return '1K chars';
  if (kind === 'video') return 'video';
  return 'image';
}

/** Rates get down to fractions of a cent, so keep digits until they stop mattering. */
const money = (value: number): string => `$${value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}`;

/** Buyer-facing quote: documented RunPod formula with the platform markup applied. */
export function quoteRunpod(
  schema: RunpodModelSchema | null,
  input: Record<string, unknown>,
): RunpodQuote | null {
  if (!schema?.pricing?.type) return null;
  const base = baseCost(schema.pricing, input);
  if (base === null || !Number.isFinite(base)) return null;

  const sell = base * (1 + (schema.markup ?? 0));
  const unit = unitOf(schema.pricing, schema.kind);
  const quantity = unit === 'second' ? durationOf(input) : 1;
  const perUnit = quantity > 0 ? sell / quantity : sell;

  return {
    cost: Math.round(sell * 1e6) / 1e6,
    unit,
    quantity,
    rateLabel: `${money(perUnit)} per ${unit}`,
  };
}

// --------------------------------------------------------------- fallback --

const FALLBACK_PARAMS: Record<string, Record<string, RunpodParamSpec>> = {
  'text-to-text': {
    prompt: { type: 'str', required: true },
    max_tokens: { type: 'int', default: 512, min: 1, max: 32768 },
    temperature: { type: 'float', default: 0.7, min: 0, max: 1, step: 0.1 },
    top_p: { type: 'float', min: 0, max: 1, step: 0.05 },
    seed: { type: 'int', default: -1 },
  },
  'text-to-image': {
    prompt: { type: 'str', required: true },
    negative_prompt: { type: 'str' },
    width: { type: 'int', default: 1024, min: 256, max: 1536, step: 64 },
    height: { type: 'int', default: 1024, min: 256, max: 1536, step: 64 },
    seed: { type: 'int', default: -1 },
    output_format: { type: 'enum', enum: ['png', 'jpeg'], default: 'png' },
  },
  'image-to-image': {
    prompt: { type: 'str', required: true },
    image: { type: 'str', required: true },
    negative_prompt: { type: 'str' },
    size: { type: 'str', default: '1024*1024', format: 'width*height' },
    seed: { type: 'int', default: -1 },
    output_format: { type: 'enum', enum: ['png', 'jpeg'], default: 'png' },
  },
  'text-to-video': {
    prompt: { type: 'str', required: true },
    duration: { type: 'int', default: 5, min: 4, max: 12, unit: 'seconds' },
    resolution: { type: 'enum', enum: ['480p', '720p', '1080p'], default: '720p' },
    aspect_ratio: {
      type: 'enum',
      enum: ['21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
      default: '16:9',
    },
    seed: { type: 'int', default: -1 },
    enable_prompt_expansion: { type: 'bool', default: false },
  },
  'image-to-video': {
    prompt: { type: 'str', required: true },
    image: { type: 'str', required: true },
    last_image: { type: 'str' },
    duration: { type: 'int', default: 5, min: 4, max: 12, unit: 'seconds' },
    resolution: { type: 'enum', enum: ['480p', '720p'], default: '720p' },
    aspect_ratio: {
      type: 'enum',
      enum: ['21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
      default: '16:9',
    },
    camera_fixed: { type: 'bool', default: false },
    generate_audio: { type: 'bool', default: false },
    seed: { type: 'int', default: -1 },
  },
};

const KIND_BY_MODALITY: Record<string, RunpodModelSchema['kind']> = {
  'text-to-text': 'text',
  'text-to-image': 'image',
  'image-to-image': 'image',
  'text-to-video': 'video',
  'image-to-video': 'video',
};

const OUTPUT_BY_KIND: Record<string, RunpodModelSchema['output']> = {
  text: 'text',
  image: 'image_url',
  video: 'video_url',
  audio: 'audio_url',
};

/**
 * Generic per-modality schema, used when the live catalog is unreachable so the
 * playground still renders a usable form.
 */
export function fallbackSchema(
  category: ProductCategory,
  endpoint?: RunpodPublicEndpoint | null,
): RunpodModelSchema | null {
  const params = FALLBACK_PARAMS[category === 'inference' ? 'text-to-text' : category];
  if (!params) return null;
  const kind = endpoint?.kind ?? KIND_BY_MODALITY[category] ?? 'text';
  return {
    slug: endpoint?.slug ?? category,
    name: endpoint?.name ?? category,
    kind,
    modality: category,
    endpointId: endpoint?.endpointId ?? '',
    output: OUTPUT_BY_KIND[kind] ?? 'text',
    openaiModel: endpoint?.openaiModel ?? null,
    params,
    pricing: {},
  };
}
