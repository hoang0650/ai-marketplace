import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

const API = environment.apiUrl;
const ROOT = API.replace(/\/v1$/, '');
const STORE = 'aimarkets.film.project.v2';
const FPS = 30;

type Transition = 'cut' | 'fade' | 'dissolve' | 'slide';
type Camera = 'static' | 'push-in' | 'pull-out' | 'pan-left' | 'pan-right' | 'orbit' | 'handheld';
type ClipState = 'draft' | 'queued' | 'running' | 'ready' | 'failed';
interface Clip {
  id: string; prompt: string; narration: string; voice: string; duration: number;
  transition: Transition; camera: Camera; state: ClipState; thumb?: string; video?: string; error?: string; source?: 'ai' | 'upload';
}
interface Media { id: string; kind: 'image' | 'video' | 'audio'; name: string; url: string; file?: File }
interface Voice { label: string; id: string }
interface Job { status: string; position?: number | null; videoUrl?: string; imageUrl?: string; error?: string; timings?: Record<string, number> }
interface Quota { enabled?: boolean; promo?: { active: boolean }; film?: { used: number; free: number }; fast?: { used: number; free: number } }

const FALLBACK_VOICES: Voice[] = [
  { id: 'Trúc Ly', label: 'Trúc Ly — Nữ · Bắc' }, { id: 'Thiện Minh', label: 'Thiện Minh — Nam · Bắc' },
  { id: 'Mai Anh', label: 'Mai Anh — Nữ · Nam' }, { id: 'Adam bựa', label: 'Adam bựa — Nam · Bắc' },
];
export const CAMERA_LABEL: Record<Camera, string> = {
  static: 'Đứng yên', 'push-in': 'Tiến vào', 'pull-out': 'Lùi ra', 'pan-left': 'Lia trái', 'pan-right': 'Lia phải', orbit: 'Xoay quanh', handheld: 'Cầm tay',
};
const CAMERA_PROMPT: Record<Camera, string> = {
  static: 'static camera', 'push-in': 'slow camera push-in', 'pull-out': 'slow camera pull-out', 'pan-left': 'camera pans left',
  'pan-right': 'camera pans right', orbit: 'camera orbits the subject', handheld: 'handheld camera',
};
export const TRANSITION_LABEL: Record<Transition, string> = { cut: 'Cắt thẳng', fade: 'Mờ dần', dissolve: 'Hoà tan', slide: 'Trượt' };
const uid = () => Math.random().toString(36).slice(2, 10);

/** AI film editor (CapCut/Jianying-style): library · preview · inspector · multi-track timeline. Renders via POST /v1/studio/film. */
@Component({
  selector: 'app-ai-film',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
<div class="ed" data-testid="film-editor">
  <header class="ed-top">
    <div class="ed-brand">🎬 <span>Làm phim AI</span></div>
    <input class="ed-title" [(ngModel)]="title" (ngModelChange)="save()" placeholder="Dự án chưa đặt tên" data-testid="film-title" />
    <div class="ed-top-r">
      @if (promo()) { <span class="ed-promo" data-testid="film-promo">🎁 Miễn phí giai đoạn đầu</span> }
      @if (quota()?.film; as q) { <span class="ed-muted">Phim miễn phí hôm nay: {{ q.used }}/{{ q.free }}</span> }
      <button class="ed-btn ed-primary" (click)="render()" [disabled]="rendering() || !clips().length" data-testid="film-submit">
        {{ rendering() ? 'Đang dựng…' : '⤓ Tạo phim' }}
      </button>
    </div>
  </header>

  @if (!loggedIn()) {
    <div class="ed-banner">Đăng nhập để tạo cảnh và xuất phim. <a routerLink="/auth/login">Đăng nhập</a></div>
  }
  @if (gpuDown()) {
    <div class="ed-banner ed-warn" data-testid="gpu-offline">⚠ GPU không khả dụng — bạn vẫn có thể chỉnh sửa dự án (tự lưu trên trình duyệt). Tạo cảnh và xuất phim sẽ hoạt động lại khi GPU trực tuyến.</div>
  }
  @if (msg()) { <div class="ed-banner" [class.ed-err]="msgErr()" data-testid="film-status">{{ msg() }}</div> }

  <nav class="ed-mtabs">
    @for (t of mobileTabs; track t.id) { <button [class.on]="mtab() === t.id" (click)="mtab.set(t.id)">{{ t.label }}</button> }
  </nav>

  <div class="ed-main">
    <!-- LEFT: library -->
    <aside class="ed-panel ed-left" [class.m-show]="mtab() === 'lib'">
      <div class="ed-tabs">
        @for (t of libTabs; track t.id) { <button [class.on]="lib() === t.id" (click)="lib.set(t.id)" [attr.data-testid]="'lib-' + t.id">{{ t.label }}</button> }
      </div>
      <div class="ed-lib">
        @switch (lib()) {
          @case ('scenes') {
            <button class="ed-btn ed-block" (click)="addClip()" data-testid="film-add">＋ Cảnh mới</button>
            <div class="ed-grid">
              @for (c of clips(); track c.id; let i = $index) {
                <button class="ed-thumb" [class.sel]="c.id === selId()" (click)="select(c.id)">
                  @if (c.thumb) { <img [src]="c.thumb" alt="" /> } @else { <span class="ed-ph">{{ i + 1 }}</span> }
                  <span class="ed-badge" [attr.data-s]="c.state">{{ stateLabel(c.state) }}</span>
                  <span class="ed-cap">Cảnh {{ i + 1 }} · {{ c.duration }}s</span>
                </button>
              }
            </div>
          }
          @case ('uploads') {
            <label class="ed-btn ed-block">⤒ Tải ảnh / video lên<input type="file" accept="image/*,video/*" multiple hidden (change)="upload($event)" data-testid="film-upload" /></label>
            <p class="ed-muted">Ảnh dùng làm khung hình đầu cho cảnh AI (ảnh → video); video được ghép thẳng vào phim xem trước.</p>
            <div class="ed-grid">
              @for (m of media(); track m.id) {
                @if (m.kind !== 'audio') {
                  <div class="ed-thumb">
                    @if (m.kind === 'image') { <img [src]="m.url" alt="" /> } @else { <video [src]="m.url" muted></video> }
                    <span class="ed-cap">{{ m.name }}</span>
                    <button class="ed-add" (click)="useMedia(m)" title="Thêm vào dòng thời gian">＋</button>
                  </div>
                }
              }
            </div>
          }
          @case ('audio') {
            <h4>Giọng đọc VieNeu</h4>
            @for (v of voices(); track v.id) {
              <button class="ed-row" [class.sel]="sel()?.voice === v.id" (click)="setVoice(v.id)">🎙 {{ v.label }}</button>
            }
            <h4>Nhạc nền</h4>
            <label class="ed-btn ed-block">♫ Tải nhạc lên<input type="file" accept="audio/*" hidden (change)="uploadMusic($event)" /></label>
            @if (music(); as mu) { <div class="ed-row sel">♫ {{ mu.name }} <button class="ed-x" (click)="music.set(null); save()">✕</button></div> }
            <p class="ed-muted">Nhạc nền phát trong bản xem trước; phim xuất ra gồm hình và giọng đọc.</p>
          }
          @case ('text') {
            <p class="ed-muted">Phụ đề lấy từ lời dẫn của từng cảnh.</p>
            <label class="ed-check"><input type="checkbox" [(ngModel)]="subtitles" (ngModelChange)="save()" /> Hiện phụ đề trên khung xem</label>
            @for (c of clips(); track c.id; let i = $index) {
              <button class="ed-row" (click)="select(c.id)">💬 {{ i + 1 }}. {{ c.narration || '(chưa có lời dẫn)' }}</button>
            }
          }
        }
      </div>
    </aside>

    <!-- CENTER: preview -->
    <section class="ed-center" [class.m-show]="mtab() === 'preview'">
      <div class="ed-stage" data-testid="film-preview">
        @if (finalVideo()) {
          <video #finalEl [src]="finalVideo()" controls class="ed-media" data-testid="film-video"></video>
        } @else if (current(); as c) {
          @if (c.video) {
            <video #clipEl [src]="c.video" class="ed-media" muted playsinline (ended)="clipEnded()"></video>
          } @else if (c.thumb) {
            <img [src]="c.thumb" class="ed-media" [class.kb]="playing()" alt="" />
          } @else {
            <div class="ed-empty"><b>Cảnh {{ index(c.id) + 1 }}</b><span>{{ c.prompt || 'Mô tả cảnh ở bảng Thuộc tính rồi bấm “Tạo cảnh”' }}</span></div>
          }
          @if (subtitles && c.narration) { <div class="ed-sub">{{ c.narration }}</div> }
          @if (c.state === 'queued' || c.state === 'running') { <div class="ed-spin">Đang tạo cảnh trên GPU RTX 5090…</div> }
        } @else {
          <div class="ed-empty"><b>Chưa có cảnh nào</b><span>Thêm cảnh mới hoặc tải ảnh/video lên ở thư viện.</span></div>
        }
      </div>
      <div class="ed-ctrl">
        <button class="ed-btn" (click)="seek(0)" title="Về đầu">⏮</button>
        <button class="ed-btn ed-play" (click)="toggle()" data-testid="film-play">{{ playing() ? '⏸' : '▶' }}</button>
        <span class="ed-tc" data-testid="film-timecode">{{ tc(playhead()) }} / {{ tc(total()) }}</span>
        @if (finalVideo()) { <a class="ed-btn" [href]="finalVideo()" download="phim-ai.mp4">Tải MP4</a> <button class="ed-btn" (click)="finalVideo.set('')">Quay lại chỉnh sửa</button> }
      </div>
      @if (rendering()) { <div class="ed-prog"><div [style.width.%]="pct()"></div></div> }
    </section>

    <!-- RIGHT: inspector -->
    <aside class="ed-panel ed-right" [class.m-show]="mtab() === 'props'" data-testid="film-inspector">
      @if (sel(); as c) {
        <h3>Thuộc tính · Cảnh {{ index(c.id) + 1 }}</h3>
        <label>Mô tả hình ảnh (prompt)
          <textarea rows="4" [(ngModel)]="c.prompt" (ngModelChange)="touch()" placeholder="VD: Đèn lồng đỏ dọc sông Hoài lúc hoàng hôn, điện ảnh" [attr.data-testid]="'film-prompt-' + index(c.id)"></textarea>
        </label>
        <label>Lời dẫn
          <textarea rows="3" [(ngModel)]="c.narration" (ngModelChange)="touch()" placeholder="VD: Khi màn đêm buông xuống, phố Hội bừng sáng." [attr.data-testid]="'film-narration-' + index(c.id)"></textarea>
        </label>
        <label>Giọng đọc
          <select [(ngModel)]="c.voice" (ngModelChange)="touch()">
            @for (v of voices(); track v.id) { <option [value]="v.id">{{ v.label }}</option> }
          </select>
        </label>
        <div class="ed-2">
          <label>Thời lượng: {{ c.duration }}s
            <input type="range" min="2" max="8" step="0.5" [(ngModel)]="c.duration" (ngModelChange)="touch()" />
          </label>
          <label>Chuyển cảnh
            <select [(ngModel)]="c.transition" (ngModelChange)="touch()">
              @for (t of transitions; track t) { <option [value]="t">{{ transitionLabel[t] }}</option> }
            </select>
          </label>
        </div>
        <label>Chuyển động máy quay
          <select [(ngModel)]="c.camera" (ngModelChange)="touch()">
            @for (k of cameras; track k) { <option [value]="k">{{ cameraLabel[k] }}</option> }
          </select>
        </label>
        @if (c.error) { <p class="ed-errtxt">{{ c.error }}</p> }
        <div class="ed-2">
          <button class="ed-btn ed-primary" (click)="generate(c)" [disabled]="c.source === 'upload' || c.state === 'queued' || c.state === 'running' || c.prompt.trim().length < 3" data-testid="film-gen-scene">✨ Tạo cảnh</button>
          <button class="ed-btn" (click)="duplicate(c)">⧉ Nhân bản</button>
        </div>
        <button class="ed-btn ed-danger" (click)="removeClip(c.id)">🗑 Xoá cảnh</button>
        <p class="ed-muted">Mô hình: Flux.1 schnell → Wan2.2 TI2V-5B → RIFE 30fps, giọng VieNeu-TTS (dùng thương mại được). Khi xuất phim, hệ thống dựng lại toàn bộ cảnh theo thứ tự trên dòng thời gian.</p>
      } @else {
        <p class="ed-muted">Chọn một cảnh trên dòng thời gian để chỉnh thuộc tính.</p>
      }
    </aside>
  </div>

  <!-- BOTTOM: timeline -->
  <section class="ed-tl" data-testid="film-timeline">
    <div class="ed-tl-bar">
      <button class="ed-btn" (click)="addClip()">＋ Cảnh</button>
      <button class="ed-btn" (click)="sel() && removeClip(sel()!.id)" [disabled]="!sel()">🗑</button>
      <span class="ed-muted">Kéo để đổi thứ tự · kéo mép phải để chỉnh thời lượng</span>
      <span class="ed-zoom">🔍 <input type="range" min="20" max="120" [(ngModel)]="pps" /></span>
    </div>
    <div class="ed-tracks" #tracks (click)="scrub($event)">
      <div class="ed-ruler" [style.width.px]="width()">
        @for (s of ticks(); track s) { <span [style.left.px]="s * pps">{{ s }}s</span> }
      </div>
      <div class="ed-track"><span class="ed-tname">🎞 Video</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of clips(); track c.id; let i = $index) {
            <div class="ed-clip v" [class.sel]="c.id === selId()" [style.width.px]="c.duration * pps" draggable="true"
                 (dragstart)="dragFrom = i" (dragover)="$event.preventDefault()" (drop)="drop(i)" (click)="select(c.id); $event.stopPropagation()"
                 [attr.data-testid]="'clip-' + i" [style.background-image]="c.thumb ? 'url(' + c.thumb + ')' : null">
              <span class="ed-cl">{{ i + 1 }} · {{ c.prompt || 'Cảnh trống' }}</span>
              @if (c.transition !== 'cut') { <span class="ed-tr" [title]="transitionLabel[c.transition]">⧓</span> }
              <span class="ed-trim" (mousedown)="trimStart($event, c)" title="Kéo để chỉnh thời lượng"></span>
            </div>
          }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">🎙 Giọng</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of clips(); track c.id) {
            <div class="ed-clip a" [style.width.px]="c.duration * pps">@if (c.narration) { <span class="ed-wave"></span><span class="ed-cl">{{ voiceName(c.voice) }}</span> }</div>
          }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">♫ Nhạc</span>
        <div class="ed-lane" [style.width.px]="width()">
          @if (music(); as mu) { <div class="ed-clip m" [style.width.px]="total() * pps"><span class="ed-cl">♫ {{ mu.name }}</span></div> }
          @else { <button class="ed-ghost" (click)="lib.set('audio'); mtab.set('lib'); $event.stopPropagation()">＋ Thêm nhạc nền</button> }
        </div>
      </div>
      <div class="ed-track"><span class="ed-tname">T Phụ đề</span>
        <div class="ed-lane" [style.width.px]="width()">
          @for (c of clips(); track c.id) {
            <div class="ed-clip t" [style.width.px]="c.duration * pps"><span class="ed-cl">{{ c.narration }}</span></div>
          }
        </div>
      </div>
      <div class="ed-head" [style.left.px]="96 + playhead() * pps"></div>
    </div>
  </section>
  @if (music(); as mu) { <audio #musicEl [src]="mu.url" loop></audio> }
</div>
`,
  styles: [`
:host{display:block}
.ed{--bg:#0f1012;--p:#17181c;--p2:#1f2026;--b:#2a2c33;--t:#e9e9ec;--m:#8b8d98;--a:#22d3ee;--a2:#c9a961;background:var(--bg);color:var(--t);border-radius:14px;overflow:hidden;font-size:13px;min-height:calc(100vh - 140px);display:flex;flex-direction:column}
.ed button,.ed select,.ed input,.ed textarea{font:inherit;color:inherit}
.ed-top{display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--p);border-bottom:1px solid var(--b)}
.ed-brand{font-weight:700;white-space:nowrap}.ed-brand span{color:var(--a2)}
.ed-title{flex:1;max-width:420px;background:transparent;border:1px solid transparent;border-radius:8px;padding:6px 10px;text-align:center}
.ed-title:hover,.ed-title:focus{border-color:var(--b);outline:none;background:var(--p2)}
.ed-top-r{margin-left:auto;display:flex;gap:10px;align-items:center}
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
.ed-right textarea,.ed-right select,.ed-right input[type=range]{background:var(--p2);border:1px solid var(--b);border-radius:8px;padding:7px;color:var(--t);resize:vertical}
.ed-right input[type=range]{padding:0;accent-color:var(--a)}
.ed-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ed-errtxt{color:#fca5a5;font-size:12px}
.ed-tabs{display:flex;border-bottom:1px solid var(--b);position:sticky;top:0;background:var(--p)}
.ed-tabs button,.ed-mtabs button{flex:1;padding:9px 4px;background:none;border:0;border-bottom:2px solid transparent;color:var(--m);cursor:pointer}
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
  .ed-top{flex-wrap:wrap}.ed-title{order:3;max-width:none;flex-basis:100%}.ed-top-r .ed-muted{display:none}
  .ed-stage{min-height:200px}.ed-tl-bar .ed-muted{display:none}
}
`],
})
export class AiFilmComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  @ViewChild('clipEl') clipEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('musicEl') musicEl?: ElementRef<HTMLAudioElement>;

  readonly libTabs = [{ id: 'scenes', label: 'Cảnh' }, { id: 'uploads', label: 'Tải lên' }, { id: 'audio', label: 'Âm thanh' }, { id: 'text', label: 'Văn bản' }] as const;
  readonly mobileTabs = [{ id: 'preview', label: 'Xem trước' }, { id: 'lib', label: 'Thư viện' }, { id: 'props', label: 'Thuộc tính' }] as const;
  readonly cameras = Object.keys(CAMERA_LABEL) as Camera[];
  readonly transitions = Object.keys(TRANSITION_LABEL) as Transition[];
  readonly cameraLabel = CAMERA_LABEL;
  readonly transitionLabel = TRANSITION_LABEL;

  title = '';
  subtitles = true;
  pps = 48;
  dragFrom = -1;
  readonly lib = signal<string>('scenes');
  readonly mtab = signal<string>('preview');
  readonly clips = signal<Clip[]>([]);
  readonly media = signal<Media[]>([]);
  readonly music = signal<Media | null>(null);
  readonly voices = signal<Voice[]>(FALLBACK_VOICES);
  readonly quota = signal<Quota | null>(null);
  readonly gpuDown = signal(false);
  readonly selId = signal('');
  readonly playhead = signal(0);
  readonly playing = signal(false);
  readonly rendering = signal(false);
  readonly pct = signal(0);
  readonly msg = signal('');
  readonly msgErr = signal(false);
  readonly finalVideo = signal('');
  readonly loggedIn = computed(() => !!this.auth.user());
  readonly promo = computed(() => !!this.quota()?.promo?.active);
  readonly sel = computed(() => this.clips().find((c) => c.id === this.selId()) || null);
  readonly total = computed(() => this.clips().reduce((s, c) => s + Number(c.duration), 0));
  readonly width = computed(() => Math.max(600, (this.total() + 4) * this.pps));
  readonly ticks = computed(() => Array.from({ length: Math.ceil(this.total() + 4) + 1 }, (_, i) => i));
  readonly current = computed(() => this.clipAt(this.playhead()) || this.sel());
  private raf = 0;
  private last = 0;
  private timers = new Set<ReturnType<typeof setInterval>>();
  private trim: { clip: Clip; x: number; d: number } | null = null;

  constructor() { inject(SeoService).set({ title: 'Làm phim AI', description: 'Trình dựng phim AI: viết cảnh, lồng tiếng VieNeu, dựng trên GPU RTX 5090.' }); }

  ngOnInit(): void {
    this.restore();
    if (!this.clips().length) this.addClip();
    if (!this.loggedIn()) return;
    this.http.get<Quota>(`${API}/studio/quota`).subscribe({ next: (q) => { this.quota.set(q); if (q.enabled === false) this.gpuDown.set(true); }, error: () => {} });
    this.http.get<{ vi?: Voice[] }>(`${API}/studio/voices`).subscribe({
      next: (r) => { if (r.vi?.length) this.voices.set(r.vi); },
      error: () => this.gpuDown.set(true),
    });
  }
  ngOnDestroy(): void { cancelAnimationFrame(this.raf); this.timers.forEach(clearInterval); }

  // ---------- project ----------
  private newClip(p: Partial<Clip> = {}): Clip {
    return { id: uid(), prompt: '', narration: '', voice: this.voices()[0]?.id || 'Trúc Ly', duration: 4, transition: 'fade', camera: 'push-in', state: 'draft', source: 'ai', ...p };
  }
  addClip(p: Partial<Clip> = {}): void {
    if (this.clips().length >= 6) return this.note('Tối đa 6 cảnh cho mỗi phim.', true);
    const c = this.newClip(p);
    this.clips.update((a) => [...a, c]); this.select(c.id); this.save();
  }
  duplicate(c: Clip): void { this.addClip({ ...c, id: undefined, state: c.video ? c.state : 'draft' } as Partial<Clip>); }
  removeClip(id: string): void { this.clips.update((a) => a.filter((c) => c.id !== id)); if (this.selId() === id) this.selId.set(this.clips()[0]?.id || ''); this.save(); }
  select(id: string): void { this.selId.set(id); this.playhead.set(this.startOf(id)); this.mtab() === 'lib' && window.innerWidth < 900 && this.mtab.set('props'); }
  setVoice(v: string): void { const c = this.sel(); if (c) { c.voice = v; this.touch(); } }
  touch(): void { this.clips.update((a) => [...a]); this.save(); }
  index(id: string): number { return this.clips().findIndex((c) => c.id === id); }
  voiceName(id: string): string { return (this.voices().find((v) => v.id === id)?.label || id).split(' — ')[0]; }
  stateLabel(s: ClipState): string { return { draft: 'Nháp', queued: 'Chờ', running: 'Đang tạo', ready: 'Sẵn sàng', failed: 'Lỗi' }[s]; }
  drop(to: number): void {
    const from = this.dragFrom; this.dragFrom = -1;
    if (from < 0 || from === to) return;
    this.clips.update((a) => { const b = [...a]; const [m] = b.splice(from, 1); b.splice(to, 0, m); return b; }); this.save();
  }
  trimStart(e: MouseEvent, c: Clip): void { e.stopPropagation(); e.preventDefault(); this.trim = { clip: c, x: e.clientX, d: Number(c.duration) }; }
  @HostListener('document:mousemove', ['$event']) onMove(e: MouseEvent): void {
    if (!this.trim) return;
    const d = Math.round(Math.min(8, Math.max(2, this.trim.d + (e.clientX - this.trim.x) / this.pps)) * 2) / 2;
    if (d !== this.trim.clip.duration) { this.trim.clip.duration = d; this.clips.update((a) => [...a]); }
  }
  @HostListener('document:mouseup') onUp(): void { if (this.trim) { this.trim = null; this.save(); } }

  save(): void {
    try {
      const clips = this.clips().map(({ video, thumb, ...c }) => ({ ...c, thumb: thumb?.startsWith('blob:') ? undefined : thumb, state: c.state === 'ready' && video?.startsWith('blob:') ? 'draft' : c.state }));
      localStorage.setItem(STORE, JSON.stringify({ title: this.title, subtitles: this.subtitles, clips }));
    } catch { /* storage full or disabled */ }
  }
  private restore(): void {
    try {
      const p = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!p) return;
      this.title = p.title || ''; this.subtitles = p.subtitles !== false;
      this.clips.set((p.clips || []).map((c: Clip) => ({ ...this.newClip(), ...c, state: c.state === 'queued' || c.state === 'running' ? 'draft' : c.state })));
      this.selId.set(this.clips()[0]?.id || '');
    } catch { /* ignore */ }
  }

  // ---------- uploads ----------
  upload(ev: Event): void {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    const add = files.filter((f) => /^(image|video)\//.test(f.type)).map((f) => ({ id: uid(), kind: f.type.startsWith('image') ? 'image' : 'video', name: f.name, url: URL.createObjectURL(f), file: f } as Media));
    this.media.update((m) => [...m, ...add]);
    (ev.target as HTMLInputElement).value = '';
  }
  uploadMusic(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.music.set({ id: uid(), kind: 'audio', name: f.name, url: URL.createObjectURL(f), file: f });
  }
  useMedia(m: Media): void {
    if (m.kind === 'video') this.addClip({ source: 'upload', state: 'ready', video: m.url, prompt: m.name.replace(/\.[^.]+$/, ''), duration: 4, camera: 'static' });
    else this.addClip({ thumb: m.url, prompt: '', camera: 'push-in' });
    this.lib.set('scenes');
  }

  // ---------- GPU calls (API -> AI service -> 5090) ----------
  private scenePrompt(c: Clip): string { return `${c.prompt.trim()}, ${CAMERA_PROMPT[c.camera]}, cinematic`.slice(0, 1000); }
  private apiError(e: HttpErrorResponse): string {
    if (e.status === 0 || e.status >= 502 || e.error?.code === 'STUDIO_UNAVAILABLE') { this.gpuDown.set(true); return 'GPU không khả dụng — dự án vẫn được giữ nguyên, hãy thử lại sau.'; }
    return e.error?.message || 'Không gửi được yêu cầu, vui lòng thử lại.';
  }
  async generate(c: Clip): Promise<void> {
    if (!this.loggedIn()) return this.note('Đăng nhập để tạo cảnh.', true);
    c.state = 'queued'; c.error = ''; this.touch();
    let imageBase64: string | undefined;
    if (c.thumb?.startsWith('blob:')) imageBase64 = await this.blobB64(c.thumb).catch(() => undefined);
    this.http.post<{ id: string }>(`${API}/studio/video/fast`, { prompt: this.scenePrompt(c), imageBase64 }).subscribe({
      next: (j) => this.poll(j.id, (s) => {
        c.state = s.status === 'running' ? 'running' : c.state;
        if (s.status === 'succeeded') {
          if (s.imageUrl) this.blob(s.imageUrl, (u) => { c.thumb = u; this.touch(); });
          if (s.videoUrl) this.blob(s.videoUrl, (u) => { c.video = u; c.state = 'ready'; this.touch(); this.note(`Cảnh ${this.index(c.id) + 1} đã sẵn sàng.`); });
        } else if (s.status === 'failed') { c.state = 'failed'; c.error = s.error || 'Tạo cảnh thất bại.'; }
        this.touch();
      }),
      error: (e: HttpErrorResponse) => { c.state = 'failed'; c.error = this.apiError(e); this.touch(); },
    });
  }
  render(): void {
    if (!this.loggedIn()) return this.note('Đăng nhập để xuất phim.', true);
    const scenes = this.clips().filter((c) => c.source !== 'upload' && c.prompt.trim().length >= 3)
      .map((c) => ({ prompt: this.scenePrompt(c), narration: c.narration.trim() }));
    if (!scenes.length) return this.note('Cần ít nhất một cảnh có mô tả hình ảnh.', true);
    this.rendering.set(true); this.pct.set(3); this.note('Đang gửi phim vào hàng đợi GPU…');
    const t0 = Date.now(); const est = 22 * scenes.length + 6;
    this.http.post<{ id: string }>(`${API}/studio/film`, { title: this.title.trim(), lang: 'vi', voice: this.sel()?.voice || this.clips()[0]?.voice, scenes }).subscribe({
      next: (j) => this.poll(j.id, (s) => {
        const sec = Math.round((Date.now() - t0) / 1000);
        if (s.status === 'queued') this.note(`Đang xếp hàng${s.position ? ` (vị trí ${s.position})` : ''} · ${sec}s`);
        if (s.status === 'running') { this.pct.set(Math.min(95, Math.round((sec / est) * 100))); this.note(`Đang dựng ${scenes.length} cảnh trên RTX 5090 · ${sec}s`); }
        if (s.status === 'succeeded' && s.videoUrl) this.blob(s.videoUrl, (u) => { this.finalVideo.set(u); this.rendering.set(false); this.pct.set(100); this.note(`Xong! Phim ${scenes.length} cảnh dựng trong ${Math.round(s.timings?.['total'] ?? sec)}s.`); this.mtab.set('preview'); });
        if (s.status === 'failed') { this.rendering.set(false); this.note(s.error || 'Dựng phim thất bại.', true); }
      }),
      error: (e: HttpErrorResponse) => { this.rendering.set(false); this.note(this.apiError(e), true); },
    });
  }
  private poll(id: string, on: (s: Job) => void): void {
    const t = setInterval(() => this.http.get<Job>(`${API}/studio/jobs/${id}`).subscribe({
      next: (s) => { on(s); if (s.status === 'succeeded' || s.status === 'failed') { clearInterval(t); this.timers.delete(t); } },
      error: () => {},
    }), 1500);
    this.timers.add(t);
  }
  private blob(path: string, done: (url: string) => void): void {
    this.http.get(`${ROOT}${path}`, { responseType: 'blob' }).subscribe({ next: (b) => done(URL.createObjectURL(b)), error: () => {} });
  }
  private async blobB64(url: string): Promise<string> {
    const b = await (await fetch(url)).blob();
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b); });
  }
  private note(m: string, err = false): void { this.msg.set(m); this.msgErr.set(err); }

  // ---------- playback ----------
  private startOf(id: string): number { let t = 0; for (const c of this.clips()) { if (c.id === id) return t; t += Number(c.duration); } return 0; }
  private clipAt(t: number): Clip | null { let s = 0; for (const c of this.clips()) { if (t < s + Number(c.duration)) return c; s += Number(c.duration); } return null; }
  toggle(): void { this.playing() ? this.pause() : this.play(); }
  play(): void {
    if (this.playhead() >= this.total() - 0.05) this.playhead.set(0);
    this.playing.set(true); this.last = performance.now(); this.musicEl?.nativeElement.play().catch(() => {});
    const step = (now: number) => {
      if (!this.playing()) return;
      const before = this.clipAt(this.playhead())?.id;
      this.playhead.set(Math.min(this.total(), this.playhead() + (now - this.last) / 1000)); this.last = now;
      const c = this.clipAt(this.playhead());
      if (c && c.id !== before) { this.selId.set(c.id); setTimeout(() => this.syncVideo(), 0); }
      if (this.playhead() >= this.total()) { this.pause(); return; }
      this.raf = requestAnimationFrame(step);
    };
    setTimeout(() => this.syncVideo(), 0);
    this.raf = requestAnimationFrame(step);
  }
  pause(): void { this.playing.set(false); cancelAnimationFrame(this.raf); this.clipEl?.nativeElement.pause(); this.musicEl?.nativeElement.pause(); }
  private syncVideo(): void {
    const v = this.clipEl?.nativeElement; const c = this.current();
    if (!v || !c) return;
    v.currentTime = Math.max(0, this.playhead() - this.startOf(c.id)) % Math.max(0.1, v.duration || c.duration);
    if (this.playing()) v.play().catch(() => {});
  }
  clipEnded(): void { if (this.playing()) this.clipEl?.nativeElement.play().catch(() => {}); }
  seek(t: number): void { this.playhead.set(Math.max(0, Math.min(this.total(), t))); const c = this.clipAt(this.playhead()); if (c) this.selId.set(c.id); setTimeout(() => this.syncVideo(), 0); }
  scrub(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement; const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - 96;
    if (x >= 0 && (e.target as HTMLElement).closest('.ed-ruler')) this.seek(x / this.pps);
  }
  tc(t: number): string {
    const f = Math.floor((t % 1) * FPS); const s = Math.floor(t) % 60; const m = Math.floor(t / 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }
}
