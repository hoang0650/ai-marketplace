/**
 * Website GPay is a second top-up channel beside VietQR.
 * It never replaces VietQR, and the website never starts an iOS/Android in-app checkout.
 * Live credit still depends on the API: GPAY_ENABLED plus merchant credentials.
 * An unconfigured channel stays visibly unavailable.
 */

/** Body field sent to POST /v1/gpay/checkout. The website is not the native app. */
export const GPAY_WEB_CHECKOUT_PLATFORM = 'web' as const;

export interface GpayConfigFlags {
  available?: boolean;
  enabled?: boolean;
  portalEnabled?: boolean;
  qrEnabled?: boolean;
}

export interface GpayUiState {
  /** Show the VietQR | GPay switch. VietQR stays available either way. */
  visible: boolean;
  available: boolean;
  /** Credentials are present. False shows the offline notice, not a live checkout. */
  enabled: boolean;
  portalEnabled: boolean;
  qrEnabled: boolean;
}

type QueryGet = { get(name: string): string | null };

/**
 * True only for the native iOS shell, not for iPhone Safari.
 * The public website may offer GPay. The iOS app must keep using IAP and must not
 * be sent to a web checkout.
 */
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

export function gpayCheckoutBody(amountVnd: number): { amountVnd: number; platform: typeof GPAY_WEB_CHECKOUT_PLATFORM } {
  return { amountVnd, platform: GPAY_WEB_CHECKOUT_PLATFORM };
}

/**
 * `uiEnabled` is the website flag. `config.enabled` is the API (credentials + GPAY_ENABLED).
 * The iOS app shell never sees the channel.
 */
export function gpayUiState(opts: {
  uiEnabled: boolean;
  iosAppShell: boolean;
  config: GpayConfigFlags | null;
}): GpayUiState {
  const hidden: GpayUiState = {
    visible: false,
    available: false,
    enabled: false,
    portalEnabled: false,
    qrEnabled: false,
  };
  if (!opts.uiEnabled || opts.iosAppShell) return hidden;
  const config = opts.config;
  if (!config) {
    return { ...hidden, visible: true };
  }
  const enabled = config.enabled === true;
  return {
    visible: true,
    available: config.available ?? enabled,
    enabled,
    portalEnabled: enabled && config.portalEnabled === true,
    qrEnabled: enabled && config.qrEnabled === true,
  };
}
