import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AffiliateService } from '../../services/affiliate.service';
import { SeoService } from '../../services/seo.service';
import { PitCommitment } from '../../models/marketplace.models';

/**
 * Admin tax tools (tax policy 2026-10):
 * - quarterly tax report export (individual sellers + household businesses revenue, VAT/PIT withheld,
 *   affiliate PIT) for the tax authority portal - file in months 1, 4, 7, 10;
 * - year-end PIT withholding certificate data (chứng từ khấu trừ thuế TNCN);
 * - review queue for affiliate commitments Mẫu 08/CK-TNCN.
 */
@Component({
  selector: 'app-admin-tax',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="page route-enter">
      <h1 class="section-title">Thuế &amp; báo cáo thuế</h1>
      <p class="mt-2 max-w-3xl text-muted">
        Cá nhân kinh doanh: sàn khấu trừ, nộp thay 7% (5% GTGT + 2% TNCN) cho dịch vụ/sản phẩm số, 1,5% cho hàng hóa (NĐ 117/2025/NĐ-CP).
        Hộ kinh doanh, doanh nghiệp/tổ chức: 0% (doanh nghiệp nhận hóa đơn GTGT 10% cho phí sàn). Affiliate: rút tối thiểu 2.000.000 đ, khấu trừ 10% TNCN mỗi lần rút,
        0% nếu có Mẫu 08/CK-TNCN được duyệt.
      </p>

      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        <div class="panel">
          <h2 class="font-display text-xl">Báo cáo thuế theo quý</h2>
          <p class="mt-1 text-sm text-muted">Doanh thu cá nhân kinh doanh, hộ kinh doanh; thuế đã khấu trừ; TNCN affiliate. Nộp trên cổng thuế trong tháng 1, 4, 7, 10.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <input class="input w-28" type="number" [(ngModel)]="year" name="year" min="2025" max="2100" aria-label="Năm" />
            <select class="input w-28" [(ngModel)]="quarter" name="quarter" aria-label="Quý">
              @for (q of [1, 2, 3, 4]; track q) {
                <option [ngValue]="q">Quý {{ q }}</option>
              }
            </select>
            <button type="button" class="btn btn-fill" [disabled]="busy()" (click)="download('quarterly', 'xlsx')">XLSX</button>
            <button type="button" class="btn" [disabled]="busy()" (click)="download('quarterly', 'csv')">CSV</button>
          </div>
        </div>
        <div class="panel">
          <h2 class="font-display text-xl">Chứng từ khấu trừ thuế TNCN (cuối năm)</h2>
          <p class="mt-1 text-sm text-muted">Tổng thu nhập và thuế TNCN đã khấu trừ theo từng người (affiliate, cá nhân kinh doanh) để lập chứng từ.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <input class="input w-28" type="number" [(ngModel)]="certYear" name="certYear" min="2025" max="2100" aria-label="Năm" />
            <button type="button" class="btn btn-fill" [disabled]="busy()" (click)="download('pit-certificates', 'xlsx')">XLSX</button>
            <button type="button" class="btn" [disabled]="busy()" (click)="download('pit-certificates', 'csv')">CSV</button>
          </div>
        </div>
      </div>
      @if (error()) {
        <p class="mt-3 text-sm text-red-600" role="alert">{{ error() }}</p>
      }

      <div class="panel mt-6 overflow-x-auto">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-display text-xl">Cam kết Mẫu 08/CK-TNCN</h2>
          <select class="input w-36" [(ngModel)]="status" name="status" (ngModelChange)="load()" aria-label="Trạng thái">
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
        @if (items().length) {
          <table class="mt-3 w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th>Người dùng</th><th>Năm</th><th>MST/CCCD</th><th>Gửi lúc</th><th>Tài liệu</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.userId) {
                <tr>
                  <td><a [routerLink]="['/admin/users', c.userId]">{{ c.fullName || c.name }}</a><br /><span class="text-xs text-muted">{{ c.email }}</span></td>
                  <td>{{ c.year }}</td>
                  <td>{{ c.personalTaxCode }}</td>
                  <td>{{ c.submittedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>@if (c.hasDocument) { <button type="button" class="btn" (click)="open(c)">Xem</button> }</td>
                  <td>
                    @if (c.status === 'pending') {
                      <button type="button" class="btn btn-fill" (click)="review(c, 'approved')">Duyệt</button>
                      <button type="button" class="btn" (click)="review(c, 'rejected')">Từ chối</button>
                    } @else {
                      {{ c.status }} {{ c.rejectReason }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="mt-2 text-muted">Không có hồ sơ.</p>
        }
      </div>
    </section>
  `,
})
export class AdminTaxComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly aff = inject(AffiliateService);
  private readonly seo = inject(SeoService);
  readonly items = signal<PitCommitment[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  year = new Date().getFullYear();
  quarter = Math.max(1, Math.ceil((new Date().getMonth() + 1) / 3) - 1) || 1;
  certYear = new Date().getFullYear();
  status = 'pending';

  ngOnInit(): void {
    this.seo.set({ title: 'Thuế & báo cáo thuế' });
    this.load();
  }

  load(): void {
    this.aff.adminPitCommitments(this.status).subscribe({ next: (r) => this.items.set(r), error: () => this.items.set([]) });
  }

  download(kind: 'quarterly' | 'pit-certificates', format: 'xlsx' | 'csv'): void {
    this.error.set('');
    this.busy.set(true);
    const params: Record<string, string> =
      kind === 'quarterly' ? { year: String(this.year), quarter: String(this.quarter), format } : { year: String(this.certYear), format };
    this.http.get(`${environment.apiUrl}/admin/tax-reports/${kind}`, { params, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const name = kind === 'quarterly' ? `bao-cao-thue-${this.year}-Q${this.quarter}.${format}` : `chung-tu-khau-tru-tncn-${this.certYear}.${format}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.busy.set(false);
      },
      error: () => {
        this.error.set('Không xuất được báo cáo.');
        this.busy.set(false);
      },
    });
  }

  open(c: PitCommitment): void {
    if (!c.userId) return;
    this.aff.pitCommitmentDocument(c.userId).subscribe({ next: (r) => window.open(r.url, '_blank', 'noopener') });
  }

  review(c: PitCommitment, decision: 'approved' | 'rejected'): void {
    if (!c.userId) return;
    let reason = '';
    if (decision === 'rejected') {
      reason = window.prompt('Lý do từ chối') || '';
      if (reason.trim().length < 3) return;
    }
    this.aff.reviewPitCommitment(c.userId, decision, reason).subscribe({ next: () => this.load() });
  }
}
