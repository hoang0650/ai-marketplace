import assert from 'node:assert/strict';
import test from 'node:test';
import { gpayCheckoutBody, gpayUiState, isIosAppShell } from '../src/app/features/wallet/gpay-ui.ts';

function query(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

test('the website does not build a GPay checkout', () => {
  assert.equal(gpayCheckoutBody(), null);
});

test('iPhone Safari is not treated as the iOS app', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  assert.equal(isIosAppShell({ userAgent: ua, query: query({}) }), false);
  assert.equal(isIosAppShell({ userAgent: 'AIMarkets-iOS/1.0', query: query({}) }), true);
});

test('GPay stays hidden even when a flag or the API says it is enabled', () => {
  const state = gpayUiState({
    uiEnabled: true,
    iosAppShell: false,
    config: { available: true, enabled: true, portalEnabled: true, qrEnabled: true, removed: false },
  });
  assert.deepEqual(state, {
    visible: false,
    available: false,
    enabled: false,
    portalEnabled: false,
    qrEnabled: false,
  });
});
