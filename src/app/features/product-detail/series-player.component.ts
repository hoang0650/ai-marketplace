import {
  Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, computed, inject, signal,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ContentService } from '../../services/api.services';
import { environment } from '../../../environments/environment';
import { ContentEpisode, Product, SeriesInfo } from '../../models/marketplace.models';

const RANGE = 50;
const LS = (slug: string) => `aimarkets.watch.${slug}`;

/** ReelShort-style short-drama player for AI film series (license-gated; free episodes playable). */
@Component({
  selector: 'app-series-player',
  standalone: true,
  template: `
<div class="sp" [class.sp--sheet]="sheet()" data-testid="series-player" (contextmenu)="block($event)">
  <header class="sp-top">
    <button type="button" class="sp-back" (click)="back.emit()" data-testid="sp-back" aria-label="Quay lại">‹ <span>Quay lại</span></button>
    <div class="sp-crumb">{{ product.name }} @if (current(); as ep) { <em>· Tập {{ ep.index }}</em> }</div>
  </header>

  <div class="sp-body">
    <section class="sp-stage" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
      <div class="sp-frame" [class.portrait]="portrait()" data-testid="sp-frame">
        @if (playUrl()) {
          <video #vid class="sp-video" [src]="playUrl()" playsinline autoplay preload="auto"
            controlslist="nodownload noremoteplayback noplaybackrate" disablepictureinpicture
            (loadedmetadata)="onMeta($event)" (timeupdate)="onTime()" (play)="paused.set(false)" (pause)="onPause()"
            (ended)="onEnded()" (error)="err.set('Không phát được tập này. Thử lại sau.')" (click)="toggle()"
            (contextmenu)="block($event)" data-testid="sp-video"></video>
          @if (caption()) { <div class="sp-sub" data-testid="sp-sub">{{ caption() }}</div> }
          @if (paused() && !nextIn()) {
            <button type="button" class="sp-bigplay" (click)="toggle()" aria-label="Phát" data-testid="sp-play">▶</button>
          }
          <div class="sp-bar"><i [style.width.%]="progressPct()"></i></div>
        } @else {
          <div class="sp-poster" [style.background-image]="posterOf(current())">
            @if (!auth.user()) {
              <div class="sp-gate" data-testid="sp-login">
                <b>Đăng nhập để xem phim</b>
                <button type="button" class="sp-cta" (click)="login.emit()">Đăng nhập</button>
              </div>
            } @else if (current() && !playable(current()!)) {
              <div class="sp-gate" data-testid="sp-locked">
                <span class="sp-lockbig">🔒</span>
                <b>Tập {{ current()!.index }} cần mở khóa</b>
                <small>Mua license để xem toàn bộ {{ episodes().length }} tập và tải file .aimc mã hóa.</small>
                <button type="button" class="sp-cta" (click)="checkout.emit()" [disabled]="checkingOut" data-testid="sp-unlock">
                  {{ checkingOut ? 'Đang thanh toán…' : 'Mở khóa toàn bộ tập' }}@if (priceLabel) { · {{ priceLabel }} }
                </button>
              </div>
            } @else if (loading()) {
              <div class="sp-gate"><span class="sp-spin"></span></div>
            } @else if (!episodes().length) {
              <div class="sp-gate"><b>Chưa có tập nào</b></div>
            } @else {
              <button type="button" class="sp-bigplay" (click)="start()" aria-label="Phát" data-testid="sp-play">▶</button>
            }
          </div>
        }
        @if (nextIn(); as n) {
          <div class="sp-next" data-testid="sp-next">
            <span>Tập tiếp theo sau {{ n }}s</span>
            <button type="button" (click)="goNext()">Xem ngay</button>
            <button type="button" class="ghost" (click)="cancelNext()">Hủy</button>
          </div>
        }
        <!-- mobile rail -->
        <div class="sp-rail">
          <button type="button" (click)="react('like')" [class.on]="info()?.liked"><b>♥</b>{{ fmt(info()?.likes) }}</button>
          <button type="button" (click)="react('save')" [class.on]="info()?.saved"><b>🔖</b>{{ fmt(info()?.saves) }}</button>
          <button type="button" (click)="share()"><b>↗</b>Chia sẻ</button>
          <button type="button" (click)="sheet.set(true)" data-testid="sp-open-sheet"><b>☰</b>Tập</button>
        </div>
        <div class="sp-mtitle">
          <b>{{ product.name }}</b>
          @if (current(); as ep) { <span>Tập {{ ep.index }} / {{ episodes().length }} · {{ ep.title }}</span> }
        </div>
      </div>
      @if (err()) { <p class="sp-err" data-testid="sp-err">{{ err() }}</p> }
      <p class="sp-note">⛔ Nội dung được bảo vệ: không quay/chụp màn hình hoặc phát lại công khai. Phím ↑/↓ hoặc vuốt để chuyển tập, Space để phát/dừng.</p>
    </section>

    <aside class="sp-side" data-testid="sp-side">
      <button type="button" class="sp-grab" (click)="sheet.set(false)" aria-label="Đóng">━━</button>
      <h1 class="sp-title">{{ product.name }}</h1>
      <h3>Cốt truyện của tập {{ current()?.index || 1 }}</h3>
      <p class="sp-syn" [class.open]="more()" data-testid="sp-synopsis">{{ synopsis() }}</p>
      @if (synopsis().length > 120) {
        <button type="button" class="sp-more" (click)="more.set(!more())" data-testid="sp-more">{{ more() ? 'Thu gọn' : 'Thêm' }}</button>
      }
      @if (info()?.genres?.length) {
        <div class="sp-tags">@for (g of info()!.genres; track g) { <span>{{ g }}</span> }</div>
      }
      <div class="sp-acts">
        <button type="button" (click)="react('like')" [class.on]="info()?.liked" data-testid="sp-like">♥ <b>{{ fmt(info()?.likes) }}</b> <small>Thích</small></button>
        <button type="button" (click)="react('save')" [class.on]="info()?.saved" data-testid="sp-save">🔖 <b>{{ fmt(info()?.saves) }}</b> <small>Lưu</small></button>
        <button type="button" (click)="share()" data-testid="sp-share">↗ <small>{{ shared() ? 'Đã sao chép' : 'Chia sẻ' }}</small></button>
      </div>

      <div class="sp-eph">
        <h3>Danh sách tập <small>({{ episodes().length }})</small></h3>
        @if (ranges().length > 1 || episodes().length > 12) {
          <button type="button" class="sp-all" [class.on]="range() === -1" (click)="range.set(-1)" data-testid="sp-all">Tất cả các tập</button>
        }
      </div>
      @if (ranges().length > 1) {
        <div class="sp-ranges">
          @for (r of ranges(); track r.i) { <button type="button" [class.on]="range() === r.i" (click)="range.set(r.i)">{{ r.label }}</button> }
        </div>
      }
      <div class="sp-grid" data-testid="sp-grid">
        @for (ep of shown(); track ep.id) {
          <button type="button" class="sp-ep" [class.cur]="current()?.id === ep.id" [class.locked]="!playable(ep)"
            (click)="select(ep, true)" [attr.data-testid]="'sp-ep-' + ep.index" [title]="ep.title">
            {{ ep.index }}
            @if (!playable(ep)) { <i class="lock">🔒</i> } @else if (ep.free && !canPlay) { <i class="free">Free</i> }
            @if (current()?.id === ep.id && !paused()) { <i class="eq"><s></s><s></s><s></s></i> }
          </button>
        }
      </div>

      <div class="sp-lic">
        @if (licenseKey) {
          <p>License <code>{{ licenseKey }}</code></p>
        } @else if (!canPlay) {
          <button type="button" class="sp-cta sp-block" (click)="checkout.emit()" [disabled]="checkingOut">
            🔓 Mở khóa toàn bộ@if (priceLabel) { · {{ priceLabel }} }
          </button>
        }
        @if (canPlay && current()) {
          <button type="button" class="sp-dl" (click)="download()" data-testid="sp-download">⤓ Tải tập {{ current()!.index }} (.aimc mã hóa)</button>
        }
        <p class="sp-hint">File .aimc chỉ mở được trong ứng dụng AI Markets khi license còn hạn.</p>
      </div>
    </aside>
  </div>
  @if (sheet()) { <div class="sp-scrim" (click)="sheet.set(false)"></div> }
</div>
  `,
  styles: [`
:host{display:block;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);width:100vw}
.sp{--bg:#0b0b0f;--p:#15151c;--b:#262633;--t:#f1f1f4;--m:#9a9aab;--a:#ff3d6e;background:var(--bg);color:var(--t);min-height:calc(100vh - 60px);user-select:none;-webkit-user-select:none}
.sp-top{display:flex;align-items:center;gap:14px;padding:12px 28px;border-bottom:1px solid var(--b)}
.sp-back{background:none;border:0;color:var(--t);font-size:22px;cursor:pointer;display:flex;align-items:center;gap:6px}
.sp-back span{font-size:14px}
.sp-crumb{color:var(--m);font-size:14px}.sp-crumb em{font-style:normal;color:var(--t)}
.sp-body{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;padding:22px 28px 36px;max-width:1500px;margin:0 auto}
.sp-stage{display:flex;flex-direction:column;align-items:center;min-width:0}
.sp-frame{position:relative;width:100%;aspect-ratio:16/9;max-height:76vh;background:#000;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px #0008}
.sp-frame.portrait{aspect-ratio:9/16;width:auto;height:76vh}
.sp-video{width:100%;height:100%;object-fit:contain;background:#000;display:block;cursor:pointer}
.sp-poster{position:absolute;inset:0;background:#111 center/cover no-repeat;display:flex;align-items:center;justify-content:center}
.sp-poster::after{content:'';position:absolute;inset:0;background:linear-gradient(#0003,#000b)}
.sp-gate{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:20px;max-width:360px}
.sp-gate b{font-size:20px}.sp-gate small{color:#d0d0da}
.sp-lockbig{font-size:42px}
.sp-cta{background:var(--a);color:#fff;border:0;border-radius:999px;padding:11px 22px;font-weight:700;cursor:pointer}
.sp-cta:disabled{opacity:.6}.sp-block{width:100%}
.sp-bigplay{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:84px;height:84px;border-radius:50%;border:0;background:#fffc;color:#111;font-size:32px;padding-left:6px;cursor:pointer;box-shadow:0 8px 30px #0009}
.sp-sub{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);width:88%;text-align:center;font-size:clamp(18px,2.4vw,30px);font-weight:800;line-height:1.3;color:#fff;text-shadow:0 2px 0 #000,0 0 12px #000,0 0 4px #000;pointer-events:none}
.sp-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:#fff3}.sp-bar i{display:block;height:100%;background:var(--a)}
.sp-next{position:absolute;right:16px;bottom:22px;z-index:3;background:#000c;border:1px solid var(--b);border-radius:12px;padding:10px 12px;display:flex;gap:8px;align-items:center;font-size:13px}
.sp-next button{background:var(--a);border:0;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}.sp-next .ghost{background:#333}
.sp-spin{width:36px;height:36px;border:3px solid #fff4;border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.sp-err{color:#ff8a8a;margin-top:10px}
.sp-note{color:var(--m);font-size:12px;margin-top:12px;text-align:center}
.sp-rail,.sp-mtitle,.sp-grab{display:none}
.sp-side{background:var(--p);border:1px solid var(--b);border-radius:14px;padding:18px;align-self:start;max-height:calc(100vh - 140px);overflow:auto}
.sp-title{font-size:22px;font-weight:800;margin:0 0 12px}
.sp-side h3{font-size:15px;font-weight:700;margin:0 0 6px}
.sp-syn{color:#cfcfda;font-size:14px;line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.sp-syn.open{-webkit-line-clamp:unset;display:block}
.sp-more{background:none;border:0;color:var(--a);font-weight:700;padding:4px 0;cursor:pointer}
.sp-tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.sp-tags span{background:#24242f;color:#d6d6e0;border-radius:6px;padding:4px 10px;font-size:12px}
.sp-acts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 18px}
.sp-acts button{background:#1e1e28;border:1px solid var(--b);color:var(--t);border-radius:10px;padding:9px 6px;cursor:pointer;display:flex;gap:5px;align-items:center;justify-content:center;font-size:14px}
.sp-acts button.on{border-color:var(--a);color:var(--a)}.sp-acts small{color:var(--m)}
.sp-eph{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.sp-eph small{color:var(--m);font-weight:400}
.sp-all{background:none;border:0;color:var(--m);cursor:pointer;font-size:13px}.sp-all.on{color:var(--a)}
.sp-ranges{display:flex;gap:14px;border-bottom:1px solid var(--b);margin-bottom:10px}
.sp-ranges button{background:none;border:0;color:var(--m);padding:6px 0;cursor:pointer;border-bottom:2px solid transparent}
.sp-ranges button.on{color:var(--t);border-bottom-color:var(--a)}
.sp-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.sp-ep{position:relative;aspect-ratio:1;background:#22222c;border:1px solid transparent;border-radius:8px;color:var(--t);font-weight:700;font-size:15px;cursor:pointer}
.sp-ep:hover{background:#2c2c38}.sp-ep.cur{border-color:var(--a);color:var(--a);background:#2a1620}
.sp-ep.locked{color:#8d8d9c}
.sp-ep .lock{position:absolute;right:3px;top:2px;font-size:10px;font-style:normal}
.sp-ep .free{position:absolute;left:0;right:0;bottom:2px;font-size:9px;font-style:normal;color:#5ee0a0}
.sp-ep .eq{position:absolute;left:4px;top:4px;display:flex;gap:1px;align-items:flex-end;height:9px}
.sp-ep .eq s{width:2px;background:var(--a);animation:eq .8s infinite ease-in-out}.sp-ep .eq s:nth-child(2){animation-delay:.2s}.sp-ep .eq s:nth-child(3){animation-delay:.4s}
@keyframes eq{0%,100%{height:3px}50%{height:9px}}
.sp-lic{margin-top:18px;border-top:1px solid var(--b);padding-top:14px;font-size:13px}
.sp-lic code{background:#000;padding:2px 6px;border-radius:4px}
.sp-dl{width:100%;background:#1e1e28;border:1px solid var(--b);color:var(--t);border-radius:10px;padding:10px;cursor:pointer;margin-top:6px}
.sp-hint{color:var(--m);font-size:12px;margin-top:8px}
.sp-scrim{display:none}
@media (max-width:820px){
  :host{position:fixed;inset:0;z-index:80;margin:0;width:auto}
  .sp{height:100dvh;min-height:0;overflow:hidden;position:relative}
  .sp-top{position:absolute;top:0;left:0;right:0;z-index:5;border:0;padding:10px 12px;background:linear-gradient(#000a,#0000)}
  .sp-crumb{display:none}
  .sp-body{display:block;padding:0;height:100%}
  .sp-stage{height:100%}
  .sp-frame,.sp-frame.portrait{width:100%;height:100dvh;max-height:none;aspect-ratio:auto;border-radius:0}
  .sp-sub{bottom:24%;font-size:22px}
  .sp-note,.sp-err{position:absolute;bottom:4px;left:8px;right:8px;font-size:10px;z-index:4}
  .sp-err{bottom:120px}
  .sp-rail{display:flex;flex-direction:column;gap:16px;position:absolute;right:10px;bottom:150px;z-index:4}
  .sp-rail button{background:none;border:0;color:#fff;display:flex;flex-direction:column;align-items:center;font-size:11px;text-shadow:0 1px 3px #000}
  .sp-rail b{font-size:26px;line-height:1.1}.sp-rail .on{color:var(--a)}
  .sp-mtitle{display:flex;flex-direction:column;position:absolute;left:14px;right:70px;bottom:48px;z-index:4;text-shadow:0 1px 3px #000}
  .sp-mtitle b{font-size:17px}.sp-mtitle span{font-size:13px;color:#ddd}
  .sp-next{bottom:110px;left:12px;right:12px}
  .sp-side{position:absolute;left:0;right:0;bottom:0;z-index:7;max-height:72dvh;border-radius:18px 18px 0 0;transform:translateY(105%);transition:transform .28s ease}
  .sp--sheet .sp-side{transform:none}
  .sp-grab{display:block;margin:-8px auto 6px;background:none;border:0;color:#555;cursor:pointer}
  .sp-scrim{display:block;position:absolute;inset:0;z-index:6;background:#0007}
  .sp-grid{grid-template-columns:repeat(6,1fr)}
}
  `],
})
export class SeriesPlayerComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) product!: Product;
  @Input() canPlay = false;
  @Input() licenseKey = '';
  @Input() priceLabel = '';
  @Input() checkingOut = false;
  @Output() checkout = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @ViewChild('vid') vid?: ElementRef<HTMLVideoElement>;

  readonly auth = inject(AuthService);
  private readonly api = inject(ContentService);

  readonly info = signal<SeriesInfo | null>(null);
  readonly episodes = signal<ContentEpisode[]>([]);
  readonly current = signal<ContentEpisode | null>(null);
  readonly playUrl = signal('');
  readonly loading = signal(false);
  readonly paused = signal(true);
  readonly portrait = signal(false);
  readonly err = signal('');
  readonly more = signal(false);
  readonly sheet = signal(false);
  readonly shared = signal(false);
  readonly range = signal(0);
  readonly nextIn = signal(0);
  readonly time = signal(0);
  readonly dur = signal(0);

  private seq = 0;
  private resumeAt = 0;
  private lastSave = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private touchY = 0;
  private slug = '';

  readonly ranges = computed(() => {
    const n = this.episodes().length;
    const out: { i: number; label: string }[] = [];
    for (let i = 0; i * RANGE < n; i++) out.push({ i, label: `${i * RANGE + 1}-${Math.min(n, (i + 1) * RANGE)}` });
    return out;
  });
  readonly shown = computed(() => {
    const r = this.range();
    const list = this.episodes();
    return r < 0 ? list : list.slice(r * RANGE, (r + 1) * RANGE);
  });
  readonly synopsis = computed(() => this.current()?.synopsis || this.info()?.synopsis || this.product?.description || '');
  readonly caption = computed(() => {
    const ep = this.current();
    if (!ep || this.time() > 5 || !this.playUrl()) return '';
    return (ep.synopsis || '').split(/(?<=[.!?…])\s/)[0].slice(0, 90);
  });
  readonly progressPct = computed(() => (this.dur() ? Math.min(100, (this.time() / this.dur()) * 100) : 0));

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['product'] && this.product?.slug !== this.slug) {
      this.slug = this.product.slug;
      this.load();
    } else if (ch['canPlay'] && !ch['canPlay'].firstChange && this.canPlay && this.current() && !this.playUrl()) {
      this.select(this.current()!, true);
    }
  }

  ngOnDestroy(): void {
    this.saveProgress(true);
    this.cancelNext();
  }

  private load(): void {
    this.loading.set(true);
    this.api.series(this.slug).subscribe({
      next: (s) => {
        this.loading.set(false);
        this.info.set(s);
        this.episodes.set(s.episodes || []);
        const local = this.readLocal();
        const want = s.progress?.episodeId || local?.episodeId;
        const ep = s.episodes.find((e) => e.id === want) || s.episodes.find((e) => this.playable(e)) || s.episodes[0] || null;
        this.resumeAt = ep && ep.id === want ? Number(s.progress?.positionSec ?? local?.positionSec ?? 0) : 0;
        if (ep) {
          this.range.set(Math.floor((ep.index - 1) / RANGE));
          this.select(ep, false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.err.set('Không tải được danh sách tập.');
      },
    });
  }

  playable(ep: ContentEpisode): boolean {
    return this.canPlay || ep.free === true;
  }

  posterOf(ep: ContentEpisode | null): string | null {
    const u = ep?.posterUrl || this.product?.coverUrl || '';
    return u ? `url("${u}")` : null;
  }

  fmt(n?: number): string {
    const v = Number(n || 0);
    return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(v);
  }

  /** Select an episode; autoplay unlocks it when the viewer may watch. */
  select(ep: ContentEpisode, userAction: boolean): void {
    this.cancelNext();
    if (this.current()?.id !== ep.id) this.saveProgress(true);
    if (userAction && this.current()?.id !== ep.id) this.resumeAt = 0;
    this.current.set(ep);
    this.more.set(false);
    this.err.set('');
    this.playUrl.set('');
    this.time.set(0);
    this.paused.set(true);
    if (userAction) this.sheet.set(false);
    if (!this.auth.user() || !this.playable(ep)) return;
    if (!userAction && !this.resumeAt && ep.index === 1 && !this.readLocal()) return; // first visit: wait for ▶
    this.unlock(ep);
  }

  start(): void {
    const ep = this.current();
    if (ep) this.unlock(ep);
  }

  private unlock(ep: ContentEpisode): void {
    const s = ++this.seq;
    this.loading.set(true);
    this.api.unlock(ep.id, this.licenseKey || undefined).subscribe({
      next: (res) => {
        if (s !== this.seq) return;
        this.loading.set(false);
        const tok = String(res.playToken || '').trim();
        this.playUrl.set(tok ? `${environment.apiUrl}/content/play?token=${encodeURIComponent(tok)}&page=1` : res.playUrl);
      },
      error: (e) => {
        if (s !== this.seq) return;
        this.loading.set(false);
        const code = e?.error?.code;
        this.err.set(code === 'LICENSE_REQUIRED' || e?.status === 402 ? 'Tập này cần license để xem.' : e?.error?.message || 'Không mở được tập này.');
      },
    });
  }

  onMeta(ev: Event): void {
    const v = ev.target as HTMLVideoElement;
    v.disablePictureInPicture = true;
    (v as HTMLVideoElement & { disableRemotePlayback: boolean }).disableRemotePlayback = true;
    this.portrait.set(v.videoHeight > v.videoWidth);
    this.dur.set(v.duration || 0);
    if (this.resumeAt > 1 && this.resumeAt < (v.duration || 0) - 2) v.currentTime = this.resumeAt;
    this.resumeAt = 0;
    v.play().catch(() => this.paused.set(true));
  }

  onTime(): void {
    const v = this.vid?.nativeElement;
    if (!v) return;
    this.time.set(v.currentTime);
    if (Date.now() - this.lastSave > 5000) this.saveProgress(false);
  }

  onPause(): void {
    this.paused.set(true);
    this.saveProgress(true);
  }

  toggle(): void {
    const v = this.vid?.nativeElement;
    if (!v) return this.start();
    if (v.paused) void v.play();
    else v.pause();
  }

  private neighbour(d: 1 | -1): ContentEpisode | null {
    const list = this.episodes();
    const i = list.findIndex((e) => e.id === this.current()?.id);
    return list[i + d] || null;
  }

  onEnded(): void {
    this.paused.set(true);
    const nx = this.neighbour(1);
    this.saveProgress(true, nx?.id);
    if (!nx) return;
    if (!this.playable(nx)) return this.select(nx, true);
    this.nextIn.set(3);
    this.timer = setInterval(() => {
      const n = this.nextIn() - 1;
      if (n <= 0) this.goNext();
      else this.nextIn.set(n);
    }, 1000);
  }

  cancelNext(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.nextIn.set(0);
  }

  goNext(): void {
    const nx = this.neighbour(1);
    this.cancelNext();
    if (nx) this.select(nx, true);
  }

  goPrev(): void {
    const pv = this.neighbour(-1);
    if (pv) this.select(pv, true);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const v = this.vid?.nativeElement;
    switch (ev.key) {
      case 'ArrowDown': case 'PageDown': case 'n': ev.preventDefault(); this.goNext(); break;
      case 'ArrowUp': case 'PageUp': case 'p': ev.preventDefault(); this.goPrev(); break;
      case ' ': case 'k': ev.preventDefault(); this.toggle(); break;
      case 'ArrowRight': if (v) { ev.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); } break;
      case 'ArrowLeft': if (v) { ev.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); } break;
      case 'Escape': if (this.sheet()) this.sheet.set(false); break;
      case 'PrintScreen': this.vid?.nativeElement.pause(); break;
    }
  }

  @HostListener('document:visibilitychange')
  onHide(): void {
    if (document.hidden) this.saveProgress(true);
  }

  touchStart(ev: TouchEvent): void {
    this.touchY = ev.changedTouches[0]?.clientY || 0;
  }

  touchEnd(ev: TouchEvent): void {
    if (this.sheet()) return;
    const dy = (ev.changedTouches[0]?.clientY || 0) - this.touchY;
    if (dy < -70) this.goNext();
    else if (dy > 70) this.goPrev();
  }

  react(kind: 'like' | 'save'): void {
    if (!this.auth.user()) return this.login.emit();
    const cur = this.info();
    if (!cur) return;
    const on = kind === 'like' ? !cur.liked : !cur.saved;
    // optimistic
    this.info.set({
      ...cur,
      ...(kind === 'like' ? { liked: on, likes: cur.likes + (on ? 1 : -1) } : { saved: on, saves: cur.saves + (on ? 1 : -1) }),
    });
    this.api.react(this.slug, kind, on).subscribe({
      next: (c) => this.info.update((s) => (s ? { ...s, ...c } : s)),
      error: () => this.info.set(cur),
    });
  }

  async share(): Promise<void> {
    const url = `${location.origin}/product/${this.slug}`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      if (nav.share && matchMedia('(max-width:820px)').matches) await nav.share({ title: this.product.name, url });
      else await navigator.clipboard.writeText(url);
      this.shared.set(true);
      setTimeout(() => this.shared.set(false), 2000);
    } catch {
      /* cancelled */
    }
  }

  download(): void {
    const ep = this.current();
    if (!ep || !this.canPlay) return;
    this.api.download(ep.id, this.licenseKey || undefined).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `episode-${ep.index}.aimc`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.err.set(e?.status === 402 ? 'Cần license còn hạn để tải.' : e?.error?.message || 'Tải xuống thất bại.'),
    });
  }

  block(ev: Event): void {
    ev.preventDefault();
  }

  private readLocal(): { episodeId: string; positionSec: number } | null {
    try {
      return JSON.parse(localStorage.getItem(LS(this.slug)) || 'null');
    } catch {
      return null;
    }
  }

  private saveProgress(force: boolean, nextId?: string): void {
    const ep = this.current();
    if (!ep || !this.slug) return;
    const pos = nextId ? 0 : Math.floor(this.vid?.nativeElement?.currentTime || this.time() || 0);
    const episodeId = nextId || ep.id;
    if (!this.playUrl() && !nextId) return;
    try {
      localStorage.setItem(LS(this.slug), JSON.stringify({ episodeId, positionSec: pos }));
    } catch {
      /* quota */
    }
    if (!this.auth.user() || (!force && Date.now() - this.lastSave < 5000)) return;
    this.lastSave = Date.now();
    this.api.progress(this.slug, episodeId, pos).subscribe({ error: () => undefined });
  }
}
