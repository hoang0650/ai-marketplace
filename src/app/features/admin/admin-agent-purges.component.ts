import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AgentPurgeService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AgentPurgeItem, AgentPurgeRuntime, AgentPurgeTab } from '../../models/marketplace.models';
import { AGENT_PURGE_MESSAGES } from './admin-agent-purges.messages';
import { BackButtonComponent } from '../../shared/components/back-button.component';

@Component({
  selector: 'app-admin-agent-purges',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TPipe, BackButtonComponent],
  templateUrl: './admin-agent-purges.component.html',
  styleUrl: './admin-agent-purges.component.scss',
})
export class AdminAgentPurgesComponent implements OnInit {
  private readonly api = inject(AgentPurgeService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly tabs: AgentPurgeTab[] = ['manual', 'failed', 'upcoming', 'done'];

  readonly tab = signal<AgentPurgeTab>('manual');
  readonly items = signal<AgentPurgeItem[]>([]);
  readonly counts = signal<Record<AgentPurgeTab, number>>({ manual: 0, failed: 0, upcoming: 0, done: 0 });
  readonly runtimes = signal<AgentPurgeRuntime[]>([]);
  readonly selectedId = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly msg = signal('');
  readonly copied = signal('');
  readonly selected = computed(() => this.items().find((i) => i.id === this.selectedId()) || null);

  q = '';
  note = '';

  constructor() {
    this.i18n.extend(AGENT_PURGE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('admin.agentPurge.title') });
    this.reload();
  }

  setTab(tab: AgentPurgeTab): void {
    this.tab.set(tab);
    this.msg.set('');
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.queue(this.tab(), this.q.trim()).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.counts.set(res.counts);
        this.runtimes.set(res.runtimes || []);
        this.loading.set(false);
        const keep = res.items.some((i) => i.id === this.selectedId());
        this.select(keep ? this.selectedId() : res.items[0]?.id || '');
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('admin.agentPurge.err'));
        this.loading.set(false);
      },
    });
  }

  select(id: string): void {
    if (id !== this.selectedId()) this.note = '';
    this.selectedId.set(id);
    this.copied.set('');
  }

  /** Manual / failed rows are past retention and can be acted on. */
  actionable(item: AgentPurgeItem): boolean {
    return !item.purgedAt && (item.purgeStatus === 'manual_required' || item.purgeStatus === 'failed');
  }

  retry(item: AgentPurgeItem): void {
    if (this.busy() || !confirm(this.i18n.t('admin.agentPurge.confirmRetry', { label: item.label }))) return;
    this.run(this.api.retry(item.id), (status) =>
      this.i18n.t(status === 'done' ? 'admin.agentPurge.retryDone' : 'admin.agentPurge.retryFailed'),
    );
  }

  markDone(item: AgentPurgeItem): void {
    if (this.note.trim().length < 5) {
      this.error.set(this.i18n.t('admin.agentPurge.noteRequired'));
      return;
    }
    if (this.busy() || !confirm(this.i18n.t('admin.agentPurge.confirmDone', { label: item.label, email: item.user.email || item.user.id }))) return;
    this.run(this.api.markDone(item.id, this.note.trim()), () => this.i18n.t('admin.agentPurge.marked'));
  }

  private run<T extends { status: string }>(req: Observable<T>, message: (status: string) => string): void {
    this.busy.set(true);
    this.error.set('');
    this.msg.set('');
    req.subscribe({
      next: (res) => {
        this.msg.set(message(res.status));
        this.busy.set(false);
        this.note = '';
        this.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.i18n.t('admin.agentPurge.err'));
        this.busy.set(false);
      },
    });
  }

  copy(text: string): void {
    void navigator.clipboard?.writeText(text).then(() => this.copied.set(text));
  }

  statusKey(item: AgentPurgeItem): string {
    if (item.purgedAt) return 'admin.agentPurge.status.done';
    if (item.purgeStatus === 'manual_required') return 'admin.agentPurge.status.manual';
    if (item.purgeStatus === 'failed') return 'admin.agentPurge.status.failed';
    return 'admin.agentPurge.status.upcoming';
  }

  statusAttr(item: AgentPurgeItem): string {
    return item.purgedAt ? 'done' : item.purgeStatus || 'upcoming';
  }
}
