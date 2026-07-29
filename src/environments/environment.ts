export const environment = {
  production: false,
  /** Real backend: ai-marketplace-api (Express + MongoDB) */
  apiUrl: 'http://localhost:4100/api',
  /** PHGroup-AI — same as hotelapp for OpenClaw direct-url / pairing */
  aiUrl: 'http://localhost:8080',
  /** Set true to use in-browser mock interceptor instead of real API */
  useMockApi: false,
  brandName: 'PH AI Market',
  brandTagline: 'AI models, skill packs, and hire talent.',
  openclaw: {
    /** Hotel / tenant id used for gateway cell resolution */
    tenantId: '',
    /** Control UI origin, e.g. https://{tenant}.phhotel.vn */
    uiBaseUrl: '',
    /** wss://… gateway — used when direct-url API is unavailable */
    gatewayUrl: '',
    gatewayToken: '',
    /** Optional Nest/PHHotel JWT if marketplace token is not accepted by AI admin */
    bearerToken: '',
  },
};
