/**
 * Buyer withdrawal stays off until an AI Markets contract, permit scope and
 * integration are actually in place. A server flag alone does not open it.
 * App Store and Google Play top-ups are outside this request.
 * A manual supplier-tax review is not an identity status.
 */
export const BUYER_TOPUP_WITHDRAW_ACTIVATED = false;
export interface BuyerDepositWithdrawSnapshot {
  enabled?: boolean | null;
  fundingSeparated?: boolean | null;
  electronicIdentityStatus?: string | null;
  payableUsd?: number | null;
  payableVnd?: number | null;
  blockedSources?: readonly string[] | null;
  settlement?: string | null;
}

export type BuyerTopupBlocker =
  | 'NOT_ACTIVATED'
  | 'SERVER_GATE_CLOSED'
  | 'IDENTITY_REQUIRED'
  | 'APPSTORE_UNRESOLVED'
  | 'GPAY_REMOVED'
  | 'SOURCE_NOT_SEPARATED'
  | 'NOTHING_TO_WITHDRAW'
  | 'DEPOSIT_CAP';

export function buyerTopupWithdrawDecision(input: {
  snapshot?: BuyerDepositWithdrawSnapshot | null;
  amountVnd?: number | null;
}): { ok: true; amountVnd: number } | { ok: false; blocker: BuyerTopupBlocker } {
  if (!BUYER_TOPUP_WITHDRAW_ACTIVATED) return { ok: false, blocker: 'NOT_ACTIVATED' };
  const snap = input.snapshot;
  if (!snap || snap.enabled !== true || snap.fundingSeparated !== true || snap.settlement !== 'VND') {
    return { ok: false, blocker: 'SERVER_GATE_CLOSED' };
  }
  if (snap.electronicIdentityStatus !== 'verified') return { ok: false, blocker: 'IDENTITY_REQUIRED' };
  const payable = Number(snap.payableVnd);
  const blocked = snap.blockedSources || [];
  if (!Number.isInteger(payable) || payable <= 0) {
    if (blocked.includes('appstore')) return { ok: false, blocker: 'APPSTORE_UNRESOLVED' };
    if (blocked.includes('gpay')) return { ok: false, blocker: 'GPAY_REMOVED' };
    if (blocked.includes('unknown') || blocked.includes('other')) return { ok: false, blocker: 'SOURCE_NOT_SEPARATED' };
    return { ok: false, blocker: 'NOTHING_TO_WITHDRAW' };
  }
  const amount = Number(input.amountVnd);
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, blocker: 'NOTHING_TO_WITHDRAW' };
  if (amount > payable) return { ok: false, blocker: 'DEPOSIT_CAP' };
  return { ok: true, amountVnd: amount };
}
