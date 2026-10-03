import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { BuilderService, GitConnection, GitRepo, TemplateGitPick } from './builder.service';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=AI%20Markets%20Templates';

/** One OAuth return can render several pickers; only the first may redeem the connect id. */
let connectDone: Promise<string> | null = null;

/** Seller picks a repo / branch / folder on their linked GitHub as the source of a template. */
@Component({
  selector: 'app-template-git-source',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <div class="gs">
      @if (error()) {
        <p class="msg msg--err">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="msg msg--ok">{{ notice() }}</p>
      }
      @if (loading()) {
        <p class="hint">{{ 'builder.loading' | t }}</p>
      } @else if (!connected()) {
        @if (conn()?.status === 'invalid') {
          <p class="msg msg--warn">{{ 'builder.git.invalid' | t }}</p>
        }
        <p class="hint">{{ 'builder.tpl.git.connectHint' | t }}</p>
        <div class="row">
          @if (oauth()) {
            <button type="button" class="gh" [disabled]="working()" (click)="connectOAuth()">
              {{ working() ? ('builder.git.connecting' | t) : ('builder.git.connect' | t) }}
            </button>
          }
          <input
            class="input grow mono"
            type="password"
            autocomplete="off"
            [(ngModel)]="token"
            [ngModelOptions]="{ standalone: true }"
            placeholder="ghp_… / github_pat_…"
            [attr.aria-label]="'builder.git.tokenTitle' | t"
          />
          <button type="button" class="ghost" [disabled]="working() || !token.trim()" (click)="connectToken()">
            {{ 'builder.git.tokenSave' | t }}
          </button>
          <a class="link" [href]="tokenUrl" target="_blank" rel="noopener noreferrer">{{ 'builder.git.tokenCreate' | t }}</a>
        </div>
      } @else {
        <p class="who">
          @if (conn()?.avatarUrl) {
            <img [src]="conn()!.avatarUrl" alt="" />
          }
          {{ 'builder.git.connectedAs' | t: { login: conn()!.login } }}
        </p>
        <div class="grid">
          <label>
            {{ 'builder.git.pickRepo' | t }}
            <select class="input" [(ngModel)]="repo" [ngModelOptions]="{ standalone: true }" (ngModelChange)="onRepo()">
              <option value="">{{ (reposLoading() ? 'builder.git.loadingRepos' : 'builder.git.choose') | t }}</option>
              @if (repo && !inList()) {
                <option [value]="repo">{{ repo }}</option>
              }
              @for (r of repos(); track r.fullName) {
                <option [value]="r.fullName">{{ r.fullName }}{{ r.private ? ' 🔒' : '' }}</option>
              }
            </select>
          </label>
          <label>
            {{ 'builder.git.branch' | t }}
            <input class="input mono" maxlength="100" [(ngModel)]="branch" [ngModelOptions]="{ standalone: true }" [placeholder]="branchPh()" (ngModelChange)="emit()" />
          </label>
          <label>
            {{ 'builder.tpl.git.path' | t }}
            <input class="input mono" maxlength="200" [(ngModel)]="path" [ngModelOptions]="{ standalone: true }" [placeholder]="'builder.tpl.git.pathPh' | t" (ngModelChange)="emit()" />
          </label>
        </div>
        @if (!reposLoading() && !repos().length) {
          <p class="hint">{{ 'builder.git.noRepos' | t }}</p>
        }
        <p class="hint">{{ 'builder.tpl.git.note' | t }}</p>
        @if (submitLabel()) {
          <div class="row">
            <button type="button" class="gh" [disabled]="busy() || !repo" (click)="submit()">{{ submitLabel() }}</button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .gs { display: grid; gap: .5rem; }
    .row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .grid { display: grid; gap: .5rem; grid-template-columns: 2fr 1fr 1fr; }
    .grid label { display: grid; gap: .25rem; font-size: .8rem; color: #555; font-weight: 600; }
    .input { border: 1px solid #ddd; border-radius: 10px; padding: .5rem .65rem; font: inherit; font-size: .85rem; background: #fff; color: inherit; min-width: 0; }
    .grow { flex: 1 1 14rem; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .gh { display: inline-flex; align-items: center; gap: .4rem; min-height: 2.2rem; padding: .45rem .9rem; border-radius: 10px; border: 0; background: #24292f; color: #fff; font-weight: 700; font-size: .82rem; cursor: pointer; }
    .gh:disabled, .ghost:disabled { opacity: .5; cursor: not-allowed; }
    .ghost { border: 1px solid #ddd; border-radius: 10px; padding: .45rem .8rem; background: #fff; color: #333; font-weight: 700; font-size: .82rem; cursor: pointer; }
    .link { font-size: .8rem; color: #333; }
    .who { margin: 0; display: flex; gap: .4rem; align-items: center; font-size: .82rem; color: #555; }
    .who img { width: 20px; height: 20px; border-radius: 50%; }
    .hint { margin: 0; color: #888; font-size: .78rem; }
    .msg { margin: 0; border-radius: 10px; padding: .5rem .75rem; font-size: .82rem; }
    .msg--err { background: #fdecea; color: #b71c1c; }
    .msg--ok { background: #e8f5e9; color: #1b5e20; }
    .msg--warn { background: #fff8e1; color: #8a6d00; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class TemplateGitSourceComponent implements OnInit {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Prefill (e.g. the repo a template was imported from). */
  readonly initial = input<TemplateGitPick | null>(null);
  /** Shown after an OAuth round trip so the page can reopen the right form (?tplgit=…). */
  readonly returnKey = input('new');
  /** When set, renders an import button that emits `submitted`. */
  readonly submitLabel = input('');
  readonly busy = input(false);
  readonly changed = output<TemplateGitPick | null>();
  readonly submitted = output<TemplateGitPick>();

  readonly tokenUrl = TOKEN_URL;
  readonly loading = signal(true);
  readonly working = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly oauth = signal(false);
  readonly conn = signal<GitConnection | null>(null);
  readonly connected = computed(() => this.conn()?.status === 'active');
  readonly repos = signal<GitRepo[]>([]);
  readonly reposLoading = signal(false);
  private readonly picked = signal('');
  readonly inList = computed(() => this.repos().some((r) => r.fullName === this.picked()));
  readonly branchPh = computed(() => this.repos().find((r) => r.fullName === this.picked())?.defaultBranch || 'main');

  token = '';
  repo = '';
  branch = '';
  path = '';

  async ngOnInit(): Promise<void> {
    const init = this.initial();
    if (init) {
      this.repo = init.repo;
      this.branch = init.branch || '';
      this.path = init.path || '';
      this.picked.set(this.repo);
    }
    const q = this.route.snapshot.queryParamMap;
    const connectId = q.get('git_connect') || '';
    const failed = q.get('git_error') || '';
    if ((connectId || failed) && !connectDone) {
      connectDone = this.redeem(connectId, failed);
      void this.router.navigate([], {
        queryParams: { git_connect: null, git_error: null, tplgit: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    if (connectDone) {
      const outcome = await connectDone;
      connectDone = null;
      if (outcome.startsWith('ok:')) this.notice.set(outcome.slice(3));
      else if (outcome) this.error.set(outcome);
    }
    await this.refresh();
    this.emit();
  }

  onRepo(): void {
    this.picked.set(this.repo);
    this.branch = '';
    this.emit();
  }

  emit(): void {
    this.changed.emit(this.connected() && this.repo ? this.pick() : null);
  }

  submit(): void {
    if (this.repo) this.submitted.emit(this.pick());
  }

  async connectOAuth(): Promise<void> {
    this.working.set(true);
    this.error.set('');
    try {
      const returnTo = `${location.origin}${location.pathname}?tplgit=${encodeURIComponent(this.returnKey())}`;
      const { url } = await firstValueFrom(this.api.gitOAuthStart(returnTo));
      location.href = url;
    } catch (e) {
      this.error.set(this.message$(e));
      this.working.set(false);
    }
  }

  async connectToken(): Promise<void> {
    const token = this.token.trim();
    if (!token) return;
    this.working.set(true);
    this.error.set('');
    try {
      const { connection } = await firstValueFrom(this.api.gitConnectToken(token));
      this.token = '';
      this.conn.set(connection);
      this.notice.set(this.i18n.t('builder.git.connectedOk'));
      this.loadRepos();
    } catch (e) {
      this.error.set(this.message$(e));
    } finally {
      this.working.set(false);
    }
  }

  private pick(): TemplateGitPick {
    return { repo: this.repo, branch: this.branch.trim() || undefined, path: this.path.trim() || undefined };
  }

  private async redeem(connectId: string, failed: string): Promise<string> {
    if (connectId) {
      try {
        await firstValueFrom(this.api.gitOAuthComplete(connectId));
        return `ok:${this.i18n.t('builder.git.connectedOk')}`;
      } catch (e) {
        return this.message$(e);
      }
    }
    const key = `builder.git.err.${failed}`;
    const text = this.i18n.t(key);
    return text !== key ? text : this.i18n.t('builder.git.err.GIT_ERROR');
  }

  private async refresh(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.gitStatus());
      this.oauth.set(!!s.providers.find((p) => p.id === 'github')?.oauth);
      this.conn.set(s.connections.find((c) => c.provider === 'github') || null);
      if (this.connected()) this.loadRepos();
    } catch (e) {
      this.error.set(this.message$(e));
    } finally {
      this.loading.set(false);
    }
  }

  private loadRepos(): void {
    this.reposLoading.set(true);
    this.api.gitRepos().subscribe({
      next: (r) => {
        this.repos.set(r.repos || []);
        this.reposLoading.set(false);
      },
      error: (e) => {
        this.error.set(this.message$(e));
        this.reposLoading.set(false);
      },
    });
  }

  private message$(e: unknown): string {
    return (e as { error?: { message?: string } })?.error?.message || this.i18n.t('builder.err.generic');
  }
}
