import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';
import { ProductService } from '../../services/api.services';
import { ProductCategory } from '../../models/marketplace.models';
import {
  BuilderKind,
  BuilderProject,
  BuilderService,
  TemplateBuild,
  TemplateGitPick,
  TemplateListing,
  TemplateUploadResult,
} from './builder.service';
import { TemplateGitSourceComponent } from './template-git-source.component';
import { TemplateGitBuildComponent } from './template-git-build.component';
import { TemplateBuildLogComponent } from './template-build-log.component';

type Picked = Array<{ file: File; path: string }>;
type DraftSource = 'upload' | 'project' | 'git';

const TEXT_ACCEPT = '.zip,.html,.css,.js,.mjs,.jsx,.ts,.tsx,.json,.svg,.txt,.md';

function pickFiles(input: HTMLInputElement): Picked {
  return Array.from(input.files || []).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

@Component({
  selector: 'app-sell-templates',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, TPipe, TemplateGitSourceComponent, TemplateGitBuildComponent, TemplateBuildLogComponent],
  template: `
    <section class="tpl">
      <div class="head">
        <div>
          <p class="crumb">{{ 'sell.nav.sales' | t }} / {{ 'sell.nav.templates' | t }}</p>
          <h1>{{ 'builder.tpl.sell.title' | t }}</h1>
          <p class="sub">{{ 'builder.tpl.sell.sub' | t }}</p>
        </div>
        <button type="button" class="btn" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? ('builder.tpl.sell.close' | t) : '+ ' + ('builder.tpl.sell.new' | t) }}
        </button>
      </div>

      @if (error()) {
        <p class="alert alert--err">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="alert alert--ok">{{ notice() }}</p>
      }
      @if (skipped().length) {
        <div class="alert alert--warn">
          <p>{{ 'builder.tpl.sell.skipped' | t: { n: skipped().length } }}</p>
          <ul>
            @for (s of skipped().slice(0, 12); track s.path) {
              <li><code>{{ s.path }}</code> — {{ 'builder.tpl.skip.' + s.reason | t }}</li>
            }
          </ul>
        </div>
      }

      @if (showCreate()) {
        <form class="card form" (ngSubmit)="create()">
          <div class="kinds">
            @for (k of kinds; track k) {
              <button type="button" class="kind" [class.kind--on]="draftKind() === k" (click)="setDraftKind(k)">
                <strong>{{ 'builder.kind.' + k | t }}</strong>
                <small>{{ 'builder.tpl.entry.' + k | t }}</small>
              </button>
            }
          </div>
          <label>
            {{ 'builder.tpl.f.name' | t }}
            <input class="input" name="name" [(ngModel)]="draft.name" maxlength="120" required />
          </label>
          <label>
            {{ 'builder.tpl.f.tagline' | t }}
            <input class="input" name="tagline" [(ngModel)]="draft.tagline" maxlength="160" />
          </label>
          <label class="wide">
            {{ 'builder.tpl.f.description' | t }}
            <textarea class="input" name="description" [(ngModel)]="draft.description" rows="4"></textarea>
          </label>
          <label>
            {{ 'builder.tpl.f.price' | t }}
            <input class="input" type="number" min="0" step="0.01" name="price" [(ngModel)]="draft.price" />
            <small>{{ 'builder.tpl.f.priceHint' | t }}</small>
          </label>
          <label>
            {{ 'builder.tpl.f.cover' | t }}
            <input class="input" name="coverUrl" [(ngModel)]="draft.coverUrl" placeholder="https://…" />
          </label>
          <label class="wide">
            {{ 'builder.tpl.f.tags' | t }}
            <input class="input" name="tags" [(ngModel)]="draft.tags" placeholder="landing, hotel, dark" />
          </label>

          <fieldset class="wide source">
            <legend>{{ 'builder.tpl.f.source' | t }}</legend>
            <div class="tabs" role="tablist">
              @for (s of sources; track s) {
                <button type="button" role="tab" class="tab" [class.tab--on]="draftSource() === s" [attr.aria-selected]="draftSource() === s" (click)="draftSource.set(s)">
                  {{ 'builder.tpl.src.' + s | t }}
                </button>
              }
            </div>
            @switch (draftSource()) {
              @case ('upload') {
                <div class="row">
                  <label class="pick">
                    {{ 'builder.tpl.pick.zip' | t }}
                    <input type="file" [accept]="textAccept" multiple (change)="onDraftFiles($event)" />
                  </label>
                  <label class="pick">
                    {{ 'builder.tpl.pick.folder' | t }}
                    <input type="file" webkitdirectory multiple (change)="onDraftFiles($event)" />
                  </label>
                </div>
                @if (draftFiles().length) {
                  <p class="hint">{{ 'builder.tpl.pick.count' | t: { n: draftFiles().length } }}</p>
                }
                <p class="hint">{{ 'builder.tpl.pick.hint' | t }}</p>
              }
              @case ('project') {
                <select class="input" name="fromProject" [ngModel]="draftProject()" (ngModelChange)="draftProject.set($event)">
                  <option value="">{{ 'builder.tpl.pick.project' | t }}</option>
                  @for (p of draftProjects(); track p.id) {
                    <option [value]="p.id">{{ p.name }} (v{{ p.version }})</option>
                  }
                </select>
                @if (!draftProjects().length) {
                  <p class="hint">{{ 'builder.tpl.pick.noProjects' | t }}</p>
                }
              }
              @case ('git') {
                <app-template-git-build [kind]="draftKind()" returnKey="new" (built)="draftBuild.set($event)" />
              }
            }
          </fieldset>

          <div class="wide actions">
            <p class="hint">{{ (draftSource() === 'git' && !draftBuild() ? 'builder.build.needBuild' : 'builder.tpl.sell.review') | t }}</p>
            <button class="btn" type="submit" [disabled]="busy() || !draft.name.trim() || !draftReady()">
              {{ busy() ? ('builder.tpl.sell.saving' | t) : ('builder.tpl.sell.publish' | t) }}
            </button>
          </div>
        </form>
      }

      <div class="list">
        @for (row of rows(); track row.product.id) {
          <article class="card item">
            <div class="cover">
              @if (row.product.coverUrl) {
                <img [src]="row.product.coverUrl" alt="" />
              } @else {
                <span>{{ row.template.kind === 'app' ? '📱' : '🖥️' }}</span>
              }
            </div>
            <div class="body">
              <p class="cat">
                {{ ('cat.' + row.product.category + '.label') | t }}
                <span class="badge" [attr.data-status]="row.product.moderationStatus">
                  {{ ('builder.tpl.status.' + (row.product.moderationStatus || 'active')) | t }}
                </span>
              </p>
              <a class="name" [routerLink]="['/product', row.product.slug]">{{ row.product.name }}</a>
              <p class="meta">
                {{ priceLabel(row) }} ·
                @if (row.template.ready) {
                  v{{ row.template.version }} · {{ row.template.fileCount }} {{ 'builder.files' | t }} ·
                  {{ 'builder.tpl.uses' | t: { n: row.template.useCount } }} ·
                } @else {
                  <span class="warn">{{ 'builder.tpl.noFiles' | t }}</span> ·
                }
                {{ 'sell.prod.sold' | t: { n: ((row.product.salesCount || 0) | number) ?? '0' } }}
              </p>
              <div class="row">
                <label class="pick pick--sm">
                  {{ (row.template.ready ? 'builder.tpl.replace' : 'builder.tpl.upload') | t }}
                  <input type="file" [accept]="textAccept" multiple [disabled]="rowBusy() === row.product.id" (change)="onRowFiles($event, row)" />
                </label>
                <label class="pick pick--sm">
                  {{ 'builder.tpl.pick.folder' | t }}
                  <input type="file" webkitdirectory multiple [disabled]="rowBusy() === row.product.id" (change)="onRowFiles($event, row)" />
                </label>
                <select class="input input--sm" [disabled]="rowBusy() === row.product.id" (change)="onRowProject($event, row)">
                  <option value="">{{ 'builder.tpl.pick.project' | t }}</option>
                  @for (p of projectsOf(row.template.kind); track p.id) {
                    <option [value]="p.id">{{ p.name }} (v{{ p.version }})</option>
                  }
                </select>
                <button type="button" class="ghost" [class.ghost--on]="gitRow() === row.product.id" (click)="toggleGitRow(row)">GitHub</button>
                @if (row.template.ready) {
                  <label class="toggle">
                    <input type="checkbox" [checked]="row.template.demoEnabled" (change)="toggleDemo(row, $event)" />
                    {{ 'builder.tpl.demoToggle' | t }}
                  </label>
                  @if (row.template.demoUrl) {
                    <a class="ghost" [href]="row.template.demoUrl" target="_blank" rel="noopener">{{ 'builder.tpl.demo' | t }} ↗</a>
                  }
                  <button type="button" class="ghost" (click)="tryInBuilder(row)">{{ 'builder.tpl.try' | t }}</button>
                }
              </div>
              @if (row.template.git; as g) {
                <div class="linked">
                  <span>
                    {{ 'builder.tpl.git.linked' | t }}
                    <a [href]="g.repoUrl" target="_blank" rel="noopener noreferrer"><code>{{ g.repo }}</code></a>
                    · <code>{{ g.branch }}</code>
                    @if (g.path) { · <code>/{{ g.path }}</code> }
                    @if (g.commitSha) {
                      · <a [href]="g.repoUrl + '/commit/' + g.commitSha" target="_blank" rel="noopener noreferrer"><code>{{ g.commitSha.slice(0, 7) }}</code></a>
                    }
                  </span>
                  <button type="button" class="ghost" [disabled]="rowBusy() === row.product.id" (click)="syncGit(row)">↻ {{ 'builder.tpl.git.sync' | t }}</button>
                  <button type="button" class="link-btn" [disabled]="rowBusy() === row.product.id" (click)="unlinkGit(row)">{{ 'builder.tpl.git.unlink' | t }}</button>
                </div>
              }
              @if (gitRow() === row.product.id) {
                <div class="gitbox">
                  <app-template-git-source
                    [returnKey]="row.product.id"
                    [initial]="row.template.git ? { repo: row.template.git.repo, branch: row.template.git.branch, path: row.template.git.path } : null"
                    [submitLabel]="'builder.tpl.git.import' | t"
                    [busy]="rowBusy() === row.product.id"
                    (submitted)="importGit(row, $event)"
                  />
                </div>
              }
              @if (rowBusy() === row.product.id) {
                <p class="hint">{{ 'builder.tpl.sell.saving' | t }}</p>
              }
              @if (rowBuild()?.productId === row.product.id) {
                <app-template-build-log [build]="rowBuild()!.build" />
              }
            </div>
          </article>
        } @empty {
          <div class="card empty">
            <p>{{ 'builder.tpl.sell.empty' | t }}</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: end; margin-bottom: 1rem; flex-wrap: wrap; }
    .crumb { margin: 0; color: #888; font-size: .8rem; }
    h1 { margin: .25rem 0 0; font-size: 1.45rem; font-weight: 800; }
    .sub { margin: .35rem 0 0; color: #777; font-size: .9rem; max-width: 46rem; }
    .btn { display: inline-flex; align-items: center; min-height: 2.4rem; padding: .5rem 1rem; border-radius: 10px; background: #e53935; color: #fff; border: 0; font-weight: 800; cursor: pointer; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1rem; }
    .alert { border-radius: 12px; padding: .75rem 1rem; font-size: .88rem; margin: 0 0 .8rem; }
    .alert ul { margin: .4rem 0 0; padding-left: 1.1rem; }
    .alert--err { background: #fdecea; color: #b71c1c; }
    .alert--ok { background: #e8f5e9; color: #1b5e20; }
    .alert--warn { background: #fff8e1; color: #8a6d00; }
    .form { display: grid; gap: .8rem; grid-template-columns: 1fr 1fr; margin-bottom: 1rem; }
    .form label { display: grid; gap: .3rem; font-size: .85rem; color: #555; font-weight: 600; }
    .form small, .hint { color: #888; font-size: .78rem; font-weight: 400; margin: 0; }
    .wide { grid-column: 1 / -1; }
    .kinds { grid-column: 1 / -1; display: flex; gap: .6rem; flex-wrap: wrap; }
    .kind { border: 1px solid #ddd; border-radius: 12px; padding: .6rem .9rem; background: #fff; text-align: left; cursor: pointer; display: grid; gap: .15rem; }
    .kind small { color: #888; font-size: .75rem; }
    .kind--on { border-color: #e53935; box-shadow: 0 0 0 2px rgba(229,57,53,.18); }
    .input { border: 1px solid #ddd; border-radius: 10px; padding: .55rem .7rem; font: inherit; background: #fff; color: inherit; }
    .input--sm { padding: .35rem .5rem; font-size: .8rem; max-width: 14rem; }
    .source { border: 1px dashed #ddd; border-radius: 12px; padding: .7rem .9rem; display: grid; gap: .5rem; }
    .source legend { font-size: .85rem; font-weight: 700; color: #555; padding: 0 .3rem; }
    .row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .pick { position: relative; overflow: hidden; border: 1px solid #ddd; border-radius: 10px; padding: .5rem .8rem; cursor: pointer; font-size: .82rem; font-weight: 700; color: #333; background: #fafafa; }
    .pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .pick--sm { padding: .35rem .6rem; font-size: .78rem; }
    .actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .list { display: grid; gap: .65rem; }
    .item { display: flex; gap: 1rem; align-items: flex-start; }
    .cover { width: 112px; height: 72px; border-radius: 10px; background: #f3f3f3; overflow: hidden; display: grid; place-items: center; flex: none; font-size: 1.6rem; }
    .cover img { width: 100%; height: 100%; object-fit: cover; }
    .body { flex: 1; min-width: 0; display: grid; gap: .3rem; }
    .cat { margin: 0; font-size: .72rem; color: #888; text-transform: uppercase; display: flex; gap: .5rem; align-items: center; }
    .badge { border-radius: 999px; padding: .1rem .5rem; background: #eee; color: #555; text-transform: none; font-weight: 700; }
    .badge[data-status='active'] { background: #e8f5e9; color: #1b5e20; }
    .badge[data-status='pending_review'] { background: #fff8e1; color: #8a6d00; }
    .badge[data-status='blocked'], .badge[data-status='suspended'] { background: #fdecea; color: #b71c1c; }
    .name { color: inherit; text-decoration: none; font-weight: 800; font-size: 1.05rem; }
    .meta { margin: 0; color: #777; font-size: .85rem; }
    .warn { color: #c62828; font-weight: 700; }
    .ghost { border: 1px solid #ddd; border-radius: 10px; padding: .35rem .7rem; text-decoration: none; color: #333; font-weight: 700; font-size: .8rem; background: #fff; cursor: pointer; }
    .toggle { display: inline-flex; gap: .35rem; align-items: center; font-size: .8rem; color: #555; }
    .ghost--on { border-color: #24292f; box-shadow: 0 0 0 2px rgba(36,41,47,.15); }
    .ghost:disabled, .link-btn:disabled { opacity: .5; cursor: not-allowed; }
    .tabs { display: flex; gap: .25rem; flex-wrap: wrap; border: 1px solid #ececec; border-radius: 10px; padding: .2rem; width: fit-content; max-width: 100%; }
    .tab { border: 0; border-radius: 8px; padding: .4rem .8rem; background: transparent; font: inherit; font-size: .82rem; font-weight: 700; color: #555; cursor: pointer; }
    .tab--on { background: #e53935; color: #fff; }
    .linked { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; font-size: .8rem; color: #555; }
    .linked a { color: inherit; }
    .linked code { font-size: .78rem; word-break: break-all; }
    .link-btn { border: 0; background: none; padding: 0; color: #c62828; font: inherit; font-size: .8rem; text-decoration: underline; cursor: pointer; }
    .gitbox { border: 1px dashed #ddd; border-radius: 12px; padding: .7rem .9rem; }
    .empty p { margin: 0; color: #777; }
    @media (max-width: 720px) { .form { grid-template-columns: 1fr; } .item { flex-direction: column; } }
  `,
})
export class SellTemplatesComponent implements OnInit {
  private readonly api = inject(BuilderService);
  private readonly productsApi = inject(ProductService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly kinds: BuilderKind[] = ['web', 'app'];
  readonly sources: DraftSource[] = ['upload', 'project', 'git'];
  readonly textAccept = TEXT_ACCEPT;
  readonly rows = signal<TemplateListing[]>([]);
  readonly projects = signal<BuilderProject[]>([]);
  readonly showCreate = signal(false);
  readonly draftKind = signal<BuilderKind>('web');
  readonly draftSource = signal<DraftSource>('upload');
  readonly draftFiles = signal<Picked>([]);
  readonly draftProject = signal('');
  readonly draftBuild = signal<TemplateBuild | null>(null);
  readonly rowBuild = signal<{ productId: string; build: TemplateBuild } | null>(null);
  readonly draftProjects = computed(() => this.projectsOf(this.draftKind()));
  readonly draftReady = computed(() => {
    switch (this.draftSource()) {
      case 'upload':
        return this.draftFiles().length > 0;
      case 'project':
        return !!this.draftProject();
      default:
        return this.draftBuild()?.kind === this.draftKind();
    }
  });
  readonly busy = signal(false);
  readonly rowBusy = signal('');
  readonly gitRow = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly skipped = signal<TemplateUploadResult['skipped']>([]);

  draft = { name: '', tagline: '', description: '', price: 19, coverUrl: '', tags: '' };

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('builder.tpl.sell.title') });
    if (!this.browser) return;
    const q = this.route.snapshot.queryParamMap;
    const kind = q.get('kind');
    if (kind === 'web' || kind === 'app') this.draftKind.set(kind);
    const fromProject = q.get('fromProject') || '';
    if (fromProject) {
      this.draftProject.set(fromProject);
      this.draftSource.set('project');
      this.showCreate.set(true);
    }
    const tplgit = q.get('tplgit') || '';
    if (tplgit === 'new') {
      this.draftSource.set('git');
      this.showCreate.set(true);
    } else if (/^[a-f0-9]{24}$/.test(tplgit)) {
      this.gitRow.set(tplgit);
    }
    this.load();
    this.api.list().subscribe({
      next: (r) => {
        this.projects.set(r.projects || []);
        const p = r.projects.find((x) => x.id === fromProject);
        if (p) {
          this.draftKind.set(p.kind);
          if (!this.draft.name) this.draft.name = p.name;
        } else if (fromProject) {
          this.draftProject.set('');
        }
      },
      error: () => this.projects.set([]),
    });
  }

  projectsOf(kind: BuilderKind): BuilderProject[] {
    return this.projects().filter((p) => p.kind === kind);
  }

  priceLabel(row: TemplateListing): string {
    const pr = row.product.pricing;
    if (!pr || pr.model === 'free' || !(Number(pr.price) > 0)) return this.i18n.t('builder.tpl.free');
    return `${pr.currency === 'USD' || !pr.currency ? '$' : pr.currency + ' '}${Number(pr.price).toFixed(2)}`;
  }

  setDraftKind(kind: BuilderKind): void {
    this.draftKind.set(kind);
    this.draftProject.set('');
    this.draftBuild.set(null);
  }

  onDraftFiles(event: Event): void {
    this.draftFiles.set(pickFiles(event.target as HTMLInputElement));
  }

  create(): void {
    const name = this.draft.name.trim();
    if (!name || this.busy()) return;
    const category = `template-${this.draftKind()}` as ProductCategory;
    const price = Math.max(0, Number(this.draft.price) || 0);
    const tags = this.draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.includes(category)) tags.push(category);
    this.reset();
    this.busy.set(true);
    this.productsApi
      .create({
        name,
        tagline: this.draft.tagline.trim(),
        description: this.draft.description.trim(),
        category,
        pricing: price > 0 ? { model: 'one-time', price, currency: 'USD' } : { model: 'free', price: 0, currency: 'USD' },
        coverUrl: this.draft.coverUrl.trim() || undefined,
        tags,
      } as Parameters<ProductService['create']>[0])
      .subscribe({
        next: (product) => {
          this.upload(product.id, () => {
            this.busy.set(false);
            this.showCreate.set(false);
            this.draft = { name: '', tagline: '', description: '', price: 19, coverUrl: '', tags: '' };
            this.draftFiles.set([]);
            this.draftProject.set('');
            this.draftBuild.set(null);
            this.draftSource.set('upload');
            this.notice.set(this.i18n.t('builder.tpl.sell.created', { name }));
          }, () => {
            this.busy.set(false);
            this.load();
          });
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
        },
      });
  }

  onRowFiles(event: Event, row: TemplateListing): void {
    const input = event.target as HTMLInputElement;
    const picked = pickFiles(input);
    input.value = '';
    if (!picked.length) return;
    this.reset();
    this.rowBusy.set(row.product.id);
    this.send(this.api.uploadTemplate(row.product.id, picked), row.product.name);
  }

  onRowProject(event: Event, row: TemplateListing): void {
    const select = event.target as HTMLSelectElement;
    const projectId = select.value;
    select.value = '';
    if (!projectId) return;
    this.reset();
    this.rowBusy.set(row.product.id);
    this.send(this.api.templateFromProject(row.product.id, projectId), row.product.name);
  }

  toggleDemo(row: TemplateListing, event: Event): void {
    const demoEnabled = (event.target as HTMLInputElement).checked;
    this.api.updateTemplate(row.product.id, { demoEnabled }).subscribe({
      next: (r) => this.patchRow(row.product.id, r.template),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  toggleGitRow(row: TemplateListing): void {
    this.gitRow.set(this.gitRow() === row.product.id ? '' : row.product.id);
  }

  importGit(row: TemplateListing, pick: TemplateGitPick): void {
    if (this.rowBusy()) return;
    this.reset();
    this.rowBusy.set(row.product.id);
    this.send(this.api.templateFromGit(row.product.id, pick), row.product.name, () => this.gitRow.set(''));
  }

  syncGit(row: TemplateListing): void {
    if (this.rowBusy()) return;
    this.reset();
    this.rowBusy.set(row.product.id);
    this.send(this.api.templateFromGit(row.product.id, { sync: true }), row.product.name);
  }

  unlinkGit(row: TemplateListing): void {
    if (!confirm(this.i18n.t('builder.tpl.git.confirmUnlink'))) return;
    this.api.updateTemplate(row.product.id, { unlinkGit: true }).subscribe({
      next: (r) => this.patchRow(row.product.id, r.template),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  tryInBuilder(row: TemplateListing): void {
    this.reset();
    this.api.useTemplate(row.product.id).subscribe({
      next: (r) => this.router.navigate(['/build', r.project.id]),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  private upload(productId: string, done: () => void, failed: () => void): void {
    const build = this.draftBuild();
    const source = this.draftSource();
    const req =
      source === 'project'
        ? this.api.templateFromProject(productId, this.draftProject())
        : source === 'git' && build
          ? this.api.templateFromBuild(productId, build.id)
          : this.api.uploadTemplate(productId, this.draftFiles());
    req.subscribe({
      next: (r) => {
        this.skipped.set(r.skipped || []);
        done();
        this.load();
      },
      error: (e) => {
        this.error.set(
          `${this.i18n.t('builder.tpl.sell.createdNoFiles')} ${e?.error?.message || this.i18n.t('builder.err.generic')}`,
        );
        failed();
      },
    });
  }

  private send(req: Observable<TemplateUploadResult>, name: string, done?: () => void): void {
    const productId = this.rowBusy();
    req.subscribe({
      next: (r) => {
        this.rowBusy.set('');
        this.skipped.set(r.skipped || []);
        this.patchRow(r.template.productId, r.template);
        this.rowBuild.set(r.build ? { productId: r.template.productId, build: r.build } : null);
        this.notice.set(this.i18n.t('builder.tpl.sell.updated', { name, v: r.template.version }));
        done?.();
      },
      error: (e) => {
        this.rowBusy.set('');
        const build = e?.error?.build as TemplateBuild | undefined;
        if (build && productId) this.rowBuild.set({ productId, build });
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  private patchRow(productId: string, template: TemplateListing['template']): void {
    this.rows.update((rows) => rows.map((r) => (r.product.id === productId ? { ...r, template: { ...r.template, ...template } } : r)));
  }

  private load(): void {
    this.api.myTemplates().subscribe({
      next: (r) => this.rows.set(r.templates || []),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  private reset(): void {
    this.error.set('');
    this.notice.set('');
    this.skipped.set([]);
    this.rowBuild.set(null);
  }
}
