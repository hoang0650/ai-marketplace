import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { LEGAL_POLICIES, LEGAL_POLICY_GROUPS, LegalPolicyMeta } from './legal-policies.catalog';

@Component({
  selector: 'app-legal-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-hub.component.html',
  styleUrl: './legal-hub.component.scss',
})
export class LegalHubComponent {
  private readonly seo = inject(SeoService);
  readonly groups = LEGAL_POLICY_GROUPS;
  readonly policies = LEGAL_POLICIES;
  readonly quickLinks: LegalPolicyMeta[] = [
    this.policies.find((p) => p.slug === 'quy-che-hoat-dong-san-tmdt')!,
    this.policies.find((p) => p.slug === 'dieu-khoan-su-dung')!,
    this.policies.find((p) => p.slug === 'chinh-sach-bao-mat-va-du-lieu')!,
    this.policies.find((p) => p.slug === 'chinh-sach-hoan-tien')!,
  ].filter(Boolean);

  query = '';

  constructor() {
    this.seo.set({
      title: 'Trung tâm pháp lý AI Markets',
      description:
        'Quy chế sàn TMĐT trung gian, điều khoản, chính sách người bán/người mua, thanh toán, bảo mật và AUP của AI Markets.',
    });
  }

  onQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  docsIn(group: string): LegalPolicyMeta[] {
    const q = this.query.trim().toLowerCase();
    return this.policies.filter((p) => {
      if (p.group !== group) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.slug.includes(q)
      );
    });
  }

  get hasResults(): boolean {
    return this.groups.some((g) => this.docsIn(g.id).length > 0);
  }
}
