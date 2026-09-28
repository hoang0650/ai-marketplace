import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KycService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { KycQueueItem, KycReviewStatus, KycSide, KycSubjectType } from '../../models/marketplace.models';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TPipe],
  templateUrl: './admin-kyc.component.html',
  styleUrl: './admin-kyc.component.scss',
})
export class AdminKycComponent implements OnInit {
  private readonly api = inject(KycService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly statuses: KycReviewStatus[] = ['pending', 'verified', 'rejected', 'all'];
  readonly subjectFilters: Array<KycSubjectType | ''> = ['', 'individual', 'organization'];
  readonly sides: KycSide[] = ['front', 'back'];

  readonly status = signal<KycReviewStatus>('pending');
  readonly subjectType = signal<KycSubjectType | ''>('');
  readonly items = signal<KycQueueItem[]>([]);
  readonly counts = signal({ pending: 0, verified: 0, rejected: 0 });
  readonly selectedId = signal('');
  readonly docs = signal<Partial<Record<KycSide, string>>>({});
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly msg = signal('');
  readonly selected = computed(() => this.items().find((i) => i.userId === this.selectedId()) || null);

  q = '';
  rejectReason = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.kyc.title') });
    this.reload();
  }

  setStatus(status: KycReviewStatus): void {
    this.status.set(status);
    this.msg.set('');
    this.reload();
  }

  setSubject(subjectType: KycSubjectType | ''): void {
    this.subjectType.set(subjectType);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.adminQueue({ status: this.status(), subjectType: this.subjectType(), q: this.q.trim() }).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.counts.set(res.counts);
        this.loading.set(false);
        const keep = res.items.some((i) => i.userId === this.selectedId());
        this.select(keep ? this.selectedId() : res.items[0]?.userId || '');
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('admin.kyc.err'));
        this.loading.set(false);
      },
    });
  }

  select(userId: string): void {
    if (userId === this.selectedId() && Object.keys(this.docs()).length) return;
    this.selectedId.set(userId);
    this.rejectReason = '';
    this.docs.set({});
    const item = this.items().find((i) => i.userId === userId);
    if (!item) return;
    for (const side of this.sides) {
      if (!(side === 'front' ? item.kyc.hasFront : item.kyc.hasBack)) continue;
      this.api.documentUrl(side, userId).subscribe({
        next: (r) => {
          if (this.selectedId() === userId) this.docs.update((m) => ({ ...m, [side]: r.url }));
        },
        error: () => undefined,
      });
    }
  }

  countFor(status: KycReviewStatus): number | null {
    const c = this.counts();
    if (status === 'all') return c.pending + c.verified + c.rejected;
    return c[status];
  }

  approve(item: KycQueueItem): void {
    if (!confirm(this.i18n.t('admin.kyc.confirmApprove'))) return;
    this.decide(item, 'verified');
  }

  reject(item: KycQueueItem): void {
    if (this.rejectReason.trim().length < 5) {
      this.error.set(this.i18n.t('admin.kyc.reasonRequired'));
      return;
    }
    this.decide(item, 'rejected');
  }

  private decide(item: KycQueueItem, decision: 'verified' | 'rejected'): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.adminDecide(item.userId, decision, decision === 'rejected' ? this.rejectReason.trim() : undefined).subscribe({
      next: () => {
        this.msg.set(this.i18n.t(decision === 'verified' ? 'admin.kyc.approved' : 'admin.kyc.rejected'));
        this.busy.set(false);
        this.rejectReason = '';
        this.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('admin.kyc.err'));
        this.busy.set(false);
      },
    });
  }

  statusKey(status: string): string {
    return `kyc.status.${status || 'none'}`;
  }

  filterKey(status: KycReviewStatus): string {
    return status === 'all' ? 'admin.kyc.filter.all' : `kyc.status.${status}`;
  }

  subjectKey(subjectType: KycSubjectType | ''): string {
    return subjectType ? `kyc.subject.${subjectType}` : 'admin.kyc.filter.allTypes';
  }

  displayName(item: KycQueueItem): string {
    return item.kyc.subjectType === 'organization' ? item.kyc.orgName || item.kyc.fullName : item.kyc.fullName || item.name;
  }
}
