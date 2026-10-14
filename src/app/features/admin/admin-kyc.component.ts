import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KycService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { KycAdminDocuments, KycDocumentInfo, KycQueueItem, KycReviewStatus, KycSide, KycSubjectType } from '../../models/marketplace.models';
import { BackButtonComponent } from '../../shared/components/back-button.component';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TPipe, BackButtonComponent],
  templateUrl: './admin-kyc.component.html',
  styleUrl: './admin-kyc.component.scss',
})
export class AdminKycComponent implements OnInit {
  private readonly api = inject(KycService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly statuses: KycReviewStatus[] = ['pending', 'verified', 'rejected', 'all'];
  readonly subjectFilters: Array<KycSubjectType | ''> = ['', 'individual', 'organization'];
  readonly sides: KycSide[] = ['front', 'back', 'license'];

  readonly status = signal<KycReviewStatus>('pending');
  readonly subjectType = signal<KycSubjectType | ''>('');
  readonly items = signal<KycQueueItem[]>([]);
  readonly counts = signal({ pending: 0, verified: 0, rejected: 0 });
  readonly selectedId = signal('');
  readonly docs = signal<Partial<Record<KycSide, string>>>({});
  /** MinIO storage info for the selected record (keys, names, sizes). */
  readonly storage = signal<KycAdminDocuments | null>(null);
  readonly copied = signal('');
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
    this.storage.set(null);
    const item = this.items().find((i) => i.userId === userId);
    if (!item) return;
    this.api.adminDocuments(userId).subscribe({
      next: (r) => {
        if (this.selectedId() === userId) this.storage.set(r);
      },
      error: () => undefined,
    });
    for (const side of this.sides) {
      const has = side === 'front' ? item.kyc.hasFront : side === 'back' ? item.kyc.hasBack : !!item.kyc.hasLicense;
      if (!has) continue;
      this.api.documentUrl(side, userId).subscribe({
        next: (r) => {
          if (this.selectedId() === userId) this.docs.update((m) => ({ ...m, [side]: r.url }));
        },
        error: () => undefined,
      });
    }
  }

  /** Storage rows: live MinIO info when loaded, else what the queue returned. */
  storageDocs(item: KycQueueItem): KycDocumentInfo[] {
    const s = this.storage();
    return s && s.userId === item.userId ? s.documents : item.kyc.documents || [];
  }

  recordIdOf(item: KycQueueItem): string {
    const s = this.storage();
    return (s && s.userId === item.userId && s.recordId) || item.kyc.recordId || '';
  }

  shortId(id: string | undefined | null): string {
    const v = String(id || '');
    return v.length > 12 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;
  }

  fileSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  copy(text: string, ev?: Event): void {
    ev?.stopPropagation();
    if (!text) return;
    const done = () => {
      this.copied.set(text);
      setTimeout(() => {
        if (this.copied() === text) this.copied.set('');
      }, 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
    } else this.fallbackCopy(text, done);
  }

  private fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      ta.remove();
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
