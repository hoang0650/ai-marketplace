import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService, UploadService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ChatConversation, ChatMessage } from '../../models/marketplace.models';
import { containsBlockedLink } from '../../utils/chat-security';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, TPipe],
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat.scss',
})
export class ChatThreadComponent implements OnInit, OnDestroy {
  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;

  private readonly api = inject(ChatService);
  private readonly uploads = inject(UploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private poll?: ReturnType<typeof setInterval>;
  private id = '';
  private stickToBottom = true;

  readonly convo = signal<ChatConversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  draft = '';

  ngOnInit(): void {
    this.id = String(this.route.snapshot.paramMap.get('id') || '');
    this.seo.set({ title: this.i18n.t('chat.title') });
    this.refresh(true);
    this.poll = setInterval(() => this.refresh(false), 8000);
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
  }

  backLink(): string {
    return this.router.url.startsWith('/sell') ? '/sell/messages' : '/messages';
  }

  isMine(m: ChatMessage): boolean {
    return String(m.senderId) === String(this.auth.user()?.id || '');
  }

  canSend(): boolean {
    return !!this.draft.trim();
  }

  onEnter(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (e.shiftKey) return;
    e.preventDefault();
    this.send(ev);
  }

  send(ev?: Event): void {
    ev?.preventDefault();
    const text = this.draft.trim();
    if (!text || this.busy() || !this.id) return;
    if (containsBlockedLink(text)) {
      this.error.set(this.i18n.t('chat.noLinks'));
      return;
    }
    this.busy.set(true);
    this.api.send(this.id, { body: text }).subscribe({
      next: (msg) => {
        this.draft = '';
        this.error.set('');
        this.messages.update((rows) => [...rows, msg]);
        this.busy.set(false);
        this.stickToBottom = true;
        this.scrollDown();
      },
      error: (err) => {
        this.error.set(this.mapErr(err));
        this.busy.set(false);
      },
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy() || !this.id) return;
    this.busy.set(true);
    this.uploads.uploadImage(file).subscribe({
      next: (up) => {
        this.api.send(this.id, { imageUrl: up.url, body: this.draft.trim() || undefined }).subscribe({
          next: (msg) => {
            this.draft = '';
            this.error.set('');
            this.messages.update((rows) => [...rows, msg]);
            this.busy.set(false);
            this.stickToBottom = true;
            this.scrollDown();
          },
          error: (err) => {
            this.error.set(this.mapErr(err));
            this.busy.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('chat.err.upload'));
        this.busy.set(false);
      },
    });
  }

  private refresh(first: boolean): void {
    if (!this.id) return;
    if (first) {
      this.api.conversation(this.id).subscribe({
        next: (c) => this.convo.set(c),
        error: (err) => this.error.set(this.mapErr(err, 'chat.err.load')),
      });
    }
    this.api.messages(this.id).subscribe({
      next: (rows) => {
        const el = this.scroller?.nativeElement;
        if (el) {
          this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }
        this.messages.set(rows);
        if (first || this.stickToBottom) this.scrollDown();
      },
      error: (err) => {
        if (first) this.error.set(this.mapErr(err, 'chat.err.load'));
      },
    });
  }

  private scrollDown(): void {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private mapErr(err: { error?: { message?: string; code?: string } }, fallback = 'chat.err.send'): string {
    const code = err?.error?.code;
    if (code === 'LINKS_NOT_ALLOWED') return this.i18n.t('chat.noLinks');
    if (code === 'IMAGE_HOST_NOT_ALLOWED') return this.i18n.t('chat.imageOnlyHost');
    if (code === 'CHAT_SELF') return this.i18n.t('chat.self');
    return err?.error?.message || this.i18n.t(fallback);
  }
}
