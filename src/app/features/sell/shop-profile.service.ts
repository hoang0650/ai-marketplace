import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export type ShopStatus = 'not_started' | 'draft' | 'pending' | 'active';

export interface ShopPolicy {
  id: string;
  title: string;
  body: string;
}

export interface ShopFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ShopProfile {
  shopName: string;
  slug: string;
  description: string;
  announcement: string;
  logoUrl: string;
  coverUrl: string;
  supportHours: string;
  status: ShopStatus;
  policies: ShopPolicy[];
  faqs: ShopFaq[];
}

const DEFAULT: ShopProfile = {
  shopName: '',
  slug: '',
  description: '',
  announcement: '',
  logoUrl: '',
  coverUrl: '',
  supportHours: '08:00 - 23:00',
  status: 'not_started',
  policies: [],
  faqs: [],
};

@Injectable({ providedIn: 'root' })
export class ShopProfileService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly profileSignal = signal<ShopProfile>({ ...DEFAULT });

  readonly profile = this.profileSignal.asReadonly();
  readonly started = computed(() => this.profileSignal().status !== 'not_started');
  readonly statusLabel = computed(() => {
    const s = this.profileSignal().status;
    if (s === 'draft') return 'nháp';
    if (s === 'pending') return 'chờ duyệt';
    if (s === 'active') return 'đang hoạt động';
    return 'chưa bắt đầu';
  });

  constructor() {
    this.reload();
  }

  private key(): string {
    const id = this.auth.user()?.id || 'anon';
    return `phai.shopProfile.${id}`;
  }

  reload(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(this.key());
      if (!raw) {
        const user = this.auth.user();
        this.profileSignal.set({
          ...DEFAULT,
          shopName: user?.name ? `Gian hàng ${user.name}` : '',
          slug: user?.creatorSlug || '',
          description: user?.bio || '',
          logoUrl: user?.avatarUrl || '',
          status: user?.creatorSlug ? 'draft' : 'not_started',
        });
        return;
      }
      this.profileSignal.set({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      this.profileSignal.set({ ...DEFAULT });
    }
  }

  start(): void {
    const user = this.auth.user();
    this.patch({
      status: 'draft',
      shopName: this.profileSignal().shopName || (user?.name ? `Gian hàng ${user.name}` : ''),
      slug:
        this.profileSignal().slug ||
        user?.creatorSlug ||
        (user?.name || 'shop')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
    });
  }

  patch(partial: Partial<ShopProfile>): void {
    const next = { ...this.profileSignal(), ...partial };
    this.profileSignal.set(next);
    this.persist(next);
  }

  saveDraft(): void {
    this.patch({ status: this.profileSignal().status === 'not_started' ? 'draft' : this.profileSignal().status });
  }

  saveChanges(): void {
    const cur = this.profileSignal();
    this.patch({ status: cur.status === 'not_started' ? 'draft' : cur.status === 'draft' ? 'pending' : cur.status });
  }

  private persist(profile: ShopProfile): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.key(), JSON.stringify(profile));
  }
}
