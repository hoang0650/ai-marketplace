import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GPAY_WEB_CHECKOUT_PLATFORM,
  gpayCheckoutBody,
  gpayUiState,
  isIosAppShell,
} from '../src/app/features/wallet/gpay-ui.ts';

function query(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

test('website checkout is the web channel only', () => {
  assert.equal(GPAY_WEB_CHECKOUT_PLATFORM, 'web');
  assert.deepEqual(gpayCheckoutBody(100000), { amountVnd: 100000, platform: 'web' });
});

test('iPhone Safari is not treated as the iOS app', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  assert.equal(isIosAppShell({ userAgent: ua, query: query({}) }), false);
});

test('native iOS shell does not see GPay', () => {
  assert.equal(isIosAppShell({ userAgent: 'AIMarkets-iOS/1.0', query: query({}) }), true);
  assert.equal(isIosAppShell({ userAgent: '', query: query({ platform: 'ios' }) }), true);
  assert.equal(isIosAppShell({ userAgent: '', query: query({ client: 'android' }) }), false);

  const state = gpayUiState({
    uiEnabled: true,
    iosAppShell: true,
    config: { available: true, enabled: true, portalEnabled: true, qrEnabled: true },
  });
  assert.deepEqual(state, {
    visible: false,
    available: false,
    enabled: false,
    portalEnabled: false,
    qrEnabled: false,
  });
});

test('web flag shows GPay beside VietQR but does not enable an unconfigured gateway', () => {
  const off = gpayUiState({
    uiEnabled: true,
    iosAppShell: false,
    config: { available: false, enabled: false, portalEnabled: false, qrEnabled: false },
  });
  assert.equal(off.visible, true);
  assert.equal(off.enabled, false);
  assert.equal(off.portalEnabled, false);
  assert.equal(off.qrEnabled, false);
});

test('configured API turns on portal and QR without hiding VietQR', () => {
  const on = gpayUiState({
    uiEnabled: true,
    iosAppShell: false,
    config: { available: true, enabled: true, portalEnabled: true, qrEnabled: true },
  });
  assert.equal(on.visible, true);
  assert.equal(on.enabled, true);
  assert.equal(on.portalEnabled, true);
  assert.equal(on.qrEnabled, true);
});

test('portal or QR bits are ignored unless the API says the channel is enabled', () => {
  const state = gpayUiState({
    uiEnabled: true,
    iosAppShell: false,
    config: { enabled: false, portalEnabled: true, qrEnabled: true },
  });
  assert.equal(state.portalEnabled, false);
  assert.equal(state.qrEnabled, false);
});

test('website flag off hides GPay even when the API is configured', () => {
  const state = gpayUiState({
    uiEnabled: false,
    iosAppShell: false,
    config: { available: true, enabled: true, portalEnabled: true, qrEnabled: true },
  });
  assert.equal(state.visible, false);
  assert.equal(state.enabled, false);
});
