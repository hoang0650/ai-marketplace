/**
 * GPay is not a website top-up channel.
 * The UI flag and the API config cannot show it again.
 */

export interface GpayConfigFlags {
  available?: boolean;
  enabled?: boolean;
  portalEnabled?: boolean;
  qrEnabled?: boolean;
  removed?: boolean;
}

export interface GpayUiState {
  visible: boolean;
  available: boolean;
  enabled: boolean;
  portalEnabled: boolean;
  qrEnabled: boolean;
}

type QueryGet = { get(name: string): string | null };

/** True only for the native iOS shell, not for iPhone Safari. */
export function isIosAppShell(input: { userAgent?: string; query?: QueryGet | null }): boolean {
  const query = input.query;
  const marked = ['client', 'platform', 'app', 'shell']
    .map((key) => String(query?.get(key) || '').trim().toLowerCase())
    .filter(Boolean);
  if (marked.some((value) => value === 'ios' || value === 'iphone' || value === 'ipad' || value === 'ios-app')) {
    return true;
  }
  const ua = input.userAgent || '';
  return /AIMarkets-iOS|AIM-iOS|aimarkets-ios/i.test(ua);
}

/** The website does not start a GPay checkout. */
export function gpayCheckoutBody(): null {
  return null;
}

export function gpayUiState(_opts?: {
  uiEnabled?: boolean;
  iosAppShell?: boolean;
  config?: GpayConfigFlags | null;
}): GpayUiState {
  return { visible: false, available: false, enabled: false, portalEnabled: false, qrEnabled: false };
}
