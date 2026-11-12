/**
 * Reads the public user.affiliateOnboarding view from GET/POST auth.
 * Signup with role affiliate sets intent only. It does not verify eKYC,
 * issue affiliateCode, create commission, or approve a payout.
 * A new code can stay closed (403 ELECTRONIC_IDENTITY_NOT_IMPLEMENTED)
 * even after internal eKYC.
 */

export interface AffiliateOnboardingStatus {
  intent: boolean;
  emailVerified: boolean;
  ekycVerified: boolean;
  taxApproved: boolean;
  policyAccepted: boolean;
  policyVersion: string;
  electronicIdentity: string;
  codeIssued: boolean;
  readyForCode: boolean;
  canSell: boolean;
  canBuy: boolean;
}

type Step = { done?: boolean; status?: string; version?: string };

type OnboardingSource = {
  role?: string | null;
  emailVerified?: boolean | null;
  kycStatus?: string | null;
  affiliateOnboarding?: {
    intent?: boolean;
    canSell?: boolean;
    canBuy?: boolean;
    readyForCode?: boolean;
    codeIssued?: boolean;
    electronicIdentity?: string;
    ekycStatus?: string;
    emailVerified?: boolean | Step;
    steps?: {
      emailVerified?: Step;
      internalKyc?: Step;
      taxCode?: Step;
      policyAccepted?: Step;
      statutoryElectronicIdentity?: Step;
    };
  } | null;
  profile?: { affiliateOnboarding?: OnboardingSource['affiliateOnboarding'] } | null;
};

export function readAffiliateOnboarding(user: OnboardingSource | null | undefined): AffiliateOnboardingStatus {
  const raw = user?.affiliateOnboarding || user?.profile?.affiliateOnboarding || {};
  const steps = raw.steps || {};
  const electronic = electronicIdentity(raw, steps.statutoryElectronicIdentity);
  const identityOpen = electronic !== 'not_implemented' && steps.statutoryElectronicIdentity?.done === true;
  const serverReady = raw.readyForCode === true || raw.codeIssued === true;
  const emailStep = steps.emailVerified;
  const emailVerified = emailStep ? emailStep.done === true : raw.emailVerified === true || user?.emailVerified === true;
  const kycStep = steps.internalKyc;
  const ekycVerified = kycStep ? kycStep.done === true : raw.ekycStatus === 'verified' || user?.kycStatus === 'verified';
  return {
    intent: raw.intent === true || user?.role === 'affiliate',
    emailVerified,
    ekycVerified,
    taxApproved: steps.taxCode?.done === true,
    policyAccepted: steps.policyAccepted?.done === true,
    policyVersion: String(steps.policyAccepted?.version || ''),
    electronicIdentity: electronic,
    codeIssued: identityOpen && serverReady,
    readyForCode: identityOpen && raw.readyForCode === true,
    canSell: raw.canSell === true,
    canBuy: raw.canBuy !== false,
  };
}

function electronicIdentity(
  raw: NonNullable<OnboardingSource['affiliateOnboarding']>,
  step: Step | undefined,
): string {
  if (typeof step?.status === 'string' && step.status) return step.status;
  if (typeof raw.electronicIdentity === 'string' && raw.electronicIdentity) return raw.electronicIdentity;
  return 'not_implemented';
}

export function postAuthPath(role: string | null | undefined): string | null {
  if (String(role || '').trim().toLowerCase() === 'affiliate') return '/affiliate';
  return null;
}
