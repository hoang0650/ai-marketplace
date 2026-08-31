import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';
import { WorkService } from '../../../services/work.service';
import { AuthService } from '../../../services/auth.service';
import { I18nService } from '../../../i18n/i18n.service';
import { TPipe } from '../../../i18n/t.pipe';
import { JobPosting, JobPostPayload, TalentProfile, WorkField } from '../../../models/work.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-work-overview',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="work-public page route-enter">
      <div class="work-hero">
        <div>
          <h1>{{ 'work.title' | t }} <span class="badge-beta">BETA</span></h1>
          <p>{{ 'work.lede' | t: { brand } }}</p>
          <div class="work-hero__actions">
            <a routerLink="/work/jobs" class="btn btn-fill">{{ 'work.findJobs' | t }}</a>
            <a routerLink="/work/talents" class="btn btn-outline">{{ 'work.findTalents' | t }}</a>
            <a routerLink="/work/post" class="btn btn-outline">{{ 'work.postJob' | t }}</a>
          </div>
        </div>
        <div class="work-cards">
          <a routerLink="/work/jobs" class="work-card-link">
            <strong>{{ 'work.nav.jobs' | t }}</strong>
            <span>{{ 'work.nav.jobsDesc' | t }}</span>
          </a>
          <a routerLink="/work/talents" class="work-card-link">
            <strong>{{ 'work.nav.talents' | t }}</strong>
            <span>{{ 'work.nav.talentsDesc' | t }}</span>
          </a>
          <a routerLink="/work/post" class="work-card-link">
            <strong>{{ 'work.nav.post' | t }}</strong>
            <span>{{ 'work.nav.postDesc' | t }}</span>
          </a>
          <a routerLink="/work/manage" class="work-card-link">
            <strong>{{ 'work.nav.dashboard' | t }}</strong>
            <span>{{ 'work.nav.dashboardDesc' | t }}</span>
          </a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './work-public.scss',
})
export class WorkOverviewComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly brand = environment.brandName;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.title') });
  }
}

@Component({
  selector: 'app-work-jobs',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  template: `
    <section class="work-public page route-enter">
      <div class="work-layout">
        <aside class="work-filter panel">
          <div class="work-filter__head">
            <h2>{{ 'work.filters' | t }}</h2>
            <button type="button" class="work-filter__clear" (click)="clearFilters()">{{ 'work.clearAll' | t }}</button>
          </div>
          @for (g of fields(); track g.id) {
            <div class="work-field-group">
              <label>
                <input type="checkbox" [checked]="expanded()[g.id]" (change)="toggleGroup(g.id)" />
                {{ g.label }}
              </label>
              @if (expanded()[g.id]) {
                <ul>
                  @for (c of g.children || []; track c.id) {
                    <li>
                      <label>
                        <input type="radio" name="field" [value]="c.id" [checked]="selectedField() === c.id" (change)="selectField(c.id)" />
                        {{ c.label }}
                      </label>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </aside>
        <div class="work-main">
          <header class="work-main__head">
            <h1>{{ 'work.jobsTitle' | t: { n: jobs().length } }}</h1>
            <label class="work-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" [(ngModel)]="query" (ngModelChange)="reload()" [placeholder]="'work.search' | t" />
            </label>
          </header>
          @for (j of jobs(); track j.id) {
            <article class="job-card">
              <div></div>
              <div>
                <h2 class="talent-card__name">{{ j.title }}</h2>
                <p class="talent-card__title">{{ j.company }} · {{ j.location }}</p>
                <p class="talent-card__bio">{{ j.description }}</p>
                <div class="talent-card__skills">
                  @for (s of j.skills.slice(0, 6); track s) {
                    <span>{{ s }}</span>
                  }
                </div>
              </div>
              <div class="job-card__side">
                <p class="job-card__salary">{{ salaryLabel(j) }}</p>
                <p class="job-card__meta2">{{ j.employmentType }} · {{ j.remote ? ('work.remote' | t) : ('work.onsite' | t) }}</p>
                <a [routerLink]="['/work/jobs', j.slug]" class="btn-view">{{ 'work.viewJob' | t }}</a>
              </div>
            </article>
          } @empty {
            <div class="work-empty panel">{{ 'work.noJobs' | t }}</div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './work-public.scss',
})
export class WorkJobsComponent implements OnInit {
  private readonly api = inject(WorkService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly fields = signal<WorkField[]>([]);
  readonly jobs = signal<JobPosting[]>([]);
  readonly selectedField = signal('');
  readonly expanded = signal<Record<string, boolean>>({ ai: true });
  query = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.nav.jobs') });
    this.api.fields().subscribe((f) => this.fields.set(f));
    this.reload();
  }

  reload(): void {
    this.api.jobs({ field: this.selectedField() || undefined, q: this.query.trim() || undefined }).subscribe((rows) => this.jobs.set(rows));
  }

  selectField(id: string): void {
    this.selectedField.set(id);
    this.reload();
  }

  toggleGroup(id: string): void {
    this.expanded.update((m) => ({ ...m, [id]: !m[id] }));
  }

  clearFilters(): void {
    this.selectedField.set('');
    this.query = '';
    this.reload();
  }

  salaryLabel(j: JobPosting): string {
    if (j.salaryNegotiable) return this.i18n.t('work.negotiable');
    if (j.salaryMin && j.salaryMax) {
      return `${j.salaryMin.toLocaleString()}–${j.salaryMax.toLocaleString()} ${j.salaryCurrency}/${j.salaryPeriod}`;
    }
    if (j.salaryMin) return `${j.salaryMin.toLocaleString()} ${j.salaryCurrency}/${j.salaryPeriod}`;
    return this.i18n.t('work.negotiable');
  }
}

@Component({
  selector: 'app-work-talents',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  template: `
    <section class="work-public page route-enter">
      <div class="work-layout">
        <aside class="work-filter panel">
          <div class="work-filter__head">
            <h2>{{ 'work.filters' | t }}</h2>
            <button type="button" class="work-filter__clear" (click)="clearFilters()">{{ 'work.clearAll' | t }}</button>
          </div>
          @for (g of fields(); track g.id) {
            <div class="work-field-group">
              <label>
                <input type="checkbox" [checked]="expanded()[g.id]" (change)="toggleGroup(g.id)" />
                {{ g.label }}
              </label>
              @if (expanded()[g.id]) {
                <ul>
                  @for (c of g.children || []; track c.id) {
                    <li>
                      <label>
                        <input type="radio" name="field" [value]="c.id" [checked]="selectedField() === c.id" (change)="selectField(c.id)" />
                        {{ c.label }}
                      </label>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </aside>
        <div class="work-main">
          <header class="work-main__head">
            <h1>{{ 'work.talentsTitle' | t: { n: talents().length } }}</h1>
            <label class="work-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" [(ngModel)]="query" (ngModelChange)="reload()" [placeholder]="'work.search' | t" />
            </label>
          </header>
          @for (t of talents(); track t.id) {
            <article class="talent-card">
              <div class="talent-card__avatar">
                @if (t.avatarUrl) {
                  <img [src]="t.avatarUrl" [alt]="t.name" />
                } @else {
                  {{ initials(t.name) }}
                }
                @if (t.available) {
                  <span class="talent-card__dot" [title]="'work.availableNow' | t"></span>
                }
              </div>
              <div>
                <h2 class="talent-card__name">{{ t.name }}</h2>
                <p class="talent-card__title">{{ t.title }}</p>
                <div class="talent-card__meta">
                  <span>{{ 'work.experience' | t: { n: t.experienceYears } }}</span>
                  <span>{{ 'work.hoursWeek' | t: { n: t.hoursPerWeek } }}</span>
                </div>
                <p class="talent-card__bio">{{ t.bio }}</p>
                <div class="talent-card__skills">
                  @for (s of t.skills.slice(0, 8); track s) {
                    <span>{{ s }}</span>
                  }
                </div>
              </div>
              <div class="talent-card__side">
                <p class="talent-card__rate">{{ rateLabel(t) }}</p>
                <p class="talent-card__trust">{{ 'work.trust' | t: { contracts: t.contractsCount, reviews: t.reviewsCount } }}</p>
                <a [routerLink]="['/work/talents', t.slug]" class="btn-view">{{ 'work.viewProfile' | t }}</a>
              </div>
            </article>
          } @empty {
            <div class="work-empty panel">{{ 'work.noTalents' | t }}</div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './work-public.scss',
})
export class WorkTalentsComponent implements OnInit {
  private readonly api = inject(WorkService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly fields = signal<WorkField[]>([]);
  readonly talents = signal<TalentProfile[]>([]);
  readonly selectedField = signal('');
  readonly expanded = signal<Record<string, boolean>>({ ai: true });
  query = '';

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.nav.talents') });
    this.api.fields().subscribe((f) => this.fields.set(f));
    this.reload();
  }

  reload(): void {
    this.api.talents({ field: this.selectedField() || undefined, q: this.query.trim() || undefined }).subscribe((rows) => this.talents.set(rows));
  }

  selectField(id: string): void {
    this.selectedField.set(id);
    this.reload();
  }

  toggleGroup(id: string): void {
    this.expanded.update((m) => ({ ...m, [id]: !m[id] }));
  }

  clearFilters(): void {
    this.selectedField.set('');
    this.query = '';
    this.reload();
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  rateLabel(t: TalentProfile): string {
    if (t.rateNegotiable && !t.rateAmount) return this.i18n.t('work.negotiable');
    if (t.rateAmount) return `${t.rateAmount.toLocaleString()} ${t.rateCurrency}/${this.i18n.t('work.hour')}`;
    return this.i18n.t('work.negotiable');
  }
}

@Component({
  selector: 'app-work-post-job',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  template: `
    <section class="work-public page route-enter">
      <h1>{{ 'work.postJob' | t }}</h1>
      <p class="text-muted">{{ 'work.postJobDesc' | t }}</p>
      @if (msg()) {
        <p class="msg ok">{{ msg() }}</p>
      }
      @if (err()) {
        <p class="msg err">{{ err() }}</p>
      }
      <form class="work-form panel" (ngSubmit)="submit()">
        <label>{{ 'work.form.title' | t }}<input [(ngModel)]="form.title" name="title" required /></label>
        <label>{{ 'work.form.company' | t }}<input [(ngModel)]="form.company" name="company" required /></label>
        <label>{{ 'work.form.location' | t }}<input [(ngModel)]="form.location" name="location" /></label>
        <label>{{ 'work.form.description' | t }}<textarea [(ngModel)]="form.description" name="description" required></textarea></label>
        <label>{{ 'work.form.skills' | t }}<input [(ngModel)]="skillsText" name="skills" [placeholder]="'work.form.skillsPh' | t" /></label>
        <div class="work-form__row">
          <label>{{ 'work.form.type' | t }}
            <select [(ngModel)]="form.employmentType" name="employmentType">
              <option value="full-time">{{ 'work.type.full' | t }}</option>
              <option value="part-time">{{ 'work.type.part' | t }}</option>
              <option value="contract">{{ 'work.type.contract' | t }}</option>
              <option value="freelance">{{ 'work.type.freelance' | t }}</option>
            </select>
          </label>
          <label>{{ 'work.form.currency' | t }}
            <select [(ngModel)]="form.salaryCurrency" name="salaryCurrency">
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
          </label>
        </div>
        <div class="work-form__row">
          <label>{{ 'work.form.salaryMin' | t }}<input type="number" [(ngModel)]="form.salaryMin" name="salaryMin" /></label>
          <label>{{ 'work.form.salaryMax' | t }}<input type="number" [(ngModel)]="form.salaryMax" name="salaryMax" /></label>
        </div>
        <label class="flex items-center gap-2">
          <input type="checkbox" [(ngModel)]="form.salaryNegotiable" name="salaryNegotiable" />
          {{ 'work.form.negotiable' | t }}
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" [(ngModel)]="form.remote" name="remote" />
          {{ 'work.form.remote' | t }}
        </label>
        <button class="btn btn-fill" type="submit" [disabled]="busy()">{{ 'work.form.submit' | t }}</button>
      </form>
    </section>
  `,
  styleUrl: './work-public.scss',
})
export class WorkPostJobComponent implements OnInit {
  private readonly api = inject(WorkService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly busy = signal(false);
  readonly msg = signal('');
  readonly err = signal('');
  skillsText = '';
  form: JobPostPayload & { remote: boolean } = {
    title: '',
    company: '',
    description: '',
    location: 'Remote',
    remote: true,
    employmentType: 'freelance',
    salaryMin: 0,
    salaryMax: 0,
    salaryCurrency: 'VND',
    salaryPeriod: 'hour',
    salaryNegotiable: false,
  };

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.postJob') });
    if (this.auth.user()?.name && !this.form.company) {
      this.form.company = this.auth.user()!.name;
    }
  }

  submit(): void {
    this.msg.set('');
    this.err.set('');
    this.busy.set(true);
    const payload: JobPostPayload = {
      ...this.form,
      skills: this.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    };
    this.api.postJob(payload).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.msg.set(this.i18n.t('work.postSuccess'));
        void this.router.navigate(['/work/jobs', job.slug]);
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e?.error?.message || this.i18n.t('work.postFail'));
      },
    });
  }
}

@Component({
  selector: 'app-work-job-detail',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './work-job-detail.component.html',
  styleUrls: ['./work-public.scss', './work-detail.scss'],
})
export class WorkJobDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly job = signal<JobPosting | null>(null);
  readonly activeTab = signal<'description' | 'deliverables' | 'responsibilities' | 'comments' | 'screening'>('description');
  readonly saved = signal(false);
  readonly applyMsg = signal('');

  readonly tabs = [
    { id: 'description' as const, labelKey: 'work.detail.tabDescription' },
    { id: 'deliverables' as const, labelKey: 'work.detail.tabDeliverables' },
    { id: 'responsibilities' as const, labelKey: 'work.detail.tabResponsibilities' },
    { id: 'comments' as const, labelKey: 'work.detail.tabComments' },
    { id: 'screening' as const, labelKey: 'work.detail.tabScreening' },
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug') || '';
      this.api.job(slug).subscribe((j) => {
        this.job.set(j);
        if (j) {
          this.seo.set({ title: j.title });
          this.saved.set(this.readSaved(slug));
        }
      });
    });
  }

  views(): number {
    const j = this.job();
    if (!j) return 0;
    return Math.max(0, (j.applicationsCount || 0) * 3 + (j.id?.length || 0) % 17);
  }

  salaryLabel(j: JobPosting): string {
    if (j.salaryNegotiable) return this.i18n.t('work.negotiable');
    if (j.salaryMin && j.salaryMax) {
      return `${j.salaryMin.toLocaleString()} – ${j.salaryMax.toLocaleString()} ${j.salaryCurrency}`;
    }
    if (j.salaryMin) return `${j.salaryMin.toLocaleString()} ${j.salaryCurrency}/${j.salaryPeriod}`;
    return this.i18n.t('work.negotiable');
  }

  employmentLabel(type: JobPosting['employmentType']): string {
    const map: Record<JobPosting['employmentType'], string> = {
      'full-time': 'work.type.full',
      'part-time': 'work.type.part',
      contract: 'work.type.contract',
      freelance: 'work.type.freelance',
    };
    return this.i18n.t(map[type] || 'work.type.freelance');
  }

  toggleSave(): void {
    const j = this.job();
    if (!j || typeof localStorage === 'undefined') return;
    const key = 'aimarkets.savedJobs';
    const list = new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]);
    if (list.has(j.slug)) list.delete(j.slug);
    else list.add(j.slug);
    localStorage.setItem(key, JSON.stringify([...list]));
    this.saved.set(list.has(j.slug));
  }

  apply(): void {
    this.applyMsg.set(this.i18n.t('work.detail.applySent'));
  }

  private readSaved(slug: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    const list = JSON.parse(localStorage.getItem('aimarkets.savedJobs') || '[]') as string[];
    return list.includes(slug);
  }
}

@Component({
  selector: 'app-work-talent-detail',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './work-talent-detail.component.html',
  styleUrls: ['./work-public.scss', './work-detail.scss'],
})
export class WorkTalentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly talent = signal<TalentProfile | null>(null);
  readonly activeTab = signal<'overview' | 'experience' | 'education' | 'products'>('overview');

  readonly tabs = [
    { id: 'overview' as const, labelKey: 'work.detail.tabOverview' },
    { id: 'experience' as const, labelKey: 'work.detail.tabExperience' },
    { id: 'education' as const, labelKey: 'work.detail.tabEducation' },
    { id: 'products' as const, labelKey: 'work.detail.tabProducts' },
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug') || '';
      this.api.talent(slug).subscribe((t) => {
        this.talent.set(t);
        if (t) this.seo.set({ title: t.name });
      });
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  rateLabel(t: TalentProfile): string {
    if (t.rateNegotiable && !t.rateAmount) return this.i18n.t('work.negotiable');
    if (t.rateAmount) return `${t.rateAmount.toLocaleString()} ${t.rateCurrency}/${this.i18n.t('work.hour')}`;
    return this.i18n.t('work.negotiable');
  }
}
