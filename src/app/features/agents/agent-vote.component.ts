import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { CommunityAgent, CommunityAgentsService, VoteBoard } from './community-agents.service';

/** Agent Marketplace "Vote" tab: nominate a GitHub repo, vote, see pending and listed agents. */
@Component({
  selector: 'app-agent-vote',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TPipe],
  template: `
    <div class="cv">
      <p class="cv__lede">{{ 'cvote.lede' | t: { period: periodLabel() } }}</p>
      @if (board?.cycle; as c) {
        <p class="cv__cycle">🗳️ {{ 'cvote.cycleEnds' | t: { key: c.key, date: (c.endsAt | date: 'dd/MM/yyyy HH:mm') || '' } }}</p>
      }

      <section class="cv__submit">
        <h2>{{ 'cvote.submitTitle' | t }}</h2>
        @if (loggedIn()) {
          <form class="cv__form" (ngSubmit)="submit()">
            <input class="cv__input" name="repoUrl" [(ngModel)]="repoUrl" [placeholder]="'cvote.submitPh' | t" autocomplete="off" required />
            <button class="cv__btn cv__btn--primary" type="submit" [disabled]="busy() || !repoUrl.trim()">{{ 'cvote.submitBtn' | t }}</button>
          </form>
          <p class="cv__hint">{{ 'cvote.submitHint' | t }}</p>
        } @else {
          <a class="cv__btn cv__btn--primary" routerLink="/auth/login" [queryParams]="{ returnUrl: '/hire-agent/marketplace' }">{{ 'cvote.loginToSubmit' | t }}</a>
        }
        @if (msg()) {
          <p class="cv__msg" [class.cv__msg--err]="isErr()">{{ msg() }}</p>
        }
      </section>

      @if (board?.pending?.length) {
        <section class="cv__section">
          <h2>⏳ {{ 'cvote.pending' | t }}</h2>
          <p class="cv__hint">{{ 'cvote.pendingHint' | t }}</p>
          <div class="cv__list">
            @for (a of board!.pending; track a._id) {
              <article class="cv__row cv__row--pending">
                <img class="cv__avatar" [src]="a.avatarUrl" [alt]="a.fullName" width="40" height="40" loading="lazy" />
                <div class="cv__info">
                  <a class="cv__name" [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }}</a>
                  <p class="cv__desc">{{ a.description }}</p>
                  <p class="cv__meta">★ {{ a.stars }} · {{ 'cvote.votes' | t: { n: a.voteCount } }}</p>
                </div>
                <span class="cv__badge cv__badge--pending">{{ 'cvote.pending' | t }}</span>
              </article>
            }
          </div>
        </section>
      }

      <section class="cv__section">
        <h2>🏆 {{ 'cvote.leaderboard' | t }}</h2>
        <div class="cv__list">
          @for (a of board?.leaderboard || []; track a._id) {
            <article class="cv__row" [class.cv__row--top]="a.rank === 1">
              <span class="cv__rank">#{{ a.rank }}</span>
              <img class="cv__avatar" [src]="a.avatarUrl" [alt]="a.fullName" width="40" height="40" loading="lazy" />
              <div class="cv__info">
                <a class="cv__name" [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }}</a>
                <p class="cv__desc">{{ a.description }}</p>
                <p class="cv__meta">★ {{ a.stars }}@if (a.language) { · {{ a.language }} } · {{ 'cvote.by' | t: { name: a.submitterName || '—' } }}</p>
              </div>
              <div class="cv__vote">
                <strong class="cv__count">{{ a.voteCount }}</strong>
                @if (a.mine) {
                  <span class="cv__badge">{{ 'cvote.yours' | t }}</span>
                } @else if (loggedIn()) {
                  <button type="button" class="cv__btn" [class.cv__btn--on]="a.votedByMe" [disabled]="busyId() === a._id" (click)="toggle(a)">
                    {{ (a.votedByMe ? 'cvote.unvote' : 'cvote.vote') | t }}
                  </button>
                }
              </div>
            </article>
          } @empty {
            <p class="cv__empty">{{ 'cvote.empty' | t }}</p>
          }
        </div>
      </section>

      @if (board?.listed?.length) {
        <section class="cv__section">
          <h2>✅ {{ 'cvote.listed' | t }}</h2>
          <p class="cv__hint">{{ 'cvote.listedHint' | t }}</p>
          <div class="cv__list">
            @for (a of board!.listed; track a._id) {
              <article class="cv__row cv__row--listed">
                <img class="cv__avatar" [src]="a.avatarUrl" [alt]="a.fullName" width="40" height="40" loading="lazy" />
                <div class="cv__info">
                  <a class="cv__name" [href]="a.htmlUrl" target="_blank" rel="noopener noreferrer">{{ a.fullName }}</a>
                  <p class="cv__meta">★ {{ a.stars }} · {{ 'cvote.votes' | t: { n: a.voteCount } }}</p>
                </div>
                <span class="cv__badge cv__badge--ok">{{ 'cvote.listed' | t }}</span>
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .cv { display: grid; gap: 1.25rem; }
    .cv__lede { margin: 0; color: var(--color-muted); max-width: 52rem; line-height: 1.55; }
    .cv__cycle { margin: -0.5rem 0 0; font-size: 0.85rem; font-weight: 600; }
    .cv h2 { margin: 0 0 0.6rem; font-size: 1.05rem; font-weight: 700; }
    .cv__submit, .cv__section {
      border: 1px solid var(--color-line); border-radius: 1rem; padding: 1rem 1.15rem;
      background: color-mix(in srgb, var(--color-paper) 88%, var(--color-mist));
    }
    .cv__form { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .cv__input {
      flex: 1 1 18rem; min-width: 0; border: 1px solid var(--color-line); border-radius: 0.65rem;
      padding: 0.55rem 0.75rem; background: var(--color-paper); color: var(--color-ink); font: inherit;
    }
    .cv__hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--color-muted); }
    .cv__section .cv__hint { margin: -0.3rem 0 0.7rem; }
    .cv__msg { margin: 0.6rem 0 0; font-size: 0.85rem; color: #1f8f55; font-weight: 600; }
    .cv__msg--err { color: #c0392b; }
    .cv__btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
      border: 1px solid var(--color-line); border-radius: 0.65rem; padding: 0.45rem 0.9rem;
      background: var(--color-paper); color: var(--color-ink); font-weight: 600; font-size: 0.85rem;
      cursor: pointer; text-decoration: none; white-space: nowrap;
    }
    .cv__btn:disabled { opacity: 0.55; cursor: default; }
    .cv__btn--primary { background: var(--color-ink); color: var(--color-paper); border-color: var(--color-ink); }
    .cv__btn--on { background: color-mix(in srgb, #2ecc71 14%, var(--color-paper)); border-color: color-mix(in srgb, #2ecc71 55%, var(--color-line)); color: #1f8f55; }
    .cv__list { display: grid; gap: 0.6rem; }
    .cv__row {
      display: grid; grid-template-columns: auto 40px minmax(0, 1fr) auto; align-items: center; gap: 0.8rem;
      border: 1px solid var(--color-line); border-radius: 0.85rem; padding: 0.7rem 0.9rem; background: var(--color-paper);
    }
    .cv__row--pending, .cv__row--listed { grid-template-columns: 40px minmax(0, 1fr) auto; }
    .cv__row--top { border-color: color-mix(in srgb, #e8b84a 60%, var(--color-line)); background: color-mix(in srgb, #e8b84a 8%, var(--color-paper)); }
    .cv__rank { font-weight: 800; color: var(--color-muted); min-width: 2rem; }
    .cv__avatar { border-radius: 0.6rem; object-fit: cover; background: var(--color-mist); }
    .cv__info { min-width: 0; }
    .cv__name { font-weight: 700; color: var(--color-ink); text-decoration: none; word-break: break-word; }
    .cv__name:hover { text-decoration: underline; }
    .cv__desc { margin: 0.15rem 0 0; font-size: 0.85rem; color: var(--color-muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .cv__meta { margin: 0.2rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
    .cv__vote { display: flex; align-items: center; gap: 0.6rem; }
    .cv__count { font-size: 1.2rem; min-width: 2ch; text-align: right; }
    .cv__badge {
      border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.72rem; font-weight: 600;
      border: 1px solid var(--color-line); background: color-mix(in srgb, var(--color-mist) 80%, transparent); white-space: nowrap;
    }
    .cv__badge--pending { border-color: color-mix(in srgb, #e8b84a 60%, var(--color-line)); color: #9a6b00; }
    .cv__badge--ok { border-color: color-mix(in srgb, #2ecc71 50%, var(--color-line)); color: #1f8f55; }
    .cv__empty { margin: 0; color: var(--color-muted); }
    .cv__meta { overflow-wrap: anywhere; }
    @media (max-width: 640px) {
      .cv__btn, .cv__input { min-height: 44px; }
    }
    @media (max-width: 560px) {
      .cv__row { grid-template-columns: 40px minmax(0, 1fr); }
      .cv__rank { display: none; }
      .cv__vote, .cv__row > .cv__badge { grid-column: 1 / -1; justify-content: flex-end; }
    }
  `,
})
export class AgentVoteComponent {
  private readonly api = inject(CommunityAgentsService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  @Input() board: VoteBoard | null = null;
  @Output() changed = new EventEmitter<void>();

  readonly loggedIn = computed(() => !!this.auth.user());
  readonly busy = signal(false);
  readonly busyId = signal('');
  readonly msg = signal('');
  readonly isErr = signal(false);
  repoUrl = '';

  periodLabel(): string {
    return this.i18n.t(`cvote.period.${this.board?.cycle?.period || 'monthly'}`);
  }

  private fail(e: { error?: { message?: string } }): void {
    this.isErr.set(true);
    this.msg.set(e?.error?.message || this.i18n.t('cvote.err'));
  }

  submit(): void {
    const url = this.repoUrl.trim();
    if (!url || this.busy()) return;
    this.busy.set(true);
    this.msg.set('');
    this.api.submit(url).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.isErr.set(false);
        this.msg.set(this.i18n.t('cvote.submitted', { name: r.agent.fullName }));
        this.repoUrl = '';
        this.changed.emit();
      },
      error: (e) => {
        this.busy.set(false);
        this.fail(e);
      },
    });
  }

  toggle(a: CommunityAgent): void {
    if (this.busyId()) return;
    this.busyId.set(a._id);
    this.msg.set('');
    const req = a.votedByMe ? this.api.unvote(a._id) : this.api.vote(a._id);
    req.subscribe({
      next: () => {
        this.busyId.set('');
        this.changed.emit();
      },
      error: (e) => {
        this.busyId.set('');
        this.fail(e);
      },
    });
  }
}
