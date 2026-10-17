import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

const API = environment.apiUrl;
export type StudioMode = 't2v' | 'i2v' | 'talking';
interface Quota { promo?: { active: boolean }; enabled: boolean; fast: { used: number; free: number; price: number }; talking: { used: number; free: number; price: number }; available: number }
interface Job { id: string; status: string; position?: number | null; timings?: Record<string, number> | null; error?: string; videoUrl?: string | null; imageUrl?: string | null; charged?: number; free?: boolean; expiresAt?: string }

/** Self-hosted GPU studio: fast video (Flux schnell → Wan2.2 TI2V-5B → RIFE) and talking avatar (VieNeu/Chatterbox TTS → JoyVASA + LivePortrait). */
@Component({
  selector: 'app-studio-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <div class="panel studio" data-testid="studio-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-2xl">
          <p class="font-display text-xl">{{ 'studio.title.' + mode | t }}</p>
          <p class="mt-1 text-sm text-muted">{{ 'studio.desc.' + mode | t }}</p>
        </div>
        @if (quota(); as q) {
          @if (q.promo?.active) { <span class="chip text-emerald-500" data-testid="studio-promo">🎁 {{ 'gpu.promo.title' | t }}</span> }
          <span class="chip" data-testid="studio-quota">{{ 'studio.quota' | t: { used: kindQuota().used, free: kindQuota().free } }}</span>
        }
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        @for (m of modes; track m) {
          <button type="button" class="btn btn-sm" [class.btn-fill]="mode === m" (click)="setMode(m)">{{ 'studio.mode.' + m | t }}</button>
        }
      </div>

      @if (!loggedIn()) {
        <p class="mt-4 text-sm">{{ 'studio.login' | t }} <a class="link" routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }">{{ 'nav.login' | t }}</a></p>
      } @else {
        <div class="mt-4 grid gap-3">
          @if (mode !== 'talking') {
            <label class="text-sm">{{ (mode === 'i2v' ? 'studio.promptOptional' : 'studio.prompt') | t }}
              <textarea class="input mt-1 w-full" rows="2" maxlength="1000" [(ngModel)]="prompt" data-testid="studio-prompt" [placeholder]="'studio.promptPh' | t"></textarea>
            </label>
          } @else {
            <label class="text-sm">{{ 'studio.text' | t }}
              <textarea class="input mt-1 w-full" rows="3" maxlength="600" [(ngModel)]="text" data-testid="studio-text" [placeholder]="'studio.textPh' | t"></textarea>
            </label>
            <label class="text-sm">{{ 'studio.lang' | t }}
              <select class="input mt-1" [(ngModel)]="lang" data-testid="studio-lang">
                <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option>
              </select>
            </label>
          }
          @if (mode !== 't2v') {
            <label class="text-sm">{{ (mode === 'talking' ? 'studio.face' : 'studio.image') | t }}
              <input type="file" accept="image/png,image/jpeg,image/webp" class="mt-1 block" (change)="pick($event, 'image')" data-testid="studio-image" />
            </label>
            @if (imagePreview()) { <img [src]="imagePreview()" alt="" class="max-h-40 rounded" /> }
          }
          @if (mode === 'talking') {
            <label class="text-sm">{{ 'studio.voice' | t }}
              <input type="file" accept="audio/*" class="mt-1 block" (change)="pick($event, 'voice')" data-testid="studio-voice" />
            </label>
          }
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn btn-fill" [disabled]="busy() || !canSubmit()" (click)="submit()" data-testid="studio-submit">
              {{ (busy() ? 'studio.working' : 'studio.generate') | t }}
            </button>
            @if (priceNote()) { <span class="text-xs text-muted">{{ priceNote() }}</span> }
          </div>
          @if (error()) { <p class="text-sm text-red-600" data-testid="studio-error">{{ error() }}</p> }
          @if (job(); as j) {
            <div class="text-sm" data-testid="studio-status">
              {{ 'studio.status.' + j.status | t }}
              @if (j.status === 'queued' && j.position) { · {{ 'studio.position' | t: { n: j.position } }} }
              · {{ elapsed() }}s
            </div>
            @if (j.timings && j.status === 'succeeded') {
              <p class="text-xs text-muted" data-testid="studio-timings">{{ timingText() }}</p>
            }
          }
          @if (videoSrc()) {
            <video [src]="videoSrc()" controls autoplay loop playsinline class="w-full max-w-3xl rounded" data-testid="studio-video"></video>
            <div class="flex gap-3 text-sm">
              <a class="link" [href]="videoSrc()" download="aimarkets-video.mp4">{{ 'studio.download' | t }}</a>
              <span class="text-muted">{{ 'studio.ttl' | t }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StudioPanelComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  @Input() mode: StudioMode = 't2v';
  @Input() modes: StudioMode[] = ['t2v', 'i2v', 'talking'];

  prompt = '';
  text = '';
  lang: 'vi' | 'en' | 'zh' = 'vi';
  private imageB64 = '';
  private voiceB64 = '';
  readonly imagePreview = signal('');
  readonly quota = signal<Quota | null>(null);
  readonly job = signal<Job | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly videoSrc = signal('');
  readonly elapsed = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = 0;

  readonly loggedIn = computed(() => !!this.auth.user());
  readonly kindQuota = computed(() => {
    const q = this.quota();
    return q ? (this.mode === 'talking' ? q.talking : q.fast) : { used: 0, free: 0, price: 0 };
  });

  ngOnInit(): void { if (this.loggedIn()) this.loadQuota(); }
  ngOnDestroy(): void { this.stop(); if (this.videoSrc()) URL.revokeObjectURL(this.videoSrc()); }

  returnUrl(): string { return typeof location !== 'undefined' ? location.pathname : '/'; }
  setMode(m: StudioMode): void { this.mode = m; this.error.set(''); this.loadQuota(); }

  priceNote(): string {
    const k = this.kindQuota();
    if (!this.quota()) return '';
    if (this.quota()?.promo?.active) return this.i18n.t('studio.freeLeft', { n: Math.max(0, k.free - k.used) });
    return k.used < k.free ? this.i18n.t('studio.freeLeft', { n: k.free - k.used }) : this.i18n.t('studio.paid', { price: k.price.toFixed(2) });
  }

  canSubmit(): boolean {
    if (this.mode === 't2v') return this.prompt.trim().length > 2;
    if (this.mode === 'i2v') return !!this.imageB64;
    return !!this.imageB64 && this.text.trim().length > 0;
  }

  timingText(): string {
    const t = this.job()?.timings || {};
    const order = ['flux', 'wan', 'rife', 'tts', 'animate', 'encode', 'total'];
    return order.filter((k) => t[k] != null).map((k) => `${this.i18n.t('studio.stage.' + k)} ${t[k]}s`).join(' · ');
  }

  private loadQuota(): void {
    this.http.get<Quota>(`${API}/studio/quota`).subscribe({ next: (q) => this.quota.set(q), error: () => {} });
  }

  pick(ev: Event, kind: 'image' | 'voice'): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 8_000_000) { this.error.set(this.i18n.t('studio.tooBig')); return; }
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      if (kind === 'image') { this.imageB64 = s; this.imagePreview.set(s); } else { this.voiceB64 = s; }
    };
    r.readAsDataURL(f);
  }

  submit(): void {
    this.error.set(''); this.busy.set(true); this.job.set(null);
    if (this.videoSrc()) { URL.revokeObjectURL(this.videoSrc()); this.videoSrc.set(''); }
    const url = this.mode === 'talking' ? `${API}/studio/video/talking` : `${API}/studio/video/fast`;
    const body = this.mode === 'talking'
      ? { text: this.text, lang: this.lang, imageBase64: this.imageB64, voiceBase64: this.voiceB64 || undefined }
      : { prompt: this.prompt, imageBase64: this.mode === 'i2v' ? this.imageB64 : undefined };
    this.http.post<Job>(url, body).subscribe({
      next: (j) => { this.job.set(j); this.started = Date.now(); this.poll(j.id); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.error?.message || this.i18n.t('studio.failed')); },
    });
  }

  private poll(id: string): void {
    this.stop();
    let ticks = 0;
    this.timer = setInterval(() => {
      this.elapsed.set(Math.round((Date.now() - this.started) / 1000));
      if (++ticks % 2) return;
      this.http.get<Job>(`${API}/studio/jobs/${id}`).subscribe({
        next: (j) => {
          this.job.set(j);
          if (j.status === 'succeeded' && j.videoUrl) { this.stop(); this.fetchVideo(j.videoUrl); }
          else if (j.status === 'failed') { this.stop(); this.busy.set(false); this.error.set(j.error || this.i18n.t('studio.failed')); this.loadQuota(); }
        },
        error: () => {},
      });
      if (ticks > 1200) { this.stop(); this.busy.set(false); }
    }, 500);
  }

  private fetchVideo(path: string): void {
    const base = API.replace(/\/v1$/, '');
    this.http.get(`${base}${path}`, { responseType: 'blob' }).subscribe({
      next: (b) => { this.videoSrc.set(URL.createObjectURL(b)); this.busy.set(false); this.loadQuota(); },
      error: () => { this.busy.set(false); this.error.set(this.i18n.t('studio.failed')); },
    });
  }

  private stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
