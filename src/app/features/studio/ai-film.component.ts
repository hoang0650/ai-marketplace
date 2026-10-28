import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { CurrencyService } from '../../i18n/currency.service';
import { FILM_V2_MESSAGES } from './film-v2.messages';
import { FILM_LANG_MESSAGES } from './film-lang.messages';

const API = environment.apiUrl;
const FILM = `${API}/studio/film`;
const OLD_STORE = 'aimarkets.film.project.v2';
const MIGRATED = 'aimarkets.film.migrated';
const LAST = 'aimarkets.film.last';
const FPS = 30;
const MAX_SEC = 7200;

type Camera = 'static' | 'push-in' | 'pull-out' | 'pan-left' | 'pan-right' | 'orbit' | 'tilt-up' | 'handheld' | 'aerial';
interface Version { v: number; videoKey: string; frameKey: string; prompt: string; seed: number; seconds: number; createdAt?: string }
interface Shot { sid: string; prompt: string; duration: number; status: string; error?: string; active: number; versions: Version[] }
interface Scene {
  sid: string; title?: string; prompt: string; narration: string; voice: string; lang?: string; camera: Camera; transition?: string; duration: number;
  videoModel?: string; imageModel?: string; source: 'ai' | 'upload'; uploadId?: string; startUploadId?: string; chainPrev?: boolean; characterIds?: string[]; settingId?: string | null;
  status: string; error?: string; generation?: number; keyframes?: { v: number; frameKey: string }[]; shots: Shot[];
}
interface AssetImg { key: string; source: string; url: string }
interface Asset { id: string; type: 'character' | 'setting'; name: string; description: string; status: string; images: AssetImg[] }
interface Upload { uid: string; kind: 'video' | 'image' | 'audio'; name: string; key: string; size: number; duration?: number; status: string }
interface Render { job: string; key: string; status: string; duration?: number; bytes?: number; createdAt?: string }
interface Project {
  id: string; title: string; lang?: string; subtitles?: SubMode; scenes: Scene[]; uploads: Upload[]; music: { uploadId?: string; volume?: number };
  renders: Render[]; totalSeconds: number; maxSeconds: number; media: Record<string, string>;
}
interface ProjectRow { id: string; title: string; scenes: number; totalSeconds: number }
interface FilmLang { code: string; name: string; engine: string; font: string; rtl: boolean; defaultVoice: string }
interface FilmModel { marketplacePricing?: { usageRate: number; usageUnit: string; currency: string }; id: string; name: string; kind: 'image' | 'video'; modality: string; available: boolean; reason: string; durations: number[]; acceptsReferences: boolean; productSlug: string }
interface Config { modelCatalog?: FilmModel[]; available: boolean; perSecond: number; perImage: number; ttsPerK: number; sceneMaxSec: number; projectMaxSec: number; languages?: FilmLang[]; voices?: Record<string, Voice[]> }
type SubMode = 'off' | 'soft' | 'burn';
interface EstItem { sid: string; shots: number[]; seconds: number; images: number; price: number }
interface Estimate { items: EstItem[]; total: number; render: { ttsChars: number; price: number }; available: number }
interface Voice { id: string; name: string; gender: string; region?: string; kind: 'preset' | 'clone' | 'builtin' }
interface Seg { scene: Scene; idx: number; start: number; dur: number; shot: number; video: string; thumb: string; offset: number }
interface Confirm { imageModel?: string; kind: 'scenes' | 'render' | 'asset' | 'shot'; assetId?: string; sceneSid?: string; shotSid?: string; items: EstItem[]; total: number; balance: number; renderLine?: string }

/** Same catalog as GET /studio/film/config (languages + voices); used until the config loads. */
const PRESET_VOICES: Omit<Voice, 'kind'>[] = [
  { id: 'Binh', name: 'Bình', gender: 'male', region: 'bac' }, { id: 'Tuyen', name: 'Tuyên', gender: 'male', region: 'bac' },
  { id: 'Ly', name: 'Ly', gender: 'female', region: 'bac' }, { id: 'Ngoc', name: 'Ngọc', gender: 'female', region: 'bac' },
  { id: 'Vinh', name: 'Vĩnh', gender: 'male', region: 'nam' }, { id: 'Doan', name: 'Đoan', gender: 'female', region: 'nam' },
];
const LANG_NAMES: [string, string][] = [
  ['vi', 'Tiếng Việt'], ['en', 'English'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['es', 'Español'], ['it', 'Italiano'], ['pt', 'Português'], ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['ms', 'Bahasa Melayu'],
  ['nl', 'Nederlands'], ['pl', 'Polski'], ['tr', 'Türkçe'], ['sv', 'Svenska'], ['da', 'Dansk'], ['fi', 'Suomi'], ['no', 'Norsk'],
  ['el', 'Ελληνικά'], ['he', 'עברית'], ['sw', 'Kiswahili'],
];
const LANG_FONTS: Record<string, string> = { zh: 'Noto Sans CJK SC', ja: 'Noto Sans CJK JP', ko: 'Noto Sans CJK KR', ar: 'Noto Sans Arabic', he: 'Noto Sans Hebrew', hi: 'Noto Sans Devanagari' };
export const FALLBACK_LANGS: FilmLang[] = LANG_NAMES.map(([code, name]) => ({
  code, name, engine: code === 'vi' ? 'vieneu' : 'chatterbox', font: LANG_FONTS[code] || 'Noto Sans', rtl: code === 'ar' || code === 'he', defaultVoice: code === 'vi' ? 'Binh' : 'default',
}));
export function fallbackVoices(lang: string): Voice[] {
  const list = PRESET_VOICES.map((v) => ({ ...v, kind: (lang === 'vi' ? 'preset' : 'clone') as Voice['kind'] }));
  return lang === 'vi' ? list : [{ id: 'default', name: 'Chatterbox', gender: 'female', kind: 'builtin' }, ...list];
}
/** CSS font stack for subtitles in the preview (matches the export's Noto fonts). */
const CSS_FONT: Record<string, string> = {
  zh: "'Noto Sans CJK SC','Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif", ja: "'Noto Sans CJK JP','Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif",
  ko: "'Noto Sans CJK KR','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif", ar: "'Noto Sans Arabic',Tahoma,sans-serif",
  he: "'Noto Sans Hebrew',Arial,sans-serif", hi: "'Noto Sans Devanagari','Nirmala UI',sans-serif",
};
export const CAMERA_LABEL: Record<Camera, string> = {
  static: 'Đứng yên', 'push-in': 'Tiến vào', 'pull-out': 'Lùi ra', 'pan-left': 'Lia trái', 'pan-right': 'Lia phải', orbit: 'Xoay quanh',
  'tilt-up': 'Ngước lên', handheld: 'Cầm tay', aerial: 'Flycam',
};
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
const uid = () => Math.random().toString(36).slice(2, 10);
/** Same split as the API/AI service: Wan 2.2 on RunPod takes 8 s / 5 s clips; fewest shots within -2..+1 s of the target (max 60). */
export function splitDuration(total: number): number[] {
  const t = Math.max(5, Math.min(60, Math.round((Number(total) || 0) / 5) * 5 || 5));
  for (let n = 1; n <= 20; n += 1) {
    let best: { a: number; score: number } | null = null;
    for (let a = n; a >= 0; a -= 1) {
      const sum = 8 * a + 5 * (n - a);
      if (sum < t - 2 || sum > Math.min(t + 1, 60)) continue;
      const score = Math.abs(sum - t) * 2 + (sum > t ? 1 : 0);
      if (!best || score < best.score) best = { a, score };
    }
    if (best) return [...Array(best.a).fill(8), ...Array(n - best.a).fill(5)];
  }
  return [5];
}

/** AI film editor: server-saved projects up to 120 min, 5–60 s chained scenes (Wan 2.2 I2V on RunPod, per-second pricing shown before generating), uploads/music in MinIO, final ffmpeg join on the AI service. */
@Component({
  selector: 'app-ai-film',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
<div class="ed" data-testid="film-editor">
  <header class="ed-top">
    <div class="ed-brand">🎬 <span>{{ t('film.title') }}</span></div>
    @if (loggedIn()) {
      <select class="ed-proj" [ngModel]="project()?.id" (ngModelChange)="open($event)" [title]="t('film.v2.projects')" data-testid="film-projects">
        @for (r of projects(); track r.id) { <option [value]="r.id">{{ r.title }} · {{ tcShort(r.totalSeconds) }}</option> }
      </select>
      <button class="ed-btn" (click)="newProject()" [title]="t('film.v2.newProject')" data-testid="film-new-project">＋</button>
      <button class="ed-btn" (click)="deleteProject()" [disabled]="!project()" [title]="t('film.v2.deleteProject')">🗑</button>
    }
    <input class="ed-title" [(ngModel)]="title" (ngModelChange)="edit()" [placeholder]="t('film.ed.untitled')" [disabled]="!project()" data-testid="film-title" />
    <div class="ed-top-r">
      <span class="ed-count" data-testid="film-length">{{ t('film.v2.length', { n: scenes().length, t: tcShort(total()) }) }}</span>
      <span class="ed-muted ed-save">{{ saveState() }}</span>
      <button class="ed-btn" (click)="generateAll()" [disabled]="!canGenerate() || busyBatch()" data-testid="film-gen-all">✨ {{ t('film.v2.genAll') }}</button>
      <button class="ed-btn ed-primary" (click)="render()" [disabled]="!canGenerate() || renderActive() || !scenes().length" data-testid="film-submit">
        {{ renderActive() ? t('film.ed.working') : '⤓ ' + t('film.v2.render') }}
      </button>
    </div>
  </header>

  @if (!loggedIn()) {
    <div class="ed-banner">{{ t('film.v2.loginBanner') }} <a routerLink="/auth/login">{{ t('film.ed.login') }}</a></div>
  }
  @if (cfg(); as c) {
    @if (!c.available) { <div class="ed-banner ed-warn" data-testid="gpu-offline">⚠ {{ t('film.v2.unavailable') }}</div> }
  }
  @if (msg()) { <div class="ed-banner" [class.ed-err]="msgErr()" data-testid="film-status">{{ msg() }}</div> }

  <nav class="ed-mtabs">
    @for (id of mobileTabs; track id) { <button [class.on]="mtab() === id" (click)="mtab.set(id)">{{ t('film.ed.tab.' + id) }}</button> }
  </nav>

  <div class="ed-main">
    <aside class="ed-panel ed-left" [class.m-show]="mtab() === 'lib'">
      <div class="ed-tabs">
        @for (id of libTabs; track id) { <button [class.on]="lib() === id" (click)="lib.set(id)" [attr.data-testid]="'lib-' + id">{{ t('film.ed.lib.' + id) }}</button> }
      </div>
      <div class="ed-lib">
        @switch (lib()) {
          @case ('scenes') {
            <button class="ed-btn ed-block" (click)="addScene()" [disabled]="!project()" data-testid="film-add">＋ {{ t('film.ed.newScene') }}</button>
            <div class="ed-grid">
              @for (c of scenes(); track c.sid; let i = $index) {
                <button class="ed-thumb" [class.sel]="c.sid === selId()" (click)="select(c.sid)">
                  @if (thumbOf(c); as th) { <img [src]="th" alt="" loading="lazy" /> } @else { <span class="ed-ph">{{ i + 1 }}</span> }
                  <span class="ed-badge" [attr.data-s]="c.status">{{ stateLabel(c.status) }}</span>
                  <span class="ed-cap">{{ t('film.scene', { n: i + 1 }) }} · {{ secondsOf(c) }}s</span>
                </button>
              }
            </div>
          }
          @case ('cast') { <ng-container *ngTemplateOutlet="assetLib; context: { type: 'character' }"></ng-container> }
          @case ('sets') { <ng-container *ngTemplateOutlet="assetLib; context: { type: 'setting' }"></ng-container> }
          @case ('uploads') {
            <label class="ed-btn ed-block" [class.dis]="!project()">⤒ {{ t('film.ed.upload') }}<input type="file" accept="image/*,video/*,audio/*" multiple hidden (change)="upload($event)" [disabled]="!project()" data-testid="film-upload" /></label>
            <p class="ed-muted">{{ t('film.v2.uploadHint') }}</p>
            @for (u of uploading(); track u.name) { <div class="ed-muted">{{ t('film.v2.uploading', { name: u.name, p: u.p }) }}</div> }
            <div class="ed-grid">
              @for (m of uploads(); track m.uid) {
                @if (m.kind !== 'audio') {
                  <div class="ed-thumb">
                    @if (m.kind === 'image') { <img [src]="media(m.key)" alt="" loading="lazy" /> } @else { <video [src]="media(m.key)" muted preload="metadata"></video> }
                    <span class="ed-cap">{{ m.name }}@if (m.duration) { · {{ round(m.duration) }}s }</span>
                    @if (m.kind === 'video') { <button class="ed-add" (click)="useVideo(m)" [title]="t('film.ed.addTimeline')">＋</button> }
                    @else { <button class="ed-add" (click)="useStart(m)" [title]="t('film.v2.useStart')" [disabled]="!sel() || sel()!.source !== 'ai'">⇥</button> }
                    <button class="ed-del" (click)="removeUpload(m)" [title]="t('film.v2.remove')">✕</button>
                  </div>
                }
              }
            </div>
          }
          @case ('audio') {
            <label>{{ t('film.lang.project') }}
              <select [ngModel]="projectLang()" (ngModelChange)="setProjectLang($event)" [disabled]="!project()" data-testid="film-project-lang">
                @for (l of langs(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
              </select>
            </label>
            <p class="ed-muted">{{ t('film.lang.hint') }}</p>
            <h4>{{ t('film.voice.forLang', { l: langName(sel() ? langOf(sel()!) : projectLang()) }) }}</h4>
            @for (v of voices(); track v.id) {
              <button class="ed-row" [class.sel]="sel()?.voice === v.id" (click)="setVoice(v.id)" [attr.data-testid]="'film-voice-' + v.id">🎙 {{ voiceLabel(v) }}</button>
            }
            <h4>{{ t('film.ed.music') }}</h4>
            <label class="ed-btn ed-block">♫ {{ t('film.ed.uploadMusic') }}<input type="file" accept="audio/*" hidden (change)="upload($event)" [disabled]="!project()" /></label>
            @for (m of uploads(); track m.uid) {
              @if (m.kind === 'audio') {
                <div class="ed-row" [class.sel]="music().uploadId === m.uid">
                  <span (click)="setMusic(m.uid)" [title]="t('film.v2.useMusic')">♫ {{ m.name }}@if (m.duration) { · {{ tcShort(m.duration) }} }</span>
                  <button class="ed-x" (click)="music().uploadId === m.uid ? setMusic('') : removeUpload(m)">✕</button>
                </div>
              }
            }
            @if (music().uploadId) {
              <label class="ed-muted">{{ t('film.v2.musicVol') }} {{ round((music().volume ?? 0.3) * 100) }}%
                <input type="range" min="0" max="1" step="0.05" [ngModel]="music().volume ?? 0.3" (ngModelChange)="setVolume($event)" /></label>
            }
            <p class="ed-muted">{{ t('film.v2.musicHint') }}</p>
          }
          @case ('text') {
            <p class="ed-muted">{{ t('film.ed.subsHint') }}</p>
            <label class="ed-check"><input type="checkbox" [(ngModel)]="subtitles" /> {{ t('film.ed.showSubs') }}</label>
            <label>{{ t('film.subs.export') }}
              <select [ngModel]="project()?.subtitles || 'off'" (ngModelChange)="setSubtitles($event)" [disabled]="!project()" data-testid="film-subs-mode">
                @for (m of subModes; track m) { <option [value]="m">{{ t('film.subs.' + m) }}</option> }
              </select>
            </label>
            <p class="ed-muted">{{ t('film.subs.exportHint') }}</p>
            @for (c of scenes(); track c.sid; let i = $index) {
              <button class="ed-row" (click)="select(c.sid)">💬 {{ i + 1 }}. {{ c.narration || t('film.ed.noNarration') }}</button>
            }
          }
        }
      </div>
    </aside>

    <section class="ed-center" [class.m-show]="mtab() === 'preview'">
      <div class="ed-stage" data-testid="film-preview">
        @if (finalVideo()) {
          <video [src]="finalVideo()" controls class="ed-media" data-testid="film-video"></video>
        } @else if (seg(); as g) {
          @if (g.video) {
            <video #clipEl [src]="g.video" class="ed-media" muted playsinline preload="auto"></video>
          } @else if (g.thumb) {
            <img [src]="g.thumb" class="ed-media" [class.kb]="playing()" alt="" />
          } @else {
            <div class="ed-empty"><b>{{ t('film.scene', { n: g.idx + 1 }) }}</b><span>{{ g.scene.prompt || t('film.ed.emptyPrompt') }}</span></div>
          }
          @if (subtitles && g.scene.narration) { <div class="ed-sub" [attr.lang]="langOf(g.scene)" [attr.dir]="isRtl(langOf(g.scene)) ? 'rtl' : null" [style.font-family]="subFont(langOf(g.scene))" data-testid="film-sub">{{ g.scene.narration }}</div> }
          @if (g.scene.status === 'generating') { <div class="ed-spin">{{ t('film.v2.generating', { n: secondsOf(g.scene) }) }}</div> }
        } @else {
          <div class="ed-empty"><b>{{ t('film.ed.noScenes') }}</b><span>{{ t('film.ed.noScenesHint') }}</span></div>
        }
      </div>
      <div class="ed-ctrl">
        <button class="ed-btn" (click)="seek(0)" [title]="t('film.ed.rewind')">⏮</button>
        <button class="ed-btn ed-play" (click)="toggle()" data-testid="film-play">{{ playing() ? '⏸' : '▶' }}</button>
        <span class="ed-tc" data-testid="film-timecode">{{ tc(playhead()) }} / {{ tc(total()) }}</span>
        @if (lastRender(); as r) {
          @if (finalVideo()) { <button class="ed-btn" (click)="finalVideo.set('')">{{ t('film.ed.backEdit') }}</button> }
          @else { <button class="ed-btn" (click)="finalVideo.set(media(r.key))" data-testid="film-last-render">🎞 {{ t('film.v2.lastRender') }} · {{ tcShort(r.duration || 0) }}</button> }
          <a class="ed-btn" [href]="media(r.key)" target="_blank" rel="noopener" download="phim-ai.mp4">{{ t('film.download') }}</a>
        }
      </div>
    </section>

    <aside class="ed-panel ed-right" [class.m-show]="mtab() === 'props'" data-testid="film-inspector">
      @if (sel(); as c) {
        <h3>{{ t('film.ed.props', { n: index(c.sid) + 1 }) }} · <span class="ed-badge-i" [attr.data-s]="c.status">{{ stateLabel(c.status) }}</span></h3>
        @if (c.source === 'upload') {
          <p class="ed-muted">🎞 {{ t('film.v2.upload') }}: {{ uploadName(c.uploadId) }} · {{ secondsOf(c) }}s</p>
        } @else {
          <label>{{ t('film.models.videoPrompt') }}
            <textarea rows="5" maxlength="600" [(ngModel)]="c.prompt" (ngModelChange)="edit()" [placeholder]="t('film.models.videoPromptHint')" [disabled]="c.status === 'generating'" [attr.data-testid]="'film-prompt-' + index(c.sid)"></textarea>
          </label>
          <label>{{ t('film.models.video') }}
            <select [ngModel]="c.videoModel || 'wan-2-2-i2v-720'" (ngModelChange)="c.videoModel = $event; edit()" [disabled]="c.status === 'generating'" data-testid="film-video-model">
              @for (m of models('video'); track m.id) { <option [value]="m.id" [disabled]="!m.available">{{ m.name }} - {{ modelPrice(m) }}{{ m.available ? '' : ' - ' + m.reason }}</option> }
            </select>
          </label>
          <label>{{ t('film.models.image') }}
            <select [ngModel]="c.imageModel || 'qwen-image-edit-2511'" (ngModelChange)="c.imageModel = $event; edit()" [disabled]="c.status === 'generating'" data-testid="film-image-model">
              @for (m of models('image'); track m.id) { <option [value]="m.id" [disabled]="!m.available">{{ m.name }} - {{ modelPrice(m) }}{{ m.available ? '' : ' - ' + m.reason }}</option> }
            </select>
          </label>
          <p class="ed-muted">{{ t('film.models.hint') }}</p>

        }
        <label>{{ t('film.ed.narration') }}
          <textarea rows="3" [(ngModel)]="c.narration" (ngModelChange)="edit()" [placeholder]="t('film.ed.narrationPh')" [attr.data-testid]="'film-narration-' + index(c.sid)" [attr.lang]="langOf(c)" [attr.dir]="isRtl(langOf(c)) ? 'rtl' : null"></textarea>
        </label>
        @if (langOf(c) !== i18n.lang()) { <p class="ed-muted">{{ t('film.lang.writeIn', { l: langName(langOf(c)) }) }}</p> }
        <label>{{ t('film.lang.scene') }}
          <select [ngModel]="c.lang || ''" (ngModelChange)="setSceneLang(c, $event)" data-testid="film-scene-lang">
            <option value="">{{ t('film.lang.inherit', { l: langName(projectLang()) }) }}</option>
            @for (l of langs(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
          </select>
        </label>
        <label>{{ t('film.ed.voice') }}
          <select [(ngModel)]="c.voice" (ngModelChange)="edit()" data-testid="film-voice">
            @for (v of voices(); track v.id) { <option [value]="v.id">{{ voiceLabel(v) }}</option> }
          </select>
        </label>
        @if (c.source === 'ai') {
          <label>{{ t('film.v2.duration', { n: c.duration, shots: splitLabel(c.duration, c.videoModel) }) }}
            <input type="range" min="5" max="60" step="5" [(ngModel)]="c.duration" (ngModelChange)="edit()" [disabled]="c.status === 'generating'" data-testid="film-duration" />
          </label>
          @if (c.status === 'stale') { <p class="ed-errtxt">{{ t('film.v2.staleHint') }}</p> }
          <label>{{ t('film.ed.camera') }}
            <select [(ngModel)]="c.camera" (ngModelChange)="edit()">
              @for (id of cameras; track id) { <option [value]="id">{{ camLabel(id) }}</option> }
            </select>
          </label>
          @if (index(c.sid) > 0) {
            <label class="ed-check"><input type="checkbox" [(ngModel)]="c.chainPrev" (ngModelChange)="edit()" data-testid="film-chain" /> {{ t('film.v2.chain') }}</label>
          }
          <div class="ed-refs" data-testid="film-refs">
            <b>{{ t('film.v2.cast') }}</b>
            <div class="ed-chips">
              @for (a of assetsOf('character'); track a.id) {
                <button class="ed-chip" [class.on]="usesRef(a)" (click)="toggleRef(a)" [disabled]="c.status === 'generating'" [attr.data-testid]="'ref-' + a.id">
                  @if (a.images[0]; as im) { <img [src]="im.url" alt="" /> } {{ a.name }}</button>
              } @empty { <button class="ed-chip" (click)="lib.set('cast'); mtab.set('lib')">＋ {{ t('film.v2.castNew') }}</button> }
            </div>
            <label>{{ t('film.v2.setting') }}
              <select [ngModel]="c.settingId || ''" (ngModelChange)="c.settingId = $event || null; edit()" data-testid="film-setting">
                <option value="">—</option>
                @for (a of assetsOf('setting'); track a.id) { <option [value]="a.id">🏞 {{ a.name }}</option> }
              </select>
            </label>
            @if ((c.characterIds || []).length || c.settingId) { <p class="ed-muted">{{ t('film.v2.refsHint') }}</p> }
          </div>
          <label>{{ t('film.v2.startImage') }}
            <select [(ngModel)]="c.startUploadId" (ngModelChange)="edit()">
              <option value="">{{ t('film.v2.startAuto') }}</option>
              @for (m of uploads(); track m.uid) { @if (m.kind === 'image') { <option [value]="m.uid">🖼 {{ m.name }}</option> } }
            </select>
          </label>
          <div class="ed-shots">
            <b>{{ t('film.v2.shots') }}</b>
            @for (sh of c.shots; track sh.sid; let j = $index) {
              <div class="ed-shot">
                <span class="ed-badge-i" [attr.data-s]="sh.status">{{ sh.duration }}s</span>
                @if (sh.active >= 0 && sh.versions[sh.active]; as v) { <img [src]="media(v.frameKey)" alt="" (click)="seekShot(c, j)" loading="lazy" /> }
                <input [(ngModel)]="sh.prompt" (ngModelChange)="edit()" [placeholder]="t('film.v2.shotPh', { n: j + 1 })" />
                @if (sh.versions.length || sh.status === 'failed') {
                  <button class="ed-btn ed-mini" (click)="regenShot(c, j)" [disabled]="!canGenerate() || c.status === 'generating'" [title]="t('film.v2.regenShot')" [attr.data-testid]="'shot-regen-' + j">↻</button>
                }
              </div>
              @if (sh.versions.length > 1) {
                <div class="ed-vers" [attr.data-testid]="'shot-versions-' + j">
                  <span>{{ t('film.v2.takes') }}</span>
                  @for (v of sh.versions; track v.v; let k = $index) {
                    <button class="ed-ver" [class.on]="k === sh.active" (click)="useTake(c, sh, v.v)" [disabled]="c.status === 'generating' || k === sh.active" [title]="v.prompt || ''">v{{ v.v }}</button>
                  }
                </div>
              }
            }
          </div>
          @if (c.error) { <p class="ed-errtxt">{{ c.error }}</p> }
          <button class="ed-btn ed-primary" (click)="generate(c)" [disabled]="!canGenerate() || c.status === 'generating' || (c.prompt || '').trim().length < 3" data-testid="film-gen-scene">
            ✨ {{ c.status === 'ready' || c.status === 'partial' || c.status === 'stale' ? t('film.v2.regenScene') : t('film.v2.genScene') }}
          </button>
        }
        <div class="ed-2">
          <button class="ed-btn" (click)="duplicate(c)">⧉ {{ t('film.ed.duplicate') }}</button>
          <button class="ed-btn ed-danger" (click)="removeScene(c.sid)" [disabled]="c.status === 'generating'">🗑 {{ t('film.ed.delete') }}</button>
        </div>
      } @else {
        <p class="ed-muted">{{ t('film.ed.pick') }}</p>
      }
    </aside>
  </div>

  <section class="ed-tl" data-testid="film-timeline">
    <div class="ed-tl-bar">
      <button class="ed-btn" (click)="addScene()" [disabled]="!project()">＋ {{ t('film.ed.sceneShort') }}</button>
      <span class="ed-muted">{{ t('film.ed.dragHint') }}</span>
      <span class="ed-zoom">🔍 <input type="range" min="0" max="100" step="1" [ngModel]="zoom()" (ngModelChange)="zoom.set(+$event)" data-testid="film-zoom" />
        <button class="ed-btn" (click)="fit()">{{ t('film.v2.fit') }}</button></span>
    </div>
    <div class="ed-tracks" #tracks (click)="scrub($event)">
      <div class="ed-ruler" [style.width.px]="width()">
        @for (s of ticks(); track s) { <span [style.left.px]="s * pps()">{{ tcShort(s) }}</span> }
      </div>
      <div class="ed-track"><span class="ed-tname">🎞 {{ t('film.ed.track.video') }}</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of scenes(); track c.sid; let i = $index) {
            <div class="ed-clip v" [class.sel]="c.sid === selId()" [attr.data-s]="c.status" [style.width.px]="w(c)" draggable="true"
                 (dragstart)="dragFrom = i" (dragover)="$event.preventDefault()" (drop)="drop(i)" (click)="select(c.sid); $event.stopPropagation()"
                 [attr.data-testid]="'clip-' + i" [style.background-image]="w(c) > 30 && thumbOf(c) ? 'url(' + thumbOf(c) + ')' : null" [title]="(i + 1) + ' · ' + c.prompt">
              @if (w(c) > 40) { <span class="ed-cl">{{ i + 1 }} · {{ c.prompt || uploadName(c.uploadId) || t('film.ed.emptyClip') }}</span> }
              @if (c.source === 'ai' && w(c) > 12) { <span class="ed-trim" (mousedown)="trimStart($event, c)" [title]="t('film.ed.trim')"></span> }
            </div>
          }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">🎙 {{ t('film.ed.track.voice') }}</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of scenes(); track c.sid) {
            <div class="ed-clip a" [style.width.px]="w(c)">@if (c.narration && w(c) > 30) { <span class="ed-wave"></span><span class="ed-cl">{{ voiceName(c.voice, langOf(c)) }} · {{ langOf(c).toUpperCase() }}</span> }</div>
          }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">♫ {{ t('film.ed.track.music') }}</span>
        <div class="ed-lane" [style.width.px]="width()">
          @if (music().uploadId) { <div class="ed-clip m" [style.width.px]="total() * pps()"><span class="ed-cl">♫ {{ uploadName(music().uploadId) }}</span></div> }
          @else { <button class="ed-ghost" (click)="lib.set('audio'); mtab.set('lib'); $event.stopPropagation()">＋ {{ t('film.ed.addMusic') }}</button> }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">T {{ t('film.ed.track.subs') }}</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of scenes(); track c.sid) {
            <div class="ed-clip t" [style.width.px]="w(c)">@if (w(c) > 30) { <span class="ed-cl">{{ c.narration }}</span> }</div>
          }
        </div>
      </div>
      <div class="ed-head" [style.left.px]="96 + playhead() * pps()"></div>
    </div>
  </section>
  @if (musicUrl()) { <audio #musicEl [src]="musicUrl()" loop></audio> }


  <ng-template #assetLib let-type="type">
    <label>{{ t('film.models.image') }}
      <select [(ngModel)]="assetImageModel" data-testid="film-asset-model">
        @for (m of models('image'); track m.id) { <option [value]="m.id" [disabled]="!m.available">{{ m.name }} - {{ modelPrice(m) }}{{ m.available ? '' : ' - ' + m.reason }}</option> }
      </select>
    </label>
    <p class="ed-muted">{{ t(type === 'character' ? 'film.v2.castHint' : 'film.v2.setsHint') }}</p>
    <div class="ed-newa">
      <input [(ngModel)]="newAsset.name" [placeholder]="t(type === 'character' ? 'film.v2.castName' : 'film.v2.setName')" maxlength="60" [attr.data-testid]="'asset-name-' + type" />
      <textarea rows="2" [(ngModel)]="newAsset.description" [placeholder]="t(type === 'character' ? 'film.v2.castDesc' : 'film.v2.setDesc')" maxlength="400" [attr.data-testid]="'asset-desc-' + type"></textarea>
      <button class="ed-btn ed-block" (click)="createAsset(type)" [disabled]="!newAsset.name.trim() || !loggedIn()" [attr.data-testid]="'asset-create-' + type">＋ {{ t('film.v2.assetCreate') }}</button>
    </div>
    @for (a of assetsOf(type); track a.id) {
      <div class="ed-asset" [attr.data-testid]="'asset-' + a.id">
        <div class="ed-ahead">
          @if (a.images[0]; as im) { <img [src]="im.url" alt="" loading="lazy" /> } @else { <span class="ed-ph">{{ type === 'character' ? '👤' : '🏞' }}</span> }
          <div class="ed-ainfo">
            <input [(ngModel)]="a.name" (change)="saveAsset(a)" maxlength="60" />
            <textarea rows="2" [(ngModel)]="a.description" (change)="saveAsset(a)" maxlength="400"></textarea>
          </div>
        </div>
        @if (a.images.length > 1) {
          <div class="ed-astrip">
            @for (im of a.images; track im.key; let k = $index) {
              <span class="ed-aimg" [class.sel]="k === 0"><img [src]="im.url" alt="" (click)="primaryImage(a, im.key)" [title]="t('film.v2.assetPrimary')" />
                <button class="ed-x" (click)="removeAssetImage(a, im.key)">✕</button></span>
            }
          </div>
        }
        @if (a.status === 'generating') { <p class="ed-muted">⏳ {{ t('film.v2.assetGenerating') }}</p> }
        <div class="ed-2">
          <button class="ed-btn" (click)="generateAsset(a)" [disabled]="!canGenerate() || a.status === 'generating' || a.images.length >= 6" [attr.data-testid]="'asset-gen-' + a.id">✨ {{ t(a.images.length ? 'film.v2.assetVariant' : 'film.v2.assetGen') }}</button>
          <label class="ed-btn" [class.dis]="a.images.length >= 6">⤒ {{ t('film.v2.assetUpload') }}<input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="uploadAssetImage($event, a)" [disabled]="a.images.length >= 6" /></label>
        </div>
        <div class="ed-2">
          @if (sel()?.source === 'ai') {
            <button class="ed-btn" (click)="toggleRef(a)" [class.on]="usesRef(a)">{{ usesRef(a) ? '✓ ' + t('film.v2.inScene') : '＋ ' + t('film.v2.addToScene') }}</button>
          }
          <button class="ed-btn ed-danger" (click)="deleteAsset(a)" [disabled]="a.status === 'generating'">🗑</button>
        </div>
      </div>
    } @empty { <p class="ed-muted">{{ t('film.v2.assetEmpty') }}</p> }
  </ng-template>
  @if (confirm(); as cf) {
    <div class="ed-modal" (click)="confirm.set(null)">
      <div class="ed-dlg" (click)="$event.stopPropagation()" data-testid="film-estimate">
        <h3>{{ t('film.v2.estTitle') }}</h3>
        @if (cf.kind === 'scenes') {
          <ul>
            @for (it of cf.items.slice(0, 12); track it.sid) {
              <li>{{ t('film.v2.estScene', { n: index(it.sid) + 1, sec: it.seconds, img: it.images ? t('film.v2.estImg', { n: it.images }) : '', price: money(it.price) }) }}</li>
            }
            @if (cf.items.length > 12) { <li>… +{{ cf.items.length - 12 }}</li> }
          </ul>
        } @else { <p data-testid="film-est-line">{{ cf.renderLine }}</p> }
        <p class="ed-total">{{ t('film.v2.estTotal', { price: money(cf.total) }) }}</p>
        <p class="ed-muted">{{ t('film.v2.estBalance', { bal: money(cf.balance) }) }}</p>
        <p class="ed-muted">{{ t('film.v2.estNote') }}</p>
        @if (cf.total > cf.balance + 1e-9) { <p class="ed-errtxt">{{ t('film.v2.noFunds') }}</p> }
        <div class="ed-2">
          <button class="ed-btn" (click)="confirm.set(null)">{{ t('film.v2.cancel') }}</button>
          <button class="ed-btn ed-primary" (click)="confirmed(cf)" [disabled]="cf.total > cf.balance + 1e-9" data-testid="film-confirm">{{ t('film.v2.confirm') }}</button>
        </div>
      </div>
    </div>
  }
</div>
`,
  styles: [`
.ed-vc{border-top:1px solid var(--b, #2a2c33);padding-top:10px;margin-top:4px}.ed-vc-h{display:block;font-weight:600;margin-bottom:6px}
.ed-fold{border:1px solid var(--b,#2a2c33);border-radius:8px;padding:8px 10px}.ed-fold summary{cursor:pointer;font-weight:600}
:host{display:block;max-width:100%;min-width:0}
.ed{--bg:#0f1012;--p:#17181c;--p2:#1f2026;--b:#2a2c33;--t:#e9e9ec;--m:#8b8d98;--a:#22d3ee;--a2:#c9a961;background:var(--bg);color:var(--t);border-radius:14px;overflow:hidden;font-size:13px;min-height:calc(100vh - 140px);max-width:100%;min-width:0;display:flex;flex-direction:column}
.ed button,.ed select,.ed input,.ed textarea{font:inherit;color:inherit}
.ed-top{display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--p);border-bottom:1px solid var(--b)}
.ed-brand{font-weight:700;white-space:nowrap}.ed-brand span{color:var(--a2)}
.ed-title{flex:1;max-width:420px;background:transparent;border:1px solid transparent;border-radius:8px;padding:6px 10px;text-align:center}
.ed-title:hover,.ed-title:focus{border-color:var(--b);outline:none;background:var(--p2)}
.ed-top-r{margin-left:auto;display:flex;gap:10px;align-items:center}
.ed-count{color:var(--m);font-variant-numeric:tabular-nums;white-space:nowrap}
.ed-promo{background:rgba(16,185,129,.15);color:#34d399;border-radius:999px;padding:3px 10px;font-weight:600;font-size:12px}
.ed-muted{color:var(--m);font-size:12px;line-height:1.5}
.ed-btn{background:var(--p2);border:1px solid var(--b);border-radius:8px;padding:6px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;justify-content:center;text-decoration:none}
.ed-btn:hover:not(:disabled){border-color:var(--a)}.ed-btn:disabled{opacity:.45;cursor:not-allowed}
.ed-primary{background:var(--a);color:#06262c !important;border-color:var(--a);font-weight:700}
.ed-danger{color:#f87171 !important}
.ed-block{width:100%;margin-bottom:10px}
.ed-banner{padding:8px 14px;background:#132a33;color:#a5f3fc;font-size:12.5px;border-bottom:1px solid var(--b)}
.ed-banner a{color:var(--a);margin-left:6px}.ed-warn{background:#2d2410;color:#fcd34d}.ed-err{background:#341515;color:#fca5a5}
.ed-main{display:grid;grid-template-columns:280px 1fr 300px;flex:1;min-height:0}
.ed-panel{background:var(--p);border-right:1px solid var(--b);overflow:auto;max-height:62vh}
.ed-right{border-right:0;border-left:1px solid var(--b);padding:12px;display:flex;flex-direction:column;gap:10px}
.ed-right h3{font-size:14px;margin:0}
.ed-right label{display:flex;flex-direction:column;gap:4px;color:var(--m);font-size:12px}
.ed-right textarea,.ed-right select,.ed-right input[type=range],.ed-lib input:not([type]),.ed-lib textarea,.ed-shot input{background:var(--p2);border:1px solid var(--b);border-radius:8px;padding:7px;color:var(--t);resize:vertical}
.ed-right input[type=range]{padding:0;accent-color:var(--a)}
.ed-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ed-errtxt{color:#fca5a5;font-size:12px}
.ed-tabs{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--b);position:sticky;top:0;background:var(--p)}
.ed-tabs button,.ed-mtabs button{flex:1;padding:9px 4px;background:none;border:0;border-bottom:2px solid transparent;color:var(--m);cursor:pointer}
.ed-tabs button{flex:1 0 33%;font-size:12.5px;white-space:nowrap}
.ed-tabs button.on,.ed-mtabs button.on{color:var(--t);border-color:var(--a)}
.ed-lib{padding:10px}.ed-lib h4{margin:10px 0 6px;font-size:12px;color:var(--m)}
.ed-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ed-thumb{position:relative;aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:var(--p2);border:2px solid transparent;cursor:pointer;padding:0}
.ed-thumb.sel{border-color:var(--a)}.ed-thumb img,.ed-thumb video{width:100%;height:100%;object-fit:cover;display:block}
.ed-ph{display:grid;place-items:center;height:100%;font-size:22px;color:var(--m)}
.ed-cap{position:absolute;left:0;right:0;bottom:0;padding:3px 6px;font-size:11px;background:linear-gradient(transparent,rgba(0,0,0,.8));text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-badge{position:absolute;top:4px;left:4px;font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.6)}
.ed-badge[data-s=ready]{color:#34d399}.ed-badge[data-s=failed]{color:#f87171}.ed-badge[data-s=running],.ed-badge[data-s=queued]{color:#fcd34d}
.ed-add{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:6px;border:0;background:var(--a);color:#06262c;cursor:pointer;font-weight:700}
.ed-row{display:flex;justify-content:space-between;width:100%;text-align:left;background:var(--p2);border:1px solid var(--b);border-radius:8px;padding:7px 9px;margin-bottom:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-row.sel{border-color:var(--a)}.ed-x{background:none;border:0;cursor:pointer;color:var(--m)}
.ed-newa{display:grid;gap:6px;margin-bottom:10px}.ed-asset{border:1px solid var(--b);border-radius:10px;padding:8px;margin-bottom:8px;background:var(--p2)}
.ed-ahead{display:flex;gap:8px}.ed-ahead>img,.ed-ahead>.ed-ph{width:64px;height:80px;object-fit:cover;border-radius:6px;flex:none;display:grid;place-items:center;background:var(--p)}
.ed-ainfo{display:grid;gap:4px;flex:1;min-width:0}.ed-ainfo input,.ed-ainfo textarea{padding:4px 6px!important;font-size:12.5px}.ed-astrip{display:flex;gap:4px;margin:6px 0;flex-wrap:wrap}.ed-aimg{position:relative}.ed-aimg img{width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent}
.ed-aimg.sel img{border-color:var(--a)}.ed-aimg .ed-x{position:absolute;top:-6px;right:-6px;font-size:10px}
.ed-refs{border-top:1px solid var(--b);padding-top:8px;margin:8px 0}.ed-chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.ed-chip{display:flex;align-items:center;gap:4px;border:1px solid var(--b);background:var(--p2);color:inherit;border-radius:999px;padding:3px 8px 3px 3px;cursor:pointer;font-size:12px}
.ed-chip img{width:22px;height:22px;border-radius:50%;object-fit:cover}.ed-chip.on,.ed-btn.on{border-color:var(--a);background:rgba(34,211,238,.15)}
.ed-check{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.ed-center{display:flex;flex-direction:column;padding:12px;gap:8px;min-width:0}
.ed-stage{position:relative;flex:1;min-height:300px;max-height:56vh;background:#000;border-radius:10px;overflow:hidden;display:grid;place-items:center}
.ed-media{width:100%;height:100%;object-fit:contain}
.ed-media.kb{animation:kb 6s ease-in-out infinite alternate}@keyframes kb{to{transform:scale(1.08)}}
.ed-empty{display:flex;flex-direction:column;gap:6px;align-items:center;color:var(--m);text-align:center;padding:24px;max-width:520px}.ed-empty b{color:var(--t);font-size:16px}
.ed-sub{position:absolute;bottom:6%;left:8%;right:8%;text-align:center;font-size:clamp(13px,1.6vw,20px);font-weight:600;text-shadow:0 2px 6px #000,0 0 2px #000}
.ed-spin{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.7);padding:4px 10px;border-radius:999px;font-size:12px;color:#fcd34d}
.ed-ctrl{display:flex;align-items:center;gap:8px;justify-content:center}
.ed-play{width:44px;height:36px;font-size:16px}
.ed-tc{font-family:ui-monospace,monospace;color:var(--m);min-width:170px;text-align:center}
.ed-prog{height:4px;background:var(--p2);border-radius:2px;overflow:hidden}.ed-prog div{height:100%;background:var(--a);transition:width .5s}
.ed-tl{background:var(--p);border-top:1px solid var(--b)}
.ed-tl-bar{display:flex;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--b)}
.ed-zoom{margin-left:auto;display:flex;gap:6px;align-items:center}.ed-zoom input{accent-color:var(--a);width:120px}
.ed-tracks{position:relative;overflow-x:auto;padding-bottom:6px;user-select:none}
.ed-ruler{position:relative;height:20px;margin-left:96px;border-bottom:1px solid var(--b);min-width:100%}
.ed-ruler span{position:absolute;top:3px;font-size:10px;color:var(--m);border-left:1px solid var(--b);padding-left:3px}
.ed-track{display:flex;align-items:center;height:44px;border-bottom:1px solid #202127}
.ed-tname{width:96px;flex:none;padding-left:10px;color:var(--m);font-size:12px;position:sticky;left:0;background:var(--p);z-index:2;height:100%;display:flex;align-items:center}
.ed-lane{display:flex;height:34px;gap:2px;min-width:calc(100% - 96px)}
.ed-clip{position:relative;flex:none;border-radius:6px;overflow:hidden;display:flex;align-items:center;font-size:11px;cursor:pointer;background-size:cover;background-position:center}
.ed-clip.v{background-color:#164e63;border:2px solid transparent}.ed-clip.v.sel{border-color:#fde047}
.ed-clip.a{background:#3b2a5a}.ed-clip.m{background:#1e3a2f}.ed-clip.t{background:#4a3410}
.ed-cl{position:relative;z-index:1;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000}
.ed-wave{position:absolute;inset:6px 4px;opacity:.5;background:repeating-linear-gradient(90deg,#c4b5fd 0 2px,transparent 2px 5px);mask:linear-gradient(transparent 20%,#000 50%,transparent 80%)}
.ed-tr{position:absolute;left:2px;top:2px;font-size:10px;background:rgba(0,0,0,.6);border-radius:4px;padding:0 3px;z-index:2}
.ed-trim{position:absolute;right:0;top:0;bottom:0;width:8px;cursor:ew-resize;background:rgba(255,255,255,.25);z-index:2}
.ed-ghost{background:none;border:1px dashed var(--b);border-radius:6px;color:var(--m);padding:0 10px;cursor:pointer}
.ed-head{position:absolute;top:0;bottom:0;width:2px;background:#f43f5e;pointer-events:none;z-index:3}
.ed-head::before{content:'';position:absolute;top:0;left:-5px;border:6px solid transparent;border-top-color:#f43f5e}
.ed-mtabs{display:none}
@media (max-width:900px){
  .ed-main{grid-template-columns:1fr}.ed-panel,.ed-center{display:none}.m-show{display:flex !important;flex-direction:column}
  .ed-left.m-show{display:block !important}.ed-panel{max-height:none;border:0}
  .ed-mtabs{display:flex;background:var(--p);border-bottom:1px solid var(--b)}
  .ed-mtabs button,.ed-btn{min-height:44px}
  .ed-top{flex-wrap:wrap}.ed-title{order:3;max-width:none;flex-basis:100%;min-width:0}.ed-top-r{flex-wrap:wrap;margin-left:0}.ed-top-r .ed-muted{display:none}
  .ed-stage{min-height:200px}.ed-tl-bar .ed-muted{display:none}
  .ed-tracks{max-width:100%}
}

.ed-proj{background:var(--p2);border:1px solid var(--b);border-radius:8px;padding:6px 8px;max-width:220px}
.ed-save{min-width:70px}
.ed-price{background:#10241c;color:#86efac}
.ed-badge[data-s=generating],.ed-badge[data-s=partial],.ed-badge[data-s=stale]{color:#fcd34d}
.ed-badge-i{font-size:11px;padding:1px 7px;border-radius:999px;background:var(--p2);color:var(--m);font-weight:500}
.ed-badge-i[data-s=ready]{color:#34d399}.ed-badge-i[data-s=failed]{color:#f87171}.ed-badge-i[data-s=generating],.ed-badge-i[data-s=partial],.ed-badge-i[data-s=stale]{color:#fcd34d}
.ed-del{position:absolute;top:4px;right:32px;width:24px;height:24px;border-radius:6px;border:0;background:rgba(0,0,0,.6);color:#fca5a5;cursor:pointer}
.ed-mini{padding:2px 8px;min-width:0;flex:0 0 auto}
.ed-vers{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;opacity:.9;padding-left:4px}
.ed-ver{font-size:11px;padding:1px 6px;border-radius:6px;border:1px solid var(--b);background:transparent;color:inherit;cursor:pointer}
.ed-ver.on{background:var(--accent,#7c5cff);color:#fff;border-color:transparent}
.ed-shots{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--b);padding-top:8px}
.ed-shot{display:flex;gap:6px;align-items:center}.ed-shot img{width:52px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer}
.ed-shot input{flex:1;min-width:0;background:var(--p2);border:1px solid var(--b);border-radius:6px;padding:5px 7px;color:var(--t)}
.ed-clip.v[data-s=generating]{outline:2px dashed #fcd34d;outline-offset:-2px}.ed-clip.v[data-s=failed]{outline:2px solid #f87171;outline-offset:-2px}
.ed-ruler span{white-space:nowrap}
.ed-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:50}
.ed-dlg{background:var(--p);border:1px solid var(--b);border-radius:12px;padding:18px;width:min(460px,92vw);display:flex;flex-direction:column;gap:8px}
.ed-dlg h3{margin:0;font-size:16px}.ed-dlg ul{margin:0;padding-left:18px;line-height:1.7}.ed-total{font-weight:700;font-size:15px;color:var(--a)}
.dis{opacity:.45;pointer-events:none}
`],
})
export class AiFilmComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly cur = inject(CurrencyService);
  @ViewChild('clipEl') clipEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('musicEl') musicEl?: ElementRef<HTMLAudioElement>;
  @ViewChild('tracks') tracksEl?: ElementRef<HTMLElement>;

  readonly libTabs = ['scenes', 'cast', 'sets', 'uploads', 'audio', 'text'] as const;
  readonly mobileTabs = ['preview', 'lib', 'props'] as const;
  readonly cameras = Object.keys(CAMERA_LABEL) as Camera[];
  readonly subModes: SubMode[] = ['off', 'soft', 'burn'];

  title = '';
  subtitles = true;
  dragFrom = -1;
  readonly lib = signal<string>('scenes');
  readonly mtab = signal<string>('preview');
  readonly project = signal<Project | null>(null);
  readonly projects = signal<ProjectRow[]>([]);
  readonly cfg = signal<Config | null>(null);
  readonly langs = computed<FilmLang[]>(() => this.cfg()?.languages?.length ? this.cfg()!.languages! : FALLBACK_LANGS);
  readonly projectLang = computed(() => this.project()?.lang || 'vi');
  /** Voices of the selected scene's language (the dropdown and the audio tab follow it). */
  readonly voices = computed<Voice[]>(() => this.voicesFor(this.sel() ? this.langOf(this.sel()!) : this.projectLang()));
  readonly selId = signal('');
  readonly playhead = signal(0);
  readonly playing = signal(false);
  readonly msg = signal('');
  readonly msgErr = signal(false);
  readonly finalVideo = signal('');
  readonly saveState = signal('');
  readonly zoom = signal(50);
  readonly confirm = signal<Confirm | null>(null);
  readonly busyBatch = signal(false);
  readonly assets = signal<Asset[]>([]);
  newAsset = { name: '', description: '' };
  readonly uploading = signal<{ name: string; p: number }[]>([]);
  readonly loggedIn = computed(() => !!this.auth.user());
  readonly scenes = computed(() => this.project()?.scenes || []);
  readonly uploads = computed(() => (this.project()?.uploads || []).filter((u) => u.status === 'ready'));
  readonly music = computed(() => this.project()?.music || {});
  readonly sel = computed(() => this.scenes().find((c) => c.sid === this.selId()) || null);
  readonly total = computed(() => this.scenes().reduce((s, c) => s + this.secondsOf(c), 0));
  /** Zoom slider 0..100 maps exponentially to 0.05..120 px/s so a 120-minute film still fits. */
  readonly pps = computed(() => 0.05 * Math.pow(2400, this.zoom() / 100));
  readonly width = computed(() => Math.max(600, (this.total() + Math.max(4, this.total() * 0.03)) * this.pps()));
  readonly ticks = computed(() => {
    const step = TICK_STEPS.find((s) => s * this.pps() >= 64) || 3600;
    const end = this.total() + Math.max(4, this.total() * 0.03);
    return Array.from({ length: Math.floor(end / step) + 1 }, (_, i) => i * step);
  });
  readonly segs = computed(() => this.buildSegs());
  readonly seg = computed(() => this.segAt(this.playhead()) || this.firstSegOf(this.selId()));
  readonly renderActive = computed(() => (this.project()?.renders || []).some((r) => r.status === 'queued' || r.status === 'running'));
  readonly lastRender = computed(() => [...(this.project()?.renders || [])].reverse().find((r) => r.status === 'succeeded') || null);
  readonly musicUrl = computed(() => { const u = this.uploads().find((x) => x.uid === this.music().uploadId); return u ? this.media(u.key) : ''; });
  readonly canGenerate = computed(() => this.loggedIn() && !!this.project() && !!this.cfg()?.available);

  private raf = 0;
  private last = 0;
  private poller: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> | null = null;
  private editSeq = 0;
  private trim: { scene: Scene; x: number; d: number } | null = null;
  private destroyed = false;

  constructor() {
    this.i18n.extend(FILM_V2_MESSAGES);
    this.i18n.extend(FILM_LANG_MESSAGES);
    inject(SeoService).set({ title: this.i18n.t('film.title'), description: this.i18n.t('film.subtitle') });
  }
  t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(key, params); }

  async ngOnInit(): Promise<void> {
    if (!this.loggedIn()) return;
    this.http.get<Config>(`${FILM}/config`).subscribe({ next: (c) => this.cfg.set(c), error: () => this.cfg.set({ available: false } as Config) });
    try {
      const list = await firstValueFrom(this.http.get<{ items: ProjectRow[] }>(`${FILM}/projects`));
      this.projects.set(list.items);
      if (!list.items.length) await this.createProject(this.migrateLocal());
      else await this.open(localStorage.getItem(LAST) && list.items.some((r) => r.id === localStorage.getItem(LAST)) ? localStorage.getItem(LAST)! : list.items[0].id);
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
    this.loadAssets();
    this.poller = setInterval(() => this.poll(), 4000);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    if (this.poller) clearInterval(this.poller);
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.flush(); }
  }

  // ---------- projects ----------
  /** One-time move of the old browser-only project (≤6 clips, 2–8 s) to the server. */
  private migrateLocal(): Partial<Project> | null {
    try {
      if (localStorage.getItem(MIGRATED)) return null;
      const p = JSON.parse(localStorage.getItem(OLD_STORE) || 'null');
      const clips = (p?.clips || []).filter((c: { source?: string; prompt?: string }) => c.source !== 'upload' && (c.prompt || '').trim());
      if (!clips.length) return null;
      return {
        title: p.title || '',
        scenes: clips.map((c: { prompt: string; narration?: string; voice?: string; camera?: Camera }) => ({ prompt: c.prompt, narration: c.narration || '', voice: c.voice || 'Binh', camera: c.camera || 'push-in', duration: 5 } as Scene)),
      };
    } catch { return null; }
  }
  private async createProject(seed: Partial<Project> | null): Promise<void> {
    const lang = this.i18n.lang();
    const body = seed || { title: '', scenes: [{ prompt: '', narration: '', voice: lang === 'vi' ? 'Binh' : 'default', camera: 'push-in', duration: 15 } as Scene] };
    const p = await firstValueFrom(this.http.post<Project>(`${FILM}/projects`, { ...body, lang }));
    if (seed) { try { localStorage.setItem(MIGRATED, '1'); } catch { /* ignore */ } this.note(this.t('film.v2.migrated')); }
    this.projects.update((a) => [{ id: p.id, title: p.title, scenes: p.scenes.length, totalSeconds: p.totalSeconds }, ...a]);
    this.setProject(p);
  }
  async newProject(): Promise<void> {
    await this.flush();
    try { await this.createProject(null); } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async open(id: string): Promise<void> {
    if (!id || id === this.project()?.id && this.project()) return;
    await this.flush();
    this.pause(); this.finalVideo.set('');
    try { this.setProject(await firstValueFrom(this.http.get<Project>(`${FILM}/projects/${id}`))); } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async deleteProject(): Promise<void> {
    const p = this.project();
    if (!p || !confirm(this.t('film.v2.confirmDelete', { t: p.title }))) return;
    try {
      await firstValueFrom(this.http.delete(`${FILM}/projects/${p.id}`));
      this.projects.update((a) => a.filter((r) => r.id !== p.id));
      this.project.set(null);
      const next = this.projects()[0];
      if (next) await this.open(next.id); else await this.createProject(null);
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  private setProject(p: Project): void {
    this.project.set(p);
    this.title = p.title;
    try { localStorage.setItem(LAST, p.id); } catch { /* ignore */ }
    if (!p.scenes.some((s) => s.sid === this.selId())) this.selId.set(p.scenes[0]?.sid || '');
    this.playhead.set(0);
    this.fit();
  }

  // ---------- editing + autosave ----------
  edit(): void {
    this.editSeq += 1;
    this.project.update((p) => (p ? { ...p, scenes: [...p.scenes] } : p));
    this.saveState.set(this.t('film.v2.saving'));
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.save(); }, 700);
  }
  /** Save now (used before generate/render/switching projects). */
  async flush(): Promise<void> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; await this.save(); }
    else if (this.saving) await this.saving;
  }
  private save(): Promise<void> {
    const run = async (): Promise<void> => {
      const p = this.project();
      if (!p) return;
      const seq = this.editSeq;
      const sent = [...p.scenes];
      const body = {
        title: this.title,
        lang: p.lang || 'vi',
        subtitles: p.subtitles || 'off',
        music: p.music,
        scenes: sent.map((s) => ({
          videoModel: s.videoModel, imageModel: s.imageModel, sid: s.sid, title: s.title, prompt: s.prompt, narration: s.narration, voice: s.voice, lang: s.lang || '', camera: s.camera, duration: s.duration,
          source: s.source, uploadId: s.uploadId, startUploadId: s.startUploadId || '', chainPrev: !!s.chainPrev, characterIds: s.characterIds || [], settingId: s.settingId || null,
          shots: (s.shots || []).map((sh) => ({ sid: sh.sid, prompt: sh.prompt })),
        })),
      };
      try {
        const r = await firstValueFrom(this.http.put<Project>(`${FILM}/projects/${p.id}`, body));
        // New scenes get their id from the server: map them back by position in what we sent.
        sent.forEach((s, i) => { if (s.sid.startsWith('n_') && r.scenes[i]) { if (this.selId() === s.sid) this.selId.set(r.scenes[i].sid); s.sid = r.scenes[i].sid; } });
        this.merge(r, seq === this.editSeq);
        this.saveState.set(this.t('film.v2.saved'));
        this.projects.update((a) => a.map((x) => (x.id === r.id ? { ...x, title: r.title, scenes: r.scenes.length, totalSeconds: r.totalSeconds } : x)));
      } catch (e) {
        const err = e as HttpErrorResponse;
        this.saveState.set(this.t('film.v2.saveFail'));
        this.note(err.error?.code === 'TOO_LONG' ? this.t('film.v2.maxLen') : this.apiError(err), true);
      }
    };
    const prev = this.saving || Promise.resolve();
    const next = prev.then(run);
    this.saving = next.finally(() => { if (this.saving === next) this.saving = null; });
    return next;
  }
  /** Take server-owned fields (status, shots, versions, uploads, renders, links); keep text the user may still be typing. */
  private merge(r: Project, full: boolean): void {
    const cur = this.project();
    if (!cur || cur.id !== r.id) return;
    if (full) { this.project.set(r); return; }
    const bySid = new Map(r.scenes.map((s) => [s.sid, s]));
    const scenes = cur.scenes.map((s) => {
      const sv = bySid.get(s.sid);
      if (!sv) return s;
      const prompts = new Map((s.shots || []).map((sh) => [sh.sid, sh.prompt]));
      return { ...s, status: sv.status, error: sv.error, generation: sv.generation, keyframes: sv.keyframes, shots: sv.shots.map((sh) => ({ ...sh, prompt: prompts.get(sh.sid) ?? sh.prompt })) };
    });
    this.project.set({ ...cur, scenes, uploads: r.uploads, renders: r.renders, media: { ...cur.media, ...r.media }, totalSeconds: r.totalSeconds });
  }
  private poll(): void {
    if (!this.destroyed && this.assets().some((a) => a.status === 'generating')) this.loadAssets(true);
    const p = this.project();
    if (!p || this.destroyed || this.saving || this.saveTimer) return;
    if (!p.scenes.some((s) => s.status === 'generating') && !this.renderActive()) return;
    const before = new Map(p.scenes.map((s) => [s.sid, s.status]));
    const wasRendering = this.renderActive();
    this.http.get<Project>(`${FILM}/projects/${p.id}`).subscribe({
      next: (r) => {
        if (this.saving || this.saveTimer) return this.merge(r, false);
        this.merge(r, true);
        r.scenes.forEach((s, i) => {
          if (before.get(s.sid) === 'generating' && s.status !== 'generating') {
            if (s.status === 'ready') this.note(this.t('film.ed.sceneReady', { n: i + 1 }));
            else this.note(`${this.t('film.ed.sceneFail')} ${s.error || ''}`, true);
          }
        });
        if (wasRendering && !this.renderActive()) {
          const lr = r.renders[r.renders.length - 1];
          if (lr?.status === 'succeeded') { this.note(this.t('film.v2.renderDone', { t: this.tcShort(lr.duration || 0) })); this.finalVideo.set(this.media(lr.key)); this.mtab.set('preview'); }
          else this.note(this.t('film.v2.renderFail'), true);
        }
      },
      error: () => {},
    });
  }

  // ---------- scenes ----------
  private newScene(p: Partial<Scene> = {}): Scene {
    return { sid: 'n_' + uid(), prompt: '', narration: '', voice: this.sel()?.voice || this.voicesFor(this.projectLang())[0]?.id || 'Binh', lang: this.sel()?.lang || '', camera: 'push-in', duration: 15, source: 'ai', status: 'draft', shots: [], chainPrev: this.scenes().length > 0, ...p };
  }
  addScene(p: Partial<Scene> = {}, at?: number): void {
    const proj = this.project();
    if (!proj) return;
    if (this.total() + (p.duration || 15) > MAX_SEC) return this.note(this.t('film.v2.maxLen'), true);
    const s = this.newScene(p);
    const scenes = [...proj.scenes];
    scenes.splice(at ?? scenes.length, 0, s);
    this.project.set({ ...proj, scenes });
    this.selId.set(s.sid);
    this.edit();
  }
  duplicate(c: Scene): void {
    this.addScene({ prompt: c.prompt, narration: c.narration, voice: c.voice, lang: c.lang || '', camera: c.camera, duration: c.duration, source: c.source, uploadId: c.uploadId, startUploadId: c.startUploadId, chainPrev: c.chainPrev, characterIds: [...(c.characterIds || [])], settingId: c.settingId || null }, this.index(c.sid) + 1);
  }
  removeScene(sid: string): void {
    const p = this.project();
    if (!p) return;
    const i = this.index(sid);
    this.project.set({ ...p, scenes: p.scenes.filter((s) => s.sid !== sid) });
    if (this.selId() === sid) this.selId.set(this.scenes()[Math.max(0, i - 1)]?.sid || '');
    this.edit();
  }
  select(sid: string): void {
    this.selId.set(sid);
    this.finalVideo.set('');
    this.seek(this.startOf(sid));
    if (this.mtab() === 'lib' && window.innerWidth < 900) this.mtab.set('props');
  }
  setVoice(v: string): void { const c = this.sel(); if (c) { c.voice = v; this.edit(); } }
  setMusic(uid: string): void { const p = this.project(); if (p) { this.project.set({ ...p, music: { ...p.music, uploadId: uid } }); this.edit(); } }
  setVolume(v: number): void { const p = this.project(); if (p) { this.project.set({ ...p, music: { ...p.music, volume: Number(v) } }); this.edit(); } }
  index(sid: string): number { return this.scenes().findIndex((c) => c.sid === sid); }
  drop(to: number): void {
    const from = this.dragFrom; this.dragFrom = -1;
    const p = this.project();
    if (!p || from < 0 || from === to) return;
    const scenes = [...p.scenes]; const [m] = scenes.splice(from, 1); scenes.splice(to, 0, m);
    this.project.set({ ...p, scenes }); this.edit();
  }
  trimStart(e: MouseEvent, c: Scene): void { e.stopPropagation(); e.preventDefault(); if (c.status !== 'generating') this.trim = { scene: c, x: e.clientX, d: Number(c.duration) }; }
  @HostListener('document:mousemove', ['$event']) onMove(e: MouseEvent): void {
    if (!this.trim) return;
    const d = Math.round(Math.min(60, Math.max(5, this.trim.d + (e.clientX - this.trim.x) / this.pps())) / 5) * 5;
    if (d !== this.trim.scene.duration) { this.trim.scene.duration = d; this.project.update((p) => (p ? { ...p, scenes: [...p.scenes] } : p)); }
  }
  @HostListener('document:mouseup') onUp(): void { if (this.trim) { this.trim = null; this.edit(); } }

  modelPrice(m: FilmModel): string {
    const p = m.marketplacePricing;
    if (!p || !(p.usageRate > 0)) return this.t('film.models.quoteOnly');
    const unitKeys: Record<string, string> = { second: 'second', seconds: 'second', image: 'perImage', images: 'perImage', video: 'perVideo', megapixel: 'megapixel' };
    const unit = unitKeys[p.usageUnit] ? this.t('film.models.' + unitKeys[p.usageUnit]) : p.usageUnit;
    const amount = this.cur.currency() === 'USD' ? ' 'qwen-image-edit-2511';
  models(kind: 'image' | 'video'): FilmModel[] { return (this.cfg()?.modelCatalog || []).filter(m => m.kind === kind); }
  private modelSplit(total: number, id?: string): number[] {
    if (!id || id === 'wan-2-2-i2v-720') return splitDuration(total);
    const options = [...(this.models('video').find(m => m.id === id)?.durations || [])].sort((a,b) => b-a);
    const target = Math.max(5, Math.min(60, Math.round(Number(total) || 5)));
    const dp: (number[] | null)[] = Array(61).fill(null); dp[0] = [];
    for (let n=1; n<=60; n++) for (const d of options) {
      const prev = n>=d ? dp[n-d] : null;
      if (prev && prev.length<12 && (!dp[n] || prev.length+1 < dp[n]!.length)) dp[n] = [...prev, d];
    }
    const hits = dp.map((shots,seconds) => ({shots,seconds})).filter(x => x.seconds && x.shots);
    hits.sort((a,b) => Math.abs(a.seconds-target)-Math.abs(b.seconds-target) || Number(a.seconds>target)-Number(b.seconds>target) || a.shots!.length-b.shots!.length);
    return hits[0]?.shots?.sort((a, b) => b - a) || splitDuration(total);
  }
  // ---------- derived helpers ----------
  secondsOf(s: Scene): number {
    if (s.source === 'upload') return Math.round(this.project()?.uploads.find((u) => u.uid === s.uploadId)?.duration || 0);
    const done = s.shots?.length && s.shots.every((sh) => sh.active >= 0) && s.status !== 'stale';
    return done ? s.shots.reduce((a, sh) => a + sh.duration, 0) : this.modelSplit(s.duration, s.videoModel).reduce((a, b) => a + b, 0);
  }
  w(c: Scene): number { return Math.max(3, this.secondsOf(c) * this.pps() - 2); }
  splitLabel(d: number, model?: string): string { const a = this.modelSplit(d, model); return this.t('film.v2.shotsSplit', { n: a.length, list: a.map((x) => x + 's').join(' + ') + ' = ' + a.reduce((x, y) => x + y, 0) + 's' }); }
  media(k?: string): string { return (k && this.project()?.media?.[k]) || ''; }
  thumbOf(s: Scene): string {
    if (s.source === 'upload') return '';
    const sh = s.shots?.[0];
    const v = sh && sh.active >= 0 ? sh.versions[sh.active] : null;
    if (v) return this.media(v.frameKey);
    const kf = s.keyframes?.[s.keyframes.length - 1];
    if (kf) return this.media(kf.frameKey);
    const up = s.startUploadId && this.project()?.uploads.find((u) => u.uid === s.startUploadId);
    return up ? this.media(up.key) : '';
  }
  uploadName(id?: string): string { return (id && this.project()?.uploads.find((u) => u.uid === id)?.name) || ''; }
  voiceName(id: string, lang?: string): string { return this.voicesFor(lang || this.projectLang()).find((v) => v.id === id)?.name || id; }
  voiceLabel(v: Voice): string {
    if (v.kind === 'builtin') return `${v.name} (${this.t('film.voice.builtin')})`;
    const who = [this.t('film.voice.' + v.gender), v.region ? this.t('film.voice.region.' + v.region) : ''].filter(Boolean).join(' ');
    return `${v.name} (${who})` + (v.kind === 'clone' ? ` · ${this.t('film.voice.clone')}` : '');
  }
  voicesFor(lang: string): Voice[] { return this.cfg()?.voices?.[lang]?.length ? this.cfg()!.voices![lang] : fallbackVoices(lang); }
  langOf(s: Scene): string { return s.lang || this.projectLang(); }
  langName(code: string): string { return this.langs().find((l) => l.code === code)?.name || code; }
  subFont(code: string): string { return CSS_FONT[code] || "'Noto Sans','Be Vietnam Pro',system-ui,sans-serif"; }
  isRtl(code: string): boolean { return code === 'ar' || code === 'he'; }
  /** Keep the voice valid for the language (vi presets have no "default"; other languages start on Chatterbox's own voice). */
  private fixVoice(s: Scene): void {
    const lang = this.langOf(s);
    if (!this.voicesFor(lang).some((v) => v.id === s.voice)) s.voice = this.langs().find((l) => l.code === lang)?.defaultVoice || (lang === 'vi' ? 'Binh' : 'default');
  }
  setSceneLang(s: Scene, lang: string): void { s.lang = lang; this.fixVoice(s); this.edit(); }
  setProjectLang(lang: string): void {
    const p = this.project();
    if (!p) return;
    p.lang = lang;
    for (const s of p.scenes) this.fixVoice(s);
    this.edit();
  }
  setSubtitles(mode: SubMode): void { const p = this.project(); if (p) { p.subtitles = mode; this.edit(); } }
  camLabel(id: Camera): string { const k = 'film.cam.' + id; const s = this.t(k); return s === k ? CAMERA_LABEL[id] : s; }
  stateLabel(s: string): string { return ['generating', 'partial', 'stale'].includes(s) ? this.t('film.v2.state.' + s) : this.t('film.ed.state.' + s); }
  money(usd: number): string {
    const v = Number(usd) || 0;
    if (this.cur.currency() === 'USD') return `$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
    return this.cur.formatFromUsd(v);
  }
  round(n: number): number { return Math.round(n); }

  // ---------- uploads (browser -> MinIO presigned PUT, then confirm) ----------
  async upload(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const p = this.project();
    if (!p) return;
    await this.flush();
    for (const f of files) {
      const kind = f.type.split('/')[0];
      if (!['image', 'video', 'audio'].includes(kind)) continue;
      const row = { name: f.name, p: 0 };
      this.uploading.update((a) => [...a, row]);
      try {
        const r = await firstValueFrom(this.http.post<{ upload: Upload; putUrl: string; headers: Record<string, string> }>(`${FILM}/projects/${p.id}/uploads`, { kind, name: f.name, size: f.size, contentType: f.type }));
        await this.put(r.putUrl, f, r.headers, (pct) => { row.p = pct; this.uploading.update((a) => [...a]); });
        await firstValueFrom(this.http.post(`${FILM}/projects/${p.id}/uploads/${r.upload.uid}/confirm`, {}));
        this.merge(await firstValueFrom(this.http.get<Project>(`${FILM}/projects/${p.id}`)), false);
        if (kind === 'audio' && !this.music().uploadId) this.setMusic(r.upload.uid);
      } catch {
        this.note(this.t('film.v2.uploadFail', { name: f.name }), true);
      } finally {
        this.uploading.update((a) => a.filter((x) => x !== row));
      }
    }
  }
  private put(url: string, f: File, headers: Record<string, string>, onPct: (n: number) => void): Promise<void> {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('PUT', url);
      Object.entries(headers || {}).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
      x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error(String(x.status))));
      x.onerror = () => rej(new Error('network'));
      x.send(f);
    });
  }
  useVideo(m: Upload): void { this.addScene({ source: 'upload', uploadId: m.uid, prompt: '', camera: 'static', duration: Math.min(60, Math.max(5, Math.round(m.duration || 5))), chainPrev: false }); this.lib.set('scenes'); }
  useStart(m: Upload): void { const c = this.sel(); if (c && c.source === 'ai') { c.startUploadId = m.uid; c.chainPrev = false; this.edit(); } }
  async removeUpload(m: Upload): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      await firstValueFrom(this.http.delete(`${FILM}/projects/${p.id}/uploads/${m.uid}`));
      this.project.set({ ...p, uploads: p.uploads.filter((u) => u.uid !== m.uid) });
    } catch (e) { this.note((e as HttpErrorResponse).status === 409 ? this.t('film.v2.inUse') : this.apiError(e as HttpErrorResponse), true); }
  }


  // ---------- character / setting library (reference images for consistent faces and places) ----------
  assetsOf(type: string): Asset[] { return this.assets().filter((a) => a.type === type); }
  private loadAssets(fromPoll = false): void {
    const before = new Map(this.assets().map((a) => [a.id, a.status]));
    this.http.get<{ items: Asset[] }>(`${FILM}/assets`).subscribe({
      next: (r) => {
        this.assets.set(r.items);
        if (fromPoll) for (const a of r.items) if (before.get(a.id) === 'generating' && a.status !== 'generating') this.note(this.t('film.v2.assetDone', { name: a.name }));
      },
      error: () => {},
    });
  }
  private putAsset(a: Asset): void { this.assets.update((xs) => xs.map((x) => (x.id === a.id ? a : x))); }
  async createAsset(type: 'character' | 'setting'): Promise<void> {
    try {
      const a = await firstValueFrom(this.http.post<Asset>(`${FILM}/assets`, { type, name: this.newAsset.name, description: this.newAsset.description }));
      this.assets.update((xs) => [a, ...xs]);
      this.newAsset = { name: '', description: '' };
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async saveAsset(a: Asset): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.put<Asset>(`${FILM}/assets/${a.id}`, { name: a.name, description: a.description }))); }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async primaryImage(a: Asset, key: string): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.put<Asset>(`${FILM}/assets/${a.id}`, { order: [key] }))); } catch { /* ignore */ }
  }
  async removeAssetImage(a: Asset, key: string): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.delete<Asset>(`${FILM}/assets/${a.id}/images`, { params: { key } }))); }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async deleteAsset(a: Asset): Promise<void> {
    if (!confirm(this.t('film.v2.assetDelete', { name: a.name }))) return;
    try {
      await firstValueFrom(this.http.delete(`${FILM}/assets/${a.id}`));
      this.assets.update((xs) => xs.filter((x) => x.id !== a.id));
      let changed = false;
      for (const s of this.scenes()) {
        if ((s.characterIds || []).includes(a.id)) { s.characterIds = s.characterIds!.filter((x) => x !== a.id); changed = true; }
        if (s.settingId === a.id) { s.settingId = null; changed = true; }
      }
      if (changed) this.edit();
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async uploadAssetImage(ev: Event, a: Asset): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const row = { name: f.name, p: 0 };
    this.uploading.update((x) => [...x, row]);
    try {
      const r = await firstValueFrom(this.http.post<{ key: string; putUrl: string; headers: Record<string, string> }>(`${FILM}/assets/${a.id}/uploads`, { name: f.name, size: f.size, contentType: f.type }));
      await this.put(r.putUrl, f, r.headers, (pct) => { row.p = pct; this.uploading.update((x) => [...x]); });
      this.putAsset(await firstValueFrom(this.http.post<Asset>(`${FILM}/assets/${a.id}/uploads/confirm`, { key: r.key })));
    } catch { this.note(this.t('film.v2.uploadFail', { name: f.name }), true); }
    finally { this.uploading.update((x) => x.filter((y) => y !== row)); }
  }
  async generateAsset(a: Asset): Promise<void> {
    let price = 0;
    const imageModel = this.assetImageModel;
    try { price = (await firstValueFrom(this.http.post<{ price: number }>(`${FILM}/model-quote`, { imageModel, mode: a.type }))).price; }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); return; }
    let balance = 0;
    try { balance = (await this.estimate([])).available; } catch { /* the API re-checks the wallet */ }
    this.confirm.set({ kind: 'asset', imageModel, assetId: a.id, items: [], total: price, balance, renderLine: this.t('film.v2.estAsset', { name: a.name, price: this.money(price) }) });
  }
  private async submitAsset(id: string, price: number, imageModel?: string): Promise<void> {
    try {
      const r = await firstValueFrom(this.http.post<{ asset: Asset }>(`${FILM}/assets/${id}/generate`, { imageModel, expectedPrice: price }));
      this.putAsset(r.asset);
      this.note(this.t('film.v2.assetSubmitted'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err), true);
    }
  }
  usesRef(a: Asset): boolean { const c = this.sel(); return !!c && (a.type === 'setting' ? c.settingId === a.id : (c.characterIds || []).includes(a.id)); }
  toggleRef(a: Asset): void {
    const c = this.sel();
    if (!c || c.source !== 'ai' || c.status === 'generating') return;
    if (a.type === 'setting') c.settingId = c.settingId === a.id ? null : a.id;
    else {
      const ids = c.characterIds || [];
      if (ids.includes(a.id)) c.characterIds = ids.filter((x) => x !== a.id);
      else if (ids.length >= 3) return this.note(this.t('film.v2.castMax'), true);
      else c.characterIds = [...ids, a.id];
    }
    this.edit();
  }

  // ---------- generate (estimate shown first; API checks expectedPrice) ----------
  private apiError(e: HttpErrorResponse): string {
    if (e?.error?.code === 'INSUFFICIENT_WALLET') return this.t('film.v2.noFunds');
    if (e?.status === 0 || e?.status >= 502 || e?.error?.code === 'STUDIO_UNAVAILABLE') return this.t('film.ed.gpuRetry');
    const code = String(e?.error?.code || '');
    const known = code ? this.t('film.err.' + code) : '';
    if (known && known !== 'film.err.' + code) return known;
    return this.i18n.lang() === 'vi' && e?.error?.message ? e.error.message : this.t('film.ed.sendFail');
  }
  private estimate(sceneIds?: string[]): Promise<Estimate> {
    return firstValueFrom(this.http.post<Estimate>(`${FILM}/projects/${this.project()!.id}/estimate`, sceneIds ? { sceneIds } : {}));
  }
  async generate(c: Scene): Promise<void> {
    await this.flush();
    try {
      const est = await this.estimate([c.sid]);
      this.confirm.set({ kind: 'scenes', items: est.items, total: est.total, balance: est.available });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async generateAll(): Promise<void> {
    await this.flush();
    try {
      const est = await this.estimate();
      const items = est.items.filter((it) => (this.scenes().find((s) => s.sid === it.sid)?.prompt || '').trim().length >= 3);
      if (!items.length) return this.note(this.t('film.ed.needPrompt'), true);
      this.confirm.set({ kind: 'scenes', items, total: items.reduce((a, x) => a + x.price, 0), balance: est.available });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async confirmed(cf: Confirm): Promise<void> {
    this.confirm.set(null);
    if (cf.kind === 'render') return this.submitRender(cf.total);
    if (cf.kind === 'asset') return this.submitAsset(cf.assetId!, cf.total, cf.imageModel);
    if (cf.kind === 'shot') return this.submitShot(cf.sceneSid!, cf.shotSid!, cf.total);
    if (cf.items.length === 1) { await this.submitScene(cf.items[0].sid, cf.items[0].price); return; }
    // Batch: one scene at a time, max 3 in flight; a chained scene waits for the previous one so it can start from its last frame.
    this.busyBatch.set(true);
    let done = 0;
    try {
      for (const it of cf.items) {
        const i = this.index(it.sid);
        const s = this.scenes()[i];
        if (!s) continue;
        if (s.chainPrev && i > 0) await this.waitFor(() => this.scenes()[i - 1]?.status !== 'generating');
        let price = it.price;
        const fresh = (await this.estimate([it.sid])).items[0];
        if (fresh && fresh.price <= it.price + 1e-9) price = fresh.price; // never charge more than the user confirmed
        else if (fresh) throw new Error(this.t('film.v2.priceChanged', { price: this.money(fresh.price) }));
        for (;;) {
          const r = await this.submitScene(it.sid, price, true);
          if (r === 'busy') { this.note(this.t('film.v2.waitSlot')); await this.sleep(8000); continue; }
          if (r !== 'ok') throw new Error(r);
          break;
        }
        done += 1;
        this.note(this.t('film.v2.batch', { done, n: cf.items.length }));
      }
      this.note(this.t('film.v2.batchDone', { n: done }));
    } catch (e) {
      this.note(this.t('film.v2.batchStop', { e: (e as Error).message }), true);
    } finally { this.busyBatch.set(false); }
  }
  /** Returns 'ok', 'busy' (too many running, batch retries) or an error message. */
  /** Re-shoot one shot (new take, price shown first). Later shots keep their takes; regenerate them too for a seamless chain. */
  async regenShot(c: Scene, j: number): Promise<void> {
    const p = this.project();
    const sh = c.shots[j];
    if (!p || !sh) return;
    await this.flush();
    try {
      const e = await firstValueFrom(this.http.post<{ seconds: number; price: number; ready: boolean; available: number }>(`${FILM}/projects/${p.id}/scenes/${c.sid}/shots/${sh.sid}/estimate`, {}));
      if (!e.ready) return this.note(this.t('film.v2.shotNeedPrev'), true);
      this.confirm.set({ kind: 'shot', sceneSid: c.sid, shotSid: sh.sid, items: [], total: e.price, balance: e.available,
        renderLine: this.t('film.v2.estShot', { n: j + 1, s: e.seconds, price: this.money(e.price) }) });
    } catch (err) { this.note(this.apiError(err as HttpErrorResponse), true); }
  }
  private async submitShot(sid: string, shot: string, price: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    const sh = this.scenes().find((s) => s.sid === sid)?.shots.find((x) => x.sid === shot);
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${sid}/shots/${shot}/generate`, { expectedPrice: price, prompt: sh?.prompt || '' }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      this.note(this.t('film.v2.shotSubmitted'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : err.error?.code === 'NEED_PREVIOUS' ? this.t('film.v2.shotNeedPrev') : this.apiError(err), true);
    }
  }
  async useTake(c: Scene, sh: Shot, v: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${c.sid}/shots/${sh.sid}/active`, { v }));
      this.merge(r.project, !this.saveTimer && !this.saving);
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  private async submitScene(sid: string, price: number, batch = false): Promise<string> {
    const p = this.project();
    if (!p) return 'no project';
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${sid}/generate`, { expectedPrice: price }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      if (!batch) this.note(this.t('film.v2.submitted', { n: this.index(sid) + 1 }));
      return 'ok';
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (err.error?.code === 'JOB_ACTIVE' && batch) return 'busy';
      const m = err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err);
      if (!batch) this.note(m, true);
      return m;
    }
  }
  private sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  private async waitFor(ok: () => boolean, maxMs = 30 * 60e3): Promise<void> {
    const t0 = Date.now();
    while (!ok() && !this.destroyed && Date.now() - t0 < maxMs) { this.poll(); await this.sleep(5000); }
  }

  // ---------- render (final ffmpeg join on the AI service) ----------
  async render(): Promise<void> {
    await this.flush();
    const p = this.project();
    if (!p) return;
    const notReady = p.scenes.some((s) => (s.source === 'upload' ? !this.uploadName(s.uploadId) : !(s.shots?.length && s.shots.every((sh) => sh.active >= 0)) || s.status === 'generating'));
    if (notReady) return this.note(this.t('film.v2.notReady'), true);
    try {
      const est = await this.estimate([]);
      const n = p.scenes.length; const tt = this.tcShort(this.total());
      const line = est.render.price > 0 ? this.t('film.v2.estRender', { n, t: tt, chars: est.render.ttsChars, price: this.money(est.render.price) }) : this.t('film.v2.estRenderFree', { n, t: tt });
      this.confirm.set({ kind: 'render', items: [], total: est.render.price, balance: est.available, renderLine: line });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  private async submitRender(price: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/render`, { expectedPrice: price }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      this.note(this.t('film.v2.rendering'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'NOT_READY' ? this.t('film.v2.notReady') : err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err), true);
    }
  }

  // ---------- timeline + playback ----------
  fit(): void {
    const el = this.tracksEl?.nativeElement;
    const avail = Math.max(300, (el?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)) - 120);
    const pps = Math.min(120, Math.max(0.05, avail / Math.max(10, this.total() * 1.04)));
    this.zoom.set(Math.round((Math.log(pps / 0.05) / Math.log(2400)) * 100));
  }
  private buildSegs(): Seg[] {
    const out: Seg[] = [];
    let t = 0;
    this.scenes().forEach((s, idx) => {
      const dur = this.secondsOf(s);
      if (s.source === 'upload') {
        const u = this.project()?.uploads.find((x) => x.uid === s.uploadId);
        out.push({ scene: s, idx, start: t, dur, shot: 0, video: u ? this.media(u.key) : '', thumb: '', offset: 0 });
      } else if (s.shots?.length && s.status !== 'stale') {
        let o = 0;
        s.shots.forEach((sh, j) => {
          const v = sh.active >= 0 ? sh.versions[sh.active] : null;
          out.push({ scene: s, idx, start: t + o, dur: sh.duration, shot: j, video: v ? this.media(v.videoKey) : '', thumb: v ? this.media(v.frameKey) : this.thumbOf(s), offset: o });
          o += sh.duration;
        });
      } else {
        out.push({ scene: s, idx, start: t, dur, shot: 0, video: '', thumb: this.thumbOf(s), offset: 0 });
      }
      t += dur;
    });
    return out;
  }
  private segAt(t: number): Seg | null {
    const a = this.segs();
    let lo = 0; let hi = a.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (t < a[m].start) hi = m - 1; else if (t >= a[m].start + a[m].dur) lo = m + 1; else return a[m];
    }
    return null;
  }
  private firstSegOf(sid: string): Seg | null { return this.segs().find((g) => g.scene.sid === sid) || null; }
  private startOf(sid: string): number { return this.firstSegOf(sid)?.start ?? 0; }
  seekShot(c: Scene, j: number): void { const g = this.segs().find((x) => x.scene.sid === c.sid && x.shot === j); if (g) this.seek(g.start); }
  toggle(): void { this.playing() ? this.pause() : this.play(); }
  play(): void {
    if (this.playhead() >= this.total() - 0.05) this.playhead.set(0);
    this.finalVideo.set('');
    this.playing.set(true); this.last = performance.now(); this.musicEl?.nativeElement.play().catch(() => {});
    const step = (now: number) => {
      if (!this.playing()) return;
      const before = this.seg();
      this.playhead.set(Math.min(this.total(), this.playhead() + (now - this.last) / 1000)); this.last = now;
      const g = this.segAt(this.playhead());
      if (g && (g.scene.sid !== before?.scene.sid || g.shot !== before?.shot)) { this.selId.set(g.scene.sid); setTimeout(() => this.syncVideo(), 0); }
      if (this.playhead() >= this.total()) { this.pause(); return; }
      this.raf = requestAnimationFrame(step);
    };
    setTimeout(() => this.syncVideo(), 0);
    this.raf = requestAnimationFrame(step);
  }
  pause(): void { this.playing.set(false); cancelAnimationFrame(this.raf); this.clipEl?.nativeElement.pause(); this.musicEl?.nativeElement.pause(); }
  private syncVideo(): void {
    const v = this.clipEl?.nativeElement; const g = this.seg();
    if (!v || !g) return;
    const want = Math.max(0, this.playhead() - g.start);
    if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want;
    if (this.playing()) v.play().catch(() => {}); else v.pause();
  }
  seek(t: number): void {
    this.playhead.set(Math.max(0, Math.min(this.total(), t)));
    const g = this.segAt(this.playhead());
    if (g) this.selId.set(g.scene.sid);
    setTimeout(() => this.syncVideo(), 0);
  }
  scrub(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement; const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - 96;
    if (x >= 0 && (e.target as HTMLElement).closest('.ed-ruler')) this.seek(x / this.pps());
  }
  tc(t: number): string {
    const f = Math.floor((t % 1) * FPS); const s = Math.floor(t) % 60; const m = Math.floor(t / 60) % 60; const h = Math.floor(t / 3600);
    return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }
  tcShort(t: number): string {
    const s = Math.round(t) % 60; const m = Math.floor(Math.round(t) / 60) % 60; const h = Math.floor(Math.round(t) / 3600);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  private note(m: string, err = false): void { this.msg.set(m); this.msgErr.set(err); }
}
 + p.usageRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : this.cur.formatFromUsd(p.usageRate);
    return this.t('film.models.from') + ' ' + amount + '/' + unit;
  }
  assetImageModel = 'qwen-image-edit-2511';
  models(kind: 'image' | 'video'): FilmModel[] { return (this.cfg()?.modelCatalog || []).filter(m => m.kind === kind); }
  private modelSplit(total: number, id?: string): number[] {
    if (!id || id === 'wan-2-2-i2v-720') return splitDuration(total);
    const options = [...(this.models('video').find(m => m.id === id)?.durations || [])].sort((a,b) => b-a);
    const target = Math.max(5, Math.min(60, Math.round(Number(total) || 5)));
    const dp: (number[] | null)[] = Array(61).fill(null); dp[0] = [];
    for (let n=1; n<=60; n++) for (const d of options) {
      const prev = n>=d ? dp[n-d] : null;
      if (prev && prev.length<12 && (!dp[n] || prev.length+1 < dp[n]!.length)) dp[n] = [...prev, d];
    }
    const hits = dp.map((shots,seconds) => ({shots,seconds})).filter(x => x.seconds && x.shots);
    hits.sort((a,b) => Math.abs(a.seconds-target)-Math.abs(b.seconds-target) || Number(a.seconds>target)-Number(b.seconds>target) || a.shots!.length-b.shots!.length);
    return hits[0]?.shots?.sort((a, b) => b - a) || splitDuration(total);
  }
  // ---------- derived helpers ----------
  secondsOf(s: Scene): number {
    if (s.source === 'upload') return Math.round(this.project()?.uploads.find((u) => u.uid === s.uploadId)?.duration || 0);
    const done = s.shots?.length && s.shots.every((sh) => sh.active >= 0) && s.status !== 'stale';
    return done ? s.shots.reduce((a, sh) => a + sh.duration, 0) : this.modelSplit(s.duration, s.videoModel).reduce((a, b) => a + b, 0);
  }
  w(c: Scene): number { return Math.max(3, this.secondsOf(c) * this.pps() - 2); }
  splitLabel(d: number, model?: string): string { const a = this.modelSplit(d, model); return this.t('film.v2.shotsSplit', { n: a.length, list: a.map((x) => x + 's').join(' + ') + ' = ' + a.reduce((x, y) => x + y, 0) + 's' }); }
  media(k?: string): string { return (k && this.project()?.media?.[k]) || ''; }
  thumbOf(s: Scene): string {
    if (s.source === 'upload') return '';
    const sh = s.shots?.[0];
    const v = sh && sh.active >= 0 ? sh.versions[sh.active] : null;
    if (v) return this.media(v.frameKey);
    const kf = s.keyframes?.[s.keyframes.length - 1];
    if (kf) return this.media(kf.frameKey);
    const up = s.startUploadId && this.project()?.uploads.find((u) => u.uid === s.startUploadId);
    return up ? this.media(up.key) : '';
  }
  uploadName(id?: string): string { return (id && this.project()?.uploads.find((u) => u.uid === id)?.name) || ''; }
  voiceName(id: string, lang?: string): string { return this.voicesFor(lang || this.projectLang()).find((v) => v.id === id)?.name || id; }
  voiceLabel(v: Voice): string {
    if (v.kind === 'builtin') return `${v.name} (${this.t('film.voice.builtin')})`;
    const who = [this.t('film.voice.' + v.gender), v.region ? this.t('film.voice.region.' + v.region) : ''].filter(Boolean).join(' ');
    return `${v.name} (${who})` + (v.kind === 'clone' ? ` · ${this.t('film.voice.clone')}` : '');
  }
  voicesFor(lang: string): Voice[] { return this.cfg()?.voices?.[lang]?.length ? this.cfg()!.voices![lang] : fallbackVoices(lang); }
  langOf(s: Scene): string { return s.lang || this.projectLang(); }
  langName(code: string): string { return this.langs().find((l) => l.code === code)?.name || code; }
  subFont(code: string): string { return CSS_FONT[code] || "'Noto Sans','Be Vietnam Pro',system-ui,sans-serif"; }
  isRtl(code: string): boolean { return code === 'ar' || code === 'he'; }
  /** Keep the voice valid for the language (vi presets have no "default"; other languages start on Chatterbox's own voice). */
  private fixVoice(s: Scene): void {
    const lang = this.langOf(s);
    if (!this.voicesFor(lang).some((v) => v.id === s.voice)) s.voice = this.langs().find((l) => l.code === lang)?.defaultVoice || (lang === 'vi' ? 'Binh' : 'default');
  }
  setSceneLang(s: Scene, lang: string): void { s.lang = lang; this.fixVoice(s); this.edit(); }
  setProjectLang(lang: string): void {
    const p = this.project();
    if (!p) return;
    p.lang = lang;
    for (const s of p.scenes) this.fixVoice(s);
    this.edit();
  }
  setSubtitles(mode: SubMode): void { const p = this.project(); if (p) { p.subtitles = mode; this.edit(); } }
  camLabel(id: Camera): string { const k = 'film.cam.' + id; const s = this.t(k); return s === k ? CAMERA_LABEL[id] : s; }
  stateLabel(s: string): string { return ['generating', 'partial', 'stale'].includes(s) ? this.t('film.v2.state.' + s) : this.t('film.ed.state.' + s); }
  money(usd: number): string {
    const v = Number(usd) || 0;
    if (this.cur.currency() === 'USD') return `$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
    return this.cur.formatFromUsd(v);
  }
  round(n: number): number { return Math.round(n); }

  // ---------- uploads (browser -> MinIO presigned PUT, then confirm) ----------
  async upload(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const p = this.project();
    if (!p) return;
    await this.flush();
    for (const f of files) {
      const kind = f.type.split('/')[0];
      if (!['image', 'video', 'audio'].includes(kind)) continue;
      const row = { name: f.name, p: 0 };
      this.uploading.update((a) => [...a, row]);
      try {
        const r = await firstValueFrom(this.http.post<{ upload: Upload; putUrl: string; headers: Record<string, string> }>(`${FILM}/projects/${p.id}/uploads`, { kind, name: f.name, size: f.size, contentType: f.type }));
        await this.put(r.putUrl, f, r.headers, (pct) => { row.p = pct; this.uploading.update((a) => [...a]); });
        await firstValueFrom(this.http.post(`${FILM}/projects/${p.id}/uploads/${r.upload.uid}/confirm`, {}));
        this.merge(await firstValueFrom(this.http.get<Project>(`${FILM}/projects/${p.id}`)), false);
        if (kind === 'audio' && !this.music().uploadId) this.setMusic(r.upload.uid);
      } catch {
        this.note(this.t('film.v2.uploadFail', { name: f.name }), true);
      } finally {
        this.uploading.update((a) => a.filter((x) => x !== row));
      }
    }
  }
  private put(url: string, f: File, headers: Record<string, string>, onPct: (n: number) => void): Promise<void> {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('PUT', url);
      Object.entries(headers || {}).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
      x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error(String(x.status))));
      x.onerror = () => rej(new Error('network'));
      x.send(f);
    });
  }
  useVideo(m: Upload): void { this.addScene({ source: 'upload', uploadId: m.uid, prompt: '', camera: 'static', duration: Math.min(60, Math.max(5, Math.round(m.duration || 5))), chainPrev: false }); this.lib.set('scenes'); }
  useStart(m: Upload): void { const c = this.sel(); if (c && c.source === 'ai') { c.startUploadId = m.uid; c.chainPrev = false; this.edit(); } }
  async removeUpload(m: Upload): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      await firstValueFrom(this.http.delete(`${FILM}/projects/${p.id}/uploads/${m.uid}`));
      this.project.set({ ...p, uploads: p.uploads.filter((u) => u.uid !== m.uid) });
    } catch (e) { this.note((e as HttpErrorResponse).status === 409 ? this.t('film.v2.inUse') : this.apiError(e as HttpErrorResponse), true); }
  }


  // ---------- character / setting library (reference images for consistent faces and places) ----------
  assetsOf(type: string): Asset[] { return this.assets().filter((a) => a.type === type); }
  private loadAssets(fromPoll = false): void {
    const before = new Map(this.assets().map((a) => [a.id, a.status]));
    this.http.get<{ items: Asset[] }>(`${FILM}/assets`).subscribe({
      next: (r) => {
        this.assets.set(r.items);
        if (fromPoll) for (const a of r.items) if (before.get(a.id) === 'generating' && a.status !== 'generating') this.note(this.t('film.v2.assetDone', { name: a.name }));
      },
      error: () => {},
    });
  }
  private putAsset(a: Asset): void { this.assets.update((xs) => xs.map((x) => (x.id === a.id ? a : x))); }
  async createAsset(type: 'character' | 'setting'): Promise<void> {
    try {
      const a = await firstValueFrom(this.http.post<Asset>(`${FILM}/assets`, { type, name: this.newAsset.name, description: this.newAsset.description }));
      this.assets.update((xs) => [a, ...xs]);
      this.newAsset = { name: '', description: '' };
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async saveAsset(a: Asset): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.put<Asset>(`${FILM}/assets/${a.id}`, { name: a.name, description: a.description }))); }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async primaryImage(a: Asset, key: string): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.put<Asset>(`${FILM}/assets/${a.id}`, { order: [key] }))); } catch { /* ignore */ }
  }
  async removeAssetImage(a: Asset, key: string): Promise<void> {
    try { this.putAsset(await firstValueFrom(this.http.delete<Asset>(`${FILM}/assets/${a.id}/images`, { params: { key } }))); }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async deleteAsset(a: Asset): Promise<void> {
    if (!confirm(this.t('film.v2.assetDelete', { name: a.name }))) return;
    try {
      await firstValueFrom(this.http.delete(`${FILM}/assets/${a.id}`));
      this.assets.update((xs) => xs.filter((x) => x.id !== a.id));
      let changed = false;
      for (const s of this.scenes()) {
        if ((s.characterIds || []).includes(a.id)) { s.characterIds = s.characterIds!.filter((x) => x !== a.id); changed = true; }
        if (s.settingId === a.id) { s.settingId = null; changed = true; }
      }
      if (changed) this.edit();
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async uploadAssetImage(ev: Event, a: Asset): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const row = { name: f.name, p: 0 };
    this.uploading.update((x) => [...x, row]);
    try {
      const r = await firstValueFrom(this.http.post<{ key: string; putUrl: string; headers: Record<string, string> }>(`${FILM}/assets/${a.id}/uploads`, { name: f.name, size: f.size, contentType: f.type }));
      await this.put(r.putUrl, f, r.headers, (pct) => { row.p = pct; this.uploading.update((x) => [...x]); });
      this.putAsset(await firstValueFrom(this.http.post<Asset>(`${FILM}/assets/${a.id}/uploads/confirm`, { key: r.key })));
    } catch { this.note(this.t('film.v2.uploadFail', { name: f.name }), true); }
    finally { this.uploading.update((x) => x.filter((y) => y !== row)); }
  }
  async generateAsset(a: Asset): Promise<void> {
    let price = 0;
    const imageModel = this.assetImageModel;
    try { price = (await firstValueFrom(this.http.post<{ price: number }>(`${FILM}/model-quote`, { imageModel, mode: a.type }))).price; }
    catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); return; }
    let balance = 0;
    try { balance = (await this.estimate([])).available; } catch { /* the API re-checks the wallet */ }
    this.confirm.set({ kind: 'asset', imageModel, assetId: a.id, items: [], total: price, balance, renderLine: this.t('film.v2.estAsset', { name: a.name, price: this.money(price) }) });
  }
  private async submitAsset(id: string, price: number, imageModel?: string): Promise<void> {
    try {
      const r = await firstValueFrom(this.http.post<{ asset: Asset }>(`${FILM}/assets/${id}/generate`, { imageModel, expectedPrice: price }));
      this.putAsset(r.asset);
      this.note(this.t('film.v2.assetSubmitted'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err), true);
    }
  }
  usesRef(a: Asset): boolean { const c = this.sel(); return !!c && (a.type === 'setting' ? c.settingId === a.id : (c.characterIds || []).includes(a.id)); }
  toggleRef(a: Asset): void {
    const c = this.sel();
    if (!c || c.source !== 'ai' || c.status === 'generating') return;
    if (a.type === 'setting') c.settingId = c.settingId === a.id ? null : a.id;
    else {
      const ids = c.characterIds || [];
      if (ids.includes(a.id)) c.characterIds = ids.filter((x) => x !== a.id);
      else if (ids.length >= 3) return this.note(this.t('film.v2.castMax'), true);
      else c.characterIds = [...ids, a.id];
    }
    this.edit();
  }

  // ---------- generate (estimate shown first; API checks expectedPrice) ----------
  private apiError(e: HttpErrorResponse): string {
    if (e?.error?.code === 'INSUFFICIENT_WALLET') return this.t('film.v2.noFunds');
    if (e?.status === 0 || e?.status >= 502 || e?.error?.code === 'STUDIO_UNAVAILABLE') return this.t('film.ed.gpuRetry');
    const code = String(e?.error?.code || '');
    const known = code ? this.t('film.err.' + code) : '';
    if (known && known !== 'film.err.' + code) return known;
    return this.i18n.lang() === 'vi' && e?.error?.message ? e.error.message : this.t('film.ed.sendFail');
  }
  private estimate(sceneIds?: string[]): Promise<Estimate> {
    return firstValueFrom(this.http.post<Estimate>(`${FILM}/projects/${this.project()!.id}/estimate`, sceneIds ? { sceneIds } : {}));
  }
  async generate(c: Scene): Promise<void> {
    await this.flush();
    try {
      const est = await this.estimate([c.sid]);
      this.confirm.set({ kind: 'scenes', items: est.items, total: est.total, balance: est.available });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async generateAll(): Promise<void> {
    await this.flush();
    try {
      const est = await this.estimate();
      const items = est.items.filter((it) => (this.scenes().find((s) => s.sid === it.sid)?.prompt || '').trim().length >= 3);
      if (!items.length) return this.note(this.t('film.ed.needPrompt'), true);
      this.confirm.set({ kind: 'scenes', items, total: items.reduce((a, x) => a + x.price, 0), balance: est.available });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  async confirmed(cf: Confirm): Promise<void> {
    this.confirm.set(null);
    if (cf.kind === 'render') return this.submitRender(cf.total);
    if (cf.kind === 'asset') return this.submitAsset(cf.assetId!, cf.total, cf.imageModel);
    if (cf.kind === 'shot') return this.submitShot(cf.sceneSid!, cf.shotSid!, cf.total);
    if (cf.items.length === 1) { await this.submitScene(cf.items[0].sid, cf.items[0].price); return; }
    // Batch: one scene at a time, max 3 in flight; a chained scene waits for the previous one so it can start from its last frame.
    this.busyBatch.set(true);
    let done = 0;
    try {
      for (const it of cf.items) {
        const i = this.index(it.sid);
        const s = this.scenes()[i];
        if (!s) continue;
        if (s.chainPrev && i > 0) await this.waitFor(() => this.scenes()[i - 1]?.status !== 'generating');
        let price = it.price;
        const fresh = (await this.estimate([it.sid])).items[0];
        if (fresh && fresh.price <= it.price + 1e-9) price = fresh.price; // never charge more than the user confirmed
        else if (fresh) throw new Error(this.t('film.v2.priceChanged', { price: this.money(fresh.price) }));
        for (;;) {
          const r = await this.submitScene(it.sid, price, true);
          if (r === 'busy') { this.note(this.t('film.v2.waitSlot')); await this.sleep(8000); continue; }
          if (r !== 'ok') throw new Error(r);
          break;
        }
        done += 1;
        this.note(this.t('film.v2.batch', { done, n: cf.items.length }));
      }
      this.note(this.t('film.v2.batchDone', { n: done }));
    } catch (e) {
      this.note(this.t('film.v2.batchStop', { e: (e as Error).message }), true);
    } finally { this.busyBatch.set(false); }
  }
  /** Returns 'ok', 'busy' (too many running, batch retries) or an error message. */
  /** Re-shoot one shot (new take, price shown first). Later shots keep their takes; regenerate them too for a seamless chain. */
  async regenShot(c: Scene, j: number): Promise<void> {
    const p = this.project();
    const sh = c.shots[j];
    if (!p || !sh) return;
    await this.flush();
    try {
      const e = await firstValueFrom(this.http.post<{ seconds: number; price: number; ready: boolean; available: number }>(`${FILM}/projects/${p.id}/scenes/${c.sid}/shots/${sh.sid}/estimate`, {}));
      if (!e.ready) return this.note(this.t('film.v2.shotNeedPrev'), true);
      this.confirm.set({ kind: 'shot', sceneSid: c.sid, shotSid: sh.sid, items: [], total: e.price, balance: e.available,
        renderLine: this.t('film.v2.estShot', { n: j + 1, s: e.seconds, price: this.money(e.price) }) });
    } catch (err) { this.note(this.apiError(err as HttpErrorResponse), true); }
  }
  private async submitShot(sid: string, shot: string, price: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    const sh = this.scenes().find((s) => s.sid === sid)?.shots.find((x) => x.sid === shot);
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${sid}/shots/${shot}/generate`, { expectedPrice: price, prompt: sh?.prompt || '' }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      this.note(this.t('film.v2.shotSubmitted'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : err.error?.code === 'NEED_PREVIOUS' ? this.t('film.v2.shotNeedPrev') : this.apiError(err), true);
    }
  }
  async useTake(c: Scene, sh: Shot, v: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${c.sid}/shots/${sh.sid}/active`, { v }));
      this.merge(r.project, !this.saveTimer && !this.saving);
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  private async submitScene(sid: string, price: number, batch = false): Promise<string> {
    const p = this.project();
    if (!p) return 'no project';
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/scenes/${sid}/generate`, { expectedPrice: price }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      if (!batch) this.note(this.t('film.v2.submitted', { n: this.index(sid) + 1 }));
      return 'ok';
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (err.error?.code === 'JOB_ACTIVE' && batch) return 'busy';
      const m = err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err);
      if (!batch) this.note(m, true);
      return m;
    }
  }
  private sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  private async waitFor(ok: () => boolean, maxMs = 30 * 60e3): Promise<void> {
    const t0 = Date.now();
    while (!ok() && !this.destroyed && Date.now() - t0 < maxMs) { this.poll(); await this.sleep(5000); }
  }

  // ---------- render (final ffmpeg join on the AI service) ----------
  async render(): Promise<void> {
    await this.flush();
    const p = this.project();
    if (!p) return;
    const notReady = p.scenes.some((s) => (s.source === 'upload' ? !this.uploadName(s.uploadId) : !(s.shots?.length && s.shots.every((sh) => sh.active >= 0)) || s.status === 'generating'));
    if (notReady) return this.note(this.t('film.v2.notReady'), true);
    try {
      const est = await this.estimate([]);
      const n = p.scenes.length; const tt = this.tcShort(this.total());
      const line = est.render.price > 0 ? this.t('film.v2.estRender', { n, t: tt, chars: est.render.ttsChars, price: this.money(est.render.price) }) : this.t('film.v2.estRenderFree', { n, t: tt });
      this.confirm.set({ kind: 'render', items: [], total: est.render.price, balance: est.available, renderLine: line });
    } catch (e) { this.note(this.apiError(e as HttpErrorResponse), true); }
  }
  private async submitRender(price: number): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      const r = await firstValueFrom(this.http.post<{ project: Project }>(`${FILM}/projects/${p.id}/render`, { expectedPrice: price }));
      this.merge(r.project, !this.saveTimer && !this.saving);
      this.note(this.t('film.v2.rendering'));
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.note(err.error?.code === 'NOT_READY' ? this.t('film.v2.notReady') : err.error?.code === 'PRICE_CHANGED' ? this.t('film.v2.priceChanged', { price: this.money(err.error.price) }) : this.apiError(err), true);
    }
  }

  // ---------- timeline + playback ----------
  fit(): void {
    const el = this.tracksEl?.nativeElement;
    const avail = Math.max(300, (el?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)) - 120);
    const pps = Math.min(120, Math.max(0.05, avail / Math.max(10, this.total() * 1.04)));
    this.zoom.set(Math.round((Math.log(pps / 0.05) / Math.log(2400)) * 100));
  }
  private buildSegs(): Seg[] {
    const out: Seg[] = [];
    let t = 0;
    this.scenes().forEach((s, idx) => {
      const dur = this.secondsOf(s);
      if (s.source === 'upload') {
        const u = this.project()?.uploads.find((x) => x.uid === s.uploadId);
        out.push({ scene: s, idx, start: t, dur, shot: 0, video: u ? this.media(u.key) : '', thumb: '', offset: 0 });
      } else if (s.shots?.length && s.status !== 'stale') {
        let o = 0;
        s.shots.forEach((sh, j) => {
          const v = sh.active >= 0 ? sh.versions[sh.active] : null;
          out.push({ scene: s, idx, start: t + o, dur: sh.duration, shot: j, video: v ? this.media(v.videoKey) : '', thumb: v ? this.media(v.frameKey) : this.thumbOf(s), offset: o });
          o += sh.duration;
        });
      } else {
        out.push({ scene: s, idx, start: t, dur, shot: 0, video: '', thumb: this.thumbOf(s), offset: 0 });
      }
      t += dur;
    });
    return out;
  }
  private segAt(t: number): Seg | null {
    const a = this.segs();
    let lo = 0; let hi = a.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (t < a[m].start) hi = m - 1; else if (t >= a[m].start + a[m].dur) lo = m + 1; else return a[m];
    }
    return null;
  }
  private firstSegOf(sid: string): Seg | null { return this.segs().find((g) => g.scene.sid === sid) || null; }
  private startOf(sid: string): number { return this.firstSegOf(sid)?.start ?? 0; }
  seekShot(c: Scene, j: number): void { const g = this.segs().find((x) => x.scene.sid === c.sid && x.shot === j); if (g) this.seek(g.start); }
  toggle(): void { this.playing() ? this.pause() : this.play(); }
  play(): void {
    if (this.playhead() >= this.total() - 0.05) this.playhead.set(0);
    this.finalVideo.set('');
    this.playing.set(true); this.last = performance.now(); this.musicEl?.nativeElement.play().catch(() => {});
    const step = (now: number) => {
      if (!this.playing()) return;
      const before = this.seg();
      this.playhead.set(Math.min(this.total(), this.playhead() + (now - this.last) / 1000)); this.last = now;
      const g = this.segAt(this.playhead());
      if (g && (g.scene.sid !== before?.scene.sid || g.shot !== before?.shot)) { this.selId.set(g.scene.sid); setTimeout(() => this.syncVideo(), 0); }
      if (this.playhead() >= this.total()) { this.pause(); return; }
      this.raf = requestAnimationFrame(step);
    };
    setTimeout(() => this.syncVideo(), 0);
    this.raf = requestAnimationFrame(step);
  }
  pause(): void { this.playing.set(false); cancelAnimationFrame(this.raf); this.clipEl?.nativeElement.pause(); this.musicEl?.nativeElement.pause(); }
  private syncVideo(): void {
    const v = this.clipEl?.nativeElement; const g = this.seg();
    if (!v || !g) return;
    const want = Math.max(0, this.playhead() - g.start);
    if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want;
    if (this.playing()) v.play().catch(() => {}); else v.pause();
  }
  seek(t: number): void {
    this.playhead.set(Math.max(0, Math.min(this.total(), t)));
    const g = this.segAt(this.playhead());
    if (g) this.selId.set(g.scene.sid);
    setTimeout(() => this.syncVideo(), 0);
  }
  scrub(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement; const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - 96;
    if (x >= 0 && (e.target as HTMLElement).closest('.ed-ruler')) this.seek(x / this.pps());
  }
  tc(t: number): string {
    const f = Math.floor((t % 1) * FPS); const s = Math.floor(t) % 60; const m = Math.floor(t / 60) % 60; const h = Math.floor(t / 3600);
    return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }
  tcShort(t: number): string {
    const s = Math.round(t) % 60; const m = Math.floor(Math.round(t) / 60) % 60; const h = Math.floor(Math.round(t) / 3600);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  private note(m: string, err = false): void { this.msg.set(m); this.msgErr.set(err); }
}
