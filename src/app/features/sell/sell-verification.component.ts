import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SellerService, LegalService } from '../../services/api.services';
import { SellerProfile, LegalDocumentMeta } from '../../models/marketplace.models';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-sell-verification',
  standalone: true,
  imports: [FormsModule, NgIf, RouterLink],
  template: `
    <div class="verify">
      <h1>Xác minh Seller (sàn trung gian)</h1>
      <p class="verify__lead">
        Để đăng bán bên thứ ba trên AI Markets, bạn phải hoàn tất hồ sơ pháp lý, chấp thuận Thỏa thuận
        Seller và được sàn phê duyệt. RunPod / OpenRouter chỉ là <strong>Provider hạ tầng</strong>, không
        phải Seller.
      </p>

      <div class="verify__status" *ngIf="profile">
        <p>
          Trạng thái:
          <strong>{{ profile.verificationStatus }}</strong>
          · Có thể publish: {{ profile.canPublish ? 'Có' : 'Chưa' }}
        </p>
        <p *ngIf="profile.statusReason">Ghi chú: {{ profile.statusReason }}</p>
      </div>

      <form class="verify__form" (ngSubmit)="submit()">
        <label>
          Loại Seller
          <select [(ngModel)]="form.sellerType" name="sellerType">
            <option value="individual">Cá nhân</option>
            <option value="household_business">Hộ kinh doanh</option>
            <option value="enterprise">Doanh nghiệp</option>
            <option value="organization">Tổ chức</option>
          </select>
        </label>
        <label>
          Tên pháp lý
          <input [(ngModel)]="form.legalName" name="legalName" required />
        </label>
        <label>
          Tên hiển thị
          <input [(ngModel)]="form.displayName" name="displayName" required />
        </label>
        <label>
          Mã số thuế (nếu có)
          <input [(ngModel)]="form.taxCode" name="taxCode" />
        </label>
        <label>
          Đăng ký kinh doanh (nếu có)
          <input [(ngModel)]="form.businessRegistrationNumber" name="brn" />
        </label>
        <label>
          Địa chỉ kinh doanh
          <input [(ngModel)]="form.businessAddress" name="addr" />
        </label>
        <label>
          Email liên hệ
          <input [(ngModel)]="form.contactEmail" name="email" type="email" />
        </label>
        <label>
          Số điện thoại
          <input [(ngModel)]="form.contactPhone" name="phone" />
        </label>
        <button type="submit" [disabled]="saving">Gửi hồ sơ xác minh</button>
      </form>

      <section class="verify__agreement" *ngIf="agreement">
        <h2>{{ agreement.title }} (v{{ agreement.version }})</h2>
        <pre>{{ agreement.content }}</pre>
        <button type="button" (click)="acceptAgreement()" [disabled]="saving">
          Tôi đã đọc và chấp thuận Thỏa thuận Seller
        </button>
      </section>

      <p class="verify__msg" *ngIf="message">{{ message }}</p>
      <p><a routerLink="/legal/chinh-sach-nguoi-ban">Chính sách người bán</a> ·
        <a routerLink="/legal/quy-che-hoat-dong-san-tmdt">Quy chế sàn</a> ·
        <a routerLink="/legal/mau-hop-dong-cung-cap-dich-vu-nguoi-ban">Thỏa thuận Seller</a></p>
    </div>
  `,
  styles: [
    `
      .verify {
        max-width: 40rem;
        padding: 0.5rem 0 2rem;
      }
      .verify__lead,
      .verify__status {
        line-height: 1.55;
        opacity: 0.85;
      }
      .verify__form {
        display: grid;
        gap: 0.85rem;
        margin: 1.5rem 0;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
      }
      input,
      select,
      button,
      pre {
        font: inherit;
      }
      input,
      select {
        padding: 0.55rem 0.7rem;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
        background: transparent;
      }
      button {
        padding: 0.65rem 1rem;
        border-radius: 999px;
        border: 0;
        background: #111;
        color: #fff;
        cursor: pointer;
        width: fit-content;
      }
      .verify__agreement pre {
        white-space: pre-wrap;
        max-height: 220px;
        overflow: auto;
        padding: 1rem;
        border-radius: 12px;
        background: color-mix(in srgb, currentColor 5%, transparent);
        font-size: 0.88rem;
      }
      .verify__msg {
        margin-top: 1rem;
        color: #0f7b3a;
      }
    `,
  ],
})
export class SellVerificationComponent implements OnInit {
  private readonly sellers = inject(SellerService);
  private readonly legal = inject(LegalService);
  private readonly seo = inject(SeoService);

  profile: SellerProfile | null = null;
  agreement: LegalDocumentMeta | null = null;
  saving = false;
  message = '';

  form = {
    sellerType: 'individual',
    legalName: '',
    displayName: '',
    taxCode: '',
    businessRegistrationNumber: '',
    businessAddress: '',
    contactEmail: '',
    contactPhone: '',
  };

  ngOnInit(): void {
    this.seo.set({
      title: 'Xác minh Seller',
      description: 'Onboarding Seller cho sàn TMĐT trung gian AI Markets.',
    });
    this.sellers.me().subscribe((p) => {
      this.profile = p;
      if (p) {
        this.form = {
          sellerType: p.sellerType || 'individual',
          legalName: p.legalName || '',
          displayName: p.displayName || '',
          taxCode: p.taxCode || '',
          businessRegistrationNumber: p.businessRegistrationNumber || '',
          businessAddress: p.businessAddress || '',
          contactEmail: p.contactEmail || '',
          contactPhone: p.contactPhone || '',
        };
      }
    });
    this.legal.get('seller-agreement').subscribe({
      next: (d) => (this.agreement = d),
      error: () => undefined,
    });
  }

  submit(): void {
    this.saving = true;
    this.sellers.apply(this.form).subscribe({
      next: (p) => {
        this.profile = p;
        this.message = 'Đã gửi hồ sơ. Chờ admin phê duyệt (VERIFIED).';
        this.saving = false;
      },
      error: (err) => {
        this.message = err?.error?.message || 'Gửi hồ sơ thất bại';
        this.saving = false;
      },
    });
  }

  acceptAgreement(): void {
    this.saving = true;
    this.sellers.acceptAgreement().subscribe({
      next: (p) => {
        this.profile = p;
        this.message = 'Đã chấp thuận Thỏa thuận Seller.';
        this.saving = false;
      },
      error: (err) => {
        this.message = err?.error?.message || 'Chấp thuận thất bại';
        this.saving = false;
      },
    });
  }
}
