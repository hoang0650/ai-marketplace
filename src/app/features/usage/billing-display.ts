/**
 * Prices come from product.offers[]. A usage rate and a time pass are
 * different offers. Nothing here multiplies USD by a rate.
 */

export interface VndQuote {
  amountVnd?: number | null;
  authoritative?: boolean;
  code?: string | null;
}

export interface SellOffer {
  id: string;
  billingMode: 'usage' | 'period' | string;
  status: 'priced' | 'needs_review' | string;
  unit: string;
  labelVi?: string;
  labelEn?: string;
  rate?: number | null;
  price?: number | null;
  currency?: string | null;
  rateVnd?: VndQuote | null;
  priceVnd?: VndQuote | null;
  includesVi?: string;
  includesEn?: string;
}

export interface OfferProduct {
  offers?: SellOffer[] | null;
  listOfferId?: string | null;
}

export function authoritativeVnd(quote: VndQuote | null | undefined): number | null {
  const amount = quote?.amountVnd;
  if (quote?.authoritative !== true || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) {
    return null;
  }
  return amount;
}

export function formatDong(amountVnd: number): string {
  return `${amountVnd.toLocaleString('vi-VN')} đ`;
}

export function productOffers(product: OfferProduct | null | undefined): SellOffer[] {
  return Array.isArray(product?.offers) ? product.offers : [];
}

export function listOffer(product: OfferProduct | null | undefined): SellOffer | null {
  const offers = productOffers(product);
  if (!offers.length) return null;
  return offers.find((offer) => offer.id === product?.listOfferId) || offers.find((offer) => offer.status === 'priced') || null;
}

export function usageOffers(product: OfferProduct | null | undefined): SellOffer[] {
  return productOffers(product).filter((offer) => offer.billingMode === 'usage');
}

export function periodOffers(product: OfferProduct | null | undefined): SellOffer[] {
  return productOffers(product).filter((offer) => offer.billingMode === 'period');
}

export function offerAmount(offer: SellOffer | null | undefined): number | null {
  if (!offer || offer.status !== 'priced') return null;
  return authoritativeVnd(offer.billingMode === 'usage' ? offer.rateVnd : offer.priceVnd);
}

export function offerPriceLabel(offer: SellOffer | null | undefined, lang: string): string | null {
  if (!offer) return null;
  const label = lang === 'vi' ? offer.labelVi : offer.labelEn;
  if (lang === 'vi') {
    const amount = offerAmount(offer);
    if (amount == null || !label) return null;
    return `${formatDong(amount)}/${label}`;
  }
  const usd = offer.billingMode === 'usage' ? offer.rate : offer.price;
  if (!(Number(usd) > 0) || !label) return null;
  return `$${usd}/${label}`;
}

export function offerNote(offer: SellOffer | null | undefined, lang: string): string {
  if (!offer) return '';
  return lang === 'vi' ? offer.includesVi || '' : offer.includesEn || '';
}

export function offerBadge(offer: SellOffer | null | undefined, lang: string): string {
  if (!offer) return '';
  if (offer.billingMode === 'usage') return lang === 'vi' ? 'Theo ký tự' : 'Metered';
  if (offer.unit === '1_day') return lang === 'vi' ? 'Gói ngày' : 'Day pass';
  if (offer.unit === '1_week') return lang === 'vi' ? 'Gói tuần' : 'Week pass';
  if (offer.unit === '1_year') return lang === 'vi' ? 'Gói năm' : 'Year pass';
  if (offer.unit === '1_month') return lang === 'vi' ? 'Gói tháng' : 'Month pass';
  return lang === 'vi' ? 'Gói thời hạn' : 'Time pass';
}

export function periodTerm(unit: string | null | undefined): 'day' | 'week' | 'month' | 'year' | null {
  if (unit === '1_day') return 'day';
  if (unit === '1_week') return 'week';
  if (unit === '1_month') return 'month';
  if (unit === '1_year') return 'year';
  return null;
}

export function offerForTerm(product: OfferProduct | null | undefined, term: string | null | undefined): SellOffer | null {
  const unit = term === 'day' ? '1_day' : term === 'week' ? '1_week' : term === 'month' ? '1_month' : term === 'year' ? '1_year' : '';
  if (!unit) return null;
  return periodOffers(product).find((offer) => offer.unit === unit) || null;
}
