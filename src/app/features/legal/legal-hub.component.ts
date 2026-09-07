import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { LEGAL_POLICIES, LEGAL_POLICY_GROUPS, LegalPolicyMeta } from './legal-policies.catalog';

@Component({
  selector: 'app-legal-hub',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './legal-hub.component.html',
  styleUrl: './legal-hub.component.scss',
})
export class LegalHubComponent {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
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
    effect(() => {
      this.i18n.lang();
      this.seo.set({
        title: this.i18n.t('legal.hub.seoTitle'),
        description: this.i18n.t('legal.hub.seoDesc'),
      });
    });
  }

  onQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  groupLabel(id: string): string {
    return this.i18n.t(`legal.group.${id}`);
  }

  policyTitle(p: LegalPolicyMeta): string {
    return this.i18n.t(`legal.policy.${p.slug}.title`);
  }

  policySummary(p: LegalPolicyMeta): string {
    return this.i18n.t(`legal.policy.${p.slug}.summary`);
  }

  docsIn(group: string): LegalPolicyMeta[] {
    this.i18n.lang();
    const q = this.query.trim().toLowerCase();
    return this.policies.filter((p) => {
      if (p.group !== group) return false;
      if (!q) return true;
      const title = this.policyTitle(p).toLowerCase();
      const summary = this.policySummary(p).toLowerCase();
      return (
        title.includes(q) ||
        summary.includes(q) ||
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
