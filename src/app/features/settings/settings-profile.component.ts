import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { AccountExtrasService, SocialLink } from './account-extras.service';

@Component({
  selector: 'app-settings-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-profile.component.html',
  styleUrl: './settings-profile.component.scss',
})
export class SettingsProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly extrasApi = inject(AccountExtrasService);

  readonly msg = signal('');
  readonly saving = signal(false);

  name = '';
  bio = '';
  avatarUrl = '';
  coverUrl = '';
  introLine = '';
  region = '';
  notifyLang = 'vi';
  website = '';
  socials: SocialLink[] = [];

  readonly initials = computed(() => {
    const name = (this.name || this.auth.user()?.name || 'U').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.seo.set({ title: 'Thông tin hồ sơ' });
    this.reset();
  }

  reset(): void {
    const u = this.auth.user();
    const ex = this.extrasApi.load();
    this.name = u?.name || '';
    this.bio = u?.bio || '';
    this.avatarUrl = u?.avatarUrl || '';
    this.coverUrl = u?.coverUrl || '';
    this.introLine = ex.introLine;
    this.region = ex.region;
    this.notifyLang = ex.notifyLang;
    this.website = ex.website;
    this.socials = [...ex.socials];
    this.msg.set('');
  }

  onAvatarFile(ev: Event): void {
    this.readFile(ev, (url) => (this.avatarUrl = url));
  }

  onCoverFile(ev: Event): void {
    this.readFile(ev, (url) => (this.coverUrl = url));
  }

  addSocial(): void {
    this.socials = [
      ...this.socials,
      { id: `s-${Date.now()}`, label: 'Link', url: '' },
    ];
  }

  removeSocial(id: string): void {
    this.socials = this.socials.filter((s) => s.id !== id);
  }

  save(): void {
    if (!this.name.trim()) {
      this.msg.set('Tên hiển thị không được để trống.');
      return;
    }
    this.saving.set(true);
    this.extrasApi.save({
      introLine: this.introLine,
      region: this.region,
      notifyLang: this.notifyLang,
      website: this.website,
      socials: this.socials,
    });
    this.auth
      .updateProfile({
        name: this.name.trim(),
        bio: this.bio.slice(0, 200),
        avatarUrl: this.avatarUrl,
        coverUrl: this.coverUrl,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.msg.set('Đã lưu hồ sơ.');
        },
        error: (err) => {
          this.saving.set(false);
          this.msg.set(err?.error?.message || 'Lưu hồ sơ thất bại (đã lưu thông tin phụ cục bộ).');
        },
      });
  }

  private readFile(ev: Event, cb: (url: string) => void): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ''));
    reader.readAsDataURL(file);
  }
}
