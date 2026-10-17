import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

const API = environment.apiUrl;
interface Scene { prompt: string; narration: string }
interface Voice { label: string; id: string }
interface Quota { promo?: { active: boolean }; film?: { used: number; free: number; price: number } }
interface FilmJob { status: string; position?: number | null; videoUrl?: string; imageUrl?: string; error?: string; timings?: Record<string, number> }

/** AI Film / Làm phim AI: scene editor whose graph is rendered by ComfyUI on the AI Markets RTX 5090. */
@Component({
  selector: 'app-ai-film',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <section class="page route-enter" data-testid="ai-film">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="max-w-3xl">
          <h1 class="section-title">{{ 'film.title' | t }}</h1>
          <p class="mt-2 text-muted">{{ 'film.subtitle' | t }}</p>
        </div>
        @if (quota(); as q) {
          <div class="flex gap-2">
            @if (q.promo?.active) { <span class="chip text-emerald-500" data-testid="film-promo">🎁 {{ 'gpu.promo.title' | t }}</span> }
            @if (q.film) { <span class="chip">{{ 'studio.quota' | t: { used: q.film.used, free: q.film.free } }}</span> }
          </div>
        }
      </div>

      @if (!loggedIn()) {
        <p class="panel mt-6 text-sm">{{ 'studio.login' | t }} <a class="link" routerLink="/auth/login">{{ 'nav.login' | t }}</a></p>
      } @else {
        <div class="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div class="panel grid gap-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="text-sm sm:col-span-3">{{ 'film.name' | t }}
                <input class="input mt-1 w-full" maxlength="120" [(ngModel)]="title" data-testid="film-title" [placeholder]="'film.namePh' | t" />
              </label>
              <label class="text-sm">{{ 'studio.lang' | t }}
                <select class="input mt-1 w-full" [(ngModel)]="lang" data-testid="film-lang">
                  <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option>
                </select>
              </label>
              @if (lang !== 'zh') {
                <label class="text-sm sm:col-span-2">{{ 'film.narrator' | t }}
                  <select class="input mt-1 w-full" [(ngModel)]="voice" data-testid="film-voice">
                    @for (v of voices(); track v.id) { <option [value]="v.id">{{ v.label }}</option> }
                  </select>
                </label>
              }
            </div>

            @for (s of scenes; track $index; let i = $index) {
              <div class="rounded-xl border border-line p-3" [attr.data-testid]="'film-scene-' + i">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold">🎬 {{ 'film.scene' | t: { n: i + 1 } }}</p>
                  @if (scenes.length > 1) { <button type="button" class="link text-xs" (click)="remove(i)" [disabled]="busy()">{{ 'film.remove' | t }}</button> }
                </div>
                <label class="mt-2 block text-xs text-muted">{{ 'film.shot' | t }}
                  <textarea class="input mt-1 w-full" rows="2" maxlength="600" [(ngModel)]="s.prompt" [attr.data-testid]="'film-prompt-' + i" [placeholder]="'film.shotPh' | t"></textarea>
                </label>
                <label class="mt-2 block text-xs text-muted">{{ 'film.voiceover' | t }}
                  <textarea class="input mt-1 w-full" rows="2" maxlength="400" [(ngModel)]="s.narration" [attr.data-testid]="'film-narration-' + i" [placeholder]="'film.voiceoverPh' | t"></textarea>
                </label>
              </div>
            }
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="btn" (click)="add()" [disabled]="busy() || scenes.length >= 6" data-testid="film-add">＋ {{ 'film.add' | t }}</button>
              <button type="button" class="btn btn-fill" (click)="submit()" [disabled]="busy() || !ready()" data-testid="film-submit">
                {{ (busy() ? 'studio.working' : 'film.create') | t }}
              </button>
            </div>
            <p class="text-xs text-muted">{{ 'film.models' | t }}</p>
          </div>

          <div class="panel grid content-start gap-3" data-testid="film-output">
            <p class="font-display text-lg">{{ 'film.preview' | t }}</p>
            @if (busy()) {
              <div class="grid gap-2" data-testid="film-progress">
                <div class="h-2 overflow-hidden rounded-full bg-line"><div class="h-full rounded-full bg-emerald-500 transition-all duration-700" [style.width.%]="pct()"></div></div>
                <p class="text-sm text-muted" data-testid="film-status">{{ status() }}</p>
              </div>
            }
            @if (error()) { <p class="text-sm text-red-600" data-testid="film-error">{{ error() }}</p> }
            @if (video()) {
              <video [src]="video()" controls autoplay playsinline class="w-full rounded-xl bg-black" data-testid="film-video"></video>
              <p class="text-sm text-muted">{{ done() }}</p>
              <a class="link text-sm" [href]="video()" download="aimarkets-film.mp4">{{ 'film.download' | t }}</a>
            } @else if (!busy()) {
              <p class="text-sm text-muted">{{ 'film.empty' | t }}</p>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class AiFilmComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  title = '';
  lang: 'vi' | 'en' | 'zh' = 'vi';
  voice = '';
  scenes: Scene[] = [{ prompt: '', narration: '' }, { prompt: '', narration: '' }];
  readonly voices = signal<Voice[]>([]);
  readonly quota = signal<Quota | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly status = signal('');
  readonly pct = signal(0);
  readonly video = signal('');
  readonly done = signal('');
  readonly loggedIn = computed(() => !!this.auth.user());
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(SeoService).set({ title: this.i18n.t('film.title'), description: this.i18n.t('film.subtitle') });
  }

  ngOnInit(): void {
    if (!this.loggedIn()) return;
    this.loadQuota();
    this.http.get<{ vi: Voice[] }>(`${API}/studio/voices`).subscribe({
      next: (r) => { this.voices.set(r.vi || []); this.voice = this.voice || r.vi?.[0]?.id || ''; },
      error: () => {},
    });
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); if (this.video()) URL.revokeObjectURL(this.video()); }

  ready(): boolean { return this.scenes.some((s) => s.prompt.trim().length >= 3); }
  add(): void { if (this.scenes.length < 6) this.scenes = [...this.scenes, { prompt: '', narration: '' }]; }
  remove(i: number): void { this.scenes = this.scenes.filter((_, k) => k !== i); }
  private loadQuota(): void { this.http.get<Quota>(`${API}/studio/quota`).subscribe({ next: (q) => this.quota.set(q), error: () => {} }); }

  submit(): void {
    const scenes = this.scenes.filter((s) => s.prompt.trim().length >= 3);
    this.busy.set(true); this.error.set(''); this.pct.set(3); this.done.set('');
    if (this.video()) { URL.revokeObjectURL(this.video()); this.video.set(''); }
    this.status.set(this.i18n.t('studio.status.queued'));
    const t0 = Date.now();
    const est = 22 * scenes.length + 6; // seconds: ~17s per shot + voice + mux on the 5090
    this.http.post<{ id: string }>(`${API}/studio/film`, { title: this.title, lang: this.lang, voice: this.lang === 'zh' ? undefined : this.voice, scenes }).subscribe({
      next: (j) => {
        this.timer = setInterval(() => {
          this.http.get<FilmJob>(`${API}/studio/jobs/${j.id}`).subscribe((s) => {
            const sec = Math.round((Date.now() - t0) / 1000);
            if (s.status === 'queued') {
              this.status.set(`${this.i18n.t('studio.status.queued')}${s.position ? ' · ' + this.i18n.t('studio.position', { n: s.position }) : ''} · ${sec}s`);
            } else if (s.status === 'running') {
              const n = Math.min(scenes.length, Math.floor(sec / (est / scenes.length)) + 1);
              this.pct.set(Math.min(95, Math.round((sec / est) * 100)));
              this.status.set(`${this.i18n.t('film.rendering', { n, total: scenes.length })} · ${sec}s`);
            }
            if (s.status === 'succeeded' && s.videoUrl) {
              clearInterval(this.timer!);
              this.pct.set(100);
              this.http.get(`${API.replace(/\/v1$/, '')}${s.videoUrl}`, { responseType: 'blob' }).subscribe((b) => {
                this.video.set(URL.createObjectURL(b)); this.busy.set(false);
                this.done.set(this.i18n.t('film.done', { n: scenes.length, s: Math.round(s.timings?.['total'] ?? sec) }));
                this.loadQuota();
              });
            } else if (s.status === 'failed') {
              clearInterval(this.timer!); this.busy.set(false); this.error.set(s.error || this.i18n.t('studio.failed'));
            }
          });
        }, 1500);
      },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.status.set(''); this.error.set(e.error?.message || this.i18n.t('studio.failed')); },
    });
  }
}
