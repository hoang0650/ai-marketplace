/**
 * Affiliate bank-payout request. There is no commercial minimum.
 * Commission cannot be spent on the platform and is not moved into the internal balance.
 * The ledger amount is USD with 2 decimal places. The form amount is whole VND.
 * A VND figure that rounds to 0.00 USD is below currency precision, not a program minimum.
 * Seller and buyer withdrawal minimums are not decided here.
 */

export const AFFILIATE_USD_DECIMALS = 2;

export type AffiliateWithdrawCode = 'ok' | 'nonfinite' | 'not_positive' | 'below_precision' | 'exceeds_available';

export interface AffiliateWithdrawInput {
  /** Amount typed on the affiliate form, in VND. */
  amountVnd: number;
  /** Withdrawable commission on the affiliate ledger (USD). Excludes the 48h hold. Not spendable balance. */
  availableUsd: number;
  /** Same available balance converted to whole VND by the server quote. */
  availableVnd: number;
  /** VND per 1 USD used only to convert a partial request. Must be positive. */
  vndPerUsd: number;
}

export interface AffiliateWithdrawQuote {
  ok: boolean;
  code: AffiliateWithdrawCode;
  /** Body `amount` for POST /wallet/withdraw with persona affiliate. USD, 2 decimals. Paid out to the registered bank account. */
  amountUsd: number;
  /** Whole VND after precision rounding. 0 when rejected. */
  amountVnd: number;
}

function fail(code: Exclude<AffiliateWithdrawCode, 'ok'>): AffiliateWithdrawQuote {
  return { ok: false, code, amountUsd: 0, amountVnd: 0 };
}

function roundUsd(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function quoteAffiliateWithdraw(input: AffiliateWithdrawInput): AffiliateWithdrawQuote {
  const amountVnd = input.amountVnd;
  const availableUsd = input.availableUsd;
  const availableVnd = input.availableVnd;
  const vndPerUsd = input.vndPerUsd;
  if (
    !Number.isFinite(amountVnd) ||
    !Number.isFinite(availableUsd) ||
    !Number.isFinite(availableVnd) ||
    !Number.isFinite(vndPerUsd) ||
    vndPerUsd <= 0 ||
    availableUsd < 0 ||
    availableVnd < 0
  ) {
    return fail('nonfinite');
  }

  const vnd = Math.round(amountVnd);
  if (vnd <= 0) return fail('not_positive');

  const availVnd = Math.round(availableVnd);
  const availUsd = roundUsd(availableUsd);
  if (vnd > availVnd) return fail('exceeds_available');

  // Paying the full quoted VND balance uses the exact USD balance so FX rounding cannot exceed it.
  const amountUsd = vnd === availVnd ? availUsd : roundUsd(vnd / vndPerUsd);
  if (!(amountUsd > 0)) return fail('below_precision');
  if (amountUsd > availUsd) return fail('exceeds_available');
  return { ok: true, code: 'ok', amountUsd, amountVnd: vnd };
}
