import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { NotificationItem } from '../../models/marketplace.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page route-enter max-w-3xl">
      <div class="flex items-center justify-between gap-4">
        <h1 class="section-title">Notifications</h1>
        <button type="button" class="btn btn-outline" (click)="readAll()">Mark all read</button>
      </div>
      <ul class="mt-8 space-y-3">
        @for (n of items(); track n.id) {
          <li class="panel" [class.opacity-60]="n.read">
            <a [routerLink]="n.href || '/'" class="no-underline">
              <p class="font-semibold">{{ n.title }}</p>
              <p class="text-sm text-muted">{{ n.body }}</p>
              <p class="mt-2 text-xs text-muted">{{ n.createdAt | date: 'medium' }}</p>
            </a>
          </li>
        }
      </ul>
    </section>
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly seo = inject(SeoService);
  readonly items = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    this.seo.set({ title: 'Notifications' });
    this.api.notifications().subscribe((items) => this.items.set(items));
  }

  readAll(): void {
    this.api.readAllNotifications().subscribe((items) => this.items.set(items));
  }
}
