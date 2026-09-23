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
  creatorSlug?: string;
  bio?: string;
  /** none | draft | pending | verified | rejected */
  kycStatus?: string;
  createdAt: string;
}

export type KycStatus = 'none' | 'draft' | 'pending' | 'verified' | 'rejected';
export type KycIdType = 'cccd' | 'cmnd' | 'passport' | 'other';
export type KycSide = 'front' | 'back' | 'selfie';

export interface KycProfile {
  status: KycStatus;
  fullName: string;
  idType: KycIdType;
  idNumber?: string;
  idNumberMasked: string;
  hasFront: boolean;
  hasBack: boolean;
  hasSelfie: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  canSubmit: boolean;
  canEdit: boolean;
  withdrawAllowed: boolean;
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

export interface ProductPricing {
  model: PricingModel;
  price: number;
  currency: string;
  interval?: 'day' | 'month' | 'year';
  usageUnit?: string;
  usageRate?: number;
  compareAtPrice?: number;
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
}

export interface ContentUnlock {
  ok: boolean;
  playUrl: string;
  playToken?: string;
  downloadUrl: string;
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

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  productType?: string;
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
  pricing: ProductPricing;
  contentMeta?: ProductContentMeta | null;
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

export interface Complaint {
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
  kind: 'text' | 'image';
  body: string;
  imageUrl: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  sellerType: string;
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
  taxRate: number;
  totalFeeRate: number;
  chargeAtWithdraw: boolean;
  minAmount: number;
  minAmountCurrency: string;
  minAmountVnd: number;
  holdHours: number;
  requiresNoDispute: boolean;
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
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
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
}

export interface AffiliateStats {
  code: string;
  clicks: number;
  conversions: number;
  earnings: number;
  currency: string;
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
