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
  /** Optional fallback when /auth/google/config is unavailable (public Web client ID). */
  googleClientId: '',
  brandName: 'AI Markets',
  brandTagline: 'AI models, skill packs, and hire talent.',
  openclaw: {
    tenantId: '',
    uiBaseUrl: '',
    gatewayUrl: '',
    gatewayToken: '',
    bearerToken: '',
  },
};
