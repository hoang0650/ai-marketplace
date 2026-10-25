export const environment = {
  production: true,
  /** Platform + gateway v1 — auth, products, wallet, chat/completions, … */
  apiUrl: 'https://api.aimarkets.vn/v1',
  /** RunPod-style serverless gateway v2 (/run, /status) */
  apiV2Url: 'https://api.aimarkets.vn/v2',
  /** PHGroup-AI / OpenClaw admin base */
  aiUrl: 'https://ai.aimarkets.vn',
  /** OpenAI-compatible AI gateway v1 */
  aiV1Url: 'https://ai.aimarkets.vn/v1',
  useMockApi: false,
  /**
   * Temporary feature flag: GPay top-up UI is hidden while false (default).
   * The API also rejects new GPay payments unless GPAY_ENABLED=true on the server.
   * Flip to true (and set GPAY_ENABLED=true on the API) to bring GPay back.
   */
  gpayEnabled: false,
  /**
   * Site-wide trial / licensing notice. Set to false in both environment files
   * once the Ministry of Industry and Trade approves the e-commerce registration.
   */
  trialNotice: true,
  /** Public Web OAuth client ID — must match GOOGLE_CLIENT_ID on api.aimarkets.vn */
  googleClientId: '',
  brandName: 'AI Markets',
  brandTagline: 'AI models, skill packs, and professional services.',
  openclaw: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.openclaw.aimarkets.vn',
    tenantId: '',
    uiBaseUrl: '',
    gatewayUrl: '',
    gatewayToken: '',
    bearerToken: '',
  },
  hermes: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.hermes.aimarkets.vn',
    gatewayToken: '',
    username: 'admin',
    password: '',
  },
  nanoclaw: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.nanoclaw.aimarkets.vn',
    dashboardSecret: '',
  },
  spacebot: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.spacebot.aimarkets.vn',
    dashboardSecret: '',
  },
  openwebui: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.openwebui.aimarkets.vn',
  },
  paperclip: {
    audience: 'aimarkets',
    publicUrlTemplate: 'https://{userId}.paperclip.aimarkets.vn',
  },
};
