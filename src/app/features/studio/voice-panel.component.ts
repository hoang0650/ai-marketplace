import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

const API = environment.apiUrl;
interface Voice { label: string; id: string }
interface Quota { promo?: { active: boolean }; tts: { used: number; free: number; price: number } }

/** Text-to-speech on the AI Markets RTX 5090: VieNeu-TTS presets (Giọng sàn) or cloning from a sample (Giọng clone). */
@Component({
  selector: 'app-voice-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe],
  template: `
    <div class="panel" data-testid="voice-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-2xl">
          <p class="font-display text-xl">{{ 'voice.title.' + mode | t }}</p>
          <p class="mt-1 text-sm text-muted">{{ 'voice.desc.' + mode | t }}</p>
        </div>
        @if (quota(); as q) {
          @if (q.promo?.active) { <span class="chip text-emerald-500" data-testid="voice-promo">🎁 {{ 'gpu.promo.title' | t }}</span> }
          <span class="chip">{{ 'studio.quota' | t: { used: q.tts.used, free: q.tts.free } }}</span>
        }
      </div>
      @if (!loggedIn()) {
        <p class="mt-4 text-sm">{{ 'studio.login' | t }} <a class="link" routerLink="/login">{{ 'nav.login' | t }}</a></p>
      } @else {
        <div class="mt-4 grid gap-3">
          <div class="flex flex-wrap gap-3">
            <label class="text-sm">{{ 'studio.lang' | t }}
              <select class="input mt-1" [(ngModel)]="lang" data-testid="voice-lang">
                <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option>
              </select>
            </label>
            @if (mode === 'preset' && lang !== 'zh') {
              <label class="text-sm">{{ 'voice.preset' | t }}
                <select class="input mt-1" [(ngModel)]="voice" data-testid="voice-preset">
                  @for (v of voices(); track v.id) { <option [value]="v.label">{{ v.label }}</option> }
                </select>
              </label>
            }
          </div>
          @if (mode === 'clone') {
            <label class="text-sm">{{ 'voice.sample' | t }}
              <input type="file" accept="audio/*" class="mt-1 block" (change)="pick($event)" data-testid="voice-sample" />
            </label>
          }
          <label class="text-sm">{{ 'studio.text' | t }}
            <textarea class="input mt-1 w-full" rows="3" maxlength="2000" [(ngModel)]="text" data-testid="voice-text" [placeholder]="'studio.textPh' | t"></textarea>
          </label>
          <div class="flex items-center gap-3">
            <button class="btn btn-fill" type="button" [disabled]="busy() || !text.trim() || (mode === 'clone' && !sample)" (click)="submit()" data-testid="voice-submit">
              {{ (busy() ? 'studio.working' : 'voice.generate') | t }}
            </button>
            @if (status()) { <span class="text-sm text-muted" data-testid="voice-status">{{ status() }}</span> }
          </div>
          @if (error()) { <p class="text-sm text-red-600" data-testid="voice-error">{{ error() }}</p> }
          @if (audio()) {
            <audio [src]="audio()" controls class="w-full max-w-xl" data-testid="voice-audio"></audio>
            <a class="link text-sm" [href]="audio()" download="aimarkets-voice.wav">{{ 'voice.download' | t }}</a>
          }
        </div>
      }
    </div>
  `,
})
export class VoicePanelComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  @Input() mode: 'preset' | 'clone' = 'preset';
  text = '';
  lang: 'vi' | 'en' | 'zh' = 'vi';
  voice = '';
  sample = '';
  readonly voices = signal<Voice[]>([]);
  readonly quota = signal<Quota | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly status = signal('');
  readonly audio = signal('');
  readonly loggedIn = computed(() => !!this.auth.user());
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.loggedIn()) return;
    this.loadQuota();
    if (this.mode === 'preset') {
      this.http.get<{ vi: Voice[] }>(`${API}/studio/voices`).subscribe({
        next: (r) => { this.voices.set(r.vi || []); this.voice = this.voice || r.vi?.[0]?.label || ''; },
        error: (e: HttpErrorResponse) => this.error.set(e.error?.message || this.i18n.t('studio.failed')),
      });
    }
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); if (this.audio()) URL.revokeObjectURL(this.audio()); }

  private loadQuota(): void { this.http.get<Quota>(`${API}/studio/quota`).subscribe({ next: (q) => this.quota.set(q), error: () => {} }); }

  pick(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 4_000_000) { this.error.set(this.i18n.t('studio.tooBig')); return; }
    const r = new FileReader();
    r.onload = () => (this.sample = String(r.result || ''));
    r.readAsDataURL(f);
  }

  submit(): void {
    this.busy.set(true); this.error.set(''); this.status.set(this.i18n.t('studio.status.queued'));
    if (this.audio()) { URL.revokeObjectURL(this.audio()); this.audio.set(''); }
    const body = { text: this.text, lang: this.lang, voice: this.mode === 'preset' && this.lang !== 'zh' ? this.voice : undefined, voiceBase64: this.mode === 'clone' ? this.sample : undefined };
    const t0 = Date.now();
    this.http.post<{ id: string }>(`${API}/studio/tts`, body).subscribe({
      next: (j) => {
        this.timer = setInterval(() => {
          this.http.get<{ status: string; audioUrl?: string; error?: string; timings?: Record<string, number> }>(`${API}/studio/jobs/${j.id}`).subscribe((s) => {
            this.status.set(`${this.i18n.t('studio.status.' + s.status)} · ${Math.round((Date.now() - t0) / 1000)}s`);
            if (s.status === 'succeeded' && s.audioUrl) {
              clearInterval(this.timer!);
              this.http.get(`${API.replace(/\/v1$/, '')}${s.audioUrl}`, { responseType: 'blob' }).subscribe((b) => {
                this.audio.set(URL.createObjectURL(b)); this.busy.set(false);
                if (s.timings?.['tts'] != null) this.status.set(this.i18n.t('voice.done', { s: s.timings['tts'], a: s.timings['audio_sec'] }));
                this.loadQuota();
              });
            } else if (s.status === 'failed') {
              clearInterval(this.timer!); this.busy.set(false); this.error.set(s.error || this.i18n.t('studio.failed'));
            }
          });
        }, 1000);
      },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.status.set(''); this.error.set(e.error?.message || this.i18n.t('studio.failed')); },
    });
  }
}
