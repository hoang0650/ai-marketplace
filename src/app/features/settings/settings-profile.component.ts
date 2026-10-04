import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { UploadService } from '../../services/api.services';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { SocialLink, UserProfileExtras } from '../../models/marketplace.models';

const MAX_SOCIALS = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type MediaField = 'avatarUrl' | 'coverUrl';

/** Truncated base64 values saved by the old form are not usable images. */
function usableImage(url?: string): string {
  const v = String(url || '').trim();
  return /^https?:\/\//i.test(v) ? v : '';
}

@Component({
  selector: 'app-settings-profile',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './settings-profile.component.html',
  styleUrl: './settings-profile.component.scss',
})
export class SettingsProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly uploads = inject(UploadService);
  private readonly i18n = inject(I18nService);

  readonly maxSocials = MAX_SOCIALS;
  readonly msg = signal('');
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal<MediaField | null>(null);

  name = '';
  bio = '';
  avatarUrl = '';
  coverUrl = '';
  introLine: UserProfileExtras['introLine'] = '';
  region = '';
  notifyLang: UserProfileExtras['notifyLang'] = 'vi';
  website = '';
  socials: Array<SocialLink & { key: number }> = [];
  private nextKey = 0;

  readonly initials = computed(() => {
    const name = (this.auth.user()?.name || 'U').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('settings.profile') });
    this.reset();
    this.auth.refreshMe().subscribe(() => this.reset());
  }

  reset(): void {
    const u = this.auth.user();
    const p = u?.profile;
    this.name = u?.name || '';
    this.bio = u?.bio || '';
    this.avatarUrl = usableImage(u?.avatarUrl);
    this.coverUrl = usableImage(u?.coverUrl);
    this.introLine = p?.introLine || '';
    this.region = p?.region || '';
    this.notifyLang = p?.notifyLang || 'vi';
    this.website = p?.website || '';
    this.socials = (p?.socials || []).map((s) => ({ ...s, key: this.nextKey++ }));
    this.flash('');
  }

  onFile(ev: Event, field: MediaField): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const maxMb = field === 'avatarUrl' ? 2 : 5;
    if (!IMAGE_TYPES.includes(file.type)) return this.flash(this.i18n.t('set.profile.badType'), true);
    if (file.size > maxMb * 1024 * 1024) return this.flash(this.i18n.t('set.profile.tooBig', { mb: maxMb }), true);
    this.uploading.set(field);
    this.uploads.uploadImage(file).subscribe({
      next: (res) => {
        this.uploading.set(null);
        this[field] = res.url;
        this.flash('');
      },
      error: (err) => {
        this.uploading.set(null);
        this.flash(err?.error?.message || this.i18n.t('set.profile.uploadFail'), true);
      },
    });
  }

  clearMedia(field: MediaField): void {
    this[field] = '';
  }

  addSocial(): void {
    if (this.socials.length >= MAX_SOCIALS) return;
    this.socials = [...this.socials, { label: '', url: '', key: this.nextKey++ }];
  }

  removeSocial(key: number): void {
    this.socials = this.socials.filter((s) => s.key !== key);
  }

  save(): void {
    if (!this.name.trim()) return this.flash(this.i18n.t('set.profile.nameRequired'), true);
    this.saving.set(true);
    this.auth
      .updateProfile({
        name: this.name.trim(),
        bio: this.bio.slice(0, 200),
        avatarUrl: this.avatarUrl,
        coverUrl: this.coverUrl,
        profile: {
          introLine: this.introLine,
          region: this.region.trim(),
          notifyLang: this.notifyLang,
          website: this.website.trim(),
          socials: this.socials
            .map(({ label, url }) => ({ label: label.trim(), url: url.trim() }))
            .filter((s) => s.url),
        },
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reset();
          this.flash(this.i18n.t('set.profile.saved'));
        },
        error: (err) => {
          this.saving.set(false);
          this.flash(err?.error?.message || this.i18n.t('set.saveFail'), true);
        },
      });
  }

  private flash(text: string, isError = false): void {
    this.msg.set(text);
    this.error.set(isError);
  }
}
