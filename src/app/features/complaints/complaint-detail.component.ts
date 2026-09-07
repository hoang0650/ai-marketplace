import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { Complaint } from '../../models/marketplace.models';

@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe],
  templateUrl: './complaint-detail.component.html',
  styleUrl: './complaints.scss',
})
export class ComplaintDetailComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly item = signal<Complaint | null>(null);
  readonly error = signal('');
  readonly msg = signal('');
  readonly busy = signal(false);
  sellerBody = '';
  appealReason = '';
  decision: 'upheld' | 'rejected' | 'mediated' = 'mediated';
  decisionNote = '';

  readonly isSeller = computed(() => {
    const c = this.item();
    const uid = this.auth.user()?.id;
    return !!(c && uid && c.sellerId === uid);
  });
  readonly isComplainant = computed(() => {
    const c = this.item();
    const uid = this.auth.user()?.id;
    return !!(c && uid && c.complainantId === uid);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.complaint(id).subscribe({
      next: (c) => {
        this.item.set(c);
        this.seo.set({ title: `${c.caseRef} · ${this.i18n.t('complaint.detail.title')}` });
      },
      error: (err) => this.error.set(err?.error?.message || this.i18n.t('complaint.err.load')),
    });
  }

  statusKey(status: string): string {
    return `complaint.status.${status}`;
  }

  kindKey(kind: string): string {
    return `complaint.kind.${kind}`;
  }

  decisionKey(decision: string): string {
    return `complaint.decision.${decision}`;
  }

  eventLabel(action: string): string {
    const known = [
      'received',
      'verifying',
      'classified',
      'awaiting_seller',
      'reviewing',
      'decided',
      'closed',
      'seller_response',
      'appeal',
      'skip_seller',
    ];
    return known.includes(action) ? this.i18n.t(`complaint.event.${action}`) : action;
  }

  private apply(updated: Complaint, okKey: string): void {
    this.item.set(updated);
    this.msg.set(this.i18n.t(okKey));
    this.busy.set(false);
  }

  private fail(err: { error?: { message?: string } }): void {
    this.error.set(err?.error?.message || this.i18n.t('complaint.err.submit'));
    this.busy.set(false);
  }

  sellerRespond(): void {
    const c = this.item();
    if (!c || this.sellerBody.trim().length < 8) {
      this.error.set(this.i18n.t('complaint.err.body'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.sellerRespondComplaint(c.id, this.sellerBody.trim()).subscribe({
      next: (row) => this.apply(row, 'complaint.ok.seller'),
      error: (err) => this.fail(err),
    });
  }

  appeal(): void {
    const c = this.item();
    if (!c || this.appealReason.trim().length < 8) {
      this.error.set(this.i18n.t('complaint.err.body'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api.appealComplaint(c.id, this.appealReason.trim()).subscribe({
      next: (row) => this.apply(row, 'complaint.ok.appeal'),
      error: (err) => this.fail(err),
    });
  }

  admin(action: 'advance' | 'skip_seller' | 'close'): void {
    const c = this.item();
    if (!c) return;
    this.busy.set(true);
    this.error.set('');
    this.api.adminUpdateComplaint(c.id, { action }).subscribe({
      next: (row) => this.apply(row, 'complaint.ok.admin'),
      error: (err) => this.fail(err),
    });
  }

  adminDecide(): void {
    const c = this.item();
    if (!c) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .adminUpdateComplaint(c.id, {
        action: 'decide',
        decision: this.decision,
        decisionNote: this.decisionNote.trim(),
      })
      .subscribe({
        next: (row) => this.apply(row, 'complaint.ok.admin'),
        error: (err) => this.fail(err),
      });
  }
}
