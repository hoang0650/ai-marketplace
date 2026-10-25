/**
 * Product categories — AI marketplace only (APIs, models, inference, agents).
 */
export type ProductCategory =
  | 'text-to-text'
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-image'
  | 'image-to-image'
  | 'api-endpoint'
  | 'inference'
  | 'fine-tune'
  | 'dataset'
  | 'gpu-compute'
  | 'game-server'
  | 'training-service'
  | 'agent-runtime'
  | 'hire-agent'
  | 'hire-marketing'
  | 'hire-seo'
  | 'hire-creator'
  | 'hire-workflow'
  | 'hire-build-app'
  | 'hire-build-web'
  | 'template-web'
  | 'template-app'
  | 'skill-pack'
  | 'voice-clone'
  | 'voice-preset'
  | 'ai-film-series'
  | 'story-book';

export type CategoryGroup = 'models' | 'skills' | 'hire' | 'apis';

export type CatalogLane = 'ai';

export type NavGroup = 'generate' | 'apis' | 'platform' | 'talent';

export type PricingModel = 'free' | 'one-time' | 'subscription' | 'usage';

export type PaymentProvider = 'wallet' | 'paypal' | 'paddle' | 'payos';

export type UserRole = 'buyer' | 'seller' | 'talent' | 'freelancer' | 'employer' | 'admin';

/** Roles a user may pick at signup (admin is never self-assignable). */
export type SignupRole = Exclude<UserRole, 'admin'>;

export type ModerationStatus = 'active' | 'suspended' | 'blocked' | 'inactive';

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  creatorSlug?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  verified?: boolean;
  accountStatus: ModerationStatus;
  storedStatus?: ModerationStatus;
  suspendedUntil?: string | null;
  statusReason?: string;
  statusChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
  orderCount?: number;
  walletByType?: Record<string, number>;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  category: string;
  productType?: string;
  provider?: string;
  creatorId?: string;
  creatorSlug?: string;
  creatorName?: string;
  coverUrl?: string;
  featured?: boolean;
  published?: boolean;
  publishedAt?: string;
  moderationStatus: ModerationStatus;
  storedStatus?: ModerationStatus;
  suspendedUntil?: string | null;
  statusReason?: string;
  statusChangedAt?: string | null;
  salesCount?: number;
  orderCount?: number;
}

export interface CategoryMeta {
  id: ProductCategory;
  label: string;
  description: string;
  hubPath: string;
  group: CategoryGroup;
  navGroup: NavGroup;
  lane: CatalogLane;
  /** Live catalog size from GET /categories (published + moderation-visible). */
  productCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  coverUrl?: string;
  role: UserRole;
  /** Least-privilege staff permissions, e.g. 'finance.tax' (kế toán thuế). Admins need none. */
  adminPermissions?: string[];
  creatorSlug?: string;
  bio?: string;
  /** none | draft | pending | verified | rejected */
  kycStatus?: string;
  hasPassword?: boolean;
  googleLinked?: boolean;
  profile?: UserProfileExtras;
  preferences?: UserPreferences;
  createdAt: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface UserProfileExtras {
  introLine: '' | 'buyer' | 'seller' | 'builder' | 'learner';
  region: string;
  website: string;
  notifyLang: 'vi' | 'en' | 'zh';
  socials: SocialLink[];
}

export interface UserPreferences {
  personalizeContent: boolean;
  personalizeAds: boolean;
  /** Email a notice on each new sign-in. */
  emailLoginAlerts?: boolean;
}

export interface AccountActivityItem {
  type:
    | 'account_created'
    | 'profile_updated'
    | 'password_changed'
    | 'kyc_submitted'
    | 'kyc_verified'
    | 'kyc_rejected'
    | 'last_login';
  at: string;
  ip?: string | null;
}

export interface CurrentSessionInfo {
  lastLogin: string | null;
  lastLoginIp: string | null;
  userAgent: string;
}

export type KycStatus = 'none' | 'draft' | 'pending' | 'verified' | 'rejected';
export type KycIdType = 'cccd' | 'cmnd' | 'passport' | 'other';
/** `license`: business registration certificate (household business / company) — Quy chế 2.1 Mục VIII. */
export type KycSide = 'front' | 'back' | 'license';
export type KycSubjectType = 'individual' | 'organization';
export type KycOrgType = 'household' | 'company';

export interface KycProfile {
  status: KycStatus;
  subjectType: KycSubjectType;
  /** Individual: the person. Organization: the legal representative / household owner. */
  fullName: string;
  idType: KycIdType;
  idNumber?: string;
  idNumberMasked: string;
  personalTaxCode?: string;
  personalTaxCodeMasked: string;
  orgType: KycOrgType | '';
  orgName: string;
  orgTaxCode: string;
  orgAddress: string;
  hasFront: boolean;
  hasBack: boolean;
  /** Business registration certificate uploaded (organizations). */
  hasLicense?: boolean;
  /** True when subjectType is organization: the licence scan is required to submit. */
  licenseRequired?: boolean;
  /** Uploaded business licence file (PDF; legacy uploads may be images). */
  licenseFile?: KycLicenseFile | null;
  /** Admin only: KYC record id, user id and MinIO storage info per document. */
  recordId?: string;
  userId?: string;
  frontObjectName?: string;
  backObjectName?: string;
  licenseObjectName?: string;
  documents?: KycDocumentInfo[];
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  canSubmit: boolean;
  canEdit: boolean;
  withdrawAllowed: boolean;
}

export interface KycSubmitBody {
  subjectType: KycSubjectType;
  fullName: string;
  idType: KycIdType;
  idNumber: string;
  personalTaxCode?: string;
  orgType?: KycOrgType;
  orgName?: string;
  orgTaxCode?: string;
  orgAddress?: string;
}

export type KycReviewStatus = 'pending' | 'verified' | 'rejected' | 'all';

export interface KycQueueItem {
  userId: string;
  email: string;
  name: string;
  role: string;
  reviewedBy: { name: string; email: string } | null;
  kyc: KycProfile;
}

export interface KycQueueResponse {
  counts: { pending: number; verified: number; rejected: number };
  items: KycQueueItem[];
}

export type AgentPurgeTab = 'manual' | 'failed' | 'upcoming' | 'done';

export interface AgentPurgeItem {
  id: string;
  agentId: string;
  label: string;
  user: { id: string; email: string; name: string };
  workspaceUrl: string;
  /** Session / Hermes profile on the runtime host (`market-<userId>`). */
  workspace: string;
  paidUntil: string;
  purgeDueAt: string | null;
  purgeStatus: '' | 'done' | 'manual_required' | 'failed';
  purgeAttemptedAt: string | null;
  purgeError: string;
  purgedAt: string | null;
  purgedBy: { id: string; email: string; name: string } | null;
  purgeNote: string;
  webhookConfigured: boolean;
}

export interface AgentPurgeRuntime {
  agentId: string;
  label: string;
  webhookConfigured: boolean;
  webhookEnv: string;
}

export interface AgentPurgeQueueResponse {
  tab: AgentPurgeTab;
  items: AgentPurgeItem[];
  counts: Record<AgentPurgeTab, number>;
  runtimes: AgentPurgeRuntime[];
}

export interface Creator {
  id: string;
  slug: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  verified: boolean;
  productCount: number;
  rating: number;
  totalSales: number;
  revenue?: number;
  reviewCount?: number;
  joinedAt?: string;
}

export interface ProductDemo {
  kind: 'image' | 'video' | 'audio' | 'text';
  url?: string;
  posterUrl?: string;
  text?: string;
  prompt?: string;
  inputImageUrl?: string;
  settings?: string;
  createdAt?: string;
}

export interface ProductPricing {
  model: PricingModel;
  price: number;
  currency: string;
  interval?: 'day' | 'month' | 'year';
  usageUnit?: string;
  usageRate?: number;
  compareAtPrice?: number;
  /** Hire listings: `price` is the starting quote; buyer may counter-offer. */
  negotiable?: boolean;
}

export interface ProductContentMeta {
  kind?: 'voice' | 'series' | 'story' | 'skill' | 'dataset' | '';
  voiceSource?: 'clone' | 'preset' | '';
  voiceModes?: Array<'tts' | 'stt'>;
  voiceSampleUrl?: string;
  presetVoiceId?: string;
  presetVoiceName?: string;
  cloneStatus?: 'pending' | 'ready' | 'failed' | '';
  cloneProvider?: string;
  cloneEndpoint?: string;
  cloneError?: string;
  cloneReadyAt?: string;
  creditUnit?: 'character' | 'word' | '';
  charactersPerCredit?: number;
  episodeCount?: number;
  synopsis?: string;
  genres?: string[];
  licenseTerm?: 'day' | 'month' | 'year' | '';
  licensePrices?: { day?: number; month?: number; year?: number };
}

export interface IssuedLicense {
  id: string;
  licenseKey: string;
  orderId?: string;
  productId?: string;
    productName?: string;
    sellerId?: string;
    sellerName?: string;
  category?: string;
  term: 'day' | 'month' | 'year';
  startsAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  valid: boolean;
}

/** Downloadable file of a licensed skill pack / dataset (GET /v1/product-files/:productId). */
export interface ProductFile {
  id: string;
  index: number;
  filename: string;
  contentType: string;
  size: number;
  description?: string;
  updatedAt?: string;
}

export interface ContentEpisode {
  id: string;
  productId: string;
  index: number;
  title: string;
  kind: 'video' | 'image' | 'audio' | 'text';
  mime: string;
  durationSec: number;
  size: number;
  previewUrl: string;
  published: boolean;
  pageCount?: number;
  free?: boolean;
  synopsis?: string;
  posterUrl?: string;
}

export interface ReaderBookmark {
  id: string;
  episodeId: string;
  fraction: number;
  page: number;
  kind: 'bookmark' | 'highlight';
  quote: string;
  note: string;
  color: string;
  createdAt: string;
}

export interface SeriesInfo {
  bookmarks?: ReaderBookmark[];
  productId: string;
  slug: string;
  title: string;
  synopsis: string;
  genres: string[];
  episodeCount: number;
  likes: number;
  saves: number;
  liked: boolean;
  saved: boolean;
  progress: { episodeId: string; positionSec: number; fraction?: number; page?: number; updatedAt?: string } | null;
  episodes: ContentEpisode[];
}

export interface ContentUnlock {
  ok: boolean;
  playUrl: string;
  playToken?: string;
  /** Only set for the seller / admin; buyers use the product online only. */
  downloadUrl: string | null;
  onlineOnly?: boolean;
  access?: 'moderation' | 'owner' | 'free' | 'license';
  traceId?: string;
  /** Short buyer watermark ("ma***@domain · AIM-…XXXX · trace") shown over the player / reader. */
  watermark?: string;
  kind: string;
  mime: string;
  title: string;
  pageCount?: number;
  pages?: Array<{ index: number; playUrl: string }>;
  expiresIn: number;
  licenseExpiresAt: string | null;
  drm: string;
}

/** Seller RunPod / gateway runtime attached to a catalog product. */
export interface ProductRuntime {
  serverlessEndpoint: string;
  tokenizeEndpoint: string;
  gatewayUrl: string;
  publicEndpoint: string;
  /** Present when caller owns the product; otherwise only envKeys. */
  env?: Array<{ key: string; value: string }>;
  envKeys?: string[];
  skills: string[];
  baseModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export type OwnershipType = 'PLATFORM_DIRECT' | 'THIRD_PARTY_SELLER';

export type SellerVerificationStatus =
  | 'PENDING'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'TERMINATED';

/** pc = web / desktop (keyboard + mouse); mobile = Android / iOS app (touch, landscape). */
export type StreamDevice = 'pc' | 'mobile';

export interface ProductStreaming {
  devices: StreamDevice[];
  /** Platform-sold GPU: rented as a platform GPU workspace (/gpu) instead of a seller stream. */
  platformRental?: boolean;
  rentalOfferId?: string;
}

export type ProductKind = 'DIGITAL' | 'PHYSICAL';

export interface ProductKindRate {
  vat: number;
  pit: number;
  total: number;
  withheldByPlatform: boolean;
}

export interface ProductKindRates {
  sellerType: string;
  sellerTypeDeclared: boolean;
  rates: Record<ProductKind, ProductKindRate>;
  policyVersion?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  productType?: string;
  /** Seller declaration: digital product/service vs physical goods (drives withheld tax). */
  productKind?: ProductKind;
  productKindDefaultedAt?: string | null;
  /** Infra provider only (runpod/openrouter/…). Not the marketplace seller. */
  provider?: string;
  infraProvider?: string;
  ownershipType?: OwnershipType;
  soldByPlatform?: boolean;
  sellerId?: string;
  sellerSlug?: string;
  sellerName?: string;
  license?: string;
  termsSummary?: string;
  complianceStatus?: string;
  moderationStatus?: string;
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  coverUrl: string;
  gallery: string[];
  /** Real outputs generated by this product, with the input that produced them. */
  demos?: ProductDemo[];
  pricing: ProductPricing;
  /** Seller-set affiliate commission 0–0.25 (null = store default). */
  affiliateRate?: number | null;
  /** Effective rate shown on the product page ("Hoa hồng lên đến X%"). */
  affiliateEffectiveRate?: number;
  contentMeta?: ProductContentMeta | null;
  /** GPU / game stream listings only. */
  streaming?: ProductStreaming;
  runtime?: ProductRuntime;
  rating: number;
  reviewCount: number;
  /** Paid units sold (from orders). */
  salesCount?: number;
  /** Alias of salesCount on the live API. */
  installCount: number;
  tags: string[];
  apiDocsMarkdown: string;
  changelog: ChangelogEntry[];
  featured?: boolean;
  publishedAt: string;
}

export interface HomeFeed {
  shops: Creator[];
  newArrivals: Product[];
  promoted: Product[];
  bestsellers: Product[];
}

export interface Coupon {
  id: string;
  sellerId?: string;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  productIds: string[];
  minSubtotal: number;
  maxDiscount: number;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number;
  maxUsesPerBuyer: number;
  usedCount: number;
  active: boolean;
  createdAt?: string | null;
}

export interface CouponPreview {
  ok: boolean;
  code: string;
  type: 'percent' | 'amount';
  value: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  buyerId?: string;
  buyerName: string;
  sellerId?: string;
  ownershipType?: OwnershipType;
  quantity?: number;
  amount: number;
  sellerNet?: number;
  platformFee?: number;
  salesChannel?: 'WEB' | 'GOOGLE_PLAY' | 'APP_STORE';
  storeFeeRate?: number;
  storeFeeAmount?: number;
  storeFeeCollector?: 'GOOGLE' | 'APPLE' | '';
  currency: string;
  status: 'pending' | 'paid' | 'refunded';
  paymentStatus?: string;
  fulfillmentStatus?: string;
  paymentProvider?: PaymentProvider | 'internal_ledger';
  provider: PaymentProvider | 'internal_ledger';
  contractSnapshot?: Record<string, unknown> | null;
  createdAt: string;
  completedAt?: string | null;
  payoutHoldUntil?: string;
  payoutHeld?: boolean;
  payoutHoldKind?: 'protection_window' | 'dispute' | null;
  disputeStatus?: 'none' | 'open' | 'seller_win' | 'buyer_win';
  disputeReason?: string;
  disputeOpenedAt?: string | null;
  disputeResolvedAt?: string | null;
  canDispute?: boolean;
}

export type ComplaintKind =
  | 'buyer_seller'
  | 'buyer_platform'
  | 'seller_platform'
  | 'employer_freelancer'
  | 'freelancer_employer'
  | 'employer_platform'
  | 'freelancer_platform';
export type ComplaintStatus =
  | 'received'
  | 'verifying'
  | 'classified'
  | 'awaiting_seller'
  | 'reviewing'
  | 'decided'
  | 'closed';
export type ComplaintDecision = '' | 'upheld' | 'rejected' | 'mediated';

export interface ComplaintEvent {
  at: string;
  actorRole: string;
  action: string;
  note: string;
}

export interface ComplaintMessage {
  id: string;
  authorId: string;
  role: 'complainant' | 'seller' | 'admin';
  body: string;
  attachments: import('../shared/attachments/attachments').FileAttachment[];
  at: string | null;
}

export interface Complaint {
  messages?: ComplaintMessage[];
  id: string;
  caseRef: string;
  complainantId: string;
  complainantName: string;
  complainantEmail: string;
  kind: ComplaintKind;
  orderId: string | null;
  productId: string | null;
  productName: string;
  jobApplicationId?: string | null;
  jobId?: string | null;
  jobTitle?: string;
  jobSlug?: string;
  sellerId: string | null;
  body: string;
  requestedAction: string;
  evidenceUrls: string[];
  status: ComplaintStatus;
  sellerResponse: string;
  sellerRespondedAt: string | null;
  decision: ComplaintDecision;
  decisionNote: string;
  decidedAt: string | null;
  appealReason: string;
  appealedAt: string | null;
  openedOrderDispute: boolean;
  closedAt: string | null;
  events: ComplaintEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  id: string;
  contextType?: 'product' | 'job' | 'talent';
  productId: string;
  productName: string;
  productSlug: string;
  productCover: string;
  jobId?: string;
  jobTitle?: string;
  jobSlug?: string;
  talentSlug?: string;
  title?: string;
  role: 'buyer' | 'seller';
  otherId: string;
  otherName: string;
  lastMessage: string;
  lastKind: 'text' | 'image';
  lastMessageAt: string | null;
  unread: number;
  createdAt: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'image' | 'file';
  body: string;
  imageUrl: string;
  attachments?: import('../shared/attachments/attachments').FileAttachment[];
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  sellerType: string;
  /** Seller type explicitly declared at registration (mandatory, tax policy 2026-10). */
  sellerTypeDeclared?: boolean;
  taxRate?: { vat: number; pit: number; total: number; withheldByPlatform: boolean };
  legalName: string;
  displayName: string;
  taxCode: string;
  businessRegistrationNumber: string;
  businessAddress: string;
  contactEmail: string;
  contactPhone: string;
  identityVerificationStatus: string;
  verificationStatus: SellerVerificationStatus;
  complianceStatus: string;
  sellerAgreementVersion: string;
  sellerAgreementAcceptedAt: string | null;
  verifiedAt: string | null;
  statusReason: string;
  canPublish: boolean;
}

export interface LegalDocumentMeta {
  id: string;
  documentType: string;
  version: string;
  title: string;
  locale: string;
  summary: string;
  effectiveAt: string | null;
  publishedAt: string | null;
  status: string;
  content?: string;
}

export interface WalletSummary {
  currency: string;
  holdHours: number;
  balance: number;
  held: number;
  available: number;
  persona?: PayoutPersona;
  personas?: PayoutPersona[];
  policy?: PayoutPolicy;
  holds: Array<{
    orderId: string;
    productName: string;
    amount: number;
    currency: string;
    kind: 'protection_window' | 'dispute';
    holdUntil: string;
    disputeStatus: string;
    disputeReason: string;
  }>;
}

export type PayoutPersona = 'buyer' | 'seller' | 'talent' | 'freelancer' | 'employer' | 'admin';

export interface PayoutPolicy {
  persona: PayoutPersona;
  canWithdraw: boolean;
  platformFeeRate: number;
  /** null when the tax depends on the order (mixed product kinds) or the seller type is undeclared. */
  taxRate: number | null;
  totalFeeRate: number | null;
  /** single | per_order | none | unknown | override (seller personas only). */
  taxMode?: 'single' | 'per_order' | 'none' | 'unknown' | 'override';
  taxBreakdown?: Array<{ kind: 'DIGITAL' | 'GOODS' | 'ALL'; rate: number; totalFeeRate: number }>;
  taxProfileIncomplete?: boolean;
  chargeAtWithdraw: boolean;
  minAmount: number;
  minAmountCurrency: string;
  minAmountVnd: number;
  holdHours: number;
  requiresNoDispute: boolean;
  sellerType?: string | null;
}

export interface PayoutQuote {
  gross: number;
  platformFee: number;
  tax: number;
  net: number;
  totalFee: number;
}

export interface PayoutPolicyResponse {
  persona: PayoutPersona;
  personas: PayoutPersona[];
  policy: PayoutPolicy;
  quote: PayoutQuote | null;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'withdraw' | 'deposit';
  amount: number;
  currency: string;
  note: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payoutId?: string;
  paymentMethod?: string;
  paypalOrderId?: string;
  gpayTransactionId?: string;
  gpayAccountNumber?: string;
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
  /** Withdrawals: destination bank account (full number for admins, masked for the owner). */
  payoutAccount?: { bankName: string; accountName: string; accountNumber: string; accountNumberMasked: string; source: string };
}

export interface GpayConfig {
  /** Method is shown in the deposit picker. */
  available?: boolean;
  /** Merchant credentials configured (gateway and/or QR). */
  enabled: boolean;
  /** GPay payment gateway (ATM / card / transfer on GPay's page). */
  portalEnabled?: boolean;
  /** Dynamic VietQR via GPay QR Payment. */
  qrEnabled?: boolean;
  sandbox: boolean;
  bankCode: string;
  accountType: string;
  minTopupVnd: number;
  vndPerUsd: number;
  merchantName?: string;
  webhookUrl?: string;
}

export interface GpayOrder {
  requestId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  channel: string;
  amountVnd: number;
  amountUsd: number;
  createdAt: string | null;
}

export interface GpayCheckoutResponse {
  success: boolean;
  order: GpayOrder;
  billUrl: string;
  billId: string;
  expiredTime: number | null;
}

export interface GpayQrResponse {
  success: boolean;
  order: GpayOrder;
  qrCode: string;
  qrCodeImage: string;
  accountNumber: string;
  accountName: string;
  provider: string;
}

export interface BuyerUsageItem {
  id: string;
  createdAt: string;
  source: string;
  channel: string;
  model: string;
  productId?: string | null;
  productName?: string;
  productSlug?: string;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  amount: number;
  currency: string;
  note: string;
  markup?: number | null;
}

export interface BuyerUsageFeed {
  currency: string;
  summary: {
    requests: number;
    totalCharged: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
  };
  items: BuyerUsageItem[];
}

export interface AdminWalletTxList {
  items: WalletTx[];
  pendingDeposits: number;
  pendingWithdraws: number;
}

export interface UsageStat {
  date: string;
  tokens: number;
  gpuHours: number;
  requests: number;
  revenue: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
  /** i18n key rendered as `notify.<key>.title|body` with `params`. */
  key?: string;
  params?: Record<string, string | number>;
}

export interface AffiliateConfig {
  attributionDays: number;
  maxRate: number;
  attribution: 'last_click';
  holdHours: number;
  pit: {
    enabled: boolean;
    rate: number;
    thresholdVnd: number;
    /** Minimum affiliate balance and single withdrawal (VND). */
    minWithdrawVnd?: number;
    legalReview: boolean;
    rule?: string;
    commitmentForm?: string;
    commitmentExempts?: boolean;
    yearEndCertificate?: boolean;
  };
}

export interface AffiliateCommissionRow {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  currency: string;
  baseAmount: number;
  rate: number;
  amount: number;
  pitAmount: number;
  pitRate?: number;
  pitRule?: string;
  netAmount: number;
  reversedAmount: number;
  state: 'pending' | 'available' | 'reversed';
  holdUntil: string;
  createdAt: string;
}

export interface AffiliateStats {
  /** null until the user is eKYC-verified. */
  code: string | null;
  kycRequired?: boolean;
  linkReady?: boolean;
  clicks: number;
  conversions: number;
  earnings: number;
  currency: string;
  kycStatus?: string;
  payoutReady?: boolean;
  orders?: number;
  commission?: { pending: number; available: number; reversed: number; pitWithheld: number; total: number };
  recent?: AffiliateCommissionRow[];
  config?: AffiliateConfig;
  pitCommitment?: PitCommitment;
  withdrawal?: AffiliateWithdrawal;
}

/** Affiliate wallet slice: withdraw only when availableVnd >= minWithdrawVnd; PIT per withdrawal. */
export interface AffiliateWithdrawal {
  earned: number;
  held: number;
  withdrawn: number;
  balance: number;
  available: number;
  availableVnd: number;
  minWithdrawVnd: number;
  canWithdraw: boolean;
  pitRate: number;
  pitCommitmentApplied: boolean;
}

/** Cam kết Mẫu 08/CK-TNCN (affiliate PIT commitment) - eKYC-style upload + admin approval. */
export interface PitCommitment {
  status: 'none' | 'draft' | 'pending' | 'approved' | 'rejected';
  year: number | null;
  hasDocument: boolean;
  personalTaxCode: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  activeForCurrentYear: boolean;
  currentYear: number;
  form: string;
  userId?: string;
  name?: string;
  email?: string;
  fullName?: string;
}

export interface TaxPolicy {
  version: string;
  platformFeeRate: number;
  platformFeeVatRate: number;
  individual: {
    withheldByPlatform: boolean;
    digital: { vat: number; pit: number; total: number };
    goods: { vat: number; pit: number; total: number };
    annualThresholdVnd: number;
  };
  householdBusiness: { withheldByPlatform: boolean; rate: number };
  company: { withheldByPlatform: boolean; rate: number; platformIssuesVatInvoiceOnFee: boolean };
  legalBasis: string[];
  legalReview: boolean;
}

export interface AffiliateLink {
  code: string;
  scope: 'product' | 'store';
  rate: number;
  inProgram: boolean;
  path: string;
  url: string;
}

export interface SellerAffiliateStats {
  defaultRate: number;
  maxRate: number;
  clicks: number;
  orders: number;
  sales: number;
  commission: number;
  currency: string;
  products: {
    id: string;
    name: string;
    slug: string;
    affiliateRate: number | null;
    effectiveRate: number;
    orders: number;
    sales: number;
    commission: number;
  }[];
}

export interface DashboardSummary {
  revenue: number;
  orders: number;
  tokenUsage: number;
  gpuHours: number;
  activeProducts: number;
  currency: string;
  grossSales?: number;
  platformCommission?: number;
  storeFees?: number;
  taxWithholding?: number;
  taxVatWithheld?: number;
  taxPitWithheld?: number;
  sellerType?: string;
  sellerTypeDeclared?: boolean;
  sellerTaxRate?: { vat: number; pit: number; total: number; withheldByPlatform: boolean };
  refunds?: number;
  netPayable?: number;
}

export interface AdminShopRevenue {
  sellerId: string;
  shopName: string;
  creatorSlug: string;
  avatarUrl: string;
  orders: number;
  grossRevenue: number;
  platformFee: number;
  storeFeeAmount?: number;
  playStoreFeeAmount?: number;
  appStoreFeeAmount?: number;
  sellerNet: number;
}

export type AdminGranularity = 'day' | 'week' | 'month';

/** One period bucket; `date` is its first day (YYYY-MM-DD, Vietnam time). */
export interface AdminDailyPoint {
  date: string;
  gross: number;
  platformFee: number;
  sellerNet: number;
  orders: number;
  deposits: number;
  users: number;
}

export interface AdminOverview {
  users: number;
  products: number;
  creators: number;
  orders: number;
  reviews: number;
  paidOrders: number;
  currency: string;
  platformFeeRate: number;
  totalGrossRevenue: number;
  gmv: number;
  platformFee: number;
  storeFees?: number;
  playStoreFees?: number;
  appStoreFees?: number;
  sellerNet: number;
  buyerDeposits: number;
  buyerDepositCount: number;
  shops: AdminShopRevenue[];
  /** Last 30 days, oldest first (Vietnam time). */
  series?: AdminDailyPoint[];
  usersList: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    creatorSlug?: string;
    avatarUrl?: string;
    accountStatus?: ModerationStatus;
    suspendedUntil?: string | null;
  }>;
  productsList: Array<{
    id: string;
    name: string;
    category: string;
    creatorSlug?: string;
    creatorName?: string;
    featured?: boolean;
    moderationStatus?: ModerationStatus;
    published?: boolean;
    suspendedUntil?: string | null;
    salesCount?: number;
  }>;
}

export interface KycLicenseFile {
  name: string;
  size: number;
  contentType: string;
  isPdf: boolean;
}

/** Admin only: where a KYC document lives in MinIO. */
export interface KycDocumentInfo {
  side: KycSide;
  objectKey: string;
  fileName: string;
  size: number;
  contentType: string;
  /** From MinIO stat on the admin documents endpoint: false = object missing, null = unknown. */
  exists?: boolean | null;
}

export interface KycAdminDocuments {
  userId: string;
  recordId: string;
  prefix: string;
  documents: KycDocumentInfo[];
}

/** Bank account sent with a buyer wallet withdrawal (buyers have no seller payout account on file). */
export interface PayoutBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PayoutAccountInfo {
  bankName: string;
  accountNumber: string;
  accountNumberMasked: string;
  accountName: string;
  updatedAt: string | null;
}

export interface PayoutAccountResponse {
  account: PayoutAccountInfo | null;
  kycStatus: string;
  canEdit: boolean;
  holderName: string;
}

export type InvoiceBuyerType = 'none' | 'organization' | 'individual';

export interface OrderInvoice {
  id: string;
  orderId: string;
  productName: string;
  amount: number;
  currency: string;
  orderedAt: string | null;
  wantsInvoice: boolean;
  buyerType: InvoiceBuyerType;
  buyerName: string;
  taxCode: string;
  personalId: string;
  address: string;
  email: string;
  budgetUnitCode: string;
  status: 'pending' | 'issued' | 'cancelled';
  invoiceNumber: string;
  invoiceSeries: string;
  lookupCode: string;
  hasPdf: boolean;
  issuedAt: string | null;
  editableUntil: string | null;
  editable: boolean;
  provider: string;
  buyer?: { id: string; name?: string; email?: string };
  pdfObjectName?: string;
}

export interface InvoicePrefill {
  buyerType: 'organization' | 'individual';
  buyerName: string;
  taxCode: string;
  personalId: string;
  address: string;
  email: string;
  budgetUnitCode: string;
  source: 'saved' | 'kyc' | 'profile';
}

export interface OrderInvoiceResponse {
  order: { id: string; productName: string; amount: number; currency: string; status: string; createdAt: string };
  invoice: OrderInvoice | null;
  prefill: InvoicePrefill;
  hasSavedProfile: boolean;
}

export interface InvoiceChoiceBody {
  wantsInvoice: boolean;
  buyerType?: 'organization' | 'individual';
  buyerName?: string;
  taxCode?: string;
  personalId?: string;
  address?: string;
  email?: string;
  budgetUnitCode?: string;
  saveProfile?: boolean;
}

export interface AdminInvoiceList {
  items: OrderInvoice[];
  counts: { pending: number; issued: number; cancelled: number; pendingWanted: number };
}
