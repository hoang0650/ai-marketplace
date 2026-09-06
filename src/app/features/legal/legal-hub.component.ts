import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { LEGAL_POLICIES, LEGAL_POLICY_GROUPS } from './legal-policies.catalog';

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

  constructor() {
    this.seo.set({
      title: 'Trung tâm pháp lý AI Markets',
      description:
        'Quy chế sàn TMĐT trung gian, điều khoản, chính sách người bán/người mua, thanh toán, bảo mật và AUP của AI Markets.',
    });
  }

  docsIn(group: string) {
    return this.policies.filter((p) => p.group === group);
  }
}
