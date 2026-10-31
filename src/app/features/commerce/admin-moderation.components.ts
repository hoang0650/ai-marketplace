import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AdminProductDetail, ModerationStatus } from '../../models/marketplace.models';
import { ADMIN_USER_MESSAGES } from '../admin/admin-user.messages';

const STATUS_OPTIONS: ModerationStatus[] = ['active', 'suspended', 'blocked', 'inactive'];

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
  imports: [FormsModule, TPipe],
  template: `
    <form class="mt-2 grid gap-3" (ngSubmit)="submit()">
      <label class="text-xs uppercase tracking-wider text-muted">{{ 'admin.user.statusLabel' | t }}</label>
      <select class="input" [(ngModel)]="status" name="status">
        @for (opt of options; track opt) {
          <option [value]="opt">{{ 'admin.user.status.' + opt | t }}</option>
        }
      </select>
      @if (status === 'suspended') {
        <label class="text-xs uppercase tracking-wider text-muted">{{ 'admin.user.days' | t }}</label>
        <input class="input" type="number" min="1" max="365" name="days" [(ngModel)]="days" />
      }
      <label class="text-xs uppercase tracking-wider text-muted">{{ 'admin.user.reasonOptional' | t }}</label>
      <textarea class="input min-h-[88px]" name="reason" [(ngModel)]="reason"></textarea>
      @if (error()) {
        <p class="text-sm text-red-600">{{ error() }}</p>
      }
      @if (ok()) {
        <p class="text-sm text-muted">{{ ok() }}</p>
      }
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-fill" type="submit" [disabled]="busy()">{{ 'admin.user.updateStatus' | t }}</button>
        @if (!hideDelete()) {
          <button class="btn btn-outline" type="button" [disabled]="busy()" (click)="confirmOpen.set(true)">
            {{ deleteLabel() }}
          </button>
        }
      </div>
    </form>
    @if (confirmOpen()) {
      <div class="am-backdrop" (click)="confirmOpen.set(false)" (keydown.escape)="confirmOpen.set(false)">
        <div class="am-dialog" role="dialog" aria-modal="true" [attr.aria-label]="deleteLabel()" (click)="$event.stopPropagation()">
          <h2>{{ 'admin.user.confirmDeleteTitle' | t }}</h2>
          <p>{{ 'admin.user.confirmDeleteBody' | t }}</p>
          <div class="am-dialog__actions">
            <button type="button" class="btn btn-outline" (click)="confirmOpen.set(false)">{{ 'admin.user.cancel' | t }}</button>
            <button type="button" class="btn btn-fill" (click)="commitDelete()">{{ deleteLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .am-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(17, 17, 17, 0.48);
    }
    .am-dialog {
      width: min(28rem, 100%);
      background: var(--color-surface);
      color: var(--color-ink);
      border: 1px solid var(--color-line);
      border-radius: 16px;
      padding: 1.2rem;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
    }
    .am-dialog h2 { margin: 0 0 0.4rem; font-size: 1.2rem; }
    .am-dialog p { margin: 0; color: var(--color-muted); }
    .am-dialog__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
  `,
})
export class AdminStatusFormComponent {
  private readonly i18n = inject(I18nService);
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
  readonly confirmOpen = signal(false);
  status: ModerationStatus = 'active';
  days = 7;
  reason = '';

  constructor() {
    this.i18n.extend(ADMIN_USER_MESSAGES);
    effect(() => {
      this.status = this.current();
      this.reason = this.initialReason();
    });
  }

  commitDelete(): void {
    this.confirmOpen.set(false);
    this.deleted.emit();
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
  private readonly i18n = inject(I18nService);

  readonly item = signal<AdminProductDetail | null>(null);
  readonly loadError = signal('');

  constructor() {
    this.i18n.extend(ADMIN_USER_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: 'Admin · Product' });
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.adminProduct(id).subscribe({
      next: (p) => this.item.set(p),
      error: (err) => this.loadError.set(errMessage(err)),
    });
  }

  statusLabel(s: ModerationStatus): string {
    const key = `admin.user.status.${s}`;
    const text = this.i18n.t(key);
    return text === key ? s : text;
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
