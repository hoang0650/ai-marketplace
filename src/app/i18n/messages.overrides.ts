import type { AppLang } from './messages';

/** Small terminology corrections shared with the mobile marketplace. */
export const MESSAGE_OVERRIDES: Partial<Record<AppLang, Record<string, string>>> = {
  vi: {
    'shop.verified': 'Người bán đã xác minh',
  },
};
