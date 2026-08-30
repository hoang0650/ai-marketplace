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
  | 'skill-pack';

export type CategoryGroup = 'models' | 'skills' | 'hire' | 'apis';

export type CatalogLane = 'ai';

export type NavGroup = 'generate' | 'apis' | 'platform' | 'talent';

export type PricingModel = 'free' | 'one-time' | 'subscription' | 'usage';

export type PaymentProvider = 'wallet' | 'stripe' | 'paypal' | 'paddle' | 'payos';

export type UserRole = 'buyer' | 'creator' | 'admin';

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
  createdAt: string;
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
}

export interface ProductPricing {
  model: PricingModel;
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  usageUnit?: string;
  usageRate?: number;
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

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  productType?: string;
  provider?: string;
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  coverUrl: string;
  gallery: string[];
  pricing: ProductPricing;
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

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string;
}

export interface Review {
  id: string;
  productId: string;
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
  quantity?: number;
  amount: number;
  sellerNet?: number;
  platformFee?: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded';
  provider: PaymentProvider;
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

export interface WalletSummary {
  currency: string;
  holdHours: number;
  balance: number;
  held: number;
  available: number;
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

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'withdraw' | 'deposit';
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
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
}

export interface AdminShopRevenue {
  sellerId: string;
  shopName: string;
  creatorSlug: string;
  avatarUrl: string;
  orders: number;
  grossRevenue: number;
  platformFee: number;
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
