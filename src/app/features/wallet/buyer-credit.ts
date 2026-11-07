/** Buyer top-up credit is not a cash payout. Seller revenue and affiliate commission are separate. */
export function buyerPrepaidCashoutBlocked(input: {
  persona?: string | null;
  policyPersona?: string | null;
}): boolean {
  return input.persona === 'buyer' || input.policyPersona === 'buyer';
}

/** Seller, talent, freelancer, employer and admin payouts still require identity. Ordinary buyers do not. */
export function payoutIdentityRequired(role: string | null | undefined): boolean {
  return role === 'seller' || role === 'talent' || role === 'freelancer' || role === 'employer' || role === 'admin';
}

/** Cases that still require identity. Ordinary buyer checkout, top-up, use, complaints and refund requests are not in this list. */
export const IDENTITY_REQUIRED_FOR = ['seller_approval', 'seller_payout', 'affiliate_link', 'affiliate_payout'] as const;

const EARNED = new Set(['seller', 'talent', 'freelancer', 'employer', 'admin']);

export interface CashoutFacts {
  persona?: string | null;
  policyPersona?: string | null;
  role?: string | null;
  buyerCashoutAllowed?: boolean | null;
  prepaidWithdrawable?: boolean | null;
  buyerIdentityRequired?: boolean | null;
  payableAmount?: number | null;
  available?: number | null;
  personas?: readonly string[] | null;
}

export function hasEarnedPayoutPersona(personas: readonly string[] | null | undefined): boolean {
  return (personas || []).some((p) => EARNED.has(p));
}

/** Hide the cash-out form for ordinary buyer credit. A seller or affiliate slice with a payable cap stays open. */
export function buyerCashoutClosed(input: CashoutFacts): boolean {
  if (input.persona === 'buyer' || input.policyPersona === 'buyer') return true;
  const earned = hasEarnedPayoutPersona(input.personas);
  const ordinary = input.role === 'buyer' || input.role === 'member';
  if (ordinary && !earned) return true;
  if (input.buyerCashoutAllowed === false && !earned && !(Number(input.payableAmount) > 0)) return true;
  return false;
}

/** Payable earnings cap. Prepaid credit is excluded when the summary says it is not withdrawable. */
export function earnedPayoutCap(input: { payableAmount?: number | null; available?: number | null; prepaidWithdrawable?: boolean | null }): number {
  const available = Number(input.available);
  const payable = Number(input.payableAmount);
  const hasAvailable = Number.isFinite(available);
  const hasPayable = Number.isFinite(payable);
  if (input.prepaidWithdrawable === false) return hasPayable ? Math.max(0, payable) : 0;
  if (hasPayable && hasAvailable) return Math.max(0, Math.min(payable, available));
  if (hasPayable) return Math.max(0, payable);
  return hasAvailable ? Math.max(0, available) : 0;
}

export type CashoutErrorKind = 'buyer' | 'prepaid_cap' | 'kyc' | 'affiliate_short';

export function cashoutErrorKind(code: string | null | undefined): CashoutErrorKind | null {
  if (code === 'BUYER_CREDIT_NON_WITHDRAWABLE') return 'buyer';
  if (code === 'PREPAID_NOT_WITHDRAWABLE') return 'prepaid_cap';
  if (code === 'KYC_REQUIRED') return 'kyc';
  if (code === 'AFFILIATE_INSUFFICIENT') return 'affiliate_short';
  return null;
}
