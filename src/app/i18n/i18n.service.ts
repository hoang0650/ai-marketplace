import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppLang, LANGS, MESSAGES } from './messages';

const STORAGE_KEY = 'aimarkets.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly langs = LANGS;
  readonly lang = signal<AppLang>(this.readInitial());

  t(key: string, params?: Record<string, string | number>): string {
    const dict = MESSAGES[this.lang()] || MESSAGES.en;
    let text = dict[key] || MESSAGES.en[key] || MESSAGES.vi[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  catLabel(id: string): string {
    if (id === 'openrouter' || id === 'featherless' || id === 'runpod-public') {
      return this.t('cat.inference.label');
    }
    return this.t(`cat.${id}.label`);
  }

  catDesc(id: string): string {
    return this.t(`cat.${id}.desc`);
  }

  setLang(lang: AppLang): void {
    if (lang !== 'vi' && lang !== 'en' && lang !== 'zh') return;
    this.lang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    }
  }

  langLabel(): string {
    return this.langs.find((l) => l.id === this.lang())?.native || 'Tiếng Việt';
  }

  private readInitial(): AppLang {
    if (!isPlatformBrowser(this.platformId)) return 'vi';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'vi' || saved === 'en' || saved === 'zh') return saved;
    } catch {
      /* ignore */
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    const lower = nav.toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('en')) return 'en';
    return 'vi';
  }
}
