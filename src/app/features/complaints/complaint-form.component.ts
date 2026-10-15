import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ComplaintKind, Order } from '../../models/marketplace.models';

const ORDER_KINDS: ComplaintKind[] = ['buyer_seller', 'buyer_platform', 'seller_platform'];
const WORK_KINDS: ComplaintKind[] = [
  'employer_freelancer',
  'freelancer_employer',
  'employer_platform',
  'freelancer_platform',
];

@Component({
  selector: 'app-complaint-form',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  templateUrl: './complaint-form.component.html',
  styleUrl: './complaints.scss',
})
export class ComplaintFormComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly orders = signal<Order[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly isWork = signal(false);
  readonly kinds = signal<ComplaintKind[]>(ORDER_KINDS);

  name = '';
  email = '';
  kind: ComplaintKind = 'buyer_seller';
  orderId = '';
  jobApplicationId = '';
  productName = '';
  body = '';
  requestedAction = '';
  evidenceUrls = '';
  openOrderDispute = true;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('complaint.form.title') });
    const user = this.auth.user();
    this.name = user?.name || '';
    this.email = user?.email || '';
    const q = this.route.snapshot.queryParamMap;
    this.jobApplicationId = q.get('jobApplicationId') || '';
    const workMode = !!this.jobApplicationId;
    this.isWork.set(workMode);
    this.kinds.set(workMode ? WORK_KINDS : ORDER_KINDS);
    const kind = q.get('kind') as ComplaintKind | null;
    if (kind && this.kinds().includes(kind)) {
      this.kind = kind;
    } else {
      this.kind = this.kinds()[0];
    }
    this.orderId = q.get('orderId') || '';
    if (q.get('intent') === 'refund' && !this.requestedAction) this.requestedAction = this.i18n.t('bhub.refundAction');
    if (!workMode) {
      this.api.orders().subscribe({
        next: (list) => {
          this.orders.set(list);
          if (this.orderId) {
            const hit = list.find((o) => o.id === this.orderId);
            if (hit) this.productName = hit.productName;
          }
        },
      });
    }
  }

  selectedOrder(): Order | undefined {
    return this.orders().find((o) => o.id === this.orderId);
  }

  onOrderChange(): void {
    const o = this.selectedOrder();
    if (o) this.productName = o.productName;
  }

  submit(): void {
    this.error.set('');
    if (this.body.trim().length < 8) {
      this.error.set(this.i18n.t('complaint.err.body'));
      return;
    }
    if (this.isWork()) {
      if (!this.jobApplicationId) {
        this.error.set(this.i18n.t('complaint.err.jobApp'));
        return;
      }
    } else if (this.kind === 'buyer_seller' && !this.orderId) {
      this.error.set(this.i18n.t('complaint.err.order'));
      return;
    }
    this.busy.set(true);
    this.api
      .createComplaint({
        kind: this.kind,
        body: this.body.trim(),
        requestedAction: this.requestedAction.trim(),
        evidenceUrls: this.evidenceUrls,
        orderId: this.isWork() ? undefined : this.orderId || undefined,
        jobApplicationId: this.isWork() ? this.jobApplicationId : undefined,
        productName: this.productName.trim() || undefined,
        name: this.name.trim(),
        email: this.email.trim(),
        openOrderDispute: !this.isWork() && this.kind === 'buyer_seller' ? this.openOrderDispute : false,
      })
      .subscribe({
        next: (c) => this.router.navigate(['/complaints', c.id]),
        error: (err) => {
          this.error.set(err?.error?.message || this.i18n.t('complaint.err.submit'));
          this.busy.set(false);
        },
      });
  }
}
