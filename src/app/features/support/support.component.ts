import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';

interface FaqItem {
  id: string;
  qKey: string;
  aKey: string;
}

interface FaqGroup {
  id: string;
  titleKey: string;
  icon: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
})
export class SupportComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  readonly brand = environment.brandName;
  readonly supportEmail = 'support@aimarkets.vn';

  readonly openId = signal<string | null>(null);

  readonly groups: FaqGroup[] = [
    {
      id: 'buyers',
      titleKey: 'support.group.buyers',
      icon: '🛒',
      items: [
        { id: 'b1', qKey: 'support.faq.b1.q', aKey: 'support.faq.b1.a' },
        { id: 'b2', qKey: 'support.faq.b2.q', aKey: 'support.faq.b2.a' },
        { id: 'b3', qKey: 'support.faq.b3.q', aKey: 'support.faq.b3.a' },
      ],
    },
    {
      id: 'sellers',
      titleKey: 'support.group.sellers',
      icon: '🏪',
      items: [
        { id: 's1', qKey: 'support.faq.s1.q', aKey: 'support.faq.s1.a' },
        { id: 's2', qKey: 'support.faq.s2.q', aKey: 'support.faq.s2.a' },
        { id: 's3', qKey: 'support.faq.s3.q', aKey: 'support.faq.s3.a' },
      ],
    },
    {
      id: 'orders',
      titleKey: 'support.group.orders',
      icon: '📦',
      items: [
        { id: 'o1', qKey: 'support.faq.o1.q', aKey: 'support.faq.o1.a' },
        { id: 'o2', qKey: 'support.faq.o2.q', aKey: 'support.faq.o2.a' },
      ],
    },
    {
      id: 'security',
      titleKey: 'support.group.security',
      icon: '🔒',
      items: [
        { id: 'sec1', qKey: 'support.faq.sec1.q', aKey: 'support.faq.sec1.a' },
        { id: 'sec2', qKey: 'support.faq.sec2.q', aKey: 'support.faq.sec2.a' },
      ],
    },
  ];

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('support.title') });
  }

  toggle(id: string): void {
    this.openId.update((cur) => (cur === id ? null : id));
  }
}
