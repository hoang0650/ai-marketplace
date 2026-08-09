import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { environment } from '../../../environments/environment';
import { AI_CATEGORIES, CATEGORY_META, DIGITAL_CATEGORIES } from '../../models/categories';

const CATEGORY_ICONS: Array<{
  id: string;
  label: string;
  hubPath: string;
  emoji: string;
  bg: string;
}> = [
  // AI
  { id: 'text-to-text', label: 'Text→Text', hubPath: '/text-to-text', emoji: '💬', bg: '#FFF3C4' },
  { id: 'text-to-image', label: 'Text→Image', hubPath: '/text-to-image', emoji: '🖼️', bg: '#FFE0E6' },
  { id: 'text-to-video', label: 'Text→Video', hubPath: '/text-to-video', emoji: '🎬', bg: '#E0F0FF' },
  { id: 'image-to-video', label: 'Img→Video', hubPath: '/image-to-video', emoji: '🎞️', bg: '#E8E0FF' },
  { id: 'hire-agent', label: 'Agents', hubPath: '/hire-agent', emoji: '🤖', bg: '#E6F4FF' },
  { id: 'skill-pack', label: 'Skills', hubPath: '/skill-pack', emoji: '📦', bg: '#F0E6FF' },
  // Digital
  { id: 'ai-account', label: 'TK AI', hubPath: '/ai-account', emoji: '🔑', bg: '#FFE8D6' },
  { id: 'social-account', label: 'MXH', hubPath: '/social-account', emoji: '👤', bg: '#E8F5E9' },
  { id: 'software', label: 'Phần mềm', hubPath: '/software', emoji: '💿', bg: '#E3F2FD' },
  { id: 'vpn-proxy', label: 'VPN', hubPath: '/vpn-proxy', emoji: '🛡', bg: '#F3E5F5' },
  { id: 'course', label: 'Khóa học', hubPath: '/course', emoji: '🎓', bg: '#FFF8E1' },
  { id: 'mmo-tool', label: 'Tool MMO', hubPath: '/mmo-tool', emoji: '🛠', bg: '#FFEBEE' },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  readonly brand = environment.brandName;
  readonly slogan = 'Good models. Fast deploy. Fair pay.';
  readonly categories = CATEGORY_META;
  readonly aiCategories = AI_CATEGORIES;
  readonly digitalCategories = DIGITAL_CATEGORIES;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly featured = signal<Product[]>([]);
  readonly latest = signal<Product[]>([]);
  readonly hireProducts = signal<Product[]>([]);

  query = '';
  selectedCategory = '';
  recentTags = ['text-to-video', 'openclaw', 'fine-tune', 'hire agent'];

  ngOnInit(): void {
    this.seo.set({
      title: 'Home',
      description: environment.brandTagline,
    });
    this.productsApi.list({ featured: true }).subscribe((items) => {
      this.featured.set(items.slice(0, 12));
    });
    this.productsApi.list().subscribe((items) => {
      this.latest.set(items);
      this.hireProducts.set(
        items.filter((p) => String(p.category).startsWith('hire-') || p.category === 'skill-pack').slice(0, 12),
      );
      if (!this.featured().length) {
        this.featured.set(items.slice(0, 12));
      }
    });
  }

  search(): void {
    const q = this.query.trim();
    const cat = this.selectedCategory;
    void this.router.navigate(cat ? ['/marketplace', cat] : ['/marketplace'], {
      queryParams: q ? { q } : {},
    });
  }

  searchTag(tag: string): void {
    this.query = tag;
    this.search();
  }

  scrollCats(el: HTMLElement): void {
    el.scrollBy({ left: 220, behavior: 'smooth' });
  }
}
