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
  readonly requiredSections: { label: string; description: string; policy: LegalPolicyMeta }[] = [
    this.requiredSection('Thông tin chủ quản', 'Thông tin pháp lý và đầu mối liên hệ', 'thong-tin-chu-quan-nen-tang'),
    this.requiredSection('Bảo mật', 'Bảo mật và dữ liệu cá nhân', 'chinh-sach-bao-mat-va-du-lieu'),
    this.requiredSection('Quyền và nghĩa vụ', 'Trách nhiệm của sàn và người dùng', 'quyen-va-nghia-vu-cac-ben'),
    this.requiredSection('Khiếu nại', 'Tiếp nhận và giải quyết tranh chấp', 'chinh-sach-khieu-nai-tranh-chap'),
    this.requiredSection('Giá cả', 'Niêm yết giá, phí và tỷ giá tham khảo', 'chinh-sach-gia-ca'),
    this.requiredSection('Thanh toán', 'Thanh toán, đối soát và chi trả', 'chinh-sach-thanh-toan-doi-soat'),
    this.requiredSection('Điều kiện và hạn chế', 'Hành vi và sản phẩm bị hạn chế', 'chinh-sach-su-dung-chap-nhan-duoc'),
    this.requiredSection('Xếp hạng', 'Tiêu chí và ưu tiên hiển thị', 'chinh-sach-xep-hang-uu-tien-hien-thi'),
    this.requiredSection('Giao nhận', 'Bàn giao sản phẩm và dịch vụ', 'chinh-sach-giao-nhan-san-pham-so'),
    this.requiredSection('Đổi trả và hoàn tiền', 'Điều kiện, thời hạn và phương thức hoàn', 'chinh-sach-hoan-tien'),
    this.requiredSection('Cung cấp dịch vụ', 'Kích hoạt và phương thức thực hiện', 'phuong-thuc-cung-cap-va-cham-dut-dich-vu'),
    this.requiredSection('Chấm dứt dịch vụ', 'Tạm ngừng, chấm dứt và xử lý dữ liệu', 'phuong-thuc-cung-cap-va-cham-dut-dich-vu'),
  ];
  readonly quickLinks: LegalPolicyMeta[] = [
    this.policies.find((p) => p.slug === 'quy-che-hoat-dong-san-tmdt')!,
    this.policies.find((p) => p.slug === 'dieu-khoan-su-dung')!,
    this.policies.find((p) => p.slug === 'chinh-sach-bao-mat-va-du-lieu')!,
    this.policies.find((p) => p.slug === 'chinh-sach-hoan-tien')!,
  ].filter(Boolean);

  query = '';

  private requiredSection(label: string, description: string, slug: string) {
    const policy = this.policies.find((p) => p.slug === slug);
    if (!policy) throw new Error(`Missing required legal policy: ${slug}`);
    return { label, description, policy };
  }

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
    const key = `legal.policy.${p.slug}.title`;
    const translated = this.i18n.t(key);
    return translated === key ? p.title : translated;
  }

  policySummary(p: LegalPolicyMeta): string {
    const key = `legal.policy.${p.slug}.summary`;
    const translated = this.i18n.t(key);
    return translated === key ? p.summary : translated;
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
