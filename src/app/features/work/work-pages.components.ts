import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-work-placeholder',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section>
      <p class="crumb">{{ crumb }}</p>
      <h1>{{ title }}</h1>
      <div class="card">
        <p>{{ desc }}</p>
        <div class="actions">
          <a routerLink="/work" class="link">Về bảng công việc →</a>
          @if (ctaPath) {
            <a [routerLink]="ctaPath" class="btn">{{ ctaLabel }}</a>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.25rem; max-width: 640px; }
    p { color: #666; line-height: 1.5; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-top: .85rem; }
    .link { color: #e53935; font-weight: 700; text-decoration: none; }
    .btn { display: inline-flex; min-height: 2.35rem; padding: .45rem .95rem; border-radius: 10px; background: #e53935; color: #fff; text-decoration: none; font-weight: 800; font-size: .88rem; align-items: center; }
  `,
})
export class WorkPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  title = 'Work';
  crumb = 'Work';
  desc = 'Tính năng đang được cập nhật.';
  ctaPath = '';
  ctaLabel = '';

  constructor() {
    const page = this.route.snapshot.data['page'] as string;
    const map: Record<string, { title: string; crumb: string; desc: string; ctaPath?: string; ctaLabel?: string }> = {
      profile: {
        title: 'Hồ sơ năng lực',
        crumb: 'Tổng quan / Hồ sơ năng lực',
        desc: 'Tạo hồ sơ kỹ năng, portfolio và kinh nghiệm để nhận việc phù hợp hơn.',
        ctaPath: '/profile',
        ctaLabel: 'Mở hồ sơ tài khoản',
      },
      saved: {
        title: 'Việc đã lưu',
        crumb: 'Tổng quan / Việc đã lưu',
        desc: 'Các việc bạn đã lưu sẽ xuất hiện tại đây.',
        ctaPath: '/hire-agent',
        ctaLabel: 'Tìm việc',
      },
      'job-profile': {
        title: 'Hồ sơ tìm việc',
        crumb: 'Tổng quan / Hồ sơ tìm việc',
        desc: 'Thiết lập mức giá, chuyên môn và trạng thái sẵn sàng nhận việc.',
      },
      post: {
        title: 'Đăng việc mới',
        crumb: 'Tuyển dụng / Đăng việc mới',
        desc: 'Đăng brief tuyển dụng hoặc thuê agent / freelancer trên marketplace.',
        ctaPath: '/dashboard/products',
        ctaLabel: 'Đăng dịch vụ',
      },
      org: {
        title: 'Tổ chức',
        crumb: 'Tuyển dụng / Tổ chức',
        desc: 'Quản lý nhóm, thành viên và không gian làm việc chung.',
      },
      services: {
        title: 'Dịch vụ của tôi',
        crumb: 'Tuyển dụng / Dịch vụ của tôi',
        desc: 'Danh sách dịch vụ / deployment bạn đang cung cấp.',
        ctaPath: '/deployments',
        ctaLabel: 'Quản lý deployments',
      },
      contests: {
        title: 'Cuộc thi của tôi',
        crumb: 'Tuyển dụng / Cuộc thi của tôi',
        desc: 'Theo dõi cuộc thi, challenge và phần thưởng.',
      },
      contracts: {
        title: 'Hợp đồng',
        crumb: 'Tài chính & bảo vệ / Hợp đồng',
        desc: 'Theo dõi hợp đồng, milestone và trạng thái bàn giao.',
      },
      disputes: {
        title: 'Tranh chấp',
        crumb: 'Tài chính & bảo vệ / Tranh chấp',
        desc: 'Mở và theo dõi tranh chấp giao dịch an toàn.',
      },
      withdraw: {
        title: 'Rút tiền',
        crumb: 'Tài chính & bảo vệ / Rút tiền',
        desc: 'Rút thu nhập từ công việc và dịch vụ.',
        ctaPath: '/wallet',
        ctaLabel: 'Mở ví',
      },
    };
    const cfg = map[page] || { title: 'Work', crumb: 'Work', desc: this.desc };
    this.title = cfg.title;
    this.crumb = cfg.crumb;
    this.desc = cfg.desc;
    this.ctaPath = cfg.ctaPath || '';
    this.ctaLabel = cfg.ctaLabel || '';
    this.seo.set({ title: this.title });
  }
}
