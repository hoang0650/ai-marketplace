/**
 * Client view of API PR 71 (commit a574ced). Amounts in VND are shown only
 * when the server quote is authoritative. This file does not apply a rate.
 */

export interface ServerVndQuote {
  amountVnd?: number | null;
  authoritative?: boolean;
  code?: string | null;
}

export interface UsageUnitDef {
  code: string;
  labelEn: string;
  labelVi: string;
  dimension: string;
  kind: 'metered' | 'entitlement' | string;
  unitSize: number;
  period?: string | null;
}

export interface UsageUnitCatalog {
  rounding?: { id?: string; summaryVi?: string; summaryEn?: string };
  units: UsageUnitDef[];
  allowedByCategory: Record<string, string[]>;
}

export interface ServicePackageDraft {
  code: string;
  name: string;
  scope: string;
  deliverablesText: string;
  durationDays: number;
  price: number;
  currency: 'USD' | 'VND';
}

export interface ServicePackagePayload {
  code: string;
  name: string;
  scope: string;
  deliverables: string[];
  durationDays: number;
  price: number;
  currency: 'USD' | 'VND';
}

const ACCESS = new Set(['1_day', '1_week', '1_month', '1_year']);

export function readAuthoritativeVnd(
  quote: ServerVndQuote | null | undefined,
): { ok: true; amountVnd: number } | { ok: false; code: string } {
  const amount = quote?.amountVnd;
  if (!quote || quote.authoritative !== true || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) {
    return { ok: false, code: quote?.code || 'MISSING_VND' };
  }
  return { ok: true, amountVnd: amount };
}

export function formatDong(amountVnd: number): string {
  return `${amountVnd.toLocaleString('vi-VN')} đ`;
}

/** Vietnamese buyer price. Never multiplies a USD figure by a rate. */
export function viPrice(quote: ServerVndQuote | null | undefined): string | null {
  const read = readAuthoritativeVnd(quote);
  return read.ok ? formatDong(read.amountVnd) : null;
}

export function unitsFor(
  catalog: UsageUnitCatalog | null | undefined,
  category: string | null | undefined,
): UsageUnitDef[] {
  if (!catalog) return [];
  const codes = catalog.allowedByCategory?.[String(category || '')];
  if (!Array.isArray(codes) || !codes.length) return [];
  const byCode = new Map(catalog.units.map((unit) => [unit.code, unit]));
  return codes.map((code) => byCode.get(code)).filter((unit): unit is UsageUnitDef => !!unit);
}

export function unitAllowed(
  catalog: UsageUnitCatalog | null | undefined,
  category: string | null | undefined,
  code: string | null | undefined,
): boolean {
  return unitsFor(catalog, category).some((unit) => unit.code === code);
}

export function isAccessUnit(code: string | null | undefined): boolean {
  return ACCESS.has(String(code || ''));
}

export function accessUnitOf(pricing: {
  usageUnit?: string | null;
  usageUnitCode?: string | null;
  usageBilling?: string | null;
  usagePeriod?: string | null;
} | null | undefined): string | null {
  if (!pricing) return null;
  if (pricing.usageBilling === 'entitlement' && isAccessUnit(pricing.usageUnitCode || pricing.usagePeriod)) {
    const code = pricing.usageUnitCode || `1_${pricing.usagePeriod}`;
    return isAccessUnit(code) ? code : null;
  }
  const code = pricing.usageUnitCode || pricing.usageUnit;
  return isAccessUnit(code) ? String(code) : null;
}

const USAGE_CURRENCIES = new Set(['USD', 'VND', 'CNY']);

/** Blank optional rates are omitted. 0 is kept (cached input at 0 is free). */
export function optionalUsageAmount(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Pricing payload for a usage product. Unit codes still come from GET /usage/units. */
export function usageProductPricing(input: {
  usageUnit: string;
  usageRate: number;
  currency?: string | null;
  inputRate?: unknown;
  outputRate?: unknown;
  cachedInputRate?: unknown;
  minCharge?: unknown;
}): {
  model: 'usage';
  price: 0;
  currency: 'USD' | 'VND' | 'CNY';
  usageUnit: string;
  usageRate: number;
  inputRate?: number;
  outputRate?: number;
  cachedInputRate?: number;
  minCharge?: number;
} {
  const raw = String(input.currency || '');
  const currency = (USAGE_CURRENCIES.has(raw) ? raw : 'USD') as 'USD' | 'VND' | 'CNY';
  const pricing: {
    model: 'usage';
    price: 0;
    currency: 'USD' | 'VND' | 'CNY';
    usageUnit: string;
    usageRate: number;
    inputRate?: number;
    outputRate?: number;
    cachedInputRate?: number;
    minCharge?: number;
  } = {
    model: 'usage',
    price: 0,
    currency,
    usageUnit: input.usageUnit,
    usageRate: Number(input.usageRate) || 0,
  };
  const inputRate = optionalUsageAmount(input.inputRate);
  const outputRate = optionalUsageAmount(input.outputRate);
  const cachedInputRate = optionalUsageAmount(input.cachedInputRate);
  const minCharge = optionalUsageAmount(input.minCharge);
  if (inputRate !== undefined) pricing.inputRate = inputRate;
  if (outputRate !== undefined) pricing.outputRate = outputRate;
  if (cachedInputRate !== undefined) pricing.cachedInputRate = cachedInputRate;
  if (minCharge !== undefined) pricing.minCharge = minCharge;
  return pricing;
}

export function snapUsageUnit(
  catalog: UsageUnitCatalog | null | undefined,
  category: string,
  current: string,
): string {
  if (!catalog) return current;
  const choices = unitsFor(catalog, category);
  if (!choices.length) return '';
  if (choices.some((unit) => unit.code === current)) return current;
  return choices[0].code;
}

export function packageDeliverables(text: string): string[] {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function servicePackagePayload(
  rows: ServicePackageDraft[],
): { ok: true; packages: ServicePackagePayload[] } | { ok: false; code: string } {
  if (rows.length > 12) return { ok: false, code: 'SERVICE_PACKAGES_TOO_MANY' };
  const seen = new Set<string>();
  const packages: ServicePackagePayload[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    const scope = row.scope.trim();
    const deliverables = packageDeliverables(row.deliverablesText);
    const durationDays = Math.round(Number(row.durationDays));
    const price = Number(row.price);
    const currency = row.currency === 'VND' ? 'VND' : row.currency === 'USD' ? 'USD' : '';
    if (!name || !scope || !deliverables.length) return { ok: false, code: 'SERVICE_PACKAGE_FIELDS' };
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
      return { ok: false, code: 'SERVICE_PACKAGE_DURATION' };
    }
    if (!(price > 0) || price > 100_000) return { ok: false, code: 'SERVICE_PACKAGE_PRICE' };
    if (currency === 'VND' && !Number.isSafeInteger(price)) return { ok: false, code: 'SERVICE_PACKAGE_PRICE' };
    if (!currency) return { ok: false, code: 'SERVICE_PACKAGE_CURRENCY' };
    const code = String(row.code || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `package-${packages.length + 1}`;
    if (seen.has(code)) return { ok: false, code: 'SERVICE_PACKAGE_CODE_DUPLICATE' };
    seen.add(code);
    packages.push({
      code,
      name,
      scope,
      deliverables,
      durationDays,
      price,
      currency,
    });
  }
  return { ok: true, packages };
}

export function needsUsageReview(pricing: { usageUnitStatus?: string | null } | null | undefined): boolean {
  return pricing?.usageUnitStatus === 'needs_review';
}

export function buyerUnitLabel(
  pricing: {
    usageUnitStatus?: string | null;
    usageUnitLabel?: { vi?: string; en?: string } | null;
    usageUnitCode?: string | null;
  } | null | undefined,
  lang: string,
): string {
  if (!pricing || pricing.usageUnitStatus === 'needs_review') return '';
  if (lang === 'vi' && pricing.usageUnitLabel?.vi) return pricing.usageUnitLabel.vi;
  if (pricing.usageUnitLabel?.en) return pricing.usageUnitLabel.en;
  return pricing.usageUnitCode || '';
}

export function viHirePrice(
  product: {
    pricingVnd?: { price?: ServerVndQuote | null } | null;
    servicePackages?: Array<{ code?: string; priceVnd?: ServerVndQuote | null }> | null;
  },
  packageCode?: string,
): string | null {
  const packages = product.servicePackages || [];
  if (packages.length) {
    const row = packages.find((item) => item.code === packageCode) || packages[0];
    return viPrice(row.priceVnd);
  }
  return viPrice(product.pricingVnd?.price);
}
