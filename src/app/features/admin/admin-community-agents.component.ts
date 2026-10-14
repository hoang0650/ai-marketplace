import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { CommunityAgent, CommunityAgentsService, VoteBoard } from '../agents/community-agents.service';
import { COMMUNITY_VOTE_MESSAGES } from '../agents/community-vote.messages';

/** Admin: review community vote winners (security check → approve & list / reject), close the cycle now. */
@Component({
  selector: 'app-admin-community-agents',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TPipe],
  template: `
    <section class="acv page route-enter">
      <p class="acv__crumb"><a routerLink="/admin">{{ 'nav.admin' | t }}</a> / <a routerLink="/hire-agent/marketplace">Agent Marketplace</a></p>
      <div class="acv__head">
        <h1>{{ 'cvote.admin.title' | t }}</h1>
        <button type="button" class="acv__btn" [disabled]="busy()" (click)="closeCycle()">⏱ {{ 'cvote.admin.close' | t }}</button>
      </div>
      <p class="acv__lede">{{ 'cvote.admin.lede' | t }}</p>
      @if (data()?.cycle; as c) {
        <p class="acv__cycle">{{ 'cvote.cycleEnds' | t: { key: c.key, date: (c.endsAt | date: 'dd/MM/yyyy HH:mm') || '' } }}</p>
      }
      @if (msg()) { <p class="acv__msg">{{ msg() }}</p> }
      @if (error()) { <p class="acv__msg acv__msg--err">{{ error() }}</p> }

      <h2>⏳ {{ 'cvote.pending' | t }}</h2>
      <div class="acv__list">
        @for (a of data()?.pending || []; track a._id) {
          <article class="acv__card">
            <div class="acv__top">
              <img [src]="a.avatarUrl" [alt]="a.fullName" width="48" height="48" />
              <div class="acv__info">
                <a class="acv__name" [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }} ↗</a>
                <p class="acv__desc">{{ a.description }}</p>
                <p class="acv__meta">★ {{ a.stars }} · {{ 'cvote.votes' | t: { n: a.voteCount } }} · {{ a.language || '—' }} · {{ a.license || 'no license' }} · {{ a.candidateCycle }} · {{ 'cvote.by' | t: { name: a.submitterName || a.submitter } }}</p>
              </div>
            </div>
            <textarea class="acv__note" rows="2" [(ngModel)]="notes[a._id]" [name]="'note-' + a._id" [placeholder]="'cvote.admin.note' | t"></textarea>
            <div class="acv__actions">
              <button type="button" class="acv__btn acv__btn--ok" [disabled]="busy()" (click)="decide(a, 'approve')">✓ {{ 'cvote.admin.approve' | t }}</button>
              <button type="button" class="acv__btn acv__btn--bad" [disabled]="busy()" (click)="decide(a, 'reject')">✕ {{ 'cvote.admin.reject' | t }}</button>
            </div>
          </article>
        } @empty {
          <p class="acv__empty">{{ 'cvote.admin.none' | t }}</p>
        }
      </div>

      <h2>🏆 {{ 'cvote.admin.top' | t }}</h2>
      <ol class="acv__top10">
        @for (a of data()?.leaderboard || []; track a._id) {
          <li><a [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }}</a> — {{ 'cvote.votes' | t: { n: a.voteCount } }}</li>
        } @empty {
          <li class="acv__empty">{{ 'cvote.empty' | t }}</li>
        }
      </ol>

      @if (data()?.listed?.length) {
        <h2>✅ {{ 'cvote.listed' | t }}</h2>
        <ul class="acv__top10">
          @for (a of data()!.listed; track a._id) {
            <li><a [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }}</a> — {{ a.listedAt | date: 'dd/MM/yyyy' }}</li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .acv { max-width: 60rem; margin: 0 auto; padding: 1.75rem clamp(1rem, 4vw, 2.5rem) 2.5rem; }
    .acv a { color: var(--color-ink); }
    .acv__crumb { margin: 0 0 0.4rem; font-size: 0.85rem; }
    .acv__crumb a { color: var(--color-muted); }
    .acv__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .acv h1 { margin: 0; font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 800; }
    .acv h2 { margin: 1.5rem 0 0.6rem; font-size: 1.05rem; font-weight: 700; }
    .acv__lede { margin: 0.5rem 0; color: var(--color-muted); line-height: 1.55; }
    .acv__cycle { margin: 0; font-size: 0.85rem; font-weight: 600; }
    .acv__msg { margin: 0.75rem 0 0; font-weight: 600; color: #1f8f55; }
    .acv__msg--err { color: #c0392b; }
    .acv__list { display: grid; gap: 0.75rem; }
    .acv__card { border: 1px solid var(--color-line); border-radius: 1rem; padding: 1rem; background: color-mix(in srgb, var(--color-paper) 88%, var(--color-mist)); }
    .acv__top { display: flex; gap: 0.8rem; align-items: flex-start; }
    .acv__top img { border-radius: 0.7rem; }
    .acv__info { min-width: 0; }
    .acv__name { font-weight: 700; color: var(--color-ink); }
    .acv__desc { margin: 0.2rem 0 0; color: var(--color-muted); font-size: 0.88rem; }
    .acv__meta { margin: 0.3rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
    .acv__note { width: 100%; margin-top: 0.75rem; border: 1px solid var(--color-line); border-radius: 0.65rem; padding: 0.5rem 0.7rem; background: var(--color-paper); color: var(--color-ink); font: inherit; resize: vertical; box-sizing: border-box; }
    .acv__actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
    .acv__btn { border: 1px solid var(--color-line); border-radius: 0.65rem; padding: 0.45rem 0.9rem; background: var(--color-paper); color: var(--color-ink); font-weight: 600; cursor: pointer; }
    .acv__btn:disabled { opacity: 0.55; cursor: default; }
    .acv__btn--ok { border-color: color-mix(in srgb, #2ecc71 55%, var(--color-line)); color: #1f8f55; }
    .acv__btn--bad { border-color: color-mix(in srgb, #e74c3c 55%, var(--color-line)); color: #c0392b; }
    .acv__top10 { margin: 0; padding-left: 1.3rem; line-height: 1.8; }
    .acv__empty { color: var(--color-muted); }
  `,
})
export class AdminCommunityAgentsComponent implements OnInit {
  private readonly api = inject(CommunityAgentsService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  readonly data = signal<VoteBoard | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly error = signal('');
  notes: Record<string, string> = {};

  constructor() {
    this.i18n.extend(COMMUNITY_VOTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('cvote.admin.title') });
    this.reload();
  }

  reload(): void {
    this.api.adminPending().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('cvote.err')),
    });
  }

  decide(a: CommunityAgent, decision: 'approve' | 'reject'): void {
    const note = (this.notes[a._id] || '').trim();
    if (note.length < 5) {
      this.error.set(this.i18n.t('cvote.admin.noteRequired'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const req = decision === 'approve' ? this.api.approve(a._id, note) : this.api.reject(a._id, note);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set(this.i18n.t(decision === 'approve' ? 'cvote.admin.approved' : 'cvote.admin.rejected', { name: a.fullName }));
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || this.i18n.t('cvote.err'));
      },
    });
  }

  closeCycle(): void {
    if (this.busy() || !confirm(this.i18n.t('cvote.admin.confirmClose'))) return;
    this.busy.set(true);
    this.error.set('');
    this.api.closeCycle().subscribe({
      next: (r) => {
        this.busy.set(false);
        this.msg.set(
          r.alreadyClosed
            ? this.i18n.t('cvote.admin.alreadyClosed', { key: r.cycle.key })
            : this.i18n.t('cvote.admin.closed', { key: r.cycle.key, name: r.winner?.fullName || '—' }),
        );
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || this.i18n.t('cvote.err'));
      },
    });
  }
}
