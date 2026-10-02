import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { BuilderProject, BuilderService, GitConnection, GitPushBody, GitPushResult, GitRepo, ProjectGit } from './builder.service';

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=AI%20Markets%20Builder';

function slug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'aimarkets-project'
  );
}

/** Link the buyer's GitHub and push the Builder project to their own repository. */
@Component({
  selector: 'app-git-panel',
  standalone: true,
  imports: [FormsModule, DatePipe, TPipe],
  template: `
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-semibold">{{ 'builder.git.title' | t }}</p>
        @if (conn(); as c) {
          @if (c.status === 'active') {
            <div class="flex items-center gap-2 text-xs">
              @if (c.avatarUrl) {
                <img [src]="c.avatarUrl" alt="" class="h-5 w-5 rounded-full" />
              }
              <span>{{ 'builder.git.connectedAs' | t: { login: c.login } }}</span>
              <span class="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{{ 'builder.git.method.' + c.method | t }}</span>
              <button type="button" class="underline text-red-400" [disabled]="busy()" (click)="disconnect()">{{ 'builder.git.disconnect' | t }}</button>
            </div>
          }
        }
      </div>
      <p class="text-xs text-muted">{{ 'builder.git.hint' | t }}</p>

      @if (error()) {
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{{ notice() }}</p>
      }

      @if (loading()) {
        <p class="text-xs text-muted">{{ 'builder.loading' | t }}</p>
      } @else if (!connected()) {
        @if (conn()?.status === 'invalid') {
          <p class="text-xs text-amber-400">{{ 'builder.git.invalid' | t }}</p>
        }
        <div class="flex flex-wrap items-center gap-3">
          @if (oauth()) {
            <button type="button" class="btn btn-fill text-xs" [disabled]="busy()" (click)="connectOAuth()">
              {{ busy() ? ('builder.git.connecting' | t) : ('builder.git.connect' | t) }}
            </button>
          } @else {
            <span class="text-xs text-muted">{{ 'builder.git.oauthOff' | t }}</span>
          }
        </div>
        <form class="grid gap-2 rounded-xl border border-line p-3" (ngSubmit)="connectToken()">
          <p class="text-xs font-semibold">{{ 'builder.git.tokenTitle' | t }}</p>
          <input
            class="input w-full font-mono text-xs"
            type="password"
            name="ghToken"
            autocomplete="off"
            [(ngModel)]="token"
            placeholder="ghp_… / github_pat_…"
          />
          <p class="text-[11px] text-muted">{{ 'builder.git.tokenNote' | t }}</p>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-outline text-xs" type="submit" [disabled]="busy() || !token.trim()">{{ 'builder.git.tokenSave' | t }}</button>
            <a class="text-xs underline" [href]="tokenUrl" target="_blank" rel="noopener noreferrer">{{ 'builder.git.tokenCreate' | t }}</a>
          </div>
        </form>
      } @else if (!canPush()) {
        <p class="text-xs text-amber-400">{{ 'builder.git.needBuild' | t }}</p>
      } @else {
        @if (project().git; as g) {
          <div class="space-y-1 rounded-xl border border-line p-3 text-xs">
            <p class="flex flex-wrap items-center gap-2">
              <a class="font-mono font-semibold underline" [href]="g.repoUrl" target="_blank" rel="noopener noreferrer">{{ g.fullName }}</a>
              <span class="rounded-full border border-line px-2 py-0.5 text-[11px]">{{ (g.private ? 'builder.git.private' : 'builder.git.public') | t }}</span>
              <span class="font-mono text-muted">{{ g.branch }}</span>
            </p>
            @if (g.lastCommitSha) {
              <p class="text-muted">
                {{ 'builder.git.lastPush' | t: { version: g.lastPushedVersion } }}
                <a class="font-mono underline" [href]="g.lastCommitUrl" target="_blank" rel="noopener noreferrer">{{ g.lastCommitSha.slice(0, 7) }}</a>
                @if (g.lastPushedAt) { · {{ g.lastPushedAt | date: 'short' }} }
              </p>
            }
            <p [class.text-amber-400]="pendingChanges()" [class.text-muted]="!pendingChanges()">
              {{ (pendingChanges() ? 'builder.git.pending' : 'builder.git.upToDate') | t: { version: project().version } }}
            </p>
          </div>
          <form class="grid gap-2" (ngSubmit)="push({})">
            <input class="input w-full text-xs" name="message" maxlength="200" [(ngModel)]="message" [placeholder]="'builder.git.messagePh' | t" />
            <div class="flex flex-wrap items-center gap-3">
              <button class="btn btn-fill text-xs" type="submit" [disabled]="busy() || generating()">
                {{ busy() ? ('builder.git.pushing' | t) : ('builder.git.pushVersion' | t: { version: project().version }) }}
              </button>
              <button type="button" class="text-xs underline" [disabled]="busy()" (click)="unlink()">{{ 'builder.git.changeRepo' | t }}</button>
            </div>
          </form>
        } @else {
          <div class="flex rounded-lg border border-line p-0.5 text-xs" role="tablist">
            @for (m of modes; track m) {
              <button
                type="button"
                role="tab"
                class="flex-1 rounded-md px-3 py-1"
                [class.bg-accent]="mode() === m"
                [class.text-white]="mode() === m"
                [attr.aria-selected]="mode() === m"
                (click)="setMode(m)"
              >
                {{ 'builder.git.mode.' + m | t }}
              </button>
            }
          </div>
          <form class="grid gap-2" (ngSubmit)="submitFirst()">
            @if (mode() === 'new') {
              <label class="grid gap-1 text-xs">
                {{ 'builder.git.repoName' | t }}
                <input class="input w-full font-mono text-xs" name="repoName" maxlength="100" [(ngModel)]="repoName" />
              </label>
              <label class="flex items-center gap-2 text-xs">
                <input type="checkbox" name="isPrivate" [(ngModel)]="isPrivate" />
                {{ 'builder.git.makePrivate' | t }}
              </label>
            } @else {
              <label class="grid gap-1 text-xs">
                {{ 'builder.git.pickRepo' | t }}
                <select class="input w-full text-xs" name="repo" [(ngModel)]="repoFull" (ngModelChange)="onPickRepo($event)">
                  <option value="">{{ (reposLoading() ? 'builder.git.loadingRepos' : 'builder.git.choose') | t }}</option>
                  @for (r of repos(); track r.fullName) {
                    <option [value]="r.fullName">{{ r.fullName }}{{ r.private ? ' 🔒' : '' }}</option>
                  }
                </select>
              </label>
              @if (!reposLoading() && !repos().length) {
                <p class="text-[11px] text-muted">{{ 'builder.git.noRepos' | t }}</p>
              }
              <label class="grid gap-1 text-xs">
                {{ 'builder.git.branch' | t }}
                <input class="input w-full font-mono text-xs" name="branch" maxlength="100" [(ngModel)]="branch" [placeholder]="branchPh()" />
              </label>
              <p class="text-[11px] text-muted">{{ 'builder.git.existingNote' | t }}</p>
            }
            <input class="input w-full text-xs" name="firstMessage" maxlength="200" [(ngModel)]="message" [placeholder]="'builder.git.messagePh' | t" />
            <button
              class="btn btn-fill text-xs"
              type="submit"
              [disabled]="busy() || generating() || (mode() === 'new' ? !repoName.trim() : !repoFull)"
            >
              {{ busy() ? ('builder.git.pushing' | t) : ('builder.git.push' | t) }}
            </button>
          </form>
        }
        @if (result(); as r) {
          <p class="text-xs">
            {{ (r.commit.unchanged ? 'builder.git.unchanged' : r.repo.created ? 'builder.git.created' : 'builder.git.pushed') | t: { repo: r.repo.fullName } }}
            <a class="underline" [href]="r.commit.unchanged ? r.repo.url : r.commit.url" target="_blank" rel="noopener noreferrer">
              {{ (r.commit.unchanged ? 'builder.git.openRepo' : 'builder.git.openCommit') | t }}
            </a>
          </p>
        }
      }
    </div>
  `,
})
export class GitPanelComponent implements OnInit {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly project = input.required<BuilderProject>();
  readonly generating = input(false);
  readonly gitChange = output<ProjectGit | null>();

  readonly modes = ['new', 'existing'] as const;
  readonly tokenUrl = TOKEN_URL;
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly oauth = signal(false);
  readonly conn = signal<GitConnection | null>(null);
  readonly connected = computed(() => this.conn()?.status === 'active');
  readonly mode = signal<'new' | 'existing'>('new');
  readonly repos = signal<GitRepo[]>([]);
  readonly reposLoading = signal(false);
  readonly result = signal<GitPushResult | null>(null);
  readonly canPush = computed(() => {
    const p = this.project();
    return (p.files?.length || p.fileCount) > 0 && (p.version > 0 || !!p.lastGeneratedAt || !!p.template);
  });
  readonly pendingChanges = computed(() => {
    const g = this.project().git;
    return !!g && this.project().version > (g.lastPushedVersion || 0);
  });
  readonly branchPh = computed(() => this.repos().find((r) => r.fullName === this.repoFull)?.defaultBranch || 'main');

  token = '';
  repoName = '';
  isPrivate = true;
  repoFull = '';
  branch = '';
  message = '';

  async ngOnInit(): Promise<void> {
    this.repoName = slug(this.project().name);
    const q = this.route.snapshot.queryParamMap;
    const connectId = q.get('git_connect') || '';
    const failed = q.get('git_error') || '';
    if (connectId || failed) {
      void this.router.navigate([], { queryParams: { git_connect: null, git_error: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    try {
      if (connectId) {
        await firstValueFrom(this.api.gitOAuthComplete(connectId));
        this.notice.set(this.i18n.t('builder.git.connectedOk'));
      } else if (failed) {
        const key = `builder.git.err.${failed}`;
        const text = this.i18n.t(key);
        this.error.set(text !== key ? text : this.i18n.t('builder.git.err.GIT_ERROR'));
      }
    } catch (e) {
      this.error.set(this.message$(e));
    }
    await this.refresh();
  }

  setMode(m: 'new' | 'existing'): void {
    this.mode.set(m);
    if (m === 'existing' && !this.repos().length) this.loadRepos();
  }

  onPickRepo(full: string): void {
    this.repoFull = full;
    this.branch = '';
  }

  async connectOAuth(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const returnTo = `${location.origin}${location.pathname}`;
      const { url } = await firstValueFrom(this.api.gitOAuthStart(returnTo));
      location.href = url;
    } catch (e) {
      this.error.set(this.message$(e));
      this.busy.set(false);
    }
  }

  async connectToken(): Promise<void> {
    const token = this.token.trim();
    if (!token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { connection } = await firstValueFrom(this.api.gitConnectToken(token));
      this.token = '';
      this.conn.set(connection);
      this.notice.set(this.i18n.t('builder.git.connectedOk'));
    } catch (e) {
      this.error.set(this.message$(e));
    } finally {
      this.busy.set(false);
    }
  }

  async disconnect(): Promise<void> {
    if (!confirm(this.i18n.t('builder.git.confirmDisconnect'))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.gitDisconnect());
      this.conn.set(null);
      this.repos.set([]);
      this.result.set(null);
      this.notice.set('');
    } catch (e) {
      this.error.set(this.message$(e));
    } finally {
      this.busy.set(false);
    }
  }

  async unlink(): Promise<void> {
    if (!confirm(this.i18n.t('builder.git.confirmUnlink'))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.gitUnlink(this.project().id));
      this.result.set(null);
      this.gitChange.emit(null);
    } catch (e) {
      this.error.set(this.message$(e));
    } finally {
      this.busy.set(false);
    }
  }

  submitFirst(): void {
    const message = this.message.trim() || undefined;
    if (this.mode() === 'new') {
      void this.push({ create: { name: this.repoName.trim(), private: this.isPrivate }, message });
    } else if (this.repoFull) {
      void this.push({ repo: this.repoFull, branch: this.branch.trim() || undefined, message });
    }
  }

  async push(body: GitPushBody): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.result.set(null);
    try {
      const r = await firstValueFrom(
        this.api.gitPush(this.project().id, { ...body, message: body.message ?? (this.message.trim() || undefined) }),
      );
      this.message = '';
      this.result.set(r);
      this.gitChange.emit(r.git);
    } catch (e) {
      this.error.set(this.message$(e));
      const code = (e as { error?: { code?: string } })?.error?.code;
      if (code === 'GIT_TOKEN_INVALID' || code === 'GIT_NOT_CONNECTED') await this.refresh();
    } finally {
      this.busy.set(false);
    }
  }

  private async refresh(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.gitStatus());
      this.oauth.set(!!s.providers.find((p) => p.id === 'github')?.oauth);
      this.conn.set(s.connections.find((c) => c.provider === 'github') || null);
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
