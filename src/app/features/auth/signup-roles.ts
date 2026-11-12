/**
 * Public registration contract from ai-marketplace-api master (PR #75).
 *
 * POST /v1/auth/register field `role`:
 *   buyer | seller | affiliate. Comparison is case-insensitive.
 *   Omitted role → buyer. asCreator:true with no role → seller. creator → seller.
 *   `marketer` is INVALID_ROLE. Do not post it.
 *
 * GET /v1/auth/roles is the label source. Vietnamese labels:
 *   buyer Người mua, seller Người bán, affiliate Người tiếp thị liên kết.
 * The shorter "Người tiếp thị" drops "liên kết", which is the wording used for
 * this program (Quy trình tiếp thị liên kết), so the dropdown uses the API label.
 *
 * acceptAffiliatePolicy:true is optional. The server records policy version
 * quy-che-affiliate-2026-10. The client does not send that version.
 * Signup does not issue a code, verify eKYC, create commission, or approve a payout.
 */

export const API_SIGNUP_ROLE_IDS = ['buyer', 'seller', 'affiliate'] as const;

/** Version the API stores when acceptAffiliatePolicy is true. Not sent by the client. */
export const AFFILIATE_POLICY_VERSION = 'quy-che-affiliate-2026-10';

export const API_SIGNUP_LABELS_VI: Record<(typeof API_SIGNUP_ROLE_IDS)[number], string> = {
  buyer: 'Người mua',
  seller: 'Người bán',
  affiliate: 'Người tiếp thị liên kết',
};

export interface AuthRoleOption {
  id: string;
  label?: string;
}

export interface SignupChoice {
  id: string;
  label: string;
}

const WORK_ONLY = ['talent', 'freelancer', 'employer'] as const;

export function fallbackSignupRoleIds(workBoard: boolean): string[] {
  const base = ['buyer', 'seller', 'affiliate'];
  return workBoard ? [...base, ...WORK_ONLY] : base;
}

export function signupChoices(input: {
  apiRoles?: AuthRoleOption[] | null;
  workBoard: boolean;
  lang: string;
  translate: (roleId: string) => string;
}): SignupChoice[] {
  const fromApi = (input.apiRoles || [])
    .map((role) => ({
      id: String(role?.id || '').trim().toLowerCase(),
      label: String(role?.label || '').trim(),
    }))
    .filter((role) => role.id && role.id !== 'admin' && role.id !== 'marketer');
  const ids = fromApi.length ? fromApi.map((role) => role.id) : fallbackSignupRoleIds(input.workBoard);
  const apiLabel = new Map(fromApi.map((role) => [role.id, role.label]));
  return ids.map((id) => ({
    id,
    label: choiceLabel(id, apiLabel.get(id) || '', input.lang, input.translate),
  }));
}

function choiceLabel(id: string, apiLabel: string, lang: string, translate: (roleId: string) => string): string {
  if (lang === 'vi' && apiLabel) return apiLabel;
  const local = translate(id);
  if (local && local !== id && local !== `signup.role.${id}`) return local;
  if (lang === 'vi' && id in API_SIGNUP_LABELS_VI) {
    return API_SIGNUP_LABELS_VI[id as keyof typeof API_SIGNUP_LABELS_VI];
  }
  return apiLabel || id;
}

export interface RegisterBody {
  email: string;
  name: string;
  password: string;
  confirmPassword?: string;
  role: string;
  googleSignupToken?: string;
  acceptAffiliatePolicy?: true;
  avatarUrl?: string;
}

export function buildRegisterBody(input: {
  email: string;
  name: string;
  password: string;
  confirmPassword?: string;
  role?: string | null;
  asCreator?: boolean;
  googleSignupToken?: string;
  acceptAffiliatePolicy?: boolean;
  avatarUrl?: string;
}): { ok: true; body: RegisterBody } | { ok: false; code: 'INVALID_ROLE'; roles: readonly string[] } {
  const resolved = resolvePostedRole(input.role, input.asCreator);
  if (!resolved.ok) return resolved;
  const body: RegisterBody = {
    email: input.email,
    name: input.name,
    password: input.password,
    role: resolved.role,
  };
  if (input.confirmPassword !== undefined) body.confirmPassword = input.confirmPassword;
  const token = String(input.googleSignupToken || '').trim();
  if (token) body.googleSignupToken = token;
  const avatar = String(input.avatarUrl || '').trim();
  if (avatar) body.avatarUrl = avatar;
  if (resolved.role === 'affiliate' && input.acceptAffiliatePolicy === true) {
    body.acceptAffiliatePolicy = true;
  }
  return { ok: true, body };
}

/** Mirror of the API's resolveSignupRole for values this form is allowed to send. */
export function resolvePostedRole(
  role: string | null | undefined,
  asCreator?: boolean,
): { ok: true; role: string } | { ok: false; code: 'INVALID_ROLE'; roles: readonly string[] } {
  const requested = String(role ?? '').trim().toLowerCase();
  if (requested === 'marketer') {
    return { ok: false, code: 'INVALID_ROLE', roles: API_SIGNUP_ROLE_IDS };
  }
  if (!requested && asCreator) return { ok: true, role: 'seller' };
  if (requested === 'creator') return { ok: true, role: 'seller' };
  return { ok: true, role: requested || 'buyer' };
}
