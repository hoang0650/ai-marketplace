import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TalentProfilePayload, WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { TalentProfile } from '../../models/work.models';
import { WorkDisclaimerComponent } from './work-disclaimer.component';

/** Talent "looking for work" profile — publishing a new one costs the Work listing fee; edits are free. */
@Component({
  selector: 'app-work-talent-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, WorkDisclaimerComponent],
  template: `
    <section>
      <p class="crumb">{{ 'work.tp.crumb' | t }}</p>
      <h1>{{ 'work.tp.title' | t }}</h1>
      <app-work-disclaimer />

      @if (!canPost()) {
        <div class="card">
          <p>{{ 'work.tp.onlyTalent' | t }}</p>
          <a routerLink="/work/talents" class="link">{{ 'work.nav.talents' | t }} →</a>
        </div>
      } @else {
        @if (profiles().length > 1) {
          <div class="tabs">
            @for (p of profiles(); track p.id) {
              <button type="button" [class.on]="editing()?.id === p.id" (click)="edit(p)">{{ p.title }}</button>
            }
            <button type="button" [class.on]="!editing()" (click)="edit(null)">+ {{ 'work.tp.new' | t }}</button>
          </div>
        }
        @if (msg()) { <p class="msg ok">{{ msg() }}</p> }
        @if (err()) {
          <p class="msg err">
            {{ err() }}
            @if (needTopUp()) { · <a routerLink="/wallet">{{ 'cart.topUp' | t }}</a> }
          </p>
        }
        <form class="card form" (ngSubmit)="save()">
          <label>{{ 'work.tp.name' | t }}<input [(ngModel)]="form.name" name="name" required /></label>
          <label>{{ 'work.tp.headline' | t }}<input [(ngModel)]="form.title" name="title" required [placeholder]="'work.tp.headlinePh' | t" /></label>
          <label>{{ 'work.tp.bio' | t }}<textarea [(ngModel)]="form.bio" name="bio" rows="5"></textarea></label>
          <label>{{ 'work.form.skills' | t }}<input [(ngModel)]="skillsText" name="skills" [placeholder]="'work.form.skillsPh' | t" /></label>
          <div class="row">
            <label>{{ 'work.tp.years' | t }}<input type="number" min="0" [(ngModel)]="form.experienceYears" name="years" /></label>
            <label>{{ 'work.tp.hours' | t }}<input type="number" min="1" max="80" [(ngModel)]="form.hoursPerWeek" name="hours" /></label>
          </div>
          <div class="row">
            <label>{{ 'work.tp.rate' | t }}<input type="number" min="0" [(ngModel)]="form.rateAmount" name="rate" /></label>
            <label>{{ 'work.form.currency' | t }}
              <select [(ngModel)]="form.rateCurrency" name="rateCurrency">
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
          <label class="check"><input type="checkbox" [(ngModel)]="form.rateNegotiable" name="neg" /> {{ 'work.form.negotiable' | t }}</label>
          <label class="check"><input type="checkbox" [(ngModel)]="form.available" name="avail" /> {{ 'work.availableNow' | t }}</label>
          <div class="actions">
            <button class="btn" type="submit" [disabled]="busy()">
              {{ editing() ? ('work.tp.save' | t) : ('work.tp.publish' | t: { fee: feeLabel() }) }}
            </button>
            @if (editing(); as p) {
              <a [routerLink]="['/work/talents', p.slug]" class="link">{{ 'work.viewProfile' | t }} →</a>
            }
          </div>
        </form>
        <p class="hint">
          {{ 'work.tp.hireHint' | t }}
          <a routerLink="/sell/products" class="link">{{ 'sell.nav.products' | t }}</a>
        </p>
      }
    </section>
  `,
  styles: `
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .3rem 0 1rem; font-size: 1.45rem; font-weight: 800; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.25rem; max-width: 720px; }
    .form { display: grid; gap: .75rem; }
    .form label { display: grid; gap: .3rem; font-size: .8rem; font-weight: 700; color: #555; }
    .form input, .form textarea, .form select { border: 1px solid #ddd; border-radius: 10px; padding: .55rem .7rem; font: inherit; font-weight: 400; color: #222; }
    .form .check { display: flex; align-items: center; gap: .5rem; font-weight: 600; }
    .row { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
    .btn { display: inline-flex; min-height: 2.4rem; padding: .5rem 1rem; border: 0; border-radius: 10px; background: #e53935; color: #fff; font-weight: 800; cursor: pointer; }
    .btn:disabled { opacity: .6; }
    .link { color: #e53935; font-weight: 700; text-decoration: none; }
    .tabs { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; }
    .tabs button { border: 1px solid #ddd; border-radius: 999px; padding: .3rem .8rem; background: #fff; cursor: pointer; }
    .tabs button.on { border-color: #e53935; color: #e53935; font-weight: 700; }
    .msg { max-width: 720px; padding: .6rem .8rem; border-radius: 10px; font-size: .85rem; }
    .msg.ok { background: #ecfdf5; color: #047857; }
    .msg.err { background: #fef2f2; color: #b91c1c; }
    .hint { max-width: 720px; margin-top: 1rem; color: #666; font-size: .85rem; }
  `,
})
export class WorkTalentProfileComponent implements OnInit {
  private readonly work = inject(WorkService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly canPost = computed(() => this.auth.isTalent());
  readonly profiles = signal<TalentProfile[]>([]);
  readonly editing = signal<TalentProfile | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly err = signal('');
  readonly needTopUp = signal(false);
  readonly feeLabel = signal('20.000đ');
  skillsText = '';
  form: Required<TalentProfilePayload> = this.blank();

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('work.tp.title') });
    this.work.listingFee().subscribe((f) => this.feeLabel.set(`${f.vnd.toLocaleString('vi-VN')}đ`));
    if (!this.canPost()) return;
    this.work.myTalents().subscribe((rows) => {
      this.profiles.set(rows);
      this.edit(rows[0] || null);
    });
  }

  private blank(): Required<TalentProfilePayload> {
    return {
      name: this.auth.user()?.name || '',
      title: '',
      bio: '',
      fieldIds: [],
      skills: [],
      experienceYears: 0,
      hoursPerWeek: 40,
      rateAmount: 0,
      rateCurrency: 'VND',
      rateNegotiable: true,
      available: true,
    };
  }

  edit(p: TalentProfile | null): void {
    this.editing.set(p);
    this.msg.set('');
    this.err.set('');
    this.form = p
      ? {
          name: p.name,
          title: p.title,
          bio: p.bio,
          fieldIds: p.fieldIds,
          skills: p.skills,
          experienceYears: p.experienceYears,
          hoursPerWeek: p.hoursPerWeek,
          rateAmount: p.rateAmount,
          rateCurrency: p.rateCurrency,
          rateNegotiable: p.rateNegotiable,
          available: p.available,
        }
      : this.blank();
    this.skillsText = this.form.skills.join(', ');
  }

  save(): void {
    if (this.busy() || !this.form.name.trim() || !this.form.title.trim()) return;
    this.busy.set(true);
    this.msg.set('');
    this.err.set('');
    this.needTopUp.set(false);
    const payload: TalentProfilePayload = {
      ...this.form,
      skills: this.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    };
    const current = this.editing();
    const call = current ? this.work.updateTalent(current.slug, payload) : this.work.createTalent(payload);
    call.subscribe({
      next: (p) => {
        this.busy.set(false);
        this.profiles.update((rows) => (current ? rows.map((r) => (r.id === p.id ? p : r)) : [p, ...rows]));
        this.edit(p);
        this.msg.set(this.i18n.t(current ? 'work.tp.saved' : 'work.tp.published'));
      },
      error: (e) => {
        this.busy.set(false);
        this.needTopUp.set(e?.status === 402);
        this.err.set(e?.error?.message || this.i18n.t('work.postFail'));
      },
    });
  }
}
