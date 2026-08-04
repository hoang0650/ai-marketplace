import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ShopFaq, ShopPolicy, ShopProfileService } from './shop-profile.service';

@Component({
  selector: 'app-sell-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './sell-profile.component.html',
  styleUrl: './sell-profile.component.scss',
})
export class SellProfileComponent {
  readonly shop = inject(ShopProfileService);
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  readonly tab = signal<'basic' | 'images' | 'payment'>('basic');
  readonly toast = signal('');
  readonly previewInitials = computed(() => {
    const name = this.shop.profile().shopName || 'GH';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  draft = { ...this.shop.profile() };

  constructor() {
    this.seo.set({ title: 'Hồ sơ gian hàng' });
    this.shop.reload();
    this.draft = { ...this.shop.profile() };
    if (!this.shop.started()) {
      this.shop.start();
      this.draft = { ...this.shop.profile() };
    }
  }

  setTab(tab: 'basic' | 'images' | 'payment'): void {
    this.tab.set(tab);
  }

  saveDraft(): void {
    this.shop.patch({ ...this.draft, status: 'draft' });
    this.showToast('Đã lưu nháp');
  }

  saveChanges(): void {
    this.shop.patch({ ...this.draft });
    this.shop.saveChanges();
    this.draft = { ...this.shop.profile() };
    this.showToast('Lưu thay đổi');
  }

  cancel(): void {
    this.draft = { ...this.shop.profile() };
    this.showToast('Đã hủy thay đổi');
  }

  addPolicy(): void {
    const item: ShopPolicy = {
      id: `p-${Date.now()}`,
      title: 'Chính sách mới',
      body: '',
    };
    this.draft.policies = [...this.draft.policies, item];
  }

  addFaq(): void {
    const item: ShopFaq = {
      id: `f-${Date.now()}`,
      question: 'Câu hỏi mới',
      answer: '',
    };
    this.draft.faqs = [...this.draft.faqs, item];
  }

  removePolicy(id: string): void {
    this.draft.policies = this.draft.policies.filter((p) => p.id !== id);
  }

  removeFaq(id: string): void {
    this.draft.faqs = this.draft.faqs.filter((f) => f.id !== id);
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2200);
  }
}
