import {
  AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ContentService } from '../../services/api.services';
import { environment } from '../../../environments/environment';
import { ContentEpisode, NarrationTiming, Product, ReaderBookmark, SeriesInfo } from '../../models/marketplace.models';

type Theme = 'light' | 'sepia' | 'dark';
type Mode = 'scroll' | 'paged';
interface ReaderSettings { size: number; family: 'serif' | 'sans'; line: number; margin: 0 | 1 | 2; theme: Theme; mode: Mode }
interface Chapter { ep: ContentEpisode; kind: 'text' | 'image' | 'other'; paras: string[]; images: string[]; error: string }
/** One narrated sentence: paragraph index, [c0, c1) offsets in that paragraph, start / end seconds. */
interface Seg { p: number; c0: number; c1: number; start: number; end: number }
interface Sync { segs: Seg[]; sentence: boolean }

const SETTINGS_KEY = 'aimarkets.reader.settings';
const LS = (slug: string) => `aimarkets.read.${slug}`;
const LS_AUDIO = (slug: string) => `aimarkets.listen.${slug}`;
const FOLLOW_PAUSE_MS = 6000; // after the reader scrolls / flips by hand, stop following the voice for a moment
const DEFAULTS: ReaderSettings = { size: 19, family: 'serif', line: 1.7, margin: 1, theme: 'sepia', mode: 'scroll' };
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/**
 * Kindle / Wattpad-style reader for story-book products: immersive, themable (light / sepia / dark),
 * scroll or page-flip, TOC with locked / free chapters, resume + bookmarks / highlights stored per user,
 * audio narration synced to the text (per-sentence TTS timing: highlight, follow, tap-to-seek, resume). License-gated like the series player; no-capture rules kept (no context menu,
 * drag, copy or print of the content).
 */
@Component({
  selector: 'app-story-reader',
  standalone: true,
  template: `
<div class="rd story-reader" [attr.data-theme]="s().theme" [class.rd--chrome]="chrome()" [class.rd--paged]="s().mode === 'paged'" data-testid="story-reader"
  [style.--fs.px]="s().size" [style.--lh]="s().line" [style.--mx]="marginRem()"
  (contextmenu)="block($event)" (dragstart)="block($event)" (copy)="block($event)" (cut)="block($event)">

  <header class="rd-top" data-testid="rd-top">
    <button type="button" class="rd-ib" (click)="back.emit()" aria-label="Quay lại" data-testid="rd-back">←</button>
    <div class="rd-title">
      <b>{{ product.name }}</b>
      <small>{{ chapter()?.ep?.title || '' }}</small>
    </div>
    <button type="button" class="rd-ib" (click)="panel.set(panel() === 'toc' ? null : 'toc')" [class.on]="panel() === 'toc'" aria-label="Mục lục" data-testid="rd-toc-btn">☰</button>
    <button type="button" class="rd-ib" (click)="toggleBookmark()" [class.on]="bookmarkHere()" [disabled]="!canRead()" aria-label="Đánh dấu trang" data-testid="rd-bm-btn">{{ bookmarkHere() ? '🔖' : '🏷' }}</button>
    @if (narrations().length) {
      <button type="button" class="rd-ib" (click)="toggleNarration()" [class.on]="audioOpen()" aria-label="Nghe sách nói" data-testid="rd-audio-btn">🎧</button>
    }
    <button type="button" class="rd-ib rd-aa" (click)="panel.set(panel() === 'settings' ? null : 'settings')" [class.on]="panel() === 'settings'" aria-label="Cài đặt đọc" data-testid="rd-settings-btn">Aa</button>
  </header>

  @if (watermark()) { <div class="rd-wm" aria-hidden="true" data-testid="rd-wm">{{ watermark() }}</div> }
  <main #scroller class="rd-body" (scroll)="onScroll()" (click)="onTap($event)" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)" (mouseup)="onSelect()" data-testid="rd-body">
    @if (loading() && !chapter()) {
      <div class="rd-center">Đang tải…</div>
    } @else if (chapter(); as c) {
      @if (!playable(c.ep)) {
        <div class="rd-center rd-lock" data-testid="rd-locked">
          <div class="rd-lock__ic">🔒</div>
          <h2>{{ c.ep.title }}</h2>
          <p>Chương {{ c.ep.index }} cần mở khóa để đọc tiếp.</p>
          @if (!auth.user()) {
            <button type="button" class="rd-cta" (click)="login.emit()">Đăng nhập để đọc</button>
          } @else {
            <button type="button" class="rd-cta" (click)="checkout.emit()" [disabled]="checkingOut" data-testid="rd-unlock">{{ checkingOut ? 'Đang thanh toán…' : 'Mở khóa cả truyện' + (priceLabel ? ' · ' + priceLabel : '') }}</button>
          }
          @if (prevChapter(); as pc) { <button type="button" class="rd-link" (click)="go(pc)">← {{ pc.title }}</button> }
        </div>
      } @else if (c.error) {
        <div class="rd-center">{{ c.error }} <button type="button" class="rd-link" (click)="open(c.ep, true)">Thử lại</button></div>
      } @else if (!c.paras.length && !c.images.length) {
        <div class="rd-center">Đang mở chương…</div>
      } @else {
        <article #cols class="rd-article" [style.column-width.px]="s().mode === 'paged' ? colW() : null" [style.column-gap.px]="s().mode === 'paged' ? gapPx() : null" [style.padding-left.px]="s().mode === 'paged' ? gapPx() / 2 : null" [style.padding-right.px]="s().mode === 'paged' ? gapPx() / 2 : null">
          <p class="rd-kicker">Chương {{ c.ep.index }}</p>
          <h1 class="rd-h1">{{ chapterHeading(c.ep) }}</h1>
          @for (src of c.images; track $index) {
            <figure class="rd-fig"><img [src]="src" alt="" draggable="false" (load)="relayout()" /></figure>
          }
          @for (p of c.paras; track $index) {
            <p class="rd-p" [class.rd-p--now]="audioOpen() && sayingPara() === $index" [class.rd-p--tap]="audioOpen() && !!sync()" [attr.data-i]="$index" [innerHTML]="marked(p, $index)"></p>
          }
          <div class="rd-end">
            @if (nextChapter(); as nc) {
              <button type="button" class="rd-cta" (click)="go(nc)" data-testid="rd-next-end">{{ playable(nc) ? 'Chương tiếp: ' : '🔒 ' }}{{ nc.title }} →</button>
            } @else { <p class="rd-fin">— Hết —</p> }
          </div>
        </article>
      }
    } @else if (!loading()) {
      <div class="rd-center">Truyện chưa có chương nào.</div>
    }
  </main>

  @if (selQuote()) {
    <button type="button" class="rd-hl-btn" (click)="addHighlight()" data-testid="rd-hl-btn">🖍 Tô sáng</button>
  }

  @if (audioOpen()) {
    <div class="rd-audio" data-testid="rd-audio">
      @if (audioErr()) {
        <span class="rd-audio__err">{{ audioErr() }}</span>
        @if (!canPlay) { <button type="button" class="rd-chip" (click)="checkout.emit()">Mở khóa</button> }
      } @else {
        <button type="button" class="rd-play" (click)="playPause()" [attr.aria-label]="audio.paused ? 'Phát' : 'Tạm dừng'" data-testid="rd-play">{{ audioPlaying() ? '❚❚' : '▶' }}</button>
        <div class="rd-audio__mid">
          <small>🎙 {{ narration()?.title || 'Sách nói' }} · {{ voiceLabel() }}</small>
          <input type="range" min="0" [max]="aDur() || 0" step="0.1" [value]="aTime()" (input)="seek($any($event.target).value)" aria-label="Vị trí" />
        </div>
        <span class="rd-audio__t" data-testid="rd-audio-time">{{ clock(aTime()) }} / {{ clock(aDur()) }}</span>
        @if (readingElsewhere(); as rc) {
          <button type="button" class="rd-chip" (click)="go(rc)" data-testid="rd-audio-back" [attr.aria-label]="'Về chương đang đọc: ' + rc.title">↩ Ch. {{ rc.index }}</button>
        }
        <button type="button" class="rd-chip" (click)="cycleSpeed()" aria-label="Tốc độ" data-testid="rd-speed">{{ speed() }}×</button>
      }
      <button type="button" class="rd-ib rd-ib--sm" (click)="closeNarration()" aria-label="Đóng">✕</button>
    </div>
  }

  <footer class="rd-bottom" data-testid="rd-bottom">
    <button type="button" class="rd-ib" (click)="prevChapter() && go(prevChapter()!)" [disabled]="!prevChapter()" aria-label="Chương trước" data-testid="rd-prev-ch">⟨</button>
    <div class="rd-prog">
      <div class="rd-prog__bar"><i [style.width.%]="overallPct()"></i><b [style.left.%]="overallPct()"></b></div>
      <div class="rd-prog__lbl" data-testid="rd-progress">
        <span>Chương {{ chapter()?.ep?.index || 0 }}/{{ chapters().length }} · {{ chapterPct() }}%</span>
        @if (s().mode === 'paged' && pages() > 1) { <span>Trang {{ page() + 1 }}/{{ pages() }}</span> }
        <span>Cả truyện {{ overallPct() }}%</span>
      </div>
    </div>
    <button type="button" class="rd-ib" (click)="nextChapter() && go(nextChapter()!)" [disabled]="!nextChapter()" aria-label="Chương sau" data-testid="rd-next-ch">⟩</button>
  </footer>

  @if (panel()) { <div class="rd-scrim" (click)="panel.set(null)"></div> }

  @if (panel() === 'toc') {
    <aside class="rd-drawer" role="dialog" aria-label="Mục lục" data-testid="rd-toc">
      <div class="rd-drawer__head">
        <div class="rd-tabs">
          <button type="button" [class.on]="tocTab() === 'ch'" (click)="tocTab.set('ch')">Mục lục</button>
          <button type="button" [class.on]="tocTab() === 'bm'" (click)="tocTab.set('bm')" data-testid="rd-bm-tab">Dấu trang · {{ bookmarks().length }}</button>
        </div>
        <button type="button" class="rd-ib" (click)="panel.set(null)" aria-label="Đóng">✕</button>
      </div>
      @if (tocTab() === 'ch') {
        @if (product.coverUrl) { <div class="rd-cover" [style.background-image]="'url(' + product.coverUrl + ')'"></div> }
        <ol class="rd-toc">
          @for (ep of chapters(); track ep.id) {
            <li>
              <button type="button" class="rd-toc__row" [class.on]="ep.id === chapter()?.ep?.id" (click)="go(ep)">
                <span class="rd-toc__n">{{ ep.index }}</span>
                <span class="rd-toc__t">{{ ep.title }}
                  @if (ep.id === chapter()?.ep?.id) { <small>Đang đọc · {{ chapterPct() }}%</small> }
                </span>
                @if (!playable(ep)) { <span class="rd-tag rd-tag--lock">🔒</span> } @else if (ep.free && !canPlay) { <span class="rd-tag rd-tag--free">Miễn phí</span> }
              </button>
              @if (owner) { <button type="button" class="rd-ib rd-ib--sm" (click)="download.emit(ep)" title="Tải .aimc (chủ sở hữu / kiểm duyệt)" aria-label="Tải .aimc">⬇</button> }
            </li>
          }
          @for (ep of narrations(); track ep.id) {
            <li>
              <button type="button" class="rd-toc__row" (click)="openNarration(ep)"><span class="rd-toc__n">🎧</span><span class="rd-toc__t">{{ ep.title }} <small>Sách nói · {{ clock(ep.durationSec || 0) }}</small></span>
                @if (!playable(ep)) { <span class="rd-tag rd-tag--lock">🔒</span> }
              </button>
              @if (owner) { <button type="button" class="rd-ib rd-ib--sm" (click)="download.emit(ep)" aria-label="Tải .aimc">⬇</button> }
            </li>
          }
        </ol>
        <p class="rd-note">{{ canPlay ? 'Chỉ đọc online: mỗi trang đều kiểm tra license, dừng ngay khi license hết hạn.' : 'Chương 🔒 cần license để đọc.' }} Nội dung được bảo vệ: không tải về, không chụp / sao chép.</p>
      } @else {
        <ul class="rd-bms">
          @for (b of bookmarks(); track b.id) {
            <li [attr.data-kind]="b.kind">
              <button type="button" class="rd-bm" (click)="jump(b)">
                <span>{{ b.kind === 'highlight' ? '🖍' : '🔖' }} {{ titleOf(b.episodeId) }} · {{ (b.fraction * 100).toFixed(0) }}%</span>
                @if (b.quote) { <q>{{ b.quote }}</q> }
              </button>
              <button type="button" class="rd-ib rd-ib--sm" (click)="removeBookmark(b)" aria-label="Xoá">🗑</button>
            </li>
          } @empty { <li class="rd-note">Chưa có dấu trang. Bấm 🏷 hoặc bôi đen một đoạn để tô sáng.</li> }
        </ul>
      }
    </aside>
  }

  @if (panel() === 'settings') {
    <aside class="rd-sheet" role="dialog" aria-label="Cài đặt đọc" data-testid="rd-settings">
      <div class="rd-row"><span>Cỡ chữ</span>
        <div class="rd-seg"><button type="button" (click)="set({ size: s().size - 1 })" [disabled]="s().size <= 14" aria-label="Nhỏ hơn">A−</button><b>{{ s().size }}</b><button type="button" (click)="set({ size: s().size + 1 })" [disabled]="s().size >= 30" aria-label="Lớn hơn" data-testid="rd-font-up">A+</button></div></div>
      <div class="rd-row"><span>Phông</span>
        <div class="rd-seg"><button type="button" class="serif" [class.on]="s().family === 'serif'" (click)="set({ family: 'serif' })">Serif</button><button type="button" class="sans" [class.on]="s().family === 'sans'" (click)="set({ family: 'sans' })">Sans</button></div></div>
      <div class="rd-row"><span>Giãn dòng</span>
        <div class="rd-seg">@for (l of [1.4, 1.7, 2.0]; track l) { <button type="button" [class.on]="s().line === l" (click)="set({ line: l })">{{ l === 1.4 ? 'Hẹp' : l === 1.7 ? 'Vừa' : 'Rộng' }}</button> }</div></div>
      <div class="rd-row"><span>Lề</span>
        <div class="rd-seg">@for (m of [0, 1, 2]; track m) { <button type="button" [class.on]="s().margin === m" (click)="set({ margin: $any(m) })">{{ ['Hẹp', 'Vừa', 'Rộng'][m] }}</button> }</div></div>
      <div class="rd-row"><span>Giao diện</span>
        <div class="rd-themes">
          @for (t of themes; track t.id) { <button type="button" [attr.data-t]="t.id" [class.on]="s().theme === t.id" (click)="set({ theme: t.id })" [attr.data-testid]="'rd-theme-' + t.id">{{ t.label }}</button> }
        </div></div>
      <div class="rd-row"><span>Chế độ</span>
        <div class="rd-seg"><button type="button" [class.on]="s().mode === 'scroll'" (click)="set({ mode: 'scroll' })" data-testid="rd-mode-scroll">↕ Cuộn</button><button type="button" [class.on]="s().mode === 'paged'" (click)="set({ mode: 'paged' })" data-testid="rd-mode-paged">⇆ Lật trang</button></div></div>
      <p class="rd-note">Chạm trái / phải để lật trang, chạm giữa để ẩn / hiện thanh công cụ. Phím ← → cũng lật trang.</p>
    </aside>
  }
</div>
  `,
  styles: [`
:host{position:fixed;inset:0;z-index:1000;display:block}
.rd{--bg:#f4ecd8;--fg:#3b2f22;--muted:#7a6a55;--line:rgba(91,70,40,.18);--bar:rgba(244,236,216,.96);--acc:#b5651d;--hl:rgba(255,213,79,.55);
  position:absolute;inset:0;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.rd[data-theme=light]{--bg:#ffffff;--fg:#1f2328;--muted:#6b7280;--line:rgba(0,0,0,.1);--bar:rgba(255,255,255,.96);--acc:#2563eb;--hl:rgba(253,224,71,.6)}
.rd[data-theme=dark]{--bg:#121212;--fg:#d6d3cd;--muted:#8d8a85;--line:rgba(255,255,255,.1);--bar:rgba(24,24,24,.96);--acc:#e0a050;--hl:rgba(224,160,80,.35)}
.rd-top,.rd-bottom{position:absolute;left:0;right:0;z-index:3;display:flex;align-items:center;gap:4px;background:var(--bar);backdrop-filter:blur(8px);transition:transform .22s ease,opacity .22s ease}
.rd-top{top:0;padding:max(4px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) 4px max(6px,env(safe-area-inset-left));border-bottom:1px solid var(--line)}
.rd-bottom{bottom:0;padding:6px max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));border-top:1px solid var(--line)}
.rd:not(.rd--chrome) .rd-top{transform:translateY(-105%);opacity:0;pointer-events:none}
.rd:not(.rd--chrome) .rd-bottom{transform:translateY(105%);opacity:0;pointer-events:none}
.rd-ib{flex:none;min-width:44px;height:44px;border-radius:10px;border:0;background:transparent;color:inherit;font-size:19px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.rd-ib:hover,.rd-ib.on{background:var(--line)} .rd-ib:disabled{opacity:.35;cursor:default}
.rd-ib--sm{min-width:40px;height:40px;font-size:15px}
.rd-aa{font:700 17px Georgia,serif}
.rd-title{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2;padding:0 4px}
.rd-title b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd-title small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scroll-behavior:auto;padding:calc(64px + env(safe-area-inset-top)) 0 calc(96px + env(safe-area-inset-bottom))}
.rd--paged .rd-body{overflow:hidden;padding:0}
.rd-article{max-width:calc(36em + 2 * var(--mx));margin:0 auto;padding:0 var(--mx);font-size:var(--fs);line-height:var(--lh);font-family:Georgia,'Noto Serif','Times New Roman',serif}
:host([data-family=sans]) .rd-article{font-family:inherit}
.rd--paged .rd-article{max-width:none;height:100%;padding:calc(60px + env(safe-area-inset-top)) var(--mx) calc(84px + env(safe-area-inset-bottom));column-fill:auto;box-sizing:border-box}
.rd-kicker{margin:0 0 .3em;font:600 .7em/1.2 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-family:inherit}
.rd-h1{margin:0 0 1.1em;font-size:1.45em;line-height:1.25;font-weight:700}
.rd-p{margin:0 0 1em;text-align:justify;hyphens:auto;-webkit-user-select:text;user-select:text;border-radius:4px;transition:background .3s}
.rd-p--now{background:color-mix(in srgb,var(--hl) 38%,transparent)}
.rd-p--tap{cursor:pointer}
:host ::ng-deep .rd-p .rd-s{background:var(--hl);color:inherit;border-radius:3px;box-shadow:0 0 0 2px var(--hl);-webkit-box-decoration-break:clone;box-decoration-break:clone}
:host ::ng-deep .rd-p mark{background:var(--hl);color:inherit;border-radius:2px}
.rd-fig{margin:0 0 1.2em;break-inside:avoid;text-align:center}
.rd-fig img{max-width:100%;max-height:72vh;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);pointer-events:none;-webkit-user-drag:none}
.rd--paged .rd-fig img{max-height:calc(100dvh - 220px)}
.rd-end{padding:1.5em 0 2em;text-align:center;break-inside:avoid}
.rd-fin{color:var(--muted);letter-spacing:.3em}
.rd-center{min-height:60%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;color:var(--muted)}
.rd--paged .rd-center{height:100%}
.rd-lock h2{margin:0;color:var(--fg);font:700 20px Georgia,serif}.rd-lock__ic{font-size:44px}
.rd-cta{min-height:48px;padding:0 22px;border-radius:999px;border:0;background:var(--acc);color:#fff;font-weight:700;font-size:15px;cursor:pointer;max-width:100%}
.rd-cta:disabled{opacity:.6}
.rd-link{background:none;border:0;color:var(--acc);text-decoration:underline;min-height:44px;cursor:pointer;font:inherit}
.rd-prog{flex:1;min-width:0;padding:0 6px}
.rd-prog__bar{position:relative;height:4px;border-radius:4px;background:var(--line)}
.rd-prog__bar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--acc)}
.rd-prog__bar b{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--acc)}
.rd-prog__lbl{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px;color:var(--muted);white-space:nowrap}
.rd-scrim{position:absolute;inset:0;z-index:4;background:rgba(0,0,0,.35)}
.rd-drawer{position:absolute;z-index:5;top:0;bottom:0;left:0;width:min(88vw,380px);background:var(--bg);color:var(--fg);box-shadow:12px 0 40px rgba(0,0,0,.3);overflow-y:auto;padding:max(8px,env(safe-area-inset-top)) 0 max(12px,env(safe-area-inset-bottom)) env(safe-area-inset-left);animation:rd-in .2s ease-out}
@keyframes rd-in{from{transform:translateX(-100%)}}
.rd-drawer__head{display:flex;align-items:center;gap:6px;padding:0 6px 6px 12px;border-bottom:1px solid var(--line)}
.rd-tabs{flex:1;display:flex;gap:4px}.rd-tabs button{min-height:44px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-weight:600;cursor:pointer}
.rd-tabs button.on{background:var(--line);color:var(--fg)}
.rd-cover{height:150px;margin:12px;border-radius:12px;background:center/cover no-repeat}
.rd-toc,.rd-bms{list-style:none;margin:0;padding:4px 0}
.rd-toc li,.rd-bms li{display:flex;align-items:center;padding-right:6px}
.rd-toc__row,.rd-bm{flex:1;min-width:0;display:flex;align-items:center;gap:10px;min-height:52px;padding:6px 12px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit;font-size:15px}
.rd-toc__row.on{background:var(--line)}
.rd-toc__n{flex:none;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--line);font-size:13px;font-weight:700}
.rd-toc__t{flex:1;min-width:0;display:flex;flex-direction:column}.rd-toc__t small{color:var(--acc);font-size:12px}
.rd-tag{flex:none;font-size:12px;padding:2px 8px;border-radius:999px}.rd-tag--free{background:rgba(34,197,94,.15);color:#16a34a}.rd-tag--lock{background:var(--line)}
.rd-bm{flex-direction:column;align-items:flex-start;gap:4px}.rd-bm q{font-style:italic;color:var(--muted);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rd-note{margin:10px 14px;font-size:12.5px;color:var(--muted);line-height:1.5}
.rd-wm{position:absolute;inset:auto 0 calc(76px + env(safe-area-inset-bottom)) 0;z-index:4;text-align:center;pointer-events:none;user-select:none;font:600 11px/1.2 ui-monospace,monospace;color:var(--muted);opacity:.45}
.rd-sheet{position:absolute;z-index:5;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,520px);background:var(--bg);color:var(--fg);border-radius:18px 18px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.3);padding:14px 16px max(14px,env(safe-area-inset-bottom));animation:rd-up .2s ease-out}
@keyframes rd-up{from{transform:translate(-50%,100%)}}
.rd-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;font-size:14px}
.rd-seg{display:flex;align-items:center;gap:4px;padding:3px;border-radius:12px;background:var(--line)}
.rd-seg button{min-width:52px;min-height:40px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:inherit;font-size:14px;cursor:pointer}
.rd-seg button.on{background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,.15);font-weight:700}.rd-seg button:disabled{opacity:.35}
.rd-seg b{min-width:28px;text-align:center}.rd-seg .serif{font-family:Georgia,serif}
.rd-themes{display:flex;gap:8px}.rd-themes button{width:64px;height:44px;border-radius:10px;border:2px solid var(--line);cursor:pointer;font-weight:600}
.rd-themes [data-t=light]{background:#fff;color:#111}.rd-themes [data-t=sepia]{background:#f4ecd8;color:#3b2f22}.rd-themes [data-t=dark]{background:#121212;color:#ddd}
.rd-themes button.on{border-color:var(--acc)}
.rd-audio{position:absolute;z-index:3;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));width:min(calc(100% - 20px),560px);display:flex;align-items:center;gap:8px;padding:8px 8px 8px 10px;border-radius:16px;background:var(--bar);border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.2);transition:bottom .22s ease}
.rd:not(.rd--chrome) .rd-audio{bottom:max(10px,env(safe-area-inset-bottom))}
.rd-play{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--acc);color:#fff;font-size:15px;cursor:pointer}
.rd-audio__mid{flex:1;min-width:0;display:flex;flex-direction:column}.rd-audio__mid small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rd-audio__mid input{width:100%;accent-color:var(--acc);height:24px}
.rd-audio__t{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.rd-audio__err{flex:1;font-size:13px}
.rd-chip{min-width:48px;min-height:40px;border-radius:999px;border:1px solid var(--line);background:transparent;color:inherit;font-weight:700;cursor:pointer}
.rd-hl-btn{position:absolute;z-index:6;left:50%;top:calc(70px + env(safe-area-inset-top));transform:translateX(-50%);min-height:44px;padding:0 16px;border-radius:999px;border:0;background:#111;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.3)}
@media (max-width:640px){.rd-prog__lbl{font-size:11px}.rd-body{padding-top:calc(60px + env(safe-area-inset-top))}}
@media print{.rd{display:none!important}}
  `],
  host: { '[attr.data-family]': 's().family' },
})
export class StoryReaderComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly auth = inject(AuthService);
  private readonly api = inject(ContentService);

  @Input({ required: true }) product!: Product;
  @Input() canPlay = false;
  @Input() licenseKey = '';
  @Input() priceLabel = '';
  @Input() checkingOut = false;
  /** Seller or admin: the only readers who may download the raw .aimc file. */
  @Input() owner = false;
  @Output() checkout = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() download = new EventEmitter<ContentEpisode>();
  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;
  @ViewChild('cols') cols?: ElementRef<HTMLElement>;

  readonly themes: { id: Theme; label: string }[] = [{ id: 'light', label: 'Sáng' }, { id: 'sepia', label: 'Sepia' }, { id: 'dark', label: 'Tối' }];
  readonly gapPx = signal(48);
  readonly s = signal<ReaderSettings>(DEFAULTS);
  readonly info = signal<SeriesInfo | null>(null);
  readonly episodes = signal<ContentEpisode[]>([]);
  readonly chapter = signal<Chapter | null>(null);
  readonly watermark = signal('');
  readonly loading = signal(false);
  readonly chrome = signal(true);
  readonly panel = signal<'toc' | 'settings' | null>(null);
  readonly tocTab = signal<'ch' | 'bm'>('ch');
  readonly fraction = signal(0);
  readonly page = signal(0);
  readonly pages = signal(1);
  readonly colW = signal(600);
  readonly bookmarks = signal<ReaderBookmark[]>([]);
  readonly selQuote = signal('');
  readonly audioOpen = signal(false);
  readonly audioErr = signal('');
  readonly audioPlaying = signal(false);
  readonly narration = signal<ContentEpisode | null>(null);
  readonly aTime = signal(0);
  readonly aDur = signal(0);
  readonly speed = signal(1);
  /** Timing of the open narration (from /unlock) and the chapter it reads. */
  readonly timing = signal<NarrationTiming | null>(null);
  readonly audio: HTMLAudioElement = typeof Audio !== 'undefined' ? new Audio() : ({ paused: true } as HTMLAudioElement);

  readonly chapters = computed(() => this.episodes().filter((e) => e.kind !== 'audio' && e.kind !== 'video'));
  readonly narrations = computed(() => this.episodes().filter((e) => e.kind === 'audio'));
  readonly idx = computed(() => this.chapters().findIndex((e) => e.id === this.chapter()?.ep.id));
  readonly prevChapter = computed(() => this.chapters()[this.idx() - 1] || null);
  readonly nextChapter = computed(() => (this.idx() >= 0 ? this.chapters()[this.idx() + 1] || null : null));
  readonly chapterPct = computed(() => Math.round(this.fraction() * 100));
  readonly overallPct = computed(() => {
    const n = this.chapters().length;
    return n ? Math.min(100, Math.round(((Math.max(0, this.idx()) + this.fraction()) / n) * 100)) : 0;
  });
  readonly canRead = computed(() => !!this.chapter() && this.playable(this.chapter()!.ep));
  readonly bookmarkHere = computed(() => {
    const c = this.chapter();
    return !!c && this.bookmarks().some((b) => b.kind === 'bookmark' && b.episodeId === c.ep.id && Math.abs(b.fraction - this.fraction()) < 0.04);
  });
  private readonly paraSigs = computed(() => (this.chapter()?.paras || []).map(fnv));
  /**
   * Real narration timing for the chapter on screen: sentence level when every paragraph still hashes like the
   * text that was narrated, paragraph level if only the count matches (chapter edited since), else none.
   */
  readonly sync = computed<Sync | null>(() => {
    const t = this.timing();
    const c = this.chapter();
    if (!t || !c || t.forEpisode !== c.ep.id || !t.segments?.length) return null;
    const sigs = this.paraSigs();
    if (t.paraCount !== sigs.length) return null;
    const sentence = t.paraSig?.length === sigs.length && t.paraSig.every((h, i) => h === sigs[i]);
    const segs = t.segments
      .map(([p, c0, c1, start, end]) => ({ p, c0, c1, start, end }))
      .filter((g) => g.p >= 0 && g.p < sigs.length && g.c1 <= c.paras[g.p].length);
    return segs.length ? { segs, sentence } : null;
  });
  /** Index of the sentence being spoken (binary search on the playback clock; stays on it through the pause after). */
  readonly sayingSeg = computed(() => {
    const t = this.sync();
    if (!t) return -1;
    const x = this.aTime() + 0.06; // a hair ahead: the eye should land as the voice starts
    const g = t.segs;
    if (x < g[0].start) return this.aTime() > 0 ? 0 : -1;
    let lo = 0, hi = g.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (g[m].start <= x) lo = m; else hi = m - 1; }
    return lo;
  });
  /** Paragraph being read: from the real timing; legacy narrations without timing keep the length-weighted estimate. */
  readonly sayingPara = computed(() => {
    const t = this.sync();
    if (t) { const k = this.sayingSeg(); return k >= 0 ? t.segs[k].p : -1; }
    if (this.timing() || this.narration()?.narrationFor) return -1; // narration of another chapter: nothing to mark here
    const paras = this.chapter()?.paras || [];
    const d = this.aDur();
    if (!paras.length || !d || !this.aTime()) return -1;
    const total = paras.reduce((a, p) => a + p.length, 0) || 1;
    let at = (this.aTime() / d) * total;
    for (let i = 0; i < paras.length; i++) { at -= paras[i].length; if (at <= 0) return i; }
    return paras.length - 1;
  });
  /** Chapter the open narration reads, when the reader is looking at a different one. */
  readonly readingElsewhere = computed(() => {
    const id = this.narration()?.narrationFor;
    if (!id || !this.audioOpen() || id === this.chapter()?.ep.id) return null;
    return this.chapters().find((e) => e.id === id) || null;
  });
  readonly voiceLabel = computed(() => {
    const m = this.timing()?.model || this.narration()?.narrationModel || 'VieNeu';
    return /chatterbox/i.test(m) ? 'Chatterbox' : 'VieNeu';
  });

  private slug = '';
  private seq = 0;
  private resume: { episodeId: string; fraction: number; page: number } | null = null;
  private lastSave = 0;
  private touch: { x: number; y: number; t: number } | null = null;
  private prevOverflow = '';
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private userMovedAt = 0;
  private readonly followTick = computed(() => (this.audioPlaying() ? Math.floor(this.aTime() * 2) : -1));
  private autoMoveAt = 0;
  private pendingSeek = -1;
  private pendingPlay = false;
  private retryAt = 0;
  private listenResume: { episodeId: string; sec: number } | null = null;
  private readonly keyHandler = (ev: KeyboardEvent) => this.onKey(ev);
  private readonly resizeHandler = () => this.relayout();

  constructor() {
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (raw && typeof raw === 'object') this.s.set({ ...DEFAULTS, ...raw });
    } catch { /* ignore */ }
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches && !localStorage.getItem(SETTINGS_KEY)) this.s.set({ ...DEFAULTS, size: 18, margin: 0 });
    this.audio.preload = 'auto';
    this.audio.ontimeupdate = () => { this.aTime.set(this.audio.currentTime || 0); this.save(false); };
    this.audio.onloadedmetadata = () => {
      this.aDur.set(this.audio.duration || 0);
      if (this.pendingSeek > 0 && this.pendingSeek < (this.audio.duration || 0) - 0.5) this.audio.currentTime = this.pendingSeek;
      this.pendingSeek = -1;
      this.aTime.set(this.audio.currentTime || 0);
      if (this.pendingPlay) void this.audio.play().catch(() => undefined);
      this.pendingPlay = false;
    };
    // While playing, a 10 Hz clock (timeupdate alone is ~4 Hz) keeps the highlight on the spoken words.
    this.audio.onplay = () => { this.audioPlaying.set(true); this.startClock(); };
    this.audio.onpause = () => { this.audioPlaying.set(false); this.stopClock(); this.save(true); };
    this.audio.onended = () => { this.audioPlaying.set(false); this.stopClock(); this.onNarrationEnd(); };
    this.audio.onerror = () => this.onAudioError();
    // Follow the voice: scroll the sentence into view (scroll mode) or turn to its page (paged mode).
    // followTick (2 Hz) also turns the page mid-sentence when a long sentence spans a page break.
    effect(() => {
      this.sayingSeg();
      this.sayingPara();
      this.followTick();
      untracked(() => setTimeout(() => this.follow(), 0));
    });
  }

  ngAfterViewInit(): void {
    if (typeof document === 'undefined') return;
    document.body.appendChild(this.host.nativeElement);
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.keyHandler, true);
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['product'] && this.product?.slug !== this.slug) {
      this.slug = this.product.slug;
      this.load();
    } else if (ch['canPlay'] && !ch['canPlay'].firstChange && this.canPlay) {
      const c = this.chapter();
      if (c && !c.paras.length && !c.images.length) this.open(c.ep, true);
      if (this.audioOpen() && this.audioErr()) this.openNarration(this.narration(), { at: this.aTime(), play: false, force: true });
    }
  }

  ngOnDestroy(): void {
    this.save(true);
    this.stopClock();
    this.audio.pause();
    this.audio.removeAttribute('src');
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.keyHandler, true);
      window.removeEventListener('resize', this.resizeHandler);
      document.body.style.overflow = this.prevOverflow;
      this.host.nativeElement.remove();
    }
  }

  playable(ep: ContentEpisode): boolean {
    return this.canPlay || ep.free === true;
  }

  marginRem(): string {
    return ['14px', 'clamp(18px, 6vw, 56px)', 'clamp(28px, 12vw, 120px)'][this.s().margin];
  }

  chapterHeading(ep: ContentEpisode): string {
    return ep.title.replace(/^Chương\s*\d+\s*[—–:-]\s*/i, '') || ep.title;
  }

  titleOf(id: string): string {
    const ep = this.episodes().find((e) => e.id === id);
    return ep ? `Chương ${ep.index}` : '';
  }

  clock(sec: number): string {
    const v = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
  }

  set(patch: Partial<ReaderSettings>): void {
    const keep = this.fraction();
    this.s.set({ ...this.s(), ...patch });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.s())); } catch { /* quota */ }
    setTimeout(() => this.relayout(), 30);
    setTimeout(() => {
      this.restore(keep, -1);
      // Changing font/mode/margins moves the text: while listening, jump straight back to the spoken line.
      if (this.audioOpen() && !this.audio.paused) { this.userMovedAt = 0; this.follow(); }
    }, 120);
  }

  block(ev: Event): void {
    ev.preventDefault();
  }

  // ───────────── loading ─────────────
  private load(): void {
    this.loading.set(true);
    this.api.series(this.slug).subscribe({
      next: (s) => {
        this.loading.set(false);
        this.info.set(s);
        this.episodes.set(s.episodes || []);
        this.bookmarks.set(s.bookmarks || []);
        const local = this.readLocal();
        const p = s.progress || local;
        const la = this.readLocalAudio();
        const sa = s.progress?.audio || null;
        this.listenResume = la && (!sa || la.at > (Date.parse(s.progress?.updatedAt || '') || 0)) ? { episodeId: la.episodeId, sec: la.sec } : sa;
        this.resume = p ? { episodeId: p.episodeId, fraction: Number(p.fraction || 0), page: Number(p.page || 0) } : null;
        const list = this.chapters();
        const ep = list.find((e) => e.id === this.resume?.episodeId) || list.find((e) => this.playable(e)) || list[0];
        if (ep) this.open(ep, false);
      },
      error: () => {
        this.loading.set(false);
        this.chapter.set(null);
      },
    });
  }

  go(ep: ContentEpisode): void {
    this.panel.set(null);
    if (ep.kind === 'audio') return this.openNarration(ep, { at: this.listenResume?.episodeId === ep.id ? this.listenResume.sec : 0 });
    this.save(true);
    this.resume = null;
    this.open(ep, true);
  }

  open(ep: ContentEpisode, user: boolean): void {
    const s = ++this.seq;
    this.chapter.set({ ep, kind: ep.kind === 'text' ? 'text' : ep.kind === 'image' ? 'image' : 'other', paras: [], images: [], error: '' });
    this.fraction.set(0);
    this.page.set(0);
    this.pages.set(1);
    this.selQuote.set('');
    if (this.scroller) this.scroller.nativeElement.scrollTop = 0;
    if (!this.auth.user() || !this.playable(ep)) return;
    this.loading.set(true);
    this.api.unlock(ep.id, this.licenseKey || undefined).subscribe({
      next: async (res) => {
        if (s !== this.seq) return;
        const tok = String(res.playToken || '').trim();
        this.watermark.set(res.watermark || '');
        const src = (pg: number, url?: string) => (tok ? `${environment.apiUrl}/content/play?token=${encodeURIComponent(tok)}&page=${pg}` : url || res.playUrl);
        const kind = (res.kind || ep.kind) as string;
        const c: Chapter = { ep, kind: kind === 'text' ? 'text' : kind === 'image' ? 'image' : 'other', paras: [], images: [], error: '' };
        if (c.kind === 'text') {
          try {
            const r = await fetch(src(1));
            if (!r.ok) throw new Error(String(r.status));
            c.paras = toParagraphs(await r.text(), r.headers.get('content-type') || '');
          } catch (err) {
            const st = String((err as Error)?.message || '');
            c.error =
              st === '402' || st === '403'
                ? 'License đã hết hạn hoặc không hợp lệ — đã dừng đọc. Gia hạn để đọc tiếp.'
                : st === '429'
                  ? 'Bạn đọc quá nhanh (giới hạn theo license). Thử lại sau ít phút.'
                  : 'Không tải được nội dung chương.';
          }
        } else {
          const pages = res.pages?.length ? res.pages : [{ index: 1, playUrl: res.playUrl }];
          c.images = pages.map((pg) => src(pg.index, pg.playUrl));
        }
        // Picture-book chapters: the episode synopsis (or the book blurb) becomes the page text.
        if (c.kind !== 'text' && !c.paras.length) c.paras = toParagraphs(ep.synopsis || (this.idx() <= 0 ? this.info()?.synopsis || this.product.description || '' : ''), 'text/plain');
        if (s !== this.seq) return;
        this.loading.set(false);
        this.chapter.set(c);
        const r = this.resume && this.resume.episodeId === ep.id ? this.resume : null;
        this.resume = null;
        setTimeout(() => this.relayout(), 40);
        setTimeout(() => { if (r) this.restore(r.fraction, r.page); else this.save(true); }, 160);
        if (!user) this.flashChrome();
      },
      error: (e) => {
        if (s !== this.seq) return;
        this.loading.set(false);
        const code = e?.error?.code;
        this.watermark.set('');
        const msg =
          code === 'LICENSE_EXPIRED'
            ? 'License đã hết hạn — đã dừng đọc. Gia hạn để đọc tiếp.'
            : code === 'LICENSE_REQUIRED' || e?.status === 402
              ? 'Chương này cần license.'
              : e?.error?.message || 'Không mở được chương.';
        this.chapter.set({ ep, kind: 'other', paras: [], images: [], error: msg });
      },
    });
  }

  // ───────────── layout / position ─────────────
  relayout(): void {
    const sc = this.scroller?.nativeElement;
    if (!sc) return;
    if (this.s().mode === 'paged') {
      // One column per screen: column = width − 2·margin, gap = 2·margin, so every page step is exactly clientWidth.
      const base = [14, Math.min(56, Math.max(18, sc.clientWidth * 0.06)), Math.min(120, Math.max(28, sc.clientWidth * 0.12))][this.s().margin];
      const m = Math.max(base, (sc.clientWidth - 760) / 2); // keep a readable measure on wide screens
      this.colW.set(Math.max(200, sc.clientWidth - 2 * m));
      this.gapPx.set(2 * m);
      setTimeout(() => {
        // multicol overflow omits the trailing padding (m), so add it back before dividing
        const art = this.cols?.nativeElement;
        this.pages.set(Math.max(1, Math.round(((art ? art.scrollWidth : sc.scrollWidth) + m) / sc.clientWidth)));
        this.goPage(Math.min(this.page(), this.pages() - 1), false);
      });
    } else {
      if (this.cols) this.cols.nativeElement.style.transform = '';
      this.onScroll();
    }
  }

  private restore(fraction: number, page: number): void {
    const sc = this.scroller?.nativeElement;
    if (!sc) return;
    this.autoMoveAt = Date.now();
    if (this.s().mode === 'paged') {
      const p = page >= 0 ? page : Math.round(fraction * (this.pages() - 1));
      this.goPage(Math.min(this.pages() - 1, Math.max(0, p)), false);
    } else {
      sc.scrollTop = fraction * Math.max(0, sc.scrollHeight - sc.clientHeight);
      this.onScroll();
    }
  }

  onScroll(): void {
    if (this.s().mode === 'paged') return;
    const sc = this.scroller?.nativeElement;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    if (Date.now() - this.autoMoveAt > 1200) this.userMovedAt = Date.now();
    this.fraction.set(max > 4 ? Math.min(1, sc.scrollTop / max) : 1);
    this.selQuote.set('');
    this.save(false);
  }

  goPage(p: number, user = true): void {
    const sc = this.scroller?.nativeElement;
    if (!sc) return;
    const n = this.pages();
    if (user && p >= n) { const nc = this.nextChapter(); if (nc) this.go(nc); return; }
    if (user && p < 0) { const pc = this.prevChapter(); if (pc) { this.resume = { episodeId: pc.id, fraction: 1, page: 9999 }; this.save(true); this.open(pc, true); } return; }
    const q = Math.min(n - 1, Math.max(0, p));
    this.page.set(q);
    // translate instead of scrollLeft: the browser clamps scrollLeft short of the last page
    sc.scrollLeft = 0;
    const art = this.cols?.nativeElement;
    if (art) art.style.transform = q ? `translateX(${-q * sc.clientWidth}px)` : '';
    this.fraction.set(n > 1 ? q / (n - 1) : 1);
    if (user) { this.userMovedAt = Date.now(); this.save(false); }
  }

  private flip(d: 1 | -1): void {
    if (this.s().mode === 'paged') return this.goPage(this.page() + d);
    const sc = this.scroller?.nativeElement;
    if (!sc) return;
    const atEnd = sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 4;
    if (d > 0 && atEnd) { const nc = this.nextChapter(); if (nc) this.go(nc); return; }
    sc.scrollBy({ top: d * sc.clientHeight * 0.88, behavior: 'smooth' });
  }

  // ───────────── input ─────────────
  onTap(ev: MouseEvent): void {
    const t = ev.target as HTMLElement;
    if (t.closest('button,a,input')) return;
    if (window.getSelection()?.toString().trim()) return;
    const w = (this.scroller?.nativeElement.clientWidth || window.innerWidth);
    const x = ev.clientX;
    // Listening: tapping a sentence / paragraph reads from there (paged mode keeps narrow edge zones for flipping).
    const para = t.closest<HTMLElement>('.rd-p');
    const edge = this.s().mode === 'paged' && (x < w * 0.12 || x > w * 0.88);
    if (para && !edge && this.audioOpen() && this.sync()) {
      const seg = this.segAt(Number(para.dataset['i']), this.caretOffset(ev, para));
      if (seg) { this.listenFrom(seg.start); return; }
    }
    if (x < w * 0.28) this.flip(-1);
    else if (x > w * 0.72) this.flip(1);
    else this.chrome.set(!this.chrome());
  }

  onTouchStart(ev: TouchEvent): void {
    const p = ev.touches[0];
    this.touch = { x: p.clientX, y: p.clientY, t: Date.now() };
  }

  onTouchEnd(ev: TouchEvent): void {
    const st = this.touch;
    this.touch = null;
    const p = ev.changedTouches[0];
    if (!st || !p) return;
    const dx = p.clientX - st.x, dy = p.clientY - st.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st.t < 600) {
      ev.preventDefault();
      if (this.s().mode === 'paged') this.flip(dx < 0 ? 1 : -1);
      else { const c = dx < 0 ? this.nextChapter() : this.prevChapter(); if (c) this.go(c); }
    } else {
      setTimeout(() => this.onSelect(), 30); // long-press selection → highlight button
    }
  }

  private onKey(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = ev.key;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && this.s().mode === 'paged')) { ev.preventDefault(); this.flip(1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { ev.preventDefault(); this.flip(-1); }
    else if (k === 'Escape') { ev.preventDefault(); if (this.panel()) this.panel.set(null); else this.back.emit(); }
    else if (k === 't') this.panel.set(this.panel() === 'toc' ? null : 'toc');
    else if ((ev.ctrlKey || ev.metaKey) && (k === 'c' || k === 'p' || k === 's')) ev.preventDefault();
  }

  @HostListener('document:visibilitychange')
  onVis(): void {
    if (document.hidden) { this.save(true); this.audio.pause(); }
  }

  private flashChrome(): void {
    this.chrome.set(true);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (window.matchMedia?.('(max-width: 640px)').matches) this.hideTimer = setTimeout(() => { if (!this.panel()) this.chrome.set(false); }, 2500);
  }

  // ───────────── bookmarks / highlights ─────────────
  onSelect(): void {
    const sel = window.getSelection();
    const q = sel?.toString().replace(/\s+/g, ' ').trim() || '';
    const inside = !!sel?.anchorNode && !!this.cols?.nativeElement.contains(sel.anchorNode);
    this.selQuote.set(inside && q.length >= 3 ? q.slice(0, 600) : '');
  }

  marked(p: string, i: number): string {
    const t = this.sync();
    const k = this.audioOpen() && t?.sentence ? this.sayingSeg() : -1;
    const g = k >= 0 ? t!.segs[k] : null;
    let html = g && g.p === i
      ? `${esc(p.slice(0, g.c0))}<span class="rd-s">${esc(p.slice(g.c0, g.c1))}</span>${esc(p.slice(g.c1))}`
      : esc(p);
    const id = this.chapter()?.ep.id;
    for (const b of this.bookmarks()) {
      if (b.kind !== 'highlight' || b.episodeId !== id || !b.quote) continue;
      const q = esc(b.quote);
      if (html.includes(q)) html = html.replace(q, `<mark>${q}</mark>`);
    }
    return i >= 0 ? html : '';
  }

  toggleBookmark(): void {
    const c = this.chapter();
    if (!c) return;
    const here = this.bookmarks().find((b) => b.kind === 'bookmark' && b.episodeId === c.ep.id && Math.abs(b.fraction - this.fraction()) < 0.04);
    if (here) return this.removeBookmark(here);
    this.addMark('bookmark', this.visibleQuote());
  }

  addHighlight(): void {
    const q = this.selQuote();
    if (!q) return;
    window.getSelection()?.removeAllRanges();
    this.selQuote.set('');
    this.addMark('highlight', q);
  }

  private addMark(kind: 'bookmark' | 'highlight', quote: string): void {
    const c = this.chapter();
    if (!c || !this.auth.user()) return;
    const tmp: ReaderBookmark = { id: 'tmp' + Date.now(), episodeId: c.ep.id, fraction: this.fraction(), page: this.page(), kind, quote, note: '', color: 'yellow', createdAt: new Date().toISOString() };
    this.bookmarks.set([...this.bookmarks(), tmp]);
    this.api.addBookmark(this.slug, { episodeId: c.ep.id, fraction: tmp.fraction, page: tmp.page, kind, quote }).subscribe({
      next: (r) => this.bookmarks.set(this.bookmarks().map((b) => (b.id === tmp.id ? r.bookmark : b))),
      error: () => this.bookmarks.set(this.bookmarks().filter((b) => b.id !== tmp.id)),
    });
  }

  removeBookmark(b: ReaderBookmark): void {
    this.bookmarks.set(this.bookmarks().filter((x) => x.id !== b.id));
    if (!b.id.startsWith('tmp')) this.api.removeBookmark(this.slug, b.id).subscribe({ error: () => undefined });
  }

  jump(b: ReaderBookmark): void {
    this.panel.set(null);
    const ep = this.chapters().find((e) => e.id === b.episodeId);
    if (!ep) return;
    if (ep.id === this.chapter()?.ep.id) return this.restore(b.fraction, b.page);
    this.save(true);
    this.resume = { episodeId: ep.id, fraction: b.fraction, page: b.page };
    this.open(ep, true);
  }

  private visibleQuote(): string {
    const sc = this.scroller?.nativeElement;
    const a = this.cols?.nativeElement;
    if (!sc || !a) return '';
    const top = sc.getBoundingClientRect().top + 70;
    const left = sc.getBoundingClientRect().left;
    const ps = Array.from(a.querySelectorAll<HTMLElement>('.rd-p'));
    const vis = ps.find((p) => { const r = p.getBoundingClientRect(); return r.bottom > top && r.left >= left - 2 && r.left < left + sc.clientWidth; });
    return (vis?.textContent || '').trim().slice(0, 140);
  }

  // ───────────── narration ─────────────
  toggleNarration(): void {
    if (this.audioOpen()) return this.closeNarration();
    const ep = this.narrationFor();
    const r = this.listenResume;
    this.openNarration(ep, { at: r && ep && r.episodeId === ep.id ? r.sec : 0 });
  }

  /** Narration of the chapter on screen; else the next narrated chapter; legacy (untimed) lists map by position. */
  private narrationFor(): ContentEpisode | null {
    const list = this.narrations();
    if (!list.length) return null;
    const id = this.chapter()?.ep.id;
    const own = list.find((e) => e.narrationFor === id);
    if (own) return own;
    if (list.some((e) => e.narrationFor)) {
      const order = this.chapters().map((e) => e.id);
      const after = list
        .filter((e) => e.narrationFor && order.indexOf(e.narrationFor) > this.idx())
        .sort((a, b) => order.indexOf(a.narrationFor!) - order.indexOf(b.narrationFor!));
      return after[0] || list[0];
    }
    if (list.length === this.chapters().length && this.idx() >= 0) return list[this.idx()];
    return list[0];
  }

  private narrationOf(chapterId: string): ContentEpisode | null {
    return this.narrations().find((e) => e.narrationFor === chapterId) || null;
  }

  /**
   * Open (or resume) a narration. `at` restores the listening position, `force` re-unlocks the same episode (play
   * tokens are short-lived) without losing the position. A timed narration also opens the chapter it reads.
   */
  openNarration(ep: ContentEpisode | null, opt: { at?: number; play?: boolean; force?: boolean } = {}): void {
    this.panel.set(null);
    if (!ep) return;
    const play = opt.play !== false;
    this.audioOpen.set(true);
    this.audioErr.set('');
    if (ep.narrationFor && ep.narrationFor !== this.chapter()?.ep.id) {
      const ch = this.chapters().find((e) => e.id === ep.narrationFor);
      if (ch) { this.save(true); this.resume = null; this.open(ch, true); }
    }
    if (!opt.force && this.narration()?.id === ep.id && this.audio.src && !this.audio.error) {
      if (opt.at != null && opt.at > 0) this.audio.currentTime = opt.at;
      if (play) void this.audio.play().catch(() => undefined);
      return;
    }
    const same = this.narration()?.id === ep.id;
    this.narration.set(ep);
    if (!same) { this.timing.set(null); this.aTime.set(opt.at || 0); this.aDur.set(ep.durationSec || 0); }
    if (!this.auth.user()) { this.audioErr.set('Đăng nhập để nghe sách nói.'); return; }
    if (!this.playable(ep)) { this.audioErr.set('Sách nói cần license.'); return; }
    this.api.unlock(ep.id, this.licenseKey || undefined).subscribe({
      next: (res) => {
        if (this.narration()?.id !== ep.id) return;
        const tok = String(res.playToken || '').trim();
        this.timing.set(res.narration || null);
        this.pendingSeek = opt.at && opt.at > 0 ? opt.at : -1;
        this.pendingPlay = play;
        this.audio.src = tok ? `${environment.apiUrl}/content/play?token=${encodeURIComponent(tok)}&page=1` : res.playUrl;
        this.audio.playbackRate = this.speed();
        this.audio.load();
      },
      error: (e) => this.audioErr.set(e?.status === 402 ? 'Sách nói cần license.' : e?.error?.message || 'Không mở được sách nói.'),
    });
  }

  closeNarration(): void {
    this.audio.pause();
    this.audioOpen.set(false);
  }

  playPause(): void {
    if (!this.audio.src || this.audio.error) {
      const ep = this.narration() || this.narrationFor();
      return this.openNarration(ep, { at: this.aTime(), force: true });
    }
    if (this.audio.paused) void this.audio.play().catch(() => this.onAudioError());
    else this.audio.pause();
  }

  seek(v: string): void {
    this.audio.currentTime = Number(v) || 0;
    this.aTime.set(this.audio.currentTime || 0);
    this.userMovedAt = 0; // a deliberate seek: follow the voice right away
  }

  /** Read from this point of the open narration (tap on text). */
  listenFrom(sec: number): void {
    this.userMovedAt = 0;
    if (!this.audio.src || this.audio.error) return this.openNarration(this.narration(), { at: sec, force: true });
    this.audio.currentTime = Math.max(0, sec);
    this.aTime.set(this.audio.currentTime);
    void this.audio.play().catch(() => undefined);
  }

  cycleSpeed(): void {
    const i = SPEEDS.indexOf(this.speed());
    const next = SPEEDS[(i + 1) % SPEEDS.length];
    this.speed.set(next);
    this.audio.playbackRate = next;
  }

  /** Expired play token / network drop: unlock again once and continue from the same second. */
  private onAudioError(): void {
    if (!this.audio.src || !this.narration()) return;
    if (Date.now() - this.retryAt > 20000) {
      this.retryAt = Date.now();
      const at = this.aTime();
      const play = this.audioPlaying() || this.pendingPlay;
      this.openNarration(this.narration(), { at, play, force: true });
      return;
    }
    this.audioErr.set('Không phát được sách nói.');
  }

  /** Chapter narration finished: continue with the next narrated chapter the reader may open. */
  private onNarrationEnd(): void {
    this.save(true);
    const cur = this.narration()?.narrationFor;
    if (!cur) return;
    const order = this.chapters();
    const i = order.findIndex((e) => e.id === cur);
    for (const ch of order.slice(i + 1)) {
      const n = this.narrationOf(ch.id);
      if (!n) continue;
      if (this.playable(n)) this.openNarration(n, { at: 0 });
      return;
    }
  }

  private startClock(): void {
    this.stopClock();
    this.clockTimer = setInterval(() => this.aTime.set(this.audio.currentTime || 0), 100);
  }

  private stopClock(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = null;
  }

  private segAt(p: number, offset: number): Seg | null {
    const segs = (this.sync()?.segs || []).filter((g) => g.p === p);
    if (!segs.length) return null;
    if (offset >= 0 && this.sync()?.sentence) return segs.find((g) => offset < g.c1) || segs[segs.length - 1];
    return segs[0];
  }

  /** Character offset of a click inside a paragraph's text (caret APIs), -1 if unknown. */
  private caretOffset(ev: MouseEvent, para: HTMLElement): number {
    const d = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    let node: Node | null = null, off = 0;
    const cp = d.caretPositionFromPoint?.(ev.clientX, ev.clientY);
    if (cp) { node = cp.offsetNode; off = cp.offset; }
    else { const r = d.caretRangeFromPoint?.(ev.clientX, ev.clientY); if (r) { node = r.startContainer; off = r.startOffset; } }
    if (!node || !para.contains(node)) return -1;
    const walk = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
    let n = 0;
    while (walk.nextNode()) {
      if (walk.currentNode === node) return n + off;
      n += (walk.currentNode.textContent || '').length;
    }
    return -1;
  }

  /** Keep the spoken line on screen: scroll it to ~30% height, or turn to the page holding it. */
  private follow(): void {
    if (!this.audioOpen() || this.audio.paused || this.sayingPara() < 0) return;
    if (Date.now() - this.userMovedAt < FOLLOW_PAUSE_MS) return;
    const art = this.cols?.nativeElement;
    const sc = this.scroller?.nativeElement;
    if (!art || !sc) return;
    const el = art.querySelector<HTMLElement>('.rd-s') || art.querySelector<HTMLElement>(`.rd-p[data-i="${this.sayingPara()}"]`);
    if (!el) return;
    // The line being read: a sentence wraps over several line boxes (and maybe two pages); pick by elapsed share.
    const rects = Array.from(el.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return;
    const t = this.sync();
    const k = this.sayingSeg();
    const g = t && k >= 0 ? t.segs[k] : null;
    const share = g && g.end > g.start ? Math.min(0.999, Math.max(0, (this.aTime() - g.start) / (g.end - g.start))) : 0;
    const r = rects[Math.min(rects.length - 1, Math.floor(share * rects.length))];
    const box = sc.getBoundingClientRect();
    if (this.s().mode === 'paged') {
      const off = Math.floor((r.left + r.width / 2 - box.left) / sc.clientWidth);
      if (off !== 0) { this.autoMoveAt = Date.now(); this.goPage(this.page() + off, false); this.save(false); }
    } else {
      const top = r.top - box.top;
      if (top < sc.clientHeight * 0.14 || top > sc.clientHeight * 0.72) {
        this.autoMoveAt = Date.now();
        sc.scrollTo({ top: Math.max(0, sc.scrollTop + top - sc.clientHeight * 0.3), behavior: 'smooth' });
      }
    }
  }

  // ───────────── progress ─────────────
  private readLocal(): { episodeId: string; fraction: number; page: number } | null {
    try { return JSON.parse(localStorage.getItem(LS(this.slug)) || 'null'); } catch { return null; }
  }

  private readLocalAudio(): { episodeId: string; sec: number; at: number } | null {
    try { return JSON.parse(localStorage.getItem(LS_AUDIO(this.slug)) || 'null'); } catch { return null; }
  }

  private save(force: boolean): void {
    const c = this.chapter();
    if (!c || !this.slug || (!c.paras.length && !c.images.length)) return;
    const body: { episodeId: string; fraction: number; page: number; audioEpisodeId?: string; audioSec?: number } = { episodeId: c.ep.id, fraction: Math.round(this.fraction() * 1000) / 1000, page: this.page() };
    try { localStorage.setItem(LS(this.slug), JSON.stringify(body)); } catch { /* quota */ }
    const n = this.narration();
    if (n && this.audio.src && this.aTime() > 0) {
      // Where the listener stopped (restarts at 0 once the chapter narration has been heard to the end).
      const sec = this.audio.ended ? 0 : Math.round(this.aTime() * 10) / 10;
      body.audioEpisodeId = n.id;
      body.audioSec = sec;
      this.listenResume = { episodeId: n.id, sec };
      try { localStorage.setItem(LS_AUDIO(this.slug), JSON.stringify({ episodeId: n.id, sec, at: Date.now() })); } catch { /* quota */ }
    }
    if (!this.auth.user() || (!force && Date.now() - this.lastSave < 4000)) return;
    this.lastSave = Date.now();
    this.api.readProgress(this.slug, body).subscribe({ error: () => undefined });
  }
}

/** FNV-1a 32-bit over UTF-16 code units, hex; same as the API (utils/story-narration.js) paragraph signatures. */
export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Chapter text (plain / markdown / HTML) → paragraphs. HTML is parsed inertly and only its text is kept. */
function toParagraphs(raw: string, type: string): string[] {
  let text = raw || '';
  if (/html/i.test(type) || /^\s*</.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const blocks = Array.from(doc.body.querySelectorAll('p,h1,h2,h3,h4,li,blockquote'));
    text = blocks.length ? blocks.map((b) => b.textContent || '').join('\n\n') : doc.body.textContent || '';
  }
  return text.replace(/\r/g, '').split(/\n\s*\n|\n(?=\s{2,})/).map((p) => p.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
