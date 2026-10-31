import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AdminDisputeDetail, DisputeMessage, DisputeTimelineEvent } from '../../models/marketplace.models';
import { DisputeThreadComponent } from '../orders/dispute-thread.component';
import { ADMIN_DISPUTE_MESSAGES } from './admin-disputes.messages';
import { adminHttpError } from './admin-http';

type Choice = 'buyer_full' | 'buyer_partial' | 'seller_win' | 'split';

interface PendingDecision {
  choice: Choice;
  resolution: 'buyer_win' | 'seller_win' | 'split';
  refundAmount?: number;
  reason: string;
}

@Component({
  selector: 'app-admin-dispute-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, TPipe, DisputeThreadComponent],
  templateUrl: './admin-dispute-detail.component.html',
  styleUrl: './admin-dispute-detail.component.scss',
})
export class AdminDisputeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  @ViewChild(DisputeThreadComponent) thread?: DisputeThreadComponent;

  readonly item = signal<AdminDisputeDetail | null>(null);
  readonly messages = signal<DisputeMessage[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly notice = signal('');
  readonly threadError = signal('');
  readonly decideError = signal('');
  readonly sending = signal(false);
  readonly deciding = signal(false);
  readonly pending = signal<PendingDecision | null>(null);

  choice: Choice | string = 'buyer_full';
  refundAmount: number | null = null;
  reason = '';

  constructor() {
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.dispute.title') });
    this.reload();
  }

  @HostListener('document:keydown.escape')
  closeDialog(): void {
    if (!this.deciding()) this.pending.set(null);
  }

  reload(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.adminDispute(id).subscribe({
      next: (row) => this.apply(row),
      error: (err) => {
        this.loading.set(false);
        if (!this.item()) this.loadError.set(adminHttpError(err, this.i18n.t('admin.dispute.loadError')));
      },
    });
  }

  statusLabel(status: string): string {
    const key = `admin.dispute.status.${status}`;
    const text = this.i18n.t(key);
    return text === key ? status : text;
  }

  roleLabel(role: string | undefined): string {
    if (!role) return '—';
    const key = `dispute.thread.role.${role}`;
    const text = this.i18n.t(key);
    return text === key ? role : text;
  }

  orderStatus(status: string): string {
    const key = `bhub.order.status.${status}`;
    const text = this.i18n.t(key);
    return text === key ? status : text;
  }

  outcomeText(row: AdminDisputeDetail): string {
    return (row.outcome?.reason || row.outcome?.note || '').trim();
  }

  events(list: DisputeTimelineEvent[] | undefined): DisputeTimelineEvent[] {
    return list || [];
  }

  needsAmount(): boolean {
    return this.choice === 'buyer_partial' || this.choice === 'split';
  }

  fee(row: AdminDisputeDetail): number | null {
    const value = row.platformFee ?? row.order?.platformFee;
    return value == null ? null : value;
  }

  hasFee(row: AdminDisputeDetail): boolean {
    return this.fee(row) != null;
  }

  feeAmount(row: AdminDisputeDetail): number {
    return this.fee(row) ?? 0;
  }

  orderAmount(row: AdminDisputeDetail): number {
    return Number(row.order?.amount ?? row.amount) || 0;
  }

  currency(row: AdminDisputeDetail): string {
    return row.order?.currency || row.currency || 'USD';
  }

  review(row: AdminDisputeDetail): void {
    const reason = this.reason.trim();
    if (reason.length < 8) {
      this.decideError.set(this.i18n.t('admin.dispute.reasonShort'));
      return;
    }
    const orderAmount = this.orderAmount(row);
    let resolution: PendingDecision['resolution'] = 'seller_win';
    let refundAmount: number | undefined;
    if (this.choice === 'buyer_full') {
      resolution = 'buyer_win';
      refundAmount = orderAmount || undefined;
    } else if (this.choice === 'buyer_partial' || this.choice === 'split') {
      resolution = this.choice === 'split' ? 'split' : 'buyer_win';
      const amount = Number(this.refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        this.decideError.set(this.i18n.t('admin.dispute.amountInvalid'));
        return;
      }
      if (orderAmount > 0 && amount >= orderAmount) {
        this.decideError.set(this.i18n.t('admin.dispute.amountRange'));
        return;
      }
      refundAmount = Math.round(amount * 100) / 100;
    }
    this.decideError.set('');
    this.pending.set({ choice: this.choice as Choice, resolution, refundAmount, reason });
  }

  confirm(): void {
    const row = this.item();
    const decision = this.pending();
    if (!row || !decision || this.deciding()) return;
    this.deciding.set(true);
    this.decideError.set('');
    this.api
      .decideDispute(row.id, {
        resolution: decision.resolution,
        reason: decision.reason,
        note: decision.reason,
        ...(decision.refundAmount != null ? { refundAmount: decision.refundAmount } : {}),
      })
      .subscribe({
        next: () => {
          this.pending.set(null);
          this.deciding.set(false);
          this.notice.set(this.i18n.t('admin.dispute.decided'));
          this.reason = '';
          this.reload();
        },
        error: (err) => {
          this.deciding.set(false);
          this.pending.set(null);
          this.decideError.set(adminHttpError(err, this.i18n.t('admin.dispute.loadError')));
        },
      });
  }

  send(body: string): void {
    const row = this.item();
    if (!row || this.sending()) return;
    this.sending.set(true);
    this.threadError.set('');
    this.api.postAdminDisputeMessage(row.order?.id || row.id, body).subscribe({
      next: () => {
        this.thread?.clear();
        this.sending.set(false);
        this.notice.set(this.i18n.t('admin.dispute.sent'));
        this.reload();
      },
      error: (err) => {
        this.sending.set(false);
        this.threadError.set(adminHttpError(err, this.i18n.t('dispute.thread.err')));
      },
    });
  }

  private apply(row: AdminDisputeDetail): void {
    this.item.set(row);
    this.messages.set(row.messages || []);
    this.loading.set(false);
    this.loadError.set('');
    const orderId = row.order?.id || row.id;
    this.api.disputeMessages(orderId).subscribe({
      next: (msgs) => {
        if (this.item()?.id !== row.id) return;
        if (msgs.length || !(row.messages || []).length) this.messages.set(msgs);
      },
      error: () => undefined,
    });
  }
}
