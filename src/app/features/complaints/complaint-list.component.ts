import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { Complaint } from '../../models/marketplace.models';

@Component({
  selector: 'app-complaint-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TPipe],
  templateUrl: './complaint-list.component.html',
  styleUrl: './complaints.scss',
})
export class ComplaintListComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly items = signal<Complaint[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly inbox = signal<'mine' | 'seller' | 'admin' | 'work' | ''>('');

  ngOnInit(): void {
    const inbox = String(this.route.snapshot.data['inbox'] || '');
    this.inbox.set(
      inbox === 'seller' || inbox === 'admin' || inbox === 'mine' || inbox === 'work' ? inbox : '',
    );
    this.seo.set({ title: this.i18n.t(this.titleKey()) });
    this.api.complaints(this.inbox() || undefined).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('complaint.err.load'));
        this.loading.set(false);
      },
    });
  }

  titleKey(): string {
    const inbox = this.inbox();
    if (inbox === 'seller') return 'complaint.list.sellerTitle';
    if (inbox === 'admin') return 'complaint.list.adminTitle';
    if (inbox === 'work') return 'complaint.list.workTitle';
    return 'complaint.list.title';
  }

  kindKey(kind: string): string {
    return `complaint.kind.${kind}`;
  }

  statusKey(status: string): string {
    return `complaint.status.${status}`;
  }
}
