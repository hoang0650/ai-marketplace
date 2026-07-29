/** RunPod-style I/O modalities + hire talent */
export type ProductCategory =
  | 'text-to-text'
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-image'
  | 'image-to-image'
  | 'fine-tune'
  | 'dataset'
  | 'inference'
  | 'hire-agent'
  | 'hire-marketing'
  | 'hire-seo'
  | 'hire-creator'
  | 'hire-workflow'
  | 'hire-build-app'
  | 'hire-build-web'
  | 'skill-pack';

export type CategoryGroup = 'models' | 'skills' | 'hire';

export type PricingModel = 'free' | 'one-time' | 'subscription' | 'usage';

export type PaymentProvider = 'stripe' | 'paypal' | 'paddle' | 'payos';

export type UserRole = 'buyer' | 'creator' | 'admin';

export interface CategoryMeta {
  id: ProductCategory;
  label: string;
  description: string;
  hubPath: string;
  group: CategoryGroup;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
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

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  coverUrl: string;
  gallery: string[];
  pricing: ProductPricing;
  rating: number;
  reviewCount: number;
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
  buyerName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded';
  provider: PaymentProvider;
  createdAt: string;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'withdraw';
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
