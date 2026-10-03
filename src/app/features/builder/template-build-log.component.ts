import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';
import { TemplateBuild } from './builder.service';

/** Deployment-style log of a template build (status, commit, timestamped lines). */
@Component({
  selector: 'app-template-build-log',
  standalone: true,
  imports: [TPipe],
  template: `
    @if (building() || build()) {
      <div class="bl" [attr.data-status]="building() ? 'running' : build()?.status">
        <div class="bar">
          <span class="badge">
            @if (building()) {
              <span class="dot dot--run"></span> {{ 'builder.build.running' | t }}
            } @else if (build()?.status === 'success') {
              ✓ {{ 'builder.build.success' | t }}
            } @else {
              ✗ {{ 'builder.build.failed' | t }}
            }
          </span>
          @if (!building() && build(); as b) {
            @if (b.source?.repo) {
              <span class="meta">
                <a [href]="b.source!.repoUrl || 'https://github.com/' + b.source!.repo" target="_blank" rel="noopener noreferrer">{{ b.source!.repo }}</a>
                @if (b.source!.branch) { · {{ b.source!.branch }} }
                @if (b.source!.commitSha) {
                  · <a [href]="(b.source!.repoUrl || 'https://github.com/' + b.source!.repo) + '/commit/' + b.source!.commitSha" target="_blank" rel="noopener noreferrer">{{ b.source!.commitSha.slice(0, 7) }}</a>
                }
              </span>
            }
            <span class="meta">{{ (b.durationMs / 1000).toFixed(1) }}s</span>
            @if (b.previewUrl) {
              <a class="open" [href]="b.previewUrl" target="_blank" rel="noopener noreferrer">{{ 'builder.build.preview' | t }} ↗</a>
            }
          }
        </div>
        <div #scroll class="lines" role="log" aria-live="polite">
          @if (building()) {
            <div class="ln ln--info"><span class="ts">00:00.000</span><span class="msg">{{ 'builder.build.fetching' | t }}</span></div>
          } @else {
            @for (l of build()?.log || []; track $index) {
              <div [class]="'ln ln--' + l.level"><span class="ts">{{ stamp(l.t) }}</span><span class="msg">{{ l.msg }}</span></div>
            }
          }
        </div>
      </div>
    }
  `,
  styles: `
    .bl { border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; background: #0b0f17; color: #d1d5db; }
    .bar { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; padding: .5rem .75rem; background: #111827; border-bottom: 1px solid #1f2937; font-size: .8rem; }
    .badge { font-weight: 800; display: inline-flex; align-items: center; gap: .35rem; }
    .bl[data-status='success'] .badge { color: #4ade80; }
    .bl[data-status='failed'] .badge { color: #f87171; }
    .bl[data-status='running'] .badge { color: #fbbf24; }
    .meta { color: #9ca3af; }
    .meta a, .open { color: #93c5fd; text-decoration: none; }
    .open { margin-left: auto; font-weight: 700; }
    .dot { width: .55rem; height: .55rem; border-radius: 50%; background: #fbbf24; }
    .dot--run { animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .3; } }
    .lines { max-height: 22rem; overflow: auto; padding: .5rem 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .75rem; line-height: 1.5; }
    .ln { display: grid; grid-template-columns: 5.5rem 1fr; gap: .5rem; padding: 0 .75rem; }
    .ts { color: #6b7280; user-select: none; }
    .msg { white-space: pre-wrap; word-break: break-word; }
    .ln--warn .msg { color: #fbbf24; }
    .ln--error { background: rgba(248, 113, 113, .08); }
    .ln--error .msg { color: #fca5a5; }
    .ln--success .msg { color: #4ade80; font-weight: 700; }
  `,
})
export class TemplateBuildLogComponent {
  readonly build = input<TemplateBuild | null>(null);
  readonly building = input(false);
  private readonly scroll = viewChild<ElementRef<HTMLElement>>('scroll');

  constructor() {
    effect(() => {
      this.build();
      const el = this.scroll()?.nativeElement;
      if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
    });
  }

  stamp(ms: number): string {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
  }
}
