import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface AccountExtras {
  introLine: string;
  region: string;
  notifyLang: string;
  website: string;
  socials: SocialLink[];
  personalizeContent: boolean;
  personalizeAds: boolean;
  googleLinked: boolean;
  telegramLinked: boolean;
}

const DEFAULT: AccountExtras = {
  introLine: '',
  region: '',
  notifyLang: 'vi',
  website: '',
  socials: [],
  personalizeContent: false,
  personalizeAds: false,
  googleLinked: true,
  telegramLinked: false,
};

@Injectable({ providedIn: 'root' })
export class AccountExtrasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly data = signal<AccountExtras>({ ...DEFAULT });

  readonly extras = this.data.asReadonly();

  private key(): string {
    return `phai.accountExtras.${this.auth.user()?.id || 'anon'}`;
  }

  load(): AccountExtras {
    if (!isPlatformBrowser(this.platformId)) return this.data();
    try {
      const raw = localStorage.getItem(this.key());
      const next = raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
      this.data.set(next);
      return next;
    } catch {
      this.data.set({ ...DEFAULT });
      return this.data();
    }
  }

  save(partial: Partial<AccountExtras>): AccountExtras {
    const next = { ...this.data(), ...partial };
    this.data.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.key(), JSON.stringify(next));
    }
    return next;
  }
}
