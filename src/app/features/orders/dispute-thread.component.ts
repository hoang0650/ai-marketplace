import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { DisputeMessage } from '../../models/marketplace.models';
import { ADMIN_DISPUTE_MESSAGES } from '../admin/admin-disputes.messages';

/** Shared dispute conversation. Admin messages are always labelled AI Markets (Admin). */
@Component({
  selector: 'app-dispute-thread',
  standalone: true,
  imports: [DatePipe, FormsModule, TPipe],
  templateUrl: './dispute-thread.component.html',
  styleUrl: './dispute-thread.component.scss',
})
export class DisputeThreadComponent {
  private readonly i18n = inject(I18nService);

  readonly messages = input<DisputeMessage[]>([]);
  readonly canReply = input(false);
  readonly busy = input(false);
  readonly hint = input<'admin' | 'party'>('party');
  readonly closedNote = input(false);
  readonly error = input('');
  readonly viewerId = input('');
  readonly send = output<string>();

  draft = '';

  constructor() {
    this.i18n.extend(ADMIN_DISPUTE_MESSAGES);
  }

  label(m: DisputeMessage): string {
    if (m.role === 'admin') return this.i18n.t('dispute.thread.admin');
    const named = (m.authorName || '').trim();
    if (named) return named;
    const key = `dispute.thread.role.${m.role}`;
    const text = this.i18n.t(key);
    return text === key ? m.role : text;
  }

  submit(): void {
    const body = this.draft.trim();
    if (!body || this.busy()) return;
    this.send.emit(body);
  }

  clear(): void {
    this.draft = '';
  }
}
