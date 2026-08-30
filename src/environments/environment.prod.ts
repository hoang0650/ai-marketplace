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
