import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

export interface VoiceFx {
  speed: number;
  /** preset id ('tram' | 'tu-nhien' | 'cao') or semitones */
  pitch: string | number;
  lang: string;
}
export const DEFAULT_VOICE_FX: VoiceFx = { speed: 1, pitch: 'tu-nhien', lang: 'vi' };

interface Lang { code: string; label: string; engine?: string }
const FALLBACK_LANGS: Lang[] = [
  { code: 'vi', label: 'Tiếng Việt' }, { code: 'en', label: 'English' }, { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' }, { code: 'ko', label: '한국어' }, { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' }, { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' },
];
let cachedLangs: Lang[] | null = null;

/** Speed (0.5–2×), pitch (Trầm / Tự nhiên / Cao or ±12 semitones) and language for TTS, voice clone and narration. */
@Component({
  selector: 'app-voice-controls',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="vc" [class.vc--dark]="dark" data-testid="voice-controls">
  @if (showLang) {
    <label class="vc-f">Ngôn ngữ
      <select [ngModel]="value.lang" (ngModelChange)="set({ lang: $event })" data-testid="vc-lang">
        @for (l of langs(); track l.code) { <option [value]="l.code">{{ l.label }}</option> }
      </select>
    </label>
  }
  <label class="vc-f">Tốc độ <b>{{ value.speed.toFixed(2) }}×</b>
    <input type="range" min="0.5" max="2" step="0.05" [ngModel]="value.speed" (ngModelChange)="set({ speed: +$event })" data-testid="vc-speed" />
    @if (speedNote) { <small>{{ speedNote }}</small> }
  </label>
  <label class="vc-f">Cao độ
    <span class="vc-seg" role="group">
      @for (p of presets; track p.id) {
        <button type="button" [class.on]="value.pitch === p.id" (click)="set({ pitch: p.id })" [attr.data-testid]="'vc-pitch-' + p.id">{{ p.label }}</button>
      }
      <button type="button" [class.on]="custom()" (click)="set({ pitch: semis() })">Tùy chỉnh</button>
    </span>
    @if (custom()) {
      <span class="vc-row"><input type="range" min="-12" max="12" step="1" [ngModel]="semis()" (ngModelChange)="set({ pitch: +$event })" data-testid="vc-semitones" /> <b>{{ semis() > 0 ? '+' : '' }}{{ semis() }} st</b></span>
    }
  </label>
</div>
  `,
  styles: [`
.vc{display:grid;gap:10px;font-size:13px}
.vc-f{display:grid;gap:4px}
.vc-f b{font-weight:700}
.vc-f small{color:#888;font-size:11px}
.vc select{padding:6px 8px;border-radius:8px;border:1px solid #d0d0d6;background:#fff}
.vc-seg{display:flex;flex-wrap:wrap;gap:4px}
.vc-seg button{border:1px solid #d0d0d6;background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;font-size:12px}
.vc-seg button.on{background:#111;color:#fff;border-color:#111}
.vc-row{display:flex;align-items:center;gap:8px}.vc-row input{flex:1}
.vc--dark select,.vc--dark .vc-seg button{background:#1f2026;color:#e9e9ec;border-color:#2a2c33}
.vc--dark .vc-seg button.on{background:#22d3ee;color:#000;border-color:#22d3ee}
  `],
})
export class VoiceControlsComponent implements OnInit {
  @Input() value: VoiceFx = { ...DEFAULT_VOICE_FX };
  @Output() valueChange = new EventEmitter<VoiceFx>();
  @Input() showLang = true;
  @Input() dark = false;
  /** e.g. talking/film: speed is applied natively by the worker (not time-stretched). */
  @Input() speedNote = '';

  private readonly http = inject(HttpClient);
  readonly langs = signal<Lang[]>(cachedLangs || FALLBACK_LANGS);
  readonly presets = [{ id: 'tram', label: 'Trầm' }, { id: 'tu-nhien', label: 'Tự nhiên' }, { id: 'cao', label: 'Cao' }];

  ngOnInit(): void {
    if (cachedLangs) return;
    const api = environment.apiUrl;
    this.http.get<{ languages?: Lang[] }>(`${api}/studio/voice-options`).subscribe({
      next: (o) => { if (o.languages?.length) { cachedLangs = o.languages; this.langs.set(o.languages); } },
      error: () => undefined,
    });
  }

  custom(): boolean { return typeof this.value.pitch === 'number'; }
  semis(): number { return typeof this.value.pitch === 'number' ? this.value.pitch : ({ tram: -3, cao: 3 } as Record<string, number>)[this.value.pitch] || 0; }

  set(patch: Partial<VoiceFx>): void {
    this.value = { ...this.value, ...patch };
    this.valueChange.emit(this.value);
  }
}

/** Request fields for the API (omits defaults). */
export function voiceFxBody(v: VoiceFx | null | undefined): { speed?: number; pitch?: string | number; lang?: string } {
  if (!v) return {};
  const out: { speed?: number; pitch?: string | number; lang?: string } = { lang: v.lang };
  if (v.speed && Math.abs(v.speed - 1) > 0.001) out.speed = v.speed;
  if (v.pitch !== 'tu-nhien' && v.pitch !== 0) out.pitch = v.pitch;
  return out;
}
