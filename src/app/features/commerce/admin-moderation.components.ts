import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DashboardService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import {
  AdminProductDetail,
  AdminUserDetail,
  ModerationStatus,
} from '../../models/marketplace.models';

const STATUS_OPTIONS: Array<{ id: ModerationStatus; label: string }> = [
  { id: 'active', label: 'Hoạt động' },
  { id: 'suspended', label: 'Đình chỉ (tạm thời)' },
  { id: 'blocked', label: 'Bị chặn' },
  { id: 'inactive', label: 'Không hoạt động' },
];

function errMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string } | string;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object' && body.message) return body.message;
  }
  return 'Không thể lưu thay đổi.';
}

@Component({
  selector: 'app-admin-status-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="mt-6 grid gap-3" (ngSubmit)="submit()">
      <label class="text-xs uppercase tracking-wider text-muted">Trạng thái</label>
      <select class="input" [(ngModel)]="status" name="status">
        @for (opt of options; track opt.id) {
          <option [value]="opt.id">{{ opt.label }}</option>
        }
      </select>
      @if (status === 'suspended') {
        <label class="text-xs uppercase tracking-wider text-muted">Số ngày đình chỉ</label>
        <input class="input" type="number" min="1" max="365" name="days" [(ngModel)]="days" />
      }
      <label class="text-xs uppercase tracking-wider text-muted">Lý do (tuỳ chọn)</label>
      <textarea class="input min-h-[88px]" name="reason" [(ngModel)]="reason"></textarea>
      @if (error()) {
        <p class="text-sm text-red-600">{{ error() }}</p>
      }
      @if (ok()) {
        <p class="text-sm text-muted">{{ ok() }}</p>
      }
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-fill" type="submit" [disabled]="busy()">Cập nhật trạng thái</button>
        @if (!hideDelete()) {
          <button class="btn btn-outline" type="button" [disabled]="busy()" (click)="confirmDelete()">
            {{ deleteLabel() }}
          </button>
        }
      </div>
    </form>
  `,
})
export class AdminStatusFormComponent {
  readonly current = input<ModerationStatus>('active');
  readonly initialReason = input('');
  readonly hideDelete = input(false);
  readonly deleteLabel = input('Xóa');
  readonly saved = output<{ status: ModerationStatus; days?: number; reason?: string }>();
  readonly deleted = output<void>();

  readonly options = STATUS_OPTIONS;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly ok = signal('');
  status: ModerationStatus = 'active';
  days = 7;
  reason = '';

  constructor() {
    effect(() => {
      this.status = this.current();
      this.reason = this.initialReason();
    });
  }

  submit(): void {
    this.error.set('');
    this.ok.set('');
    this.saved.emit({
      status: this.status,
      days: this.status === 'suspended' ? Number(this.days) || 7 : undefined,
      reason: this.reason.trim(),
    });
  }

  confirmDelete(): void {
    const ok = window.confirm('Xóa vĩnh viễn? Hành động này không hoàn tác.');
    if (ok) this.deleted.emit();
  }
}

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminStatusFormComponent],
  template: `
    <section class="page route-enter max-w-3xl">
      <a routerLink="/admin" class="text-sm text-muted">← Admin dashboard</a>
      <h1 class="section-title mt-4">Chi tiết người dùng</h1>
      @if (item(); as u) {
        <div class="panel mt-8 grid gap-2 text-sm">
          <p><span class="text-muted">Tên</span> · {{ u.name }}</p>
          <p><span class="text-muted">Email</span> · {{ u.email }}</p>
          <p><span class="text-muted">Vai trò</span> · {{ u.role }}</p>
          <p><span class="text-muted">Shop</span> · {{ u.creatorSlug || '—' }}</p>
          <p><span class="text-muted">Trạng thái</span> · {{ statusLabel(u.accountStatus) }}</p>
          @if (u.suspendedUntil && u.accountStatus === 'suspended') {
            <p><span class="text-muted">Đình chỉ đến</span> · {{ u.suspendedUntil | date: 'medium' }}</p>
          }
          @if (u.statusReason) {
            <p><span class="text-muted">Lý do</span> · {{ u.statusReason }}</p>
          }
          <p><span class="text-muted">Sản phẩm</span> · {{ u.productCount | number }}</p>
          <p><span class="text-muted">Đơn hàng</span> · {{ u.orderCount | number }}</p>
          @if (u.createdAt) {
            <p><span class="text-muted">Tạo lúc</span> · {{ u.createdAt | date: 'medium' }}</p>
          }
        </div>
        <app-admin-status-form
          [current]="u.accountStatus"
          [initialReason]="u.statusReason || ''"
          [hideDelete]="isSelf()"
          deleteLabel="Xóa tài khoản"
          (saved)="save($event)"
          (deleted)="remove()"
        />
        @if (isSelf()) {
          <p class="mt-3 text-sm text-muted">Bạn không thể tự đình chỉ, chặn hoặc xóa tài khoản admin của mình.</p>
        }
      } @else if (loadError()) {
        <p class="mt-8 text-sm text-muted">{{ loadError() }}</p>
      }
    </section>
  `,
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  readonly item = signal<AdminUserDetail | null>(null);
  readonly loadError = signal('');
  readonly isSelf = signal(false);

  ngOnInit(): void {
    this.seo.set({ title: 'Admin · User' });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.adminUser(id).subscribe({
      next: (u) => {
        this.item.set(u);
        this.isSelf.set(this.auth.user()?.id === u.id);
      },
      error: (err) => this.loadError.set(errMessage(err)),
    });
  }

  statusLabel(s: ModerationStatus): string {
    return STATUS_OPTIONS.find((o) => o.id === s)?.label || s;
  }

  save(body: { status: ModerationStatus; days?: number; reason?: string }): void {
    const u = this.item();
    if (!u) return;
    this.api.updateUserStatus(u.id, body).subscribe({
      next: (next) => this.item.set(next),
      error: (err) => alert(errMessage(err)),
    });
  }

  remove(): void {
    const u = this.item();
    if (!u) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => void this.router.navigateByUrl('/admin'),
      error: (err) => alert(errMessage(err)),
    });
  }
}

@Component({
  selector: 'app-admin-product-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminStatusFormComponent],
  template: `
    <section class="page route-enter max-w-3xl">
      <a routerLink="/admin" class="text-sm text-muted">← Admin dashboard</a>
      <h1 class="section-title mt-4">Chi tiết sản phẩm</h1>
      @if (item(); as p) {
        <div class="panel mt-8 grid gap-2 text-sm">
          <p><span class="text-muted">Tên</span> · {{ p.name }}</p>
          <p><span class="text-muted">Slug</span> · {{ p.slug }}</p>
          <p><span class="text-muted">Danh mục</span> · {{ p.category }}</p>
          <p><span class="text-muted">Người bán</span> · {{ p.creatorName }} ({{ p.creatorSlug || '—' }})</p>
          <p><span class="text-muted">Trạng thái</span> · {{ statusLabel(p.moderationStatus) }}</p>
          <p><span class="text-muted">Công khai catalog</span> · {{ p.published ? 'Có' : 'Không' }}</p>
          @if (p.suspendedUntil && p.moderationStatus === 'suspended') {
            <p><span class="text-muted">Đình chỉ đến</span> · {{ p.suspendedUntil | date: 'medium' }}</p>
          }
          @if (p.statusReason) {
            <p><span class="text-muted">Lý do</span> · {{ p.statusReason }}</p>
          }
          <p><span class="text-muted">Đã bán</span> · {{ (p.salesCount || 0) | number }}</p>
          <p><span class="text-muted">Đơn hàng</span> · {{ p.orderCount | number }}</p>
        </div>
        <app-admin-status-form
          [current]="p.moderationStatus"
          [initialReason]="p.statusReason || ''"
          deleteLabel="Xóa sản phẩm"
          (saved)="save($event)"
          (deleted)="remove()"
        />
      } @else if (loadError()) {
        <p class="mt-8 text-sm text-muted">{{ loadError() }}</p>
      }
    </section>
  `,
})
export class AdminProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);

  readonly item = signal<AdminProductDetail | null>(null);
  readonly loadError = signal('');

  ngOnInit(): void {
    this.seo.set({ title: 'Admin · Product' });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.adminProduct(id).subscribe({
      next: (p) => this.item.set(p),
      error: (err) => this.loadError.set(errMessage(err)),
    });
  }

  statusLabel(s: ModerationStatus): string {
    return STATUS_OPTIONS.find((o) => o.id === s)?.label || s;
  }

  save(body: { status: ModerationStatus; days?: number; reason?: string }): void {
    const p = this.item();
    if (!p) return;
    this.api.updateProductStatus(p.id, body).subscribe({
      next: (next) => this.item.set(next),
      error: (err) => alert(errMessage(err)),
    });
  }

  remove(): void {
    const p = this.item();
    if (!p) return;
    this.api.deleteProduct(p.id).subscribe({
      next: () => void this.router.navigateByUrl('/admin'),
      error: (err) => alert(errMessage(err)),
    });
  }
}
