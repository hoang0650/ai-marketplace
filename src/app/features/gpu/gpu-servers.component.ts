import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DashboardService, GpuGatewayService, GpuServer } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { UsageStat } from '../../models/marketplace.models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gpu-servers',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div class="panel">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-2xl">GPU & live streams</h2>
            <p class="mt-1 text-sm text-muted">
              GPU is a marketplace resource. Provider is selected from the registry (RunPod is one adapter). Terminal and play stay on this origin.
            </p>
          </div>
        </div>
        <form class="mt-5 grid gap-3 sm:grid-cols-4" (ngSubmit)="create()">
          <input class="input" name="name" [(ngModel)]="name" placeholder="Server name" required />
          <select class="input" name="provider" [(ngModel)]="provider">
            @for (p of computeProviders(); track p.provider) {
              <option [value]="p.provider">{{ p.label }}</option>
            }
          </select>
          <select class="input" name="kind" [(ngModel)]="kind">
            <option value="game">Game stream</option>
            <option value="compute">Compute / terminal</option>
          </select>
          <button class="btn btn-fill text-sm" type="submit" [disabled]="busy()">Launch</button>
        </form>
        @if (error()) {
          <p class="mt-3 text-sm text-red-400">{{ error() }}</p>
        }
        <ul class="mt-6 space-y-3">
          @for (s of servers(); track s.id) {
            <li class="rounded-xl border border-line p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="font-semibold">{{ s.name }}</p>
                  <p class="text-xs text-muted">{{ s.gpu || s.provider }} · {{ s.kind }} · {{ s.status }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <a class="btn btn-outline text-xs" [routerLink]="['/dashboard/projects', projectId, 'terminal']" [queryParams]="{ serverId: s.id }">Terminal</a>
                  @if (s.kind === 'game') {
                    <a class="btn btn-fill text-xs" [routerLink]="['/dashboard/servers', s.id, 'play']">Play live</a>
                  }
                  <button class="btn btn-outline text-xs" type="button" (click)="start(s)">Start</button>
                  <button class="btn btn-outline text-xs" type="button" (click)="stop(s)">Stop</button>
                  <button class="btn btn-outline text-xs" type="button" (click)="remove(s)">Delete</button>
                </div>
              </div>
            </li>
          } @empty {
            <li class="text-sm text-muted">No GPU servers yet. Launch a game stream lab to preview the live player.</li>
          }
        </ul>
      </div>
      <div class="panel">
        <h2 class="font-display text-2xl">GPU hours</h2>
        <p class="mt-2 text-muted">Last 7 days: {{ total() | number:'1.1-1' }} h</p>
        <ul class="mt-6 space-y-2">
          @for (u of usage(); track u.date) {
            <li class="flex justify-between border-b border-line py-2 text-sm">
              <span>{{ u.date }}</span><span class="font-mono">{{ u.gpuHours | number:'1.1-1' }} h</span>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class GpuServersComponent implements OnInit {
  private readonly gpu = inject(GpuGatewayService);
  private readonly dash = inject(DashboardService);
  private readonly seo = inject(SeoService);
  private readonly http = inject(HttpClient);
  readonly projectId = 'default';
  readonly servers = signal<GpuServer[]>([]);
  readonly usage = signal<UsageStat[]>([]);
  readonly computeProviders = signal<Array<{ provider: string; label: string }>>([{ provider: 'runpod', label: 'RunPod' }]);
  readonly total = signal(0);
  readonly busy = signal(false);
  readonly error = signal('');
  name = 'GPU Game Lab';
  kind: 'game' | 'compute' = 'game';
  provider = 'runpod';

  ngOnInit(): void {
    this.seo.set({ title: 'GPU servers' });
    this.refresh();
    this.http
      .get<{ providers: Array<{ provider: string; label: string; compute?: boolean; capabilities?: string[]; status?: string }> }>(
        `${environment.apiUrl}/providers`,
        { params: { capability: 'GPU_COMPUTE' } },
      )
      .subscribe({
        next: (r) => {
          const rows = (r.providers || []).filter(
            (p) => (p.compute || p.capabilities?.includes('GPU_COMPUTE')) && p.status !== 'planned',
          );
          if (rows.length) this.computeProviders.set(rows);
        },
        error: () => undefined,
      });
    this.dash.usage().subscribe((u) => {
      this.usage.set(u);
      this.total.set(u.reduce((s, x) => s + x.gpuHours, 0));
    });
  }

  refresh(): void {
    this.gpu.listServers(this.projectId).subscribe({
      next: (rows) => this.servers.set(rows),
      error: (e) => this.error.set(e?.error?.message || 'Could not load servers'),
    });
  }

  create(): void {
    this.busy.set(true);
    this.error.set('');
    this.gpu.createServer({ name: this.name, kind: this.kind, projectId: this.projectId, provider: this.provider }).subscribe({
      next: () => {
        this.busy.set(false);
        this.refresh();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.message || 'Launch failed');
      },
    });
  }

  start(s: GpuServer): void {
    this.gpu.startServer(s.id).subscribe({ next: () => this.refresh() });
  }

  stop(s: GpuServer): void {
    this.gpu.stopServer(s.id).subscribe({ next: () => this.refresh() });
  }

  remove(s: GpuServer): void {
    this.gpu.deleteServer(s.id).subscribe({ next: () => this.refresh() });
  }
}
