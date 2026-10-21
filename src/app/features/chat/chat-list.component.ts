import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../services/api.services';
import { TPipe } from '../../i18n/t.pipe';
import { ChatConversation } from '../../models/marketplace.models';

/** Left pane of /messages: searchable conversation list with avatars, last message and unread badge. */
@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TPipe],
  template: `
    <div class="cl">
      <div class="cl__head">
        <h1>{{ 'chat.title' | t }}</h1>
        <label class="cl__search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 4a6 6 0 1 0 3.9 10.6l4.7 4.7 1.4-1.4-4.7-4.7A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/></svg>
          <input type="search" [value]="q()" (input)="q.set($any($event.target).value)" [placeholder]="'chat.search' | t" />
        </label>
      </div>
      @if (loading()) {
        <p class="cl__meta">{{ 'chat.loading' | t }}</p>
      } @else if (error()) {
        <p class="cl__meta cl__meta--err">{{ error() }}</p>
      } @else if (!filtered().length) {
        <p class="cl__meta">{{ (q() ? 'chat.noMatch' : 'chat.empty') | t }}</p>
      } @else {
        <ul class="cl__list">
          @for (c of filtered(); track c.id) {
            <li>
              <a class="cl__item" [class.cl__item--on]="c.id === activeId()" [class.cl__item--unread]="c.unread > 0" [routerLink]="link(c.id)">
                <span class="cl__avatar" [style.background]="color(c.otherName)">
                  {{ initials(c.otherName) }}
                  @if (c.productCover) { <img class="cl__thumb" [src]="c.productCover" alt="" /> }
                </span>
                <span class="cl__body">
                  <span class="cl__row">
                    <strong>{{ c.otherName || ('chat.product' | t) }}</strong>
                    <time>{{ when(c.lastMessageAt) }}</time>
                  </span>
                  <span class="cl__product">{{ c.productName || c.title }}</span>
                  <span class="cl__row">
                    <span class="cl__last">{{ c.lastKind === 'image' ? ('📷 ' + ('chat.image' | t)) : c.lastMessage }}</span>
                    @if (c.unread > 0) { <span class="cl__badge">{{ c.unread > 99 ? '99+' : c.unread }}</span> }
                  </span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ChatListComponent implements OnInit, OnDestroy {
  private readonly api = inject(ChatService);
  private readonly router = inject(Router);
  private readonly date = new DatePipe('en-US');
  private poll?: ReturnType<typeof setInterval>;

  readonly activeId = input('');
  readonly items = signal<ChatConversation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly q = signal('');
  readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const rows = [...this.items()].sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')));
    return q ? rows.filter((c) => `${c.otherName} ${c.productName} ${c.title || ''} ${c.lastMessage}`.toLowerCase().includes(q)) : rows;
  });

  ngOnInit(): void {
    this.load();
    this.poll = setInterval(() => this.load(), 15000);
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
  }

  private load(): void {
    this.api.conversations().subscribe({
      next: (list) => {
        // The open thread is being read: don't show it as unread.
        this.items.set(list.map((c) => (c.id === this.activeId() ? { ...c, unread: 0 } : c)));
        this.loading.set(false);
      },
      error: (err) => {
        if (this.loading()) this.error.set(err?.error?.message || 'Error');
        this.loading.set(false);
      },
    });
  }

  link(id: string): string[] {
    return this.router.url.startsWith('/sell') ? ['/sell/messages', id] : ['/messages', id];
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

  when(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return this.date.transform(d, sameDay ? 'HH:mm' : now.getFullYear() === d.getFullYear() ? 'dd/MM' : 'dd/MM/yy') || '';
  }
}
