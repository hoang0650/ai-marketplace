import { Component, PLATFORM_ID, ViewEncapsulation, computed, effect, inject, input, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../i18n/i18n.service';
import { responseBlocks, responseHtml } from './ai-response-markdown';

const MESSAGES = {
  vi: { 'ai.reply': 'AI Markets', 'ai.thinking': 'Đang suy nghĩ', 'ai.waiting': 'Đang chờ phản hồi từ model…', 'ai.thought': 'Thinking', 'ai.worked': 'Đã xử lý', 'ai.files': 'tệp đã cập nhật', 'ai.drafting': 'Đang soạn tệp', 'ai.copy': 'Sao chép', 'ai.copied': 'Đã sao chép', 'ai.seconds': 'giây', 'ai.copyFailed': 'Không sao chép được. Bạn có thể chọn nội dung để sao chép.' },
  en: { 'ai.reply': 'AI Markets', 'ai.thinking': 'Thinking', 'ai.waiting': 'Waiting for the model’s response…', 'ai.thought': 'Thinking', 'ai.worked': 'Worked for', 'ai.files': 'files updated', 'ai.drafting': 'Drafting files', 'ai.copy': 'Copy', 'ai.copied': 'Copied', 'ai.seconds': 's', 'ai.copyFailed': 'Could not copy. Select the response to copy it.' },
  zh: { 'ai.reply': 'AI Markets', 'ai.thinking': '正在思考', 'ai.waiting': '正在等待模型回复…', 'ai.thought': '思考', 'ai.worked': '处理耗时', 'ai.files': '个文件已更新', 'ai.drafting': '正在编写文件', 'ai.copy': '复制', 'ai.copied': '已复制', 'ai.seconds': '秒', 'ai.copyFailed': '无法复制，请选择内容后复制。' },
};
const NAV_MESSAGES = {
  vi: { 'ai.jump': 'Tin mới', 'ai.interrupted': 'Phản hồi chưa hoàn tất' },
  en: { 'ai.jump': 'Latest messages', 'ai.interrupted': 'Response interrupted' },
  zh: { 'ai.jump': '最新消息', 'ai.interrupted': '回复已中断' },
};

@Component({
  selector: 'app-ai-response', standalone: true, encapsulation: ViewEncapsulation.None,
  host: { class: 'ai-response-host' },
  template: `
    <article class="ai-response" [attr.aria-busy]="busy()">
      <header class="ai-response__head"><span class="ai-response__mark" aria-hidden="true">✦</span><span>{{ t('ai.reply') }}</span>@if (model()) { <span class="ai-response__model">{{ model() }}</span> }</header>
      @if (busy() || reasoning()) {
        <details class="ai-response__thinking" [open]="busy() && !!reasoning()">
          <summary><span [class.ai-response__pulse]="busy()" aria-hidden="true">{{ busy() ? '◌' : '✓' }}</span> {{ busy() ? (status() || t('ai.thinking')) : reasoning() ? t('ai.thought') : t('ai.worked') }}@if (seconds() > 0) { <span class="ai-response__time">· {{ seconds() }} {{ t('ai.seconds') }}</span> }<span class="ai-response__chevron" aria-hidden="true">⌄</span></summary>
          @if (reasoning()) { <div class="ai-response__reasoning ai-response__markdown" [innerHTML]="reasoningHtml()"></div> } @else if (busy()) { <p class="ai-response__hint">{{ t('ai.waiting') }}</p> }
        </details>
      } @else if (durationMs() > 0) {
        <div class="ai-response__thinking">✓ {{ t('ai.worked') }} · {{ seconds() }} {{ t('ai.seconds') }}</div>
      }
      <div class="ai-response__markdown">
        @for (block of blocks(); track $index) {
          @if (block.kind === 'code') {
            <div class="ai-response__code"><div class="ai-response__code-head"><span>{{ block.language || 'code' }}</span><button type="button" (click)="copy(block.text, 'code-' + $index)">{{ copied() === 'code-' + $index ? t('ai.copied') : t('ai.copy') }}</button></div><pre><code>{{ block.text }}</code></pre></div>
          } @else { <div [innerHTML]="block.html"></div> }
        }
      </div>
      @if (files().length) {
        <details class="ai-response__files"><summary>{{ busy() ? t('ai.drafting') : files().length + ' ' + t('ai.files') }}</summary><div>@for (file of files(); track file) { <button type="button" [disabled]="busy()" (click)="fileSelected.emit(file)"><span aria-hidden="true">▤</span> {{ file }}</button> }</div></details>
      }
      @if (text().trim() && !busy()) { <footer class="ai-response__actions"><button type="button" (click)="copy(text(), 'answer')" [attr.aria-label]="t('ai.copy')"><span aria-hidden="true">▢</span> {{ copied() === 'answer' ? t('ai.copied') : t('ai.copy') }}</button></footer> }
      @if (copyError()) { <p class="ai-response__hint" role="status">{{ t('ai.copyFailed') }}</p> }
    </article>
  `,
  styleUrl: './ai-response.component.scss',
})
export class AiResponseComponent {
  private readonly i18n = inject(I18nService);
  private readonly messages = this.i18n.extend(MESSAGES);
  private readonly navMessages = this.i18n.extend(NAV_MESSAGES);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly text = input(''); readonly reasoning = input(''); readonly busy = input(false);
  readonly status = input(''); readonly model = input(''); readonly durationMs = input(0);
  readonly files = input<readonly string[]>([]); readonly fileSelected = output<string>();
  readonly copied = signal(''); readonly copyError = signal(false); private readonly elapsed = signal(0);
  readonly seconds = computed(() => this.busy() ? this.elapsed() : Math.round(this.durationMs() / 1000));
  readonly blocks = computed(() => responseBlocks(this.text()));
  readonly reasoningHtml = computed(() => responseHtml(this.reasoning()));
  constructor() {
    effect(cleanup => {
      if (!this.browser || !this.busy()) return;
      const start = Date.now(); this.elapsed.set(0);
      const timer = setInterval(() => this.elapsed.set(Math.floor((Date.now() - start) / 1000)), 1000);
      cleanup(() => clearInterval(timer));
    });
  }
  t(key: string): string { return this.i18n.t(key); }
  async copy(text: string, key: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.copyError.set(false); this.copied.set(key); setTimeout(() => this.copied.set(''), 1800); }
    catch { this.copyError.set(true); }
  }
}
