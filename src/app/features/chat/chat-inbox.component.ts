import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ChatConversation } from '../../models/marketplace.models';

@Component({
  selector: 'app-chat-inbox',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './chat-inbox.component.html',
  styleUrl: './chat.scss',
})
export class ChatInboxComponent implements OnInit {
  private readonly api = inject(ChatService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly items = signal<ChatConversation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('chat.title') });
    this.api.conversations().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('chat.err.load'));
        this.loading.set(false);
      },
    });
  }

  threadLink(id: string): string[] {
    return this.router.url.startsWith('/sell') ? ['/sell/messages', id] : ['/messages', id];
  }
}
