import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ChatConversation, ChatMessage } from '../../models/marketplace.models';
import { containsBlockedLink } from '../../utils/chat-security';
import { ChatListComponent } from './chat-list.component';
import { ATTACH_ACCEPT, AttachmentService, AttachmentsComponent, FileAttachment, attachmentProblem, fileSize } from '../../shared/attachments/attachments';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, TPipe, ChatListComponent, AttachmentsComponent],
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat.scss',
})
export class ChatThreadComponent implements OnInit, OnDestroy {
  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;

  private readonly api = inject(ChatService);
  private readonly attach = inject(AttachmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private poll?: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);
  readonly id = signal('');
  private stickToBottom = true;

  readonly convo = signal<ChatConversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  draft = '';
  readonly accept = ATTACH_ACCEPT;
  readonly pending = signal<FileAttachment[]>([]);
  readonly uploading = signal(0);
  readonly size = fileSize;

  /** Messages with day separators and sender groups (same sender within 5 minutes). */
  readonly rows = computed(() => {
    const list = this.messages();
    const me = String(this.auth.user()?.id || '');
    const out: { m: ChatMessage; mine: boolean; sep: string; first: boolean; last: boolean }[] = [];
    list.forEach((m, i) => {
      const prev = list[i - 1];
      const next = list[i + 1];
      const t = new Date(m.createdAt).getTime();
      const day = new Date(m.createdAt).toDateString();
      const sep = !prev || new Date(prev.createdAt).toDateString() !== day ? this.dayLabel(m.createdAt) : '';
      const same = (a?: ChatMessage) => !!a && String(a.senderId) === String(m.senderId) && Math.abs(new Date(a.createdAt).getTime() - t) < 300000 && new Date(a.createdAt).toDateString() === day;
      out.push({ m, mine: String(m.senderId) === me, sep, first: !same(prev), last: !same(next) });
    });
    return out;
  });

  dayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) return this.i18n.t('chat.today');
    if (d.toDateString() === y.toDateString()) return this.i18n.t('chat.yesterday');
    return new DatePipe('en-US').transform(d, 'dd/MM/yyyy') || '';
  }

  initials(name: string): string {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  color(name: string): string {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h} 45% 42%)`;
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('chat.title') });
    // Same component is reused when switching conversations in the left pane.
    const sub = this.route.paramMap.subscribe((pm) => {
      this.id.set(String(pm.get('id') || ''));
      this.convo.set(null);
      this.messages.set([]);
      this.error.set('');
      this.draft = '';
      this.refresh(true);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
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
    return (!!this.draft.trim() || this.pending().length > 0) && !this.uploading();
  }

  removePending(id: string): void {
    this.pending.update((l) => l.filter((a) => a.id !== id));
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
    const files = this.pending();
    if ((!text && !files.length) || this.busy() || this.uploading() || !this.id()) return;
    if (containsBlockedLink(text)) {
      this.error.set(this.i18n.t('chat.noLinks'));
      return;
    }
    this.busy.set(true);
    this.api.send(this.id(), { body: text || undefined, ...(files.length ? { attachmentIds: files.map((a) => a.id) } : {}) }).subscribe({
      next: (msg) => {
        this.draft = '';
        this.pending.set([]);
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
    const picked = Array.from(input.files || []);
    input.value = '';
    if (!picked.length || !this.id()) return;
    for (const file of picked.slice(0, 10 - this.pending().length)) {
      const bad = attachmentProblem(file);
      if (bad) {
        this.error.set(`${file.name}: ${this.i18n.t(bad)}`);
        continue;
      }
      this.uploading.update((n) => n + 1);
      this.attach.upload(file, 'chat', this.id()).subscribe({
        next: (a) => {
          this.pending.update((l) => [...l, a]);
          this.uploading.update((n) => n - 1);
        },
        error: (err) => {
          this.error.set(`${file.name}: ${this.mapErr(err, 'chat.err.upload')}`);
          this.uploading.update((n) => n - 1);
        },
      });
    }
  }

  private refresh(first: boolean): void {
    if (!this.id()) return;
    if (first) {
      this.api.conversation(this.id()).subscribe({
        next: (c) => this.convo.set(c),
        error: (err) => this.error.set(this.mapErr(err, 'chat.err.load')),
      });
    }
    this.api.messages(this.id()).subscribe({
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
