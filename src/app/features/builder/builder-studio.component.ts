import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { BuilderProject, BuilderService, BuilderStreamError, ByokKey, ByokProvider, ProjectGit } from './builder.service';
import { ByokKeysComponent } from './byok-keys.component';
import { GitPanelComponent } from './git-panel.component';
import { buildZip, expoScaffold } from './zip';
import { DEFAULT_CHROME, DeviceChrome, DeviceFrameComponent, DeviceModel, deviceOuter } from './device-frame.component';

interface Device {
  id: string;
  width: number;
  height: number;
  /** Emulator shell; none = full-width desktop preview. */
  model: DeviceModel | null;
}

const DEVICES: Record<'web' | 'app', Device[]> = {
  web: [
    { id: 'desktop', width: 0, height: 0, model: null },
    { id: 'tablet', width: 820, height: 1180, model: 'tablet' },
    { id: 'mobile', width: 390, height: 844, model: 'iphone' },
  ],
  app: [
    { id: 'iphone', width: 390, height: 844, model: 'iphone' },
    { id: 'android', width: 412, height: 915, model: 'android' },
    { id: 'tablet', width: 820, height: 1180, model: 'tablet' },
  ],
};

@Component({
  selector: 'app-builder-studio',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe, ByokKeysComponent, GitPanelComponent, DeviceFrameComponent],
  styles: [
    `
      :host { display: block; }
      .studio { min-height: calc(100vh - 4rem); }
      .preview-full { position: fixed; inset: 0; z-index: 60; height: auto !important; min-height: 0 !important; border-radius: 0; }
      .bubble-user { background: rgb(99 102 241 / 0.15); }
      .selected-row { background: rgb(255 255 255 / 0.1); }
    `,
  ],
  template: `
    @if (project(); as p) {
      <section class="studio flex flex-col gap-3 px-3 py-3">
        <!-- top bar -->
        <header class="flex flex-wrap items-center gap-2">
          <a routerLink="/build" class="btn btn-outline text-xs">← {{ 'builder.back' | t }}</a>
          <input
            class="input min-w-[10rem] flex-1 py-1 font-semibold sm:max-w-xs"
            [ngModel]="p.name"
            (change)="rename($any($event.target).value)"
            maxlength="80"
            [attr.aria-label]="'builder.namePh' | t"
          />
          <span class="rounded-full border border-line px-2 py-0.5 text-xs">{{ 'builder.kind.' + p.kind | t }}</span>
          <span class="text-xs text-muted">v{{ p.version }}</span>
          @if (p.template) {
            <span class="max-w-full truncate text-xs text-muted">{{ 'builder.tpl.from' | t: { name: p.template.name } }}</span>
          }
          <div class="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
            @if (activeKeys().length) {
              <label class="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted sm:flex-none" [title]="'builder.modelHint' | t">
                {{ 'builder.provider' | t }}
                <select class="input min-w-0 flex-1 py-1 text-xs text-ink" [ngModel]="provider()" (ngModelChange)="pickProvider($event)">
                  @for (k of activeKeys(); track k.provider) {
                    <option [value]="k.provider">{{ providerLabel(k.provider) }}</option>
                  }
                </select>
              </label>
              <label class="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted sm:flex-none" [title]="'builder.modelHint' | t">
                {{ 'builder.model' | t }}
                <input
                  class="input min-w-0 flex-1 py-1 text-xs text-ink sm:w-44 sm:flex-none"
                  list="builder-models"
                  [ngModel]="model()"
                  (ngModelChange)="model.set($event)"
                  (change)="saveModel()"
                  [placeholder]="defaultModel() || ('builder.modelDefault' | t)"
                />
              </label>
              <datalist id="builder-models">
                @for (m of models(); track m) {
                  <option [value]="m"></option>
                }
              </datalist>
              <button type="button" class="btn btn-outline text-xs" (click)="showKeys.set(!showKeys())">{{ 'builder.keys.manage' | t }}</button>
            } @else {
              <button type="button" class="btn btn-fill text-xs" (click)="showKeys.set(true)">{{ 'builder.keys.setup' | t }}</button>
            }
            <button type="button" class="btn btn-outline text-xs" (click)="exportZip()">{{ 'builder.export' | t }}</button>
            <a class="btn btn-outline text-xs" [href]="p.previewUrl" target="_blank" rel="noopener noreferrer">{{ 'builder.openTab' | t }}</a>
            <button type="button" class="btn btn-outline text-xs" [class.border-accent]="showGit()" (click)="showGit.set(!showGit())">
              {{ p.git ? ('builder.git.buttonLinked' | t: { repo: p.git.repo }) : ('builder.git.button' | t) }}
            </button>
            @if (canSellTemplate()) {
              <a class="btn btn-outline text-xs" routerLink="/sell/templates" [queryParams]="{ fromProject: p.id, kind: p.kind }">
                {{ 'builder.tpl.sellThis' | t }}
              </a>
            }
          </div>
        </header>

        @if (showKeys()) {
          <div class="panel"><app-byok-keys (changed)="onKeys($event)" /></div>
        }
        @if (showGit()) {
          <div class="panel"><app-git-panel [project]="p" [generating]="generating()" (gitChange)="onGit($event)" /></div>
        }
        @if (error()) {
          <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ error() }}</p>
        }

        <div class="grid gap-3 lg:h-[calc(100vh-7rem)] lg:min-h-[560px] lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
          <!-- chat -->
          <div class="panel flex min-h-0 min-w-0 flex-col gap-3 p-3">
            <div #chatScroll class="max-h-[45vh] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-none">
              @for (m of p.messages || []; track m.id) {
                <div class="rounded-xl px-3 py-2 text-sm" [class.bubble-user]="m.role === 'user'" [class.border]="m.role === 'assistant'" [class.border-line]="m.role === 'assistant'">
                  <p class="whitespace-pre-wrap">{{ m.content }}</p>
                  @if (m.files.length) {
                    <div class="mt-2 flex flex-wrap gap-1">
                      @for (f of m.files; track f) {
                        <button type="button" class="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]" (click)="openFile(f)">{{ f }}</button>
                      }
                    </div>
                  }
                  @if (m.role === 'assistant' && m.model) {
                    <p class="mt-1 text-[11px] text-muted">{{ m.model }} · {{ m.createdAt | date: 'short' }}</p>
                  }
                </div>
              } @empty {
                @if (!generating()) {
                  <p class="text-sm text-muted">{{ 'builder.chatEmpty.' + p.kind | t }}</p>
                }
              }
              @if (generating()) {
                <div class="space-y-2 rounded-xl border border-accent/50 px-3 py-2 text-sm">
                  @if (pendingPrompt()) {
                    <p class="whitespace-pre-wrap text-muted">{{ pendingPrompt() }}</p>
                  }
                  <p class="font-semibold">
                    {{ writingFile() ? ('builder.writing' | t: { file: writingFile() }) : ('builder.thinking' | t) }}
                  </p>
                  <p class="text-[11px] text-muted">{{ streamModel() }} · {{ streamChars() }} {{ 'builder.chars' | t }}</p>
                  <pre class="max-h-48 overflow-hidden whitespace-pre-wrap rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-tight text-muted">{{ streamTail() }}</pre>
                </div>
              }
            </div>

            @if (previewError(); as pe) {
              <div class="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
                <p class="font-semibold">{{ 'builder.previewError' | t }}</p>
                <pre class="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[11px]">{{ pe }}</pre>
                <div class="mt-2 flex gap-2">
                  <button type="button" class="btn btn-fill text-xs" [disabled]="generating() || !canBuild()" (click)="fixError()">{{ 'builder.fixWithAi' | t }}</button>
                  <button type="button" class="btn btn-outline text-xs" (click)="previewError.set('')">{{ 'builder.dismiss' | t }}</button>
                </div>
              </div>
            }

            <form class="space-y-2" (ngSubmit)="send()">
              <textarea
                class="input min-h-[5rem] w-full text-sm"
                name="prompt"
                [(ngModel)]="prompt"
                maxlength="8000"
                [placeholder]="'builder.followUpPh' | t"
                (keydown.control.enter)="send()"
                (keydown.meta.enter)="send()"
              ></textarea>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] text-muted">{{ 'builder.byokNote' | t }}</span>
                @if (generating()) {
                  <button type="button" class="btn btn-outline text-xs text-red-400" (click)="stop()">{{ 'builder.stop' | t }}</button>
                } @else {
                  <button class="btn btn-fill text-xs" type="submit" [disabled]="!prompt.trim() || !canBuild()">{{ 'builder.send' | t }}</button>
                }
              </div>
              @if (!canBuild()) {
                <p class="text-xs text-amber-400">{{ 'builder.needKey.short' | t }}</p>
              }
            </form>
          </div>

          <!-- preview / code -->
          <div class="panel flex h-[75vh] min-h-[480px] min-w-0 flex-col gap-2 p-3 lg:h-auto lg:min-h-0" [class.preview-full]="expanded()">
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex rounded-lg border border-line p-0.5" role="tablist">
                @for (tab of tabs; track tab) {
                  <button
                    type="button"
                    role="tab"
                    class="rounded-md px-3 py-1 text-xs"
                    [class.bg-accent]="view() === tab"
                    [class.text-white]="view() === tab"
                    [attr.aria-selected]="view() === tab"
                    (click)="view.set(tab)"
                  >
                    {{ 'builder.tab.' + tab | t }}
                  </button>
                }
              </div>
              @if (view() === 'preview') {
                <div class="flex rounded-lg border border-line p-0.5">
                  @for (d of devices(); track d.id) {
                    <button type="button" class="rounded-md px-2 py-1 text-xs" [class.selected-row]="device().id === d.id" (click)="deviceId.set(d.id)">
                      {{ 'builder.device.' + d.id | t }}
                    </button>
                  }
                </div>
                <button type="button" class="btn btn-outline ml-auto text-xs" (click)="reload()">↻ {{ 'builder.reload' | t }}</button>
                <button type="button" class="btn btn-outline text-xs" (click)="copyLink()">{{ copied() ? ('builder.copied' | t) : ('builder.copyLink' | t) }}</button>
              }
              <button
                type="button"
                class="btn btn-outline text-xs"
                [class.ml-auto]="view() !== 'preview'"
                [attr.aria-pressed]="expanded()"
                (click)="expanded.set(!expanded())"
              >
                {{ expanded() ? ('builder.collapse' | t) : ('builder.expand' | t) }}
              </button>
            </div>

            @if (view() === 'preview') {
              <div
                #stage
                class="relative flex min-h-0 flex-1 justify-center overflow-hidden rounded-xl"
                [class.items-center]="!device().model"
                [style.background]="device().model ? 'radial-gradient(ellipse at 50% 30%, #3a3f4b 0%, #1b1e25 60%, #111317 100%)' : 'rgb(0 0 0 / 0.3)'"
              >
                @if (device().model; as model) {
                  <div class="relative self-center" [style.width.px]="outer().width * scale()" [style.height.px]="outer().height * scale()">
                    <div class="absolute left-1/2 top-0 origin-top" [style.transform]="'translateX(-50%) scale(' + scale() + ')'">
                      <app-device-frame [model]="model" [width]="device().width" [height]="device().height" [chrome]="chrome()">
                        <iframe
                          #frame
                          class="absolute inset-0 h-full w-full border-0 bg-white"
                          [src]="frameSrc()"
                          sandbox="allow-scripts allow-forms allow-modals allow-popups"
                          [title]="p.name"
                        ></iframe>
                      </app-device-frame>
                    </div>
                  </div>
                } @else {
                  <iframe
                    #frame
                    class="h-full w-full rounded-xl border-0 bg-white"
                    [src]="frameSrc()"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    [title]="p.name"
                  ></iframe>
                }
              </div>
              <p class="text-[11px] text-muted">{{ 'builder.phoneHint.' + p.kind | t }}</p>
            } @else {
              <div class="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
                <div class="flex min-h-0 flex-col gap-2">
                  <ul class="max-h-36 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line text-xs md:max-h-none">
                    @for (f of p.files || []; track f.path) {
                      <li>
                        <button
                          type="button"
                          class="w-full truncate px-2 py-1.5 text-left font-mono"
                          [class.selected-row]="selectedPath() === f.path"
                          (click)="openFile(f.path)"
                        >
                          {{ f.path }}
                        </button>
                      </li>
                    }
                  </ul>
                  <form class="flex gap-1" (ngSubmit)="newFile()">
                    <input class="input min-w-0 flex-1 py-1 font-mono text-xs" name="newPath" [(ngModel)]="newPath" [placeholder]="p.kind === 'app' ? 'components/Card.tsx' : 'about.html'" />
                    <button class="btn btn-outline text-xs" type="submit" [disabled]="!newPath.trim()">+</button>
                  </form>
                </div>
                <div class="flex min-h-0 flex-col gap-2">
                  @if (selectedPath()) {
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate font-mono text-xs">{{ selectedPath() }}</span>
                      <div class="flex gap-2">
                        <button type="button" class="btn btn-outline text-xs text-red-400" [disabled]="generating()" (click)="deleteFile()">{{ 'builder.deleteFile' | t }}</button>
                        <button type="button" class="btn btn-fill text-xs" [disabled]="generating() || !dirty()" (click)="saveFile()">{{ 'builder.saveFile' | t }}</button>
                      </div>
                    </div>
                    <textarea
                      class="input min-h-0 flex-1 resize-none font-mono text-xs leading-relaxed"
                      spellcheck="false"
                      [readonly]="generating()"
                      [ngModel]="draft()"
                      (ngModelChange)="draft.set($event)"
                      (keydown.control.s)="$event.preventDefault(); saveFile()"
                    ></textarea>
                  } @else {
                    <p class="text-sm text-muted">{{ 'builder.pickFile' | t }}</p>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    } @else {
      <section class="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted">
        @if (error()) {
          <p class="text-red-400">{{ error() }}</p>
          <a routerLink="/build" class="mt-4 inline-block underline">{{ 'builder.back' | t }}</a>
        } @else {
          {{ 'builder.loading' | t }}
        }
      </section>
    }
  `,
})
export class BuilderStudioComponent implements OnInit, AfterViewInit {
  private readonly api = inject(BuilderService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  readonly canSellTemplate = computed(() => ['seller', 'admin'].includes(this.auth.user()?.role || ''));
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  private readonly chatScroll = viewChild<ElementRef<HTMLElement>>('chatScroll');

  readonly tabs = ['preview', 'code'] as const;
  readonly project = signal<BuilderProject | null>(null);
  readonly providers = signal<ByokProvider[]>([]);
  readonly keys = signal<ByokKey[]>([]);
  readonly activeKeys = computed(() => this.keys().filter((k) => k.status === 'active'));
  readonly provider = signal('');
  readonly model = signal('');
  readonly models = signal<string[]>([]);
  readonly defaultModel = computed(() => this.providers().find((p) => p.id === this.provider())?.defaultModel || '');
  readonly canBuild = computed(() => this.activeKeys().some((k) => k.provider === this.provider()));
  readonly view = signal<'preview' | 'code'>('preview');
  readonly deviceId = signal('');
  readonly devices = computed(() => DEVICES[this.project()?.kind || 'web']);
  readonly device = computed(() => this.devices().find((d) => d.id === this.deviceId()) || this.devices()[0]);
  readonly stageSize = signal({ width: 0, height: 0 });
  readonly outer = computed(() => {
    const d = this.device();
    return d.model ? deviceOuter(d.model, d.width, d.height) : { width: 0, height: 0 };
  });
  readonly scale = computed(() => {
    const { width: w, height: h } = this.outer();
    const { width, height } = this.stageSize();
    if (!w || !width || !height) return 1;
    return Math.min(1, (width - 40) / w, (height - 40) / h);
  });
  readonly nonce = signal(0);
  readonly chrome = signal<DeviceChrome>(DEFAULT_CHROME);
  readonly frameSrc = computed<SafeResourceUrl | null>(() => {
    const p = this.project();
    if (!p) return null;
    const model = this.device().model;
    const device = model ? `&device=${model}` : '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${p.previewUrl}?v=${p.version}-${this.nonce()}${device}`);
  });
  readonly generating = signal(false);
  readonly pendingPrompt = signal('');
  readonly streamText = signal('');
  readonly streamModel = signal('');
  readonly streamChars = computed(() => this.streamText().length);
  readonly streamTail = computed(() => this.streamText().slice(-1800));
  readonly writingFile = computed(() => {
    const text = this.streamText();
    const open = text.lastIndexOf('<file ');
    if (open < 0 || text.indexOf('</file>', open) >= 0) return '';
    return /path\s*=\s*["']([^"']+)/.exec(text.slice(open))?.[1] || '';
  });
  readonly previewError = signal('');
  readonly selectedPath = signal('');
  readonly draft = signal('');
  readonly dirty = computed(() => {
    const f = this.project()?.files?.find((x) => x.path === this.selectedPath());
    return f ? f.content !== this.draft() : this.draft().length > 0;
  });
  readonly error = signal('');
  readonly showKeys = signal(false);
  /** Opens itself when GitHub OAuth sends the browser back here (?git_connect / ?git_error). */
  readonly showGit = signal(false);
  readonly copied = signal(false);
  readonly expanded = signal(false);

  prompt = '';
  newPath = '';
  private abort: AbortController | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.view();
      this.device();
      if (this.browser) setTimeout(() => this.observeStage());
    });
    effect(() => {
      if (this.browser) document.body.style.overflow = this.expanded() ? 'hidden' : '';
    });
    effect(() => {
      this.frameSrc();
      untracked(() => this.chrome.set(DEFAULT_CHROME));
    });
    this.destroyRef.onDestroy(() => {
      if (this.browser) document.body.style.overflow = '';
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.expanded.set(false);
  }

  ngOnInit(): void {
    if (!this.browser) return;
    const id = this.route.snapshot.paramMap.get('id') || '';
    const q = this.route.snapshot.queryParamMap;
    if (q.get('git_connect') || q.get('git_error')) this.showGit.set(true);
    const initialPrompt = String((history.state as { prompt?: string } | null)?.prompt || '');
    if (initialPrompt) history.replaceState({ ...history.state, prompt: undefined }, '');

    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        type?: string;
        message?: string;
        top?: string;
        bottom?: string;
        style?: string;
        background?: string;
      } | null;
      if (!data || data.source !== 'aim-preview') return;
      if (event.source !== this.frame()?.nativeElement.contentWindow) return;
      if (data.type === 'error' && data.message) this.previewError.set(data.message);
      const color = (v?: string) => (typeof v === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|[a-z]{3,20})$/i.test(v.trim()) ? v.trim() : '');
      if (data.type === 'chrome') {
        this.chrome.update((c) => ({ ...c, top: color(data.top) || c.top, bottom: color(data.bottom) || c.bottom }));
      } else if (data.type === 'statusbar') {
        const bar = data.style === 'light' || data.style === 'dark' ? data.style : 'auto';
        this.chrome.update((c) => ({ ...c, bar, barBackground: color(data.background) }));
      }
    };
    window.addEventListener('message', onMessage);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('message', onMessage);
      this.abort?.abort();
      this.resizeObserver?.disconnect();
    });

    Promise.all([firstValueFrom(this.api.get(id)), firstValueFrom(this.api.providers())])
      .then(([pr, keys]) => {
        this.providers.set(keys.providers || []);
        this.keys.set(keys.keys || []);
        this.project.set(pr.project);
        this.seo.set({ title: `${pr.project.name} · ${this.i18n.t('builder.title')}` });
        const active = this.activeKeys();
        const prov = active.some((k) => k.provider === pr.project.provider) ? pr.project.provider : active[0]?.provider || '';
        this.provider.set(prov);
        this.model.set(pr.project.provider === prov ? pr.project.model : '');
        if (prov) this.loadModels(prov);
        setTimeout(() => this.observeStage());
        this.scrollChat();
        if (initialPrompt && this.canBuild()) this.run(initialPrompt);
      })
      .catch((e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.notFound')));
  }

  ngAfterViewInit(): void {
    this.observeStage();
  }

  providerLabel(id: string): string {
    return this.providers().find((p) => p.id === id)?.label || id;
  }

  onKeys(keys: ByokKey[]): void {
    this.keys.set(keys);
    if (!this.canBuild()) {
      const first = this.activeKeys()[0]?.provider || '';
      if (first) this.pickProvider(first);
    }
  }

  onGit(git: ProjectGit | null): void {
    this.project.update((cur) => (cur ? { ...cur, git } : cur));
  }

  pickProvider(id: string): void {
    this.provider.set(id);
    this.model.set('');
    this.models.set([]);
    this.loadModels(id);
    this.persist({ provider: id, model: '' });
  }

  saveModel(): void {
    this.persist({ model: this.model().trim() });
  }

  rename(name: string): void {
    const value = String(name || '').trim();
    if (value) this.persist({ name: value });
  }

  send(): void {
    const text = this.prompt.trim();
    if (!text || this.generating() || !this.canBuild()) return;
    this.prompt = '';
    this.run(text);
  }

  fixError(): void {
    const err = this.previewError();
    if (!err) return;
    this.previewError.set('');
    this.run('', err);
  }

  stop(): void {
    this.abort?.abort();
  }

  async run(prompt: string, previewError = ''): Promise<void> {
    const p = this.project();
    if (!p || this.generating()) return;
    this.generating.set(true);
    this.pendingPrompt.set(prompt || this.i18n.t('builder.fixing'));
    this.streamText.set('');
    this.streamModel.set(this.model() || this.defaultModel());
    this.error.set('');
    this.previewError.set('');
    this.abort = new AbortController();
    this.scrollChat();
    try {
      const result = await this.api.generate(
        p.id,
        { prompt, previewError: previewError || undefined, provider: this.provider(), model: this.model().trim() || undefined },
        {
          onStart: (info) => this.streamModel.set(info.model),
          onDelta: (text) => {
            this.streamText.update((t) => t + text);
            this.scrollChat();
          },
        },
        this.abort.signal,
      );
      this.applyProject(result.project);
      if (result.truncated) this.error.set(this.i18n.t('builder.err.truncated'));
      else if (result.rejected.length) this.error.set(this.i18n.t('builder.err.rejected', { files: result.rejected.join(', ') }));
      this.view.set('preview');
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        this.error.set(this.i18n.t('builder.stopped'));
      } else if (e instanceof BuilderStreamError) {
        const key = `builder.err.${e.code}`;
        const text = this.i18n.t(key);
        this.error.set(text !== key && e.code !== 'PROVIDER_ERROR' ? text : e.message || text);
        if (!prompt && previewError) this.previewError.set(previewError);
        else if (prompt && !this.prompt) this.prompt = prompt;
      } else {
        this.error.set(this.i18n.t('builder.err.generic'));
        if (prompt && !this.prompt) this.prompt = prompt;
      }
    } finally {
      this.generating.set(false);
      this.pendingPrompt.set('');
      this.abort = null;
      this.scrollChat();
    }
  }

  reload(): void {
    this.previewError.set('');
    this.nonce.update((n) => n + 1);
  }

  async copyLink(): Promise<void> {
    const p = this.project();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p.previewUrl);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      window.prompt(this.i18n.t('builder.copyLink'), p.previewUrl);
    }
  }

  openFile(path: string): void {
    const f = this.project()?.files?.find((x) => x.path === path);
    if (!f) return;
    this.selectedPath.set(path);
    this.draft.set(f.content);
    this.view.set('code');
  }

  newFile(): void {
    const path = this.newPath.trim();
    if (!path) return;
    this.selectedPath.set(path);
    this.draft.set('');
    this.newPath = '';
  }

  saveFile(): void {
    const p = this.project();
    const path = this.selectedPath();
    if (!p || !path || this.generating()) return;
    this.api.saveFile(p.id, path, this.draft()).subscribe({
      next: (r) => this.applyProject(r.project),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  deleteFile(): void {
    const p = this.project();
    const path = this.selectedPath();
    if (!p || !path) return;
    if (!p.files?.some((f) => f.path === path)) {
      this.selectedPath.set('');
      return;
    }
    if (!confirm(this.i18n.t('builder.confirmDeleteFile', { file: path }))) return;
    this.api.deleteFile(p.id, path).subscribe({
      next: (r) => {
        this.selectedPath.set('');
        this.applyProject(r.project);
      },
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  exportZip(): void {
    const p = this.project();
    if (!p?.files) return;
    const own = new Set(p.files.map((f) => f.path));
    const extra = p.kind === 'app' ? expoScaffold(p.name).filter((f) => !own.has(f.path)) : [];
    const blob = buildZip([...p.files, ...extra]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'project'}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  private applyProject(next: BuilderProject): void {
    this.project.set(next);
    const path = this.selectedPath();
    const f = next.files?.find((x) => x.path === path);
    if (f) this.draft.set(f.content);
    setTimeout(() => this.observeStage());
  }

  private persist(body: { name?: string; provider?: string; model?: string }): void {
    const p = this.project();
    if (!p) return;
    this.api.update(p.id, body).subscribe({
      next: (r) => this.project.update((cur) => (cur ? { ...cur, name: r.project.name, provider: r.project.provider, model: r.project.model } : cur)),
      error: (e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.generic')),
    });
  }

  private loadModels(provider: string): void {
    this.api.models(provider).subscribe({
      next: (r) => {
        if (this.provider() !== provider) return;
        this.models.set(r.models || []);
      },
      error: () => this.models.set([]),
    });
  }

  private observeStage(): void {
    const el = this.stage()?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.stageSize.set({ width, height });
    });
    this.resizeObserver.observe(el);
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = this.chatScroll()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
