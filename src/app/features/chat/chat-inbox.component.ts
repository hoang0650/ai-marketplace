import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { ChatListComponent } from './chat-list.component';

@Component({
  selector: 'app-chat-inbox',
  standalone: true,
  imports: [TPipe, ChatListComponent],
  templateUrl: './chat-inbox.component.html',
  styleUrl: './chat.scss',
})
export class ChatInboxComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('chat.title') });
  }
}
