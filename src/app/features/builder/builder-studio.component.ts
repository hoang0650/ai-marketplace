import { AiResponseComponent } from '../../shared/components/ai-response.component';
import { builderStreamView } from '../../shared/components/ai-response-markdown';
import { CodeEditorComponent } from './code-editor.component';
import { MobileIdeComponent } from './mobile-ide.component';
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
import { isPlatformBrowser } from '@angular/common';
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
import { STUDIO_MESSAGES } from './studio.messages';
import { LocalProviderError, LocalProviderService } from './local-provider.service';
import { LocalProviderCardComponent } from './local-provider-card.component';
import { ExpoQrComponent } from './expo-qr.component';
import { HandoffButtonComponent } from '../handoff/handoff-button.component';
import { SyncService } from '../../services/sync.service';
import { DEFAULT_CHROME, DeviceChrome, DeviceFrameComponent, DeviceModel, deviceOuter } from './device-frame.component';

interface Device {
  id: string;
  width: number;
  height: number;
  /** Emulator shell; none = full-width desktop preview. */
  model: DeviceModel | null;
}

/** Browser-side provider id (see LocalProviderService); the API stores it as project.provider. */
const LOCAL_ID = 'local';

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
  imports: [AiResponseComponent, FormsModule, RouterLink, TPipe, ByokKeysComponent, LocalProviderCardComponent, GitPanelComponent, DeviceFrameComponent, ExpoQrComponent, HandoffButtonComponent, CodeEditorComponent, MobileIdeComponent],
  styles: [
    `
      :host { display: block; }
      .studio { height: calc(100dvh - 4rem); min-height: 560px; }
      .preview-full { position: fixed; inset: 0; z-index: 60; height: auto !important; min-height: 0 !important; border-radius: 0; }
      .bubble-user { background: rgb(99 102 241 / 0.15); }
      .selected-row { background: rgb(255 255 255 / 0.1); }
      .seg { display: inline-flex; border: 1px solid var(--color-line, #e5e7eb); border-radius: .6rem; padding: 2px; gap: 2px; }
      .seg > button { border-radius: .45rem; padding: .25rem .65rem; font-size: .75rem; line-height: 1.1rem; white-space: nowrap; }
      .seg > button.on { background: var(--color-accent, #c9a45c); color: #fff; }
      .icon-btn { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; height: 2rem; min-width: 2rem; padding: 0 .55rem; border: 1px solid var(--color-line, #e5e7eb); border-radius: .55rem; font-size: .75rem; white-space: nowrap; }
      .icon-btn:hover { border-color: var(--color-accent, #c9a45c); }
      .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 70; min-width: 15rem; border-radius: .75rem; padding: .35rem; box-shadow: 0 18px 40px rgb(0 0 0 / .18); }
      .menu > * { display: flex; width: 100%; align-items: center; gap: .5rem; padding: .5rem .65rem; border-radius: .5rem; font-size: .82rem; text-align: left; }
      .menu > *:hover { background: rgb(127 127 127 / .12); }
      .drawer-backdrop { position: fixed; inset: 0; z-index: 1080; background: rgb(0 0 0 / .45); }
      .drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 1081; width: min(560px, 100vw); overflow-y: auto; box-shadow: -18px 0 40px rgb(0 0 0 / .2); }
      .composer textarea { resize: none; }
      .chip { border: 1px solid var(--color-line, #e5e7eb); border-radius: 999px; padding: .3rem .7rem; font-size: .75rem; text-align: left; }
      .chip:hover { border-color: var(--color-accent, #c9a45c); }
      @media (max-width: 1023px) { .studio { height: auto; } }
      /* < lg: full-screen app shell (header · pane · bottom tabs), sized to the visual viewport so the
         composer / key bar sit right above the soft keyboard. */
      .m-studio { position: fixed; left: 0; right: 0; top: var(--vvt, 0px); height: var(--vvh, 100dvh); min-height: 0; z-index: 1000; margin: 0;
        padding: max(.375rem, env(safe-area-inset-top)) max(.5rem, env(safe-area-inset-right)) 0 max(.5rem, env(safe-area-inset-left));
        gap: .375rem; overflow: hidden; background: var(--color-paper, #f7f5f2); overscroll-behavior: contain; }
      .m-studio .icon-btn { height: 44px; min-width: 44px; font-size: .85rem; }
      .m-studio .chip { min-height: 44px; }
      .m-studio .btn { min-height: 44px; }
      .m-studio .seg > button { min-height: 40px; }
      .m-studio input, .m-studio textarea, .m-studio select { font-size: 16px; } /* no iOS zoom-on-focus */
      .m-hide { display: none !important; }
      .m-tap { min-height: 44px; }
      .m-studio header { min-width: 0; }
      .m-studio header > * { flex-shrink: 0; }
      .m-studio header > input { flex-shrink: 1; }
      .m-p0 { padding: 0 !important; }
      .m-pane { min-height: 0 !important; flex: 1 1 auto; }
      .m-tabs { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 calc(-1 * max(.5rem, env(safe-area-inset-left))); padding-bottom: env(safe-area-inset-bottom);
        border-top: 1px solid var(--color-line, #1f2937); background: var(--color-surface, #ffffff); }
      .m-tabs > button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 56px; font-size: 11px; font-weight: 600; color: var(--color-muted, #9ca3af); position: relative; }
      .m-tabs > button .ic { font-size: 18px; line-height: 1; }
      .m-tabs > button.on { color: var(--color-accent, #c9a45c); }
      .m-tabs > button.on::before { content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 2px; border-radius: 2px; background: currentColor; }
      .m-tabs .badge { position: absolute; top: 8px; left: calc(50% + 8px); min-width: 8px; height: 8px; border-radius: 999px; background: #3b82f6; }
      .m-kb .m-tabs { display: none; }
      .m-fab { position: absolute; right: 12px; bottom: 12px; z-index: 5; min-height: 44px; padding: 0 16px; border-radius: 999px; background: #0e639c; color: #fff; font-weight: 600; font-size: 14px; box-shadow: 0 8px 24px rgb(0 0 0 / .35); }
    `,
  ],
  template: `
    @if (project(); as p) {
      <section class="studio flex flex-col gap-2 px-3 py-2" [class.m-studio]="mobile()" [class.m-kb]="mobile() && kb()" [style.--vvh]="mobile() ? vvh() + 'px' : null" [style.--vvt]="mobile() ? vvt() + 'px' : null" data-testid="builder-studio">
        <!-- compact header: identity left, actions right, rest in overflow menu -->
        <header class="panel flex items-center gap-2 px-2 py-1.5" [class.flex-wrap]="!mobile()">
          <a routerLink="/build" class="icon-btn no-underline" [title]="'builder.back' | t" [attr.aria-label]="'builder.back' | t">←</a>
          <input
            class="input min-w-0 flex-1 border-transparent bg-transparent py-1 font-semibold sm:max-w-xs"
            [ngModel]="p.name"
            (change)="rename($any($event.target).value)"
            maxlength="80"
            [attr.aria-label]="'builder.namePh' | t"
          />
          <span class="hidden rounded-full border border-line px-2 py-0.5 text-[11px] sm:inline">{{ 'builder.kind.' + p.kind | t }} · v{{ p.version }}</span>
          @if (p.template) {
            <span class="hidden max-w-[16rem] truncate text-[11px] text-muted xl:inline" [title]="'builder.tpl.from' | t: { name: p.template.name }">{{ 'builder.tpl.from' | t: { name: p.template.name } }}</span>
          }
          <div class="ml-auto flex items-center gap-1.5">
            @if (activeKeys().length) {
              <div class="hidden items-center gap-1 md:flex" [title]="'builder.modelHint' | t">
                <select class="input w-32 py-1 text-xs text-ink" [ngModel]="provider()" (ngModelChange)="pickProvider($event)" [attr.aria-label]="'builder.provider' | t">
                  @for (k of activeKeys(); track k.provider) {
                    <option [value]="k.provider">{{ providerLabel(k.provider) }}</option>
                  }
                </select>
                <input
                  class="input w-40 py-1 text-xs text-ink"
                  list="builder-models"
                  [ngModel]="model()"
                  (ngModelChange)="model.set($event)"
                  (change)="saveModel()"
                  [placeholder]="defaultModel() || ('builder.modelDefault' | t)"
                  [attr.aria-label]="'builder.model' | t"
                />
                <datalist id="builder-models">
                  @for (m of models(); track m) {
                    <option [value]="m"></option>
                  }
                </datalist>
              </div>
            } @else {
              <button type="button" class="btn btn-fill text-xs" [class.m-hide]="mobile()" (click)="openDrawer('keys')">{{ 'builder.keys.setup' | t }}</button>
              @if (mobile()) { <button type="button" class="icon-btn" (click)="openDrawer('keys')" [title]="'builder.keys.setup' | t" [attr.aria-label]="'builder.keys.setup' | t">🔑</button> }
            }
            @if (!mobile()) { <app-handoff-button kind="builder" [targetId]="p.id" [compact]="true" /> }
            <a class="icon-btn no-underline" [class.m-hide]="mobile()" [href]="p.previewUrl" target="_blank" rel="noopener noreferrer" [title]="'builder.openTab' | t">↗<span class="hidden lg:inline">{{ 'builder.openTab' | t }}</span></a>
            <button type="button" class="icon-btn" [class.m-hide]="mobile()" [class.border-accent]="drawer() === 'git'" (click)="openDrawer('git')" [title]="p.git ? ('builder.git.buttonLinked' | t: { repo: p.git.repo }) : ('builder.git.button' | t)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              <span class="hidden max-w-[10rem] truncate lg:inline">{{ p.git ? p.git.repo : ('builder.git.button' | t) }}</span>
            </button>
            <div class="relative">
              <button type="button" class="icon-btn" [attr.aria-expanded]="menuOpen()" aria-haspopup="menu" (click)="menuOpen.set(!menuOpen())" [title]="'builder.more' | t">⋯</button>
              @if (menuOpen()) {
                <div class="menu panel" role="menu">
                  <button type="button" role="menuitem" (click)="menuOpen.set(false); openDrawer('keys')">🔑 {{ 'builder.keys.manage' | t }}</button>
                  @if (mobile()) {
                    <a role="menuitem" class="no-underline" [href]="p.previewUrl" target="_blank" rel="noopener noreferrer" (click)="menuOpen.set(false)">↗ {{ 'builder.openTab' | t }}</a>
                    <button type="button" role="menuitem" (click)="menuOpen.set(false); openDrawer('git')">⎇ {{ p.git ? p.git.repo : ('builder.git.button' | t) }}</button>
                  }
                  <button type="button" role="menuitem" (click)="menuOpen.set(false); exportZip()">⬇ {{ 'builder.export' | t }}</button>
                  <button type="button" role="menuitem" (click)="menuOpen.set(false); copyLink()">🔗 {{ copied() ? ('builder.copied' | t) : ('builder.copyLink' | t) }}</button>
                  @if (canSellTemplate()) {
                    <a role="menuitem" class="no-underline" routerLink="/sell/templates" [queryParams]="{ fromProject: p.id, kind: p.kind }" (click)="menuOpen.set(false)">🏷 {{ 'builder.tpl.sellThis' | t }}</a>
                  }
                </div>
              }
            </div>
          </div>
        </header>

        @if (error()) {
          <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ error() }}</p>
        }
        @if (remoteGenerating() && !generating()) {
          <p class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm">⏳ {{ 'handoff.remoteGenerating' | t }}</p>
        }

        <!-- small screens: switch between chat and preview -->
        <div class="lg:hidden" [class.m-hide]="mobile()"><div class="seg" role="tablist">
          <button type="button" role="tab" [class.on]="pane() === 'chat'" [attr.aria-selected]="pane() === 'chat'" (click)="pane.set('chat')">{{ 'builder.pane.chat' | t }}</button>
          <button type="button" role="tab" [class.on]="pane() === 'preview'" [attr.aria-selected]="pane() === 'preview'" (click)="pane.set('preview')">{{ 'builder.tab.preview' | t }} / {{ 'builder.tab.code' | t }}</button>
        </div></div>

        <div class="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] xl:grid-cols-[minmax(390px,480px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
          <!-- chat: full height, messages scroll, composer pinned -->
          <div class="panel min-h-0 min-w-0 flex-col p-0 lg:flex" [class.flex]="pane() === 'chat'" [class.hidden]="pane() !== 'chat'" [class.m-pane]="mobile()" [style.min-height]="mobile() ? null : '60vh'">
            <div class="flex items-center justify-between border-b border-line px-3 py-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">{{ 'builder.pane.chat' | t }}</span>
              @if (activeKeys().length) {
                <span class="truncate text-[11px] text-muted md:hidden">{{ providerLabel(provider()) }} · {{ model() || defaultModel() }}</span>
              }
            </div>
            <div #chatScroll role="log" aria-live="polite" aria-relevant="additions" (scroll)="onChatScroll($event)" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
              @if (!(p.messages || []).length && !generating()) {
                <div class="flex flex-col justify-start gap-4 py-6">
                  <p class="text-sm text-muted">{{ 'builder.chatEmpty.' + p.kind | t }}</p>
                  <div class="flex flex-wrap gap-2">
                    @for (s of suggestions(); track s) {
                      <button type="button" class="chip" (click)="prompt = s">{{ s }}</button>
                    }
                  </div>
                </div>
              }
              @for (m of p.messages || []; track m.id) {
                @if (m.role === 'user') {
                  <article class="ml-auto w-fit max-w-[92%] rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/10"><p class="whitespace-pre-wrap break-words">{{ m.content }}</p></article>
                } @else {
                  <app-ai-response [text]="m.content" [model]="m.model" [durationMs]="m.durationMs || 0" [files]="m.files || []" (fileSelected)="openFile($event)" />
                }
              }
              @if (generating()) {
                @if (pendingPrompt()) { <article class="ml-auto w-fit max-w-[92%] rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/10"><p class="whitespace-pre-wrap break-words">{{ pendingPrompt() }}</p></article> }
                <app-ai-response [text]="streamPreview().text" [busy]="true" [model]="streamModel()" [files]="streamPreview().files" [status]="writingFile() ? ('builder.writing' | t: { file: writingFile() }) : ''" />
              } @else if (streamFailed()) {
                @if (failedPrompt()) { <article class="ml-auto w-fit max-w-[92%] rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/10"><p class="whitespace-pre-wrap break-words">{{ failedPrompt() }}</p></article> }
                <p class="text-xs text-muted">{{ 'ai.interrupted' | t }}</p>
                @if (streamPreview().text) { <app-ai-response [text]="streamPreview().text" [model]="streamModel()" /> }
              }
            </div>

            @if (!chatAtBottom()) { <button type="button" class="mx-auto mb-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs" (click)="scrollChat(true)">{{ 'ai.jump' | t }} &#8595;</button> }
            <div class="space-y-2 border-t border-line p-3">
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
              <form class="composer rounded-xl border border-line p-2 focus-within:border-accent" (ngSubmit)="send()">
                <textarea
                  class="w-full border-0 bg-transparent text-sm outline-none"
                  [rows]="mobile() ? 2 : 4"
                  name="prompt"
                  [(ngModel)]="prompt"
                  maxlength="8000"
                  [placeholder]="'builder.followUpPh' | t"
                  [attr.aria-label]="'builder.followUpPh' | t"
                  (keydown.control.enter)="send()"
                  (keydown.meta.enter)="send()"
                ></textarea>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] text-muted">{{ 'builder.byokNote' | t }}</span>
                  @if (generating()) {
                    <button type="button" class="btn btn-outline text-xs text-red-400" (click)="stop()">■ {{ 'builder.stop' | t }}</button>
                  } @else {
                    <button class="btn btn-fill text-xs" type="submit" [disabled]="!prompt.trim() || !canBuild()">{{ 'builder.send' | t }} ↵</button>
                  }
                </div>
              </form>
              @if (!canBuild()) {
                <button type="button" class="w-full text-left text-xs text-amber-500 underline" [class.m-tap]="mobile()" (click)="openDrawer('keys')">{{ 'builder.needKey.short' | t }}</button>
              }
            </div>
          </div>

          <!-- preview / code -->
          <div class="panel min-h-[70vh] min-w-0 flex-col gap-2 p-2 lg:flex lg:min-h-0" [class.flex]="pane() === 'preview'" [class.hidden]="pane() !== 'preview'" [class.preview-full]="expanded()" [class.m-pane]="mobile()" [class.m-p0]="mobile() && view() === 'code'" [class.relative]="mobile()">
            <div class="flex flex-wrap items-center gap-2" [class.m-hide]="mobile() && view() === 'code'">
              <div class="seg" role="tablist" [class.m-hide]="mobile()">
                @for (tab of tabs; track tab) {
                  <button type="button" role="tab" [class.on]="view() === tab" [attr.aria-selected]="view() === tab" (click)="view.set(tab)">{{ 'builder.tab.' + tab | t }}</button>
                }
              </div>
              @if (view() === 'preview' && !mobile()) {
                <div class="seg" role="group" [attr.aria-label]="'builder.devices' | t">
                  @for (d of devices(); track d.id) {
                    <button type="button" [class.on]="device().id === d.id" [attr.aria-pressed]="device().id === d.id" (click)="deviceId.set(d.id)">{{ 'builder.device.' + d.id | t }}</button>
                  }
                </div>
              }
              <div class="ml-auto flex items-center gap-1.5">
                @if (view() === 'preview') {
                  <button type="button" class="icon-btn" (click)="reload()" [title]="'builder.reload' | t">↻<span class="hidden xl:inline">{{ 'builder.reload' | t }}</span></button>
                }
                <button type="button" class="icon-btn" [attr.aria-pressed]="expanded()" (click)="expanded.set(!expanded())">{{ expanded() ? ('builder.collapse' | t) : ('builder.expand' | t) }}</button>
              </div>
            </div>

            @if (view() === 'preview') {
              <div
                #stage
                class="relative flex min-h-0 flex-1 justify-center overflow-hidden rounded-xl"
                [class.items-center]="!device().model"
                [style.background]="device().model ? 'radial-gradient(ellipse at 50% 30%, #3a3f4b 0%, #1b1e25 60%, #111317 100%)' : 'rgb(0 0 0 / 0.3)'"
              >
                @if (!mobile() && device().model; as model) {
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
                @if (p.kind === 'app' && expoInfo(); as ei) {
                  <div class="absolute right-3 top-3 z-10 max-h-full">
                    <app-expo-qr [infoUrl]="ei" [qrUrl]="ei + '.svg'" [version]="p.version" [webUrl]="p.previewUrl" [dock]="true" />
                  </div>
                }
              </div>
              @if (!mobile()) { <p class="text-[11px] text-muted">{{ 'builder.phoneHint.' + p.kind | t }}</p> }
              @else if (!expanded()) { <button type="button" class="m-fab" (click)="mtabSet('code')" data-testid="m-fab-code">&lt;/&gt; {{ 'builder.tab.code' | t }}</button> }
            } @else if (mobile()) {
              <app-mobile-ide class="flex min-h-0 flex-1"
                [mode]="mtab() === 'files' ? 'files' : 'code'"
                [files]="filePaths()" [tabs]="openTabs()" [path]="selectedPath()" [draft]="draft()" [dirty]="dirty()"
                [generating]="generating()" [kind]="p.kind" [version]="p.version"
                (open)="openFile($event); mtabSet('code')" (closeTab)="closeTab($event)" (changed)="draft.set($event)"
                (save)="dirty() && !generating() && saveFile()" (remove)="deleteFile()" (create)="newPath = $event; newFile(); mtabSet('code')"
                (preview)="mtabSet('preview')" />
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
                    <app-code-editor
                      [value]="draft()"
                      [path]="selectedPath()"
                      [readOnly]="generating()"
                      (changed)="draft.set($event)"
                      (save)="dirty() && !generating() && saveFile()"
                    />
                  } @else {
                    <p class="text-sm text-muted">{{ 'builder.pickFile' | t }}</p>
                  }
                </div>
              </div>
            }
          </div>
        </div>
        @if (mobile()) {
          <nav class="m-tabs" role="tablist" [attr.aria-label]="'builder.m.nav' | t" data-testid="m-tabs">
            @for (t of mtabs; track t.id) {
              <button type="button" role="tab" [class.on]="mtab() === t.id" [attr.aria-selected]="mtab() === t.id" (click)="mtabSet(t.id)" [attr.data-testid]="'m-tab-' + t.id">
                <span class="ic" aria-hidden="true">{{ t.icon }}</span>{{ t.label | t }}
                @if (t.id === 'chat' && generating() && mtab() !== 'chat') { <span class="badge"></span> }
                @if (t.id === 'code' && dirty() && mtab() !== 'code') { <span class="badge" style="background:#e2c08d"></span> }
              </button>
            }
          </nav>
        }
      </section>

      <!-- API keys / GitHub: right drawer instead of inline panels that push the editor down -->
      @if (drawer(); as d) {
        <div class="drawer-backdrop" (click)="closeDrawer()" aria-hidden="true"></div>
        <aside class="drawer panel rounded-none" role="dialog" aria-modal="true" [attr.aria-label]="d === 'keys' ? ('builder.keys.manage' | t) : ('builder.git.button' | t)">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-inherit px-4 py-3" style="background: inherit">
            <h2 class="text-sm font-semibold">{{ d === 'keys' ? ('builder.keys.manage' | t) : ('builder.git.button' | t) }}</h2>
            <button type="button" class="icon-btn" (click)="closeDrawer()" [attr.aria-label]="'builder.close' | t">✕</button>
          </div>
          <div class="p-4">
            @if (d === 'keys') {
              <app-local-provider-card (changed)="onLocalChanged()" />
              <app-byok-keys (changed)="onKeys($event)" />
            } @else {
              <app-git-panel [project]="p" [generating]="generating()" (gitChange)="onGit($event)" />
            }
          </div>
        </aside>
      }
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
  private readonly _studioMessages = this.i18n.extend(STUDIO_MESSAGES);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  readonly canSellTemplate = computed(() => {
    const tpl = this.project()?.template;
    return ['seller', 'admin'].includes(this.auth.user()?.role || '') && (!tpl || !!tpl.own);
  });
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  private readonly chatScroll = viewChild<ElementRef<HTMLElement>>('chatScroll');

  readonly tabs = ['preview', 'code'] as const;
  readonly project = signal<BuilderProject | null>(null);
  /** Expo Go (Snack) info endpoint for app projects — same capability token as the web preview. */
  readonly expoInfo = computed(() => {
    const url = this.project()?.previewUrl || '';
    const m = url.match(/^(.*)\/preview\/([a-f0-9]{24})\/([A-Za-z0-9_-]{16,64})\/?$/);
    return m ? `${m[1]}/preview-expo/${m[2]}/${m[3]}` : '';
  });
  readonly providers = signal<ByokProvider[]>([]);
  readonly keys = signal<ByokKey[]>([]);
  private readonly local = inject(LocalProviderService);
  /** Server-stored BYOK keys plus the browser-only localhost endpoint (never sent to the server). */
  readonly activeKeys = computed<ByokKey[]>(() => {
    const list = this.keys().filter((k) => k.status === 'active');
    const c = this.local.config();
    if (!c) return list;
    return [
      { provider: LOCAL_ID, last4: '', baseUrl: c.baseUrl, model: c.model, status: 'active', lastVerifiedAt: null, lastUsedAt: null, updatedAt: c.updatedAt },
      ...list,
    ];
  });
  readonly provider = signal('');
  readonly model = signal('');
  readonly models = signal<string[]>([]);
  readonly defaultModel = computed(() =>
    this.provider() === LOCAL_ID ? this.local.config()?.model || '' : this.providers().find((p) => p.id === this.provider())?.defaultModel || '',
  );
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
    // Fill the available height (up to 1.6x) — the Expo panel floats in the corner instead of stealing rows.
    return Math.min(1.6, (width - 40) / w, (height - 32) / h);
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
  private runStartedAt = 0;
  readonly generating = signal(false);
  /** Another device of this user is generating in this project (sync feed). */
  readonly remoteGenerating = signal(false);
  private readonly sync = inject(SyncService);
  readonly pendingPrompt = signal('');
  readonly streamText = signal('');
  readonly streamModel = signal('');
  readonly streamFailed = signal(false);
  readonly failedPrompt = signal('');
  readonly chatAtBottom = signal(true);
  readonly streamPreview = computed(() => builderStreamView(this.streamText()));
  readonly writingFile = computed(() => this.streamPreview().activeFile);
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
  /** API keys / GitHub drawer (one at a time). */
  readonly drawer = signal<'keys' | 'git' | null>(null);
  readonly menuOpen = signal(false);
  /** < lg: which pane is visible. */
  readonly pane = signal<'chat' | 'preview'>('chat');
  /** < lg: full-screen mobile shell with bottom tabs (Chat · Code · Preview · Files). */
  readonly mobile = signal(false);
  readonly mtab = signal<'chat' | 'code' | 'preview' | 'files'>('chat');
  readonly mtabs = [
    { id: 'chat', icon: '✦', label: 'builder.m.tab.chat' },
    { id: 'code', icon: '</>', label: 'builder.tab.code' },
    { id: 'preview', icon: '▶', label: 'builder.tab.preview' },
    { id: 'files', icon: '🗂', label: 'builder.m.tab.files' },
  ] as const;
  /** Visual viewport height/top (px) and whether the soft keyboard is up. */
  readonly vvh = signal(0);
  readonly vvt = signal(0);
  readonly kb = signal(false);
  readonly openTabs = signal<string[]>([]);
  readonly filePaths = computed(() => (this.project()?.files || []).map((f) => f.path));
  /** Unsaved edits per open tab, so switching tabs doesn't lose work. */
  private readonly drafts = new Map<string, string>();
  readonly suggestions = computed(() => {
    const kind = this.project()?.kind === 'app' ? 'app' : 'web';
    return [1, 2, 3].map((i) => this.i18n.t(`builder.suggest.${kind}.${i}`));
  });

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
      if (this.browser) document.body.style.overflow = this.expanded() || this.mobile() ? 'hidden' : '';
    });
    // Keep the mobile bottom tab in sync when code elsewhere flips pane/view (e.g. after a build → preview).
    effect(() => {
      if (!this.mobile()) return;
      const pane = this.pane(), view = this.view();
      untracked(() => {
        const cur = this.mtab();
        const want = pane === 'chat' ? 'chat' : view === 'preview' ? 'preview' : cur === 'files' ? 'files' : 'code';
        if (cur !== want) this.mtab.set(want);
      });
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
    if (this.drawer()) return this.closeDrawer();
    if (this.menuOpen()) return this.menuOpen.set(false);
    this.expanded.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.menuOpen()) return;
    const t = e.target as HTMLElement | null;
    if (t && !t.closest('.menu') && !t.closest('[aria-haspopup="menu"]')) this.menuOpen.set(false);
  }

  openDrawer(d: 'keys' | 'git'): void {
    this.drawer.set(d);
    this.showKeys.set(d === 'keys');
    this.showGit.set(d === 'git');
  }

  closeDrawer(): void {
    this.drawer.set(null);
    this.showKeys.set(false);
    this.showGit.set(false);
  }

  ngOnInit(): void {
    if (!this.browser) return;
    this.initMobile();
    const id = this.route.snapshot.paramMap.get('id') || '';
    const q = this.route.snapshot.queryParamMap;
    if (q.get('git_connect') || q.get('git_error')) this.openDrawer('git');
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

    // Cross-device sync: another tab/phone changed this project -> refetch (server is the source of truth).
    const syncSub = this.sync.events.subscribe((e) => {
      const cur = this.project();
      if (!cur) return;
      if (e.type === 'project.generating' && e.data?.id === cur.id && !e.self) this.remoteGenerating.set(e.data.state === 'start');
      const changed = e.type === 'project.updated' && e.data?.id === cur.id && Number(e.data.version) !== cur.version;
      if ((changed || e.type === 'reset') && !this.generating()) {
        this.api.get(cur.id).subscribe({ next: (r) => this.project.set(r.project), error: () => {} });
        if (changed) this.remoteGenerating.set(false);
      }
    });
    this.destroyRef.onDestroy(() => syncSub.unsubscribe());

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
        // "Tải về" from the purchase notice: export the freshly created project once.
        if (q.get('export') === 'zip') setTimeout(() => this.exportZip());
      })
      .catch((e) => this.error.set(e?.error?.message || this.i18n.t('builder.err.notFound')));
  }

  ngAfterViewInit(): void {
    this.observeStage();
  }

  providerLabel(id: string): string {
    if (id === LOCAL_ID) return `Localhost · ${this.local.config()?.baseUrl.replace(/^https?:\/\//, '') || ''}`;
    return this.providers().find((p) => p.id === id)?.label || id;
  }

  onLocalChanged(): void {
    if (this.local.config()) {
      this.pickProvider(LOCAL_ID);
      return;
    }
    if (this.provider() === LOCAL_ID) {
      const first = this.activeKeys()[0]?.provider || '';
      if (first) this.pickProvider(first);
      else this.provider.set('');
    }
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
    this.runStartedAt = Date.now();
    this.pendingPrompt.set(prompt || this.i18n.t('builder.fixing'));
    this.streamText.set('');
    this.streamFailed.set(false);
    this.failedPrompt.set('');
    this.chatAtBottom.set(true);
    this.streamModel.set(this.model() || this.defaultModel());
    this.error.set('');
    this.previewError.set('');
    this.abort = new AbortController();
    this.scrollChat();
    try {
      if (this.provider() === LOCAL_ID) {
        await this.runLocal(p.id, prompt, previewError);
        return;
      }
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
      this.streamFailed.set(true);
      this.failedPrompt.set(this.pendingPrompt());
      if (e instanceof LocalProviderError) {
        const key = `builder.local.err.${e.code}`;
        const t = this.i18n.t(key);
        this.error.set(t !== key ? (e.code === 'LOCAL_HTTP' ? `${t} (${e.message})` : t) : e.message);
        if (prompt && !this.prompt) this.prompt = prompt;
        if (!prompt && previewError) this.previewError.set(previewError);
      } else if ((e as Error)?.name === 'AbortError') {
        this.error.set(this.i18n.t('builder.stopped'));
      } else if (e instanceof BuilderStreamError) {
        const key = `builder.err.${e.code}`;
        const text = this.i18n.t(key);
        this.error.set(text !== key && e.code !== 'PROVIDER_ERROR' ? text : e.message || text);
        if (!prompt && previewError) this.previewError.set(previewError);
        else if (prompt && !this.prompt) this.prompt = prompt;
      } else {
        this.error.set((e as { error?: { message?: string } })?.error?.message || this.i18n.t('builder.err.generic'));
        if (prompt && !this.prompt) this.prompt = prompt;
      }
    } finally {
      this.generating.set(false);
      this.pendingPrompt.set('');
      this.abort = null;
      this.scrollChat();
    }
  }

  /**
   * Localhost provider: the server builds the prompt, the BROWSER streams it to the user's local
   * OpenAI-compatible endpoint, and only the model's reply text goes back to be applied.
   */
  private async runLocal(id: string, prompt: string, previewError: string): Promise<void> {
    const body = { prompt, previewError: previewError || undefined };
    const { messages } = await firstValueFrom(this.api.localPrompt(id, body));
    const model = this.model().trim() || this.local.config()?.model || '';
    this.streamModel.set(model);
    const out = await this.local.chat(messages, {
      model,
      signal: this.abort?.signal,
      onDelta: (text) => {
        this.streamText.update((t) => t + text);
        this.scrollChat();
      },
    });
    const result = await firstValueFrom(this.api.localApply(id, { ...body, text: out.text, model: out.model, finishReason: out.finishReason, durationMs: Date.now() - this.runStartedAt }));
    this.applyProject(result.project);
    if (result.truncated) this.error.set(this.i18n.t('builder.err.truncated'));
    else if (result.rejected.length) this.error.set(this.i18n.t('builder.err.rejected', { files: result.rejected.join(', ') }));
    this.view.set('preview');
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
    this.stashDraft();
    this.selectedPath.set(path);
    this.draft.set(this.drafts.get(path) ?? f.content);
    this.drafts.delete(path);
    this.addTab(path);
    this.view.set('code');
    if (this.mobile() && this.mtab() !== 'code') this.mtabSet('code');
  }

  private stashDraft(): void {
    const cur = this.selectedPath();
    if (cur && this.dirty()) this.drafts.set(cur, this.draft());
  }

  private addTab(path: string): void {
    if (!this.openTabs().includes(path)) this.openTabs.set([...this.openTabs(), path].slice(-12));
  }

  closeTab(path: string): void {
    if (path === this.selectedPath() && this.dirty() && !confirm(this.i18n.t('builder.m.discard', { file: path }))) return;
    if (path !== this.selectedPath()) this.drafts.delete(path);
    const tabs = this.openTabs(), i = tabs.indexOf(path);
    const next = tabs.filter((t) => t !== path);
    this.openTabs.set(next);
    if (path === this.selectedPath()) {
      const n = next[Math.min(i, next.length - 1)];
      if (n) { this.selectedPath.set(''); this.openFile(n); } else { this.selectedPath.set(''); this.draft.set(''); }
    }
  }

  mtabSet(t: 'chat' | 'code' | 'preview' | 'files'): void {
    this.mtab.set(t);
    this.pane.set(t === 'chat' ? 'chat' : 'preview');
    this.view.set(t === 'preview' ? 'preview' : 'code');
    if (t === 'code' && !this.selectedPath()) {
      const files = this.project()?.files || [];
      const first = files.find((f) => /(^|\/)(App|index)\.(tsx|jsx|html)$/.test(f.path)) || files[0];
      if (first) this.openFile(first.path);
    }
  }

  private initMobile(): void {
    const mq = window.matchMedia('(max-width: 1023px)');
    const vv = window.visualViewport;
    const sync = () => {
      const h = vv ? vv.height : window.innerHeight;
      this.vvh.set(Math.round(h));
      this.vvt.set(Math.round(vv ? vv.offsetTop : 0));
      this.kb.set(window.innerHeight - h > 140);
    };
    const apply = () => {
      this.mobile.set(mq.matches);
      if (mq.matches) this.mtabSet(this.pane() === 'chat' ? 'chat' : this.view() === 'code' ? 'code' : 'preview');
      document.body.style.overflow = mq.matches || this.expanded() ? 'hidden' : '';
      sync();
    };
    apply();
    mq.addEventListener('change', apply);
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    this.destroyRef.onDestroy(() => { mq.removeEventListener('change', apply); vv?.removeEventListener('resize', sync); vv?.removeEventListener('scroll', sync); });
  }

  newFile(): void {
    const path = this.newPath.trim();
    if (!path) return;
    this.stashDraft();
    this.addTab(path);
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
        this.openTabs.set(this.openTabs().filter((t) => t !== path));
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
    if (provider === LOCAL_ID) {
      this.local
        .listModels()
        .then((list) => {
          if (this.provider() === LOCAL_ID) this.models.set(list);
        })
        .catch(() => undefined);
      return;
    }
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

  onChatScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.chatAtBottom.set(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
  }

  scrollChat(force = false): void {
    setTimeout(() => {
      const el = this.chatScroll()?.nativeElement;
      if (el && (force || this.chatAtBottom())) { el.scrollTop = el.scrollHeight; this.chatAtBottom.set(true); }
    });
  }
}
