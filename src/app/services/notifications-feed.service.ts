import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DashboardService } from './api.services';
import { NotificationItem } from '../models/marketplace.models';

const POLL_MS = 60_000;

/** Bell feed shared by the header and any page that just caused a notification (purchase, refund…). */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  private readonly api = inject(DashboardService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private timer: ReturnType<typeof setInterval> | undefined;
  readonly items = signal<NotificationItem[]>([]);
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  refresh(): void {
    this.api.notifications().subscribe({
      next: (items) => this.items.set(items),
      error: () => undefined,
    });
  }

  /** Server writes the notification right after the response; fetch now and once more shortly after. */
  refreshSoon(): void {
    this.refresh();
    if (this.browser) setTimeout(() => this.refresh(), 2500);
  }

  start(): void {
    this.refresh();
    if (!this.browser || this.timer) return;
    this.timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') this.refresh();
    }, POLL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.items.set([]);
  }

  set(items: NotificationItem[]): void {
    this.items.set(items);
  }
}
