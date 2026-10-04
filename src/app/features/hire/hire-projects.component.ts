import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HireProject, HireService } from '../../services/hire.service';
import { TPipe } from '../../i18n/t.pipe';
import { CATEGORY_META, HIRE_REQUEST_CATEGORIES } from '../../models/categories';

type Tab = '' | 'buyer' | 'seller';

/** "Dự án thuê" — quoted, milestone-based custom work as buyer or as seller/talent. */
@Component({
  selector: 'app-hire-projects',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, TPipe],
  template: `
    <section class="mx-auto max-w-5xl px-4 py-8">
      <div class="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display text-3xl">{{ 'hire.list.title' | t }}</h1>
          <p class="text-sm text-muted">{{ 'hire.list.lead' | t }}</p>
        </div>
      </div>
      <div class="mb-5 flex flex-wrap gap-2">
        @for (x of tabs; track x.id) {
          <button type="button" class="btn" [class.btn-fill]="tab() === x.id" [class.btn-outline]="tab() !== x.id" (click)="setTab(x.id)">
            {{ x.label | t }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="text-muted">{{ 'hire.loading' | t }}</p>
      } @else if (error()) {
        <p style="color:#c62828">{{ error() }}</p>
      } @else if (!items().length) {
        <div class="panel">
          <p class="text-muted">{{ 'hire.list.empty' | t }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (s of services; track s.id) {
              <a class="btn btn-outline" [routerLink]="s.path">{{ 'cat.' + s.id + '.label' | t }}</a>
            }
          </div>
        </div>
      } @else {
        <div class="grid gap-3">
          @for (p of items(); track p.id) {
            <a class="panel grid gap-1 no-underline" [routerLink]="['/hire/projects', p.id]">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-display text-lg">{{ p.productName }}</span>
                <span class="hire-badge" [attr.data-status]="p.status">{{ 'hire.status.' + p.status | t }}</span>
              </div>
              <p class="text-sm text-muted">
                {{ (p.role === 'seller' ? 'hire.list.client' : 'hire.list.provider') | t }}:
                {{ p.role === 'seller' ? p.buyerName : p.sellerName }}
                @if (p.quote.amount) {
                  · {{ p.quote.amount | currency: p.currency : 'symbol-narrow' : '1.0-2' }}
                }
                @if (p.milestones.length) {
                  · {{ 'hire.list.progress' | t: { done: approvedCount(p), total: p.milestones.length } }}
                }
                @if (hasOverdue(p)) {
                  · <span style="color:#c62828">{{ 'hire.ms.overdue' | t }}</span>
                }
              </p>
              <p class="text-xs text-muted">{{ 'hire.list.updated' | t }} {{ p.updatedAt | date: 'short' }}</p>
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .hire-badge {
        border-radius: 999px;
        padding: 0.15rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
        background: #eef2ff;
        color: #3730a3;
      }
      .hire-badge[data-status='active'] { background: #ecfdf5; color: #047857; }
      .hire-badge[data-status='completed'] { background: #f0fdf4; color: #15803d; }
      .hire-badge[data-status='terminated'],
      .hire-badge[data-status='declined'],
      .hire-badge[data-status='cancelled'] { background: #fef2f2; color: #b91c1c; }
    `,
  ],
})
export class HireProjectsComponent implements OnInit {
  private readonly hire = inject(HireService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs: { id: Tab; label: string }[] = [
    { id: '', label: 'hire.list.all' },
    { id: 'buyer', label: 'hire.list.asBuyer' },
    { id: 'seller', label: 'hire.list.asSeller' },
  ];
  readonly services = HIRE_REQUEST_CATEGORIES.map((id) => ({
    id,
    path: CATEGORY_META.find((c) => c.id === id)?.hubPath || `/${id}`,
  }));
  readonly tab = signal<Tab>('');
  readonly items = signal<HireProject[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const as = q.get('as');
      this.tab.set(as === 'buyer' || as === 'seller' ? as : '');
      this.load();
    });
  }

  setTab(id: Tab): void {
    void this.router.navigate([], { queryParams: { as: id || null }, replaceUrl: true });
  }

  approvedCount(p: HireProject): number {
    return p.milestones.filter((m) => m.status === 'approved').length;
  }

  hasOverdue(p: HireProject): boolean {
    return p.status === 'active' && p.milestones.some((m) => m.overdue && m.status !== 'approved');
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.hire.list(this.tab()).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error');
        this.loading.set(false);
      },
    });
  }
}
