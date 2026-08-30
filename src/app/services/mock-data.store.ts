import { Injectable, signal } from '@angular/core';
import {
  AffiliateStats,
  Creator,
  DashboardSummary,
  NotificationItem,
  Order,
  Product,
  ProductCategory,
  Review,
  UsageStat,
  User,
  WalletTx,
} from '../models/marketplace.models';
import { CATEGORY_META } from '../models/categories';
import seed from '../../assets/mock/marketplace.json';
import { mergeRunpodIntoMarketplace } from '../models/runpod-marketplace-products';

interface MockDb {
  users: User[];
  creators: Creator[];
  products: Product[];
  reviews: Review[];
  orders: Order[];
  wallet: WalletTx[];
  usage: UsageStat[];
  notifications: NotificationItem[];
  affiliate: AffiliateStats;
  dashboard: DashboardSummary;
}

function initMockDb(): MockDb {
  const db = structuredClone(seed as MockDb);
  mergeRunpodIntoMarketplace(db);
  db.products = db.products.filter((p) => CATEGORY_META.some((c) => c.id === p.category));
  return db;
}

@Injectable({ providedIn: 'root' })
export class MockDataStore {
  private db: MockDb = initMockDb();
  private wishlistIds = signal<string[]>(this.readWishlist());

  ready(): Promise<void> {
    return Promise.resolve();
  }

  private ensure(): MockDb {
    return this.db;
  }

  categories() {
    return CATEGORY_META;
  }

  listProducts(filter: {
    category?: string;
    q?: string;
    featured?: boolean;
    creatorSlug?: string;
  }): Product[] {
    let items = [...this.ensure().products];
    if (filter.category) {
      items = items.filter((p) => p.category === filter.category);
    }
    if (filter.featured) {
      items = items.filter((p) => p.featured);
    }
    if (filter.creatorSlug) {
      items = items.filter((p) => p.creatorSlug === filter.creatorSlug);
    }
    if (filter.q) {
      const q = filter.q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q)),
      );
    }
    return items.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.ensure().products.find((p) => p.slug === slug);
  }

  creators(): Creator[] {
    return this.ensure().creators;
  }

  getCreatorBySlug(slug: string): Creator | undefined {
    return this.ensure().creators.find((c) => c.slug === slug);
  }

  reviews(productId?: string): Review[] {
    const items = this.ensure().reviews;
    return productId ? items.filter((r) => r.productId === productId) : items;
  }

  addReview(input: Omit<Review, 'id' | 'createdAt'>): Review {
    const review: Review = {
      ...input,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.ensure().reviews.unshift(review);
    return review;
  }

  orders(): Order[] {
    return this.ensure().orders;
  }

  wallet(): WalletTx[] {
    return this.ensure().wallet;
  }

  withdraw(amount: number): WalletTx {
    const tx: WalletTx = {
      id: `w-${Date.now()}`,
      type: 'withdraw',
      amount,
      currency: 'USD',
      note: 'Withdraw request',
      createdAt: new Date().toISOString(),
    };
    this.ensure().wallet.unshift(tx);
    return tx;
  }

  deposit(amount: number): WalletTx {
    const tx: WalletTx = {
      id: `w-${Date.now()}`,
      type: 'deposit',
      amount,
      currency: 'USD',
      note: 'Buyer wallet deposit',
      createdAt: new Date().toISOString(),
    };
    this.ensure().wallet.unshift(tx);
    return tx;
  }

  usage(): UsageStat[] {
    return this.ensure().usage;
  }

  dashboard(): DashboardSummary {
    return this.ensure().dashboard;
  }

  notifications(): NotificationItem[] {
    return this.ensure().notifications;
  }

  markNotificationsRead(): NotificationItem[] {
    this.ensure().notifications = this.ensure().notifications.map((n) => ({ ...n, read: true }));
    return this.ensure().notifications;
  }

  affiliate(): AffiliateStats {
    return this.ensure().affiliate;
  }

  wishlist(): Product[] {
    const ids = new Set(this.wishlistIds());
    return this.ensure().products.filter((p) => ids.has(p.id));
  }

  toggleWishlist(productId: string): { wishlist: Product[]; added: boolean } {
    const current = this.wishlistIds();
    const exists = current.includes(productId);
    const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
    this.wishlistIds.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('phai.wishlist', JSON.stringify(next));
    }
    return { wishlist: this.wishlist(), added: !exists };
  }

  login(email: string, _password: string): User | undefined {
    return this.ensure().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  register(input: { email: string; name: string; asCreator?: boolean }): User {
    const user: User = {
      id: `u-${Date.now()}`,
      email: input.email,
      name: input.name,
      role: input.asCreator ? 'creator' : 'buyer',
      creatorSlug: input.asCreator ? input.name.toLowerCase().replace(/\s+/g, '-') : undefined,
      avatarUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(input.email)}`,
      createdAt: new Date().toISOString(),
    };
    this.ensure().users.push(user);
    if (input.asCreator && user.creatorSlug) {
      this.ensure().creators.push({
        id: `c-${Date.now()}`,
        slug: user.creatorSlug,
        name: user.name,
        bio: 'New creator on AI Markets',
        avatarUrl: user.avatarUrl!,
        coverUrl: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=1600&q=80',
        verified: false,
        productCount: 0,
        rating: 0,
        totalSales: 0,
      });
    }
    return user;
  }

  getUser(id: string): User | undefined {
    return this.ensure().users.find((u) => u.id === id);
  }

  updateUser(
    id: string,
    patch: { name?: string; bio?: string; avatarUrl?: string; coverUrl?: string },
  ): User | undefined {
    const user = this.getUser(id);
    if (!user) return undefined;
    if (patch.name !== undefined) user.name = patch.name;
    if (patch.bio !== undefined) user.bio = patch.bio;
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    if (patch.coverUrl !== undefined) user.coverUrl = patch.coverUrl;
    return user;
  }

  adminOverview() {
    const db = this.ensure();
    const paid = db.orders.filter((o) => o.status === 'paid');
    const totalGrossRevenue = paid.reduce((s, o) => s + o.amount, 0);
    const platformFeeRate = 0.2;
    const platformFee = Math.round(totalGrossRevenue * platformFeeRate * 100) / 100;
    const sellerNet = Math.round((totalGrossRevenue - platformFee) * 100) / 100;

    const bySeller = new Map<string, { shopName: string; creatorSlug: string; avatarUrl: string; orders: number; gross: number }>();
    for (const o of paid) {
      const product = db.products.find((p) => p.id === o.productId);
      const creator = db.creators.find((c) => c.id === product?.creatorId || c.slug === product?.creatorSlug);
      const key = creator?.id || product?.creatorId || 'unknown';
      const cur = bySeller.get(key) || {
        shopName: creator?.name || product?.creatorName || 'Unknown shop',
        creatorSlug: creator?.slug || product?.creatorSlug || '',
        avatarUrl: creator?.avatarUrl || '',
        orders: 0,
        gross: 0,
      };
      cur.orders += 1;
      cur.gross += o.amount;
      bySeller.set(key, cur);
    }

    const deposits = db.wallet.filter((t) => t.type === 'deposit');
    const buyerDeposits = deposits.reduce((s, t) => s + t.amount, 0);

    return {
      users: db.users.length,
      products: db.products.length,
      creators: db.creators.length,
      orders: db.orders.length,
      reviews: db.reviews?.length || 0,
      paidOrders: paid.length,
      currency: 'USD',
      platformFeeRate,
      totalGrossRevenue,
      gmv: totalGrossRevenue,
      platformFee,
      sellerNet,
      buyerDeposits,
      buyerDepositCount: deposits.length,
      shops: [...bySeller.entries()].map(([sellerId, row]) => {
        const fee = Math.round(row.gross * platformFeeRate * 100) / 100;
        return {
          sellerId,
          shopName: row.shopName,
          creatorSlug: row.creatorSlug,
          avatarUrl: row.avatarUrl,
          orders: row.orders,
          grossRevenue: row.gross,
          platformFee: fee,
          sellerNet: Math.round((row.gross - fee) * 100) / 100,
        };
      }),
      usersList: db.users,
      productsList: db.products,
      ordersList: db.orders,
    };
  }

  upsertProduct(partial: Partial<Product> & { name: string }): Product {
    const db = this.ensure();
    const existing = partial.id ? db.products.find((p) => p.id === partial.id) : undefined;
    if (existing) {
      Object.assign(existing, partial);
      this.syncCreatorCounts(db);
      return existing;
    }

    const creator =
      db.creators.find((c) => c.slug === partial.creatorSlug) ||
      db.creators.find((c) => c.id === partial.creatorId) ||
      db.creators[0];

    const slugBase = (partial.slug || partial.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = slugBase;
    let n = 2;
    while (db.products.some((p) => p.slug === slug)) {
      slug = `${slugBase}-${n++}`;
    }

    const category = (partial.category as ProductCategory) || 'text-to-text';
    const product: Product = {
      id: `p-${Date.now()}`,
      slug,
      name: partial.name,
      tagline: partial.tagline || '',
      description: partial.description || '',
      category,
      creatorId: creator?.id || partial.creatorId || 'c-nova',
      creatorSlug: creator?.slug || partial.creatorSlug || 'nova-labs',
      creatorName: creator?.name || partial.creatorName || 'Nova Labs',
      coverUrl: partial.coverUrl || 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=1200&q=80',
      gallery: partial.gallery?.length ? partial.gallery : [partial.coverUrl || 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=1200&q=80'],
      pricing: partial.pricing || { model: 'free', price: 0, currency: 'USD' },
      rating: 0,
      reviewCount: 0,
      salesCount: 0,
      installCount: 0,
      tags: partial.tags?.length ? partial.tags : [category],
      apiDocsMarkdown: partial.apiDocsMarkdown || `## Docs\nPOST \`/v1/${category}/run\``,
      changelog: partial.changelog || [{ version: '1.0.0', date: new Date().toISOString().slice(0, 10), notes: 'Initial release.' }],
      publishedAt: new Date().toISOString(),
      featured: partial.featured,
    };
    db.products.unshift(product);
    this.syncCreatorCounts(db);
    return product;
  }

  deleteProduct(id: string): void {
    const db = this.ensure();
    db.products = db.products.filter((p) => p.id !== id);
    this.syncCreatorCounts(db);
  }

  private syncCreatorCounts(db: ReturnType<MockDataStore['ensure']>): void {
    for (const creator of db.creators) {
      creator.productCount = db.products.filter((p) => p.creatorSlug === creator.slug).length;
    }
  }

  private readWishlist(): string[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      return JSON.parse(localStorage.getItem('phai.wishlist') || '[]');
    } catch {
      return [];
    }
  }
}
