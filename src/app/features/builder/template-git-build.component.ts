import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { BuilderKind, BuilderService, TemplateBuild, TemplateGitPick } from './builder.service';
import { TemplateBuildLogComponent } from './template-build-log.component';
import { TemplateGitSourceComponent } from './template-git-source.component';

/** Pick a GitHub repo → Build → log. Emits the build only when it passed (publishable). */
@Component({
  selector: 'app-template-git-build',
  standalone: true,
  imports: [TPipe, TemplateGitSourceComponent, TemplateBuildLogComponent],
  template: `
    <div class="gb">
      <app-template-git-source [returnKey]="returnKey()" (changed)="onPick($event)" />
      @if (pick()) {
        <div class="row">
          <button type="button" class="build" [disabled]="building()" (click)="run()">
            {{ building() ? ('builder.build.running' | t) : build() ? ('builder.build.rebuild' | t) : ('builder.build.run' | t) }}
          </button>
          <span class="hint">{{ 'builder.build.hint.' + kind() | t }}</span>
        </div>
      }
      @if (error()) {
        <p class="err">{{ error() }}</p>
      }
      <app-template-build-log [build]="build()" [building]="building()" />
      @if (build()?.status === 'failed' && !building()) {
        <p class="fix">{{ 'builder.build.fixHint' | t }}</p>
      }
    </div>
  `,
  styles: `
    .gb { display: grid; gap: .6rem; }
    .row { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; }
    .build { display: inline-flex; align-items: center; min-height: 2.3rem; padding: .45rem 1rem; border-radius: 10px; border: 0; background: #16a34a; color: #fff; font-weight: 800; font-size: .85rem; cursor: pointer; }
    .build:disabled { opacity: .6; cursor: progress; }
    .hint { color: #888; font-size: .78rem; }
    .err { margin: 0; border-radius: 10px; padding: .5rem .75rem; font-size: .82rem; background: #fdecea; color: #b71c1c; }
    .fix { margin: 0; color: #b71c1c; font-size: .8rem; font-weight: 600; }
  `,
})
export class TemplateGitBuildComponent {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);

  readonly kind = input.required<BuilderKind>();
  readonly returnKey = input('new');
  /** Successful build ready to publish, or null (none yet / failed / source changed). */
  readonly built = output<TemplateBuild | null>();

  readonly pick = signal<TemplateGitPick | null>(null);
  readonly build = signal<TemplateBuild | null>(null);
  readonly building = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      this.kind();
      untracked(() => this.reset());
    });
  }

  onPick(pick: TemplateGitPick | null): void {
    const same = JSON.stringify(pick) === JSON.stringify(this.pick());
    this.pick.set(pick);
    if (!same) this.reset();
  }

  run(): void {
    const pick = this.pick();
    if (!pick || this.building()) return;
    this.building.set(true);
    this.error.set('');
    this.build.set(null);
    this.built.emit(null);
    this.api.templateBuild({ kind: this.kind(), fromGit: pick }).subscribe({
      next: ({ build }) => {
        this.building.set(false);
        this.build.set(build);
        this.built.emit(build.status === 'success' ? build : null);
      },
      error: (e) => {
        this.building.set(false);
        this.error.set(e?.error?.message || this.i18n.t('builder.err.generic'));
      },
    });
  }

  private reset(): void {
    this.build.set(null);
    this.error.set('');
    this.built.emit(null);
  }
}
