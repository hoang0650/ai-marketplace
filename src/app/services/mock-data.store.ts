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

@Injectable({ providedIn: 'root' })
export class MockDataStore {
  private db: MockDb = structuredClone(seed as MockDb);
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
    return items.sort((a, b) => b.installCount - a.installCount);
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
        bio: 'New creator on PH AI Market',
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

  adminOverview() {
    const db = this.ensure();
    return {
      users: db.users.length,
      products: db.products.length,
      creators: db.creators.length,
      orders: db.orders.length,
      gmv: db.orders.reduce((s, o) => s + o.amount, 0),
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
