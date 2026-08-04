import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { NotificationItem } from '../../models/marketplace.models';

type NotiFilter = 'all' | 'unread';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);

  readonly items = signal<NotificationItem[]>([]);
  readonly filter = signal<NotiFilter>('all');
  readonly loading = signal(false);

  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);
  readonly visible = computed(() => {
    const list = this.items();
    return this.filter() === 'unread' ? list.filter((n) => !n.read) : list;
  });

  ngOnInit(): void {
    this.seo.set({ title: 'Thông báo' });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.notifications().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: NotiFilter): void {
    this.filter.set(f);
  }

  readAll(): void {
    this.api.readAllNotifications().subscribe((items) => this.items.set(items));
  }
}
