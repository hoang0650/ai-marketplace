import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { JobBid } from '../../models/work.models';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-work-contracts',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe, DecimalPipe],
  template: `
    <section class="work-contracts page route-enter">
      <a routerLink="/work/manage" class="work-detail__back">← {{ 'work.nav.dashboard' | t }}</a>
      <h1>{{ 'work.contracts' | t }}</h1>
      <p class="lede">{{ 'work.contractsLede' | t }}</p>

      <div class="filters">
        <button type="button" [class.active]="roleFilter() === 'all'" (click)="setAs('all')">{{ 'work.filter.all' | t }}</button>
        <button type="button" [class.active]="roleFilter() === 'employer'" (click)="setAs('employer')">{{ 'work.filter.employer' | t }}</button>
        <button type="button" [class.active]="roleFilter() === 'freelancer'" (click)="setAs('freelancer')">{{ 'work.filter.freelancer' | t }}</button>
      </div>

      @if (err()) {
        <p class="msg err">{{ err() }}</p>
      }

      @for (c of rows(); track c.id) {
        <article class="card">
          <div class="card__main">
            <a [routerLink]="['/work/jobs', c.jobSlug]" class="title">{{ c.jobTitle || c.jobSlug }}</a>
            <p>{{ c.applicantName }} · {{ c.proposedAmount | number }} {{ c.proposedCurrency }}/{{ c.proposedPeriod }}</p>
            <p class="status">{{ ('work.ws.' + (c.workStatus || 'none')) | t }}</p>
            @if (c.deliveryNote) {
              <p class="note">{{ 'work.delivery' | t }}: {{ c.deliveryNote }}</p>
            }
            @if (c.revisionNote) {
              <p class="note warn">{{ 'work.revision' | t }}: {{ c.revisionNote }}</p>
            }
          </div>
          <div class="card__actions">
            @if (isFreelancer(c) && (c.workStatus === 'hired' || c.workStatus === 'in_progress' || c.workStatus === 'revision_requested')) {
              @if (c.workStatus === 'hired') {
                <button type="button" class="btn" (click)="start(c)">{{ 'work.action.start' | t }}</button>
              }
              <textarea [(ngModel)]="notes[c.id]" rows="2" [placeholder]="'work.deliveryPh' | t"></textarea>
              <button type="button" class="btn" (click)="deliver(c)">{{ 'work.action.deliver' | t }}</button>
            }
            @if (isEmployer(c) && c.workStatus === 'delivered') {
              <button type="button" class="btn" (click)="complete(c)">{{ 'work.action.complete' | t }}</button>
              <textarea [(ngModel)]="revs[c.id]" rows="2" [placeholder]="'work.revisionPh' | t"></textarea>
              <button type="button" class="btn outline" (click)="revision(c)">{{ 'work.action.revision' | t }}</button>
            }
            <a
              class="btn outline"
              [routerLink]="['/complaints/new']"
              [queryParams]="{
                jobApplicationId: c.id,
                kind: isEmployer(c) ? 'employer_freelancer' : 'freelancer_employer',
              }"
            >
              {{ 'work.action.complaint' | t }}
            </a>
          </div>
        </article>
      } @empty {
        <div class="empty">{{ 'work.noContracts' | t }}</div>
      }

      <p class="hint">
        <a routerLink="/work/manage/disputes">{{ 'work.viewDisputes' | t }} →</a>
      </p>
    </section>
  `,
  styles: `
    .lede { color: var(--color-muted); max-width: 52rem; }
    .filters { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
    .filters button { border: 1px solid var(--color-line); background: #fff; border-radius: 999px; padding: .35rem .9rem; font-weight: 700; cursor: pointer; }
    .filters button.active { background: #111; color: #fff; border-color: #111; }
    .card { display: grid; gap: 1rem; grid-template-columns: 1fr; border: 1px solid var(--color-line); border-radius: 14px; padding: 1rem; margin-bottom: .85rem; background: var(--color-surface); }
    @media (min-width: 800px) { .card { grid-template-columns: 1.4fr 1fr; } }
    .title { font-weight: 800; color: inherit; text-decoration: none; }
    .status { font-weight: 800; color: #c9a961; }
    .note { color: var(--color-muted); font-size: .9rem; }
    .note.warn { color: #b42318; }
    .card__actions { display: flex; flex-direction: column; gap: .5rem; }
    .card__actions textarea { width: 100%; border: 1px solid var(--color-line); border-radius: 10px; padding: .55rem; }
    .btn { display: inline-flex; justify-content: center; min-height: 2.4rem; border: 0; border-radius: 10px; background: #111; color: #fff; font-weight: 800; text-decoration: none; align-items: center; padding: 0 .9rem; cursor: pointer; }
    .btn.outline { background: transparent; color: #111; border: 1px solid var(--color-line); }
    .empty { padding: 1.25rem; border: 1px dashed var(--color-line); border-radius: 12px; color: var(--color-muted); }
    .hint { margin-top: 1rem; }
    .msg.err { color: #b42318; }
  `,
})
export class WorkContractsComponent implements OnInit {
  private readonly api = inject(WorkService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly roleFilter = signal<'all' | 'employer' | 'freelancer'>('all');
  readonly rows = signal<JobBid[]>([]);
  readonly err = signal('');
  notes: Record<string, string> = {};
  revs: Record<string, string> = {};

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.contracts') });
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/work/manage/contracts' } });
      return;
    }
    this.reload();
  }

  setAs(v: 'all' | 'employer' | 'freelancer'): void {
    this.roleFilter.set(v);
    this.reload();
  }

  reload(): void {
    this.api.contracts(this.roleFilter()).subscribe((rows) => this.rows.set(rows));
  }

  isFreelancer(c: JobBid): boolean {
    return !!c.applicantId && String(c.applicantId) === String(this.auth.user()?.id || '');
  }

  isEmployer(c: JobBid): boolean {
    return !this.isFreelancer(c);
  }

  start(c: JobBid): void {
    this.api.startWork(c.id).subscribe({
      next: () => this.reload(),
      error: (e) => this.err.set(e?.error?.message || 'Error'),
    });
  }

  deliver(c: JobBid): void {
    const note = (this.notes[c.id] || '').trim();
    if (note.length < 4) {
      this.err.set(this.i18n.t('work.deliveryRequired'));
      return;
    }
    this.api.deliver(c.id, { note }).subscribe({
      next: () => this.reload(),
      error: (e) => this.err.set(e?.error?.message || 'Error'),
    });
  }

  complete(c: JobBid): void {
    this.api.complete(c.id).subscribe({
      next: () => this.reload(),
      error: (e) => this.err.set(e?.error?.message || 'Error'),
    });
  }

  revision(c: JobBid): void {
    const note = (this.revs[c.id] || '').trim();
    if (note.length < 4) {
      this.err.set(this.i18n.t('work.revisionRequired'));
      return;
    }
    this.api.revision(c.id, note).subscribe({
      next: () => this.reload(),
      error: (e) => this.err.set(e?.error?.message || 'Error'),
    });
  }
}
