import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { TPipe } from '../../i18n/t.pipe';
import { VoiceControlsComponent, VoiceFx, DEFAULT_VOICE_FX, voiceFxBody } from './voice-controls.component';
import { I18nService } from '../../i18n/i18n.service';

const API = environment.apiUrl;
interface Voice { label: string; id: string }
interface Quota { promo?: { active: boolean }; tts: { used: number; free: number; price: number; unit?: string } }
interface JobStatus { status: string; stage?: string | null; audioUrl?: string; error?: string; timings?: Record<string, number> }

/** Text-to-speech on AI Markets GPUs (RunPod serverless or self-hosted): VieNeu-TTS presets (Giọng sàn) or cloning from a sample (Giọng clone). */
@Component({
  selector: 'app-voice-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, TPipe, VoiceControlsComponent],
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
          @if (!q.promo?.active && q.tts.unit === 'characters' && q.tts.price > 0) {
            <span class="chip text-muted" data-testid="voice-price">{{ 'voice.price' | t: { price: q.tts.price } }}</span>
          }
        }
      </div>
      @if (!loggedIn()) {
        <p class="mt-4 text-sm">{{ 'studio.login' | t }} <a class="link" routerLink="/login">{{ 'nav.login' | t }}</a></p>
      } @else {
        <div class="mt-4 grid gap-3">
          <div class="flex flex-wrap gap-3">
            <app-voice-controls class="min-w-[16rem] flex-1" [(value)]="fx" />
            @if (mode === 'preset' && (fx.lang === 'vi' || fx.lang === 'en')) {
              <label class="text-sm">{{ 'voice.preset' | t }}
                <select class="input mt-1" [(ngModel)]="voice" data-testid="voice-preset">
                  @for (v of voices(); track v.id) { <option [value]="v.id">{{ v.label }}</option> }
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
            <button class="btn btn-fill" type="button" [disabled]="busy() || !text.trim() || (mode === 'clone' && !sample) || (mode === 'preset' && (fx.lang === 'vi' || fx.lang === 'en') && !voice)" (click)="submit()" data-testid="voice-submit">
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
  fx: VoiceFx = { ...DEFAULT_VOICE_FX };
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
    if (this.mode === 'preset') this.loadVoices(1);
  }

  /** The voice list is static catalog data on the server (no GPU needed); retry once on a network blip. */
  private loadVoices(retries: number): void {
    this.http.get<{ vi: Voice[]; default?: string }>(`${API}/studio/voices`).subscribe({
      next: (r) => {
        const list = r.vi || [];
        this.voices.set(list);
        this.voice = this.voice || (list.some((v) => v.id === r.default) ? r.default! : list[0]?.id || '');
        if (!list.length) this.error.set(this.i18n.t('voice.noVoices'));
        else if (this.error() === this.i18n.t('voice.noVoices')) this.error.set('');
      },
      error: (e: HttpErrorResponse) => {
        if (retries > 0) { setTimeout(() => this.loadVoices(retries - 1), 1500); return; }
        this.error.set(e.error?.message || this.i18n.t('voice.noVoices'));
      },
    });
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
    const vieneu = this.fx.lang === 'vi' || this.fx.lang === 'en';
    const body = { text: this.text, ...voiceFxBody(this.fx), voice: this.mode === 'preset' && vieneu ? this.voice : undefined, voiceBase64: this.mode === 'clone' ? this.sample : undefined };
    const t0 = Date.now();
    this.http.post<{ id: string }>(`${API}/studio/tts`, body).subscribe({
      next: (j) => {
        // Async job + polling: a cold GPU start (2-3 min) is just a longer "queued", never a client timeout.
        this.timer = setInterval(() => {
          this.http.get<JobStatus>(`${API}/studio/jobs/${j.id}`).subscribe((s) => {
            const label = s.status === 'queued' && s.stage === 'cold_start' ? this.i18n.t('voice.coldStart') : this.i18n.t('studio.status.' + s.status);
            this.status.set(`${label} · ${Math.round((Date.now() - t0) / 1000)}s`);
            if (s.status === 'succeeded' && s.audioUrl) {
              clearInterval(this.timer!);
              this.http.get(`${API.replace(/\/v1$/, '')}${s.audioUrl}`, { responseType: 'blob' }).subscribe((b) => {
                this.audio.set(URL.createObjectURL(b)); this.busy.set(false);
                if (s.timings?.['tts'] != null) this.status.set(this.i18n.t('voice.done', { s: s.timings['tts'], a: s.timings['audio_sec'] }));
                this.loadQuota();
              });
            } else if (s.status === 'failed') {
              clearInterval(this.timer!); this.busy.set(false); this.status.set(''); this.error.set(s.error || this.i18n.t('voice.failed'));
              this.loadQuota();
            }
          });
        }, 2000);
      },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.status.set(''); this.error.set(e.error?.message || this.i18n.t('voice.failed')); },
    });
  }
}
