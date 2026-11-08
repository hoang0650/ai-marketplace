export const environment = {
  production: false,
  /** Platform + gateway v1 — auth, products, wallet, chat/completions, … */
  apiUrl: 'http://localhost:4100/v1',
  /** RunPod-style serverless gateway v2 (/run, /status) */
  apiV2Url: 'http://localhost:4100/v2',
  /** PHGroup-AI / OpenClaw admin base */
  aiUrl: 'http://localhost:8080',
  /** OpenAI-compatible AI gateway v1 */
  aiV1Url: 'http://localhost:8080/v1',
  useMockApi: false,
  /**
   * GPay is not a top-up channel. This flag cannot turn a gateway back on.
   * Website top-up is VietQR to the company account.
   */
  gpayEnabled: false,
  /**
   * Site-wide trial / licensing notice. Set to false in both environment files
   * once the Ministry of Industry and Trade approves the e-commerce registration.
   */
  trialNotice: true,
  /** Optional fallback when /auth/google/config is unavailable (public Web client ID). */
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
