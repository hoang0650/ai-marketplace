/**
 * Affiliate signup contract.
 * Register and Google sign-up send `role: "affiliate"`.
 * Auth responses may include `affiliateOnboarding` on the user or under `profile`.
 * Codes stay unissued while electronic identity is not implemented.
 */

export interface AffiliateOnboarding {
  emailVerified: boolean;
  ekycStatus: string;
  taxCodeStatus: string;
  electronicIdentity: string;
  codeIssued: boolean;
}

type OnboardingSource = {
  role?: string | null;
  emailVerified?: boolean | null;
  kycStatus?: string | null;
  affiliateOnboarding?: Partial<AffiliateOnboarding> | null;
  profile?: { affiliateOnboarding?: Partial<AffiliateOnboarding> | null } | null;
};

export function readAffiliateOnboarding(user: OnboardingSource | null | undefined): AffiliateOnboarding {
  const raw = user?.affiliateOnboarding || user?.profile?.affiliateOnboarding || {};
  return {
    emailVerified: raw.emailVerified === true || user?.emailVerified === true,
    ekycStatus: String(raw.ekycStatus || user?.kycStatus || 'none'),
    taxCodeStatus: String(raw.taxCodeStatus || 'missing'),
    electronicIdentity: String(raw.electronicIdentity || 'not_implemented'),
    codeIssued: raw.codeIssued === true && String(raw.electronicIdentity || 'not_implemented') !== 'not_implemented' ? true : false,
  };
}

export function postAuthPath(role: string | null | undefined): string | null {
  if (role === 'affiliate') return '/affiliate';
  return null;
}
