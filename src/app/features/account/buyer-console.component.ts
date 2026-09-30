import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../services/seo.service';
import { ProductService } from '../../services/api.services';
import { Product } from '../../models/marketplace.models';

@Component({
  selector: 'app-buyer-console',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page route-enter">
      <h1 class="font-display text-3xl">Buyer console</h1>
      <p class="mt-2 text-muted">API keys, agent templates, and training jobs. Keys are hashed on the server; plaintext is shown once.</p>
      <nav class="mt-6 flex flex-wrap gap-2">
        <a class="btn btn-outline text-xs" routerLink="/wallet">Wallet</a>
        <a class="btn btn-outline text-xs" routerLink="/dashboard/gpu">GPU & streams</a>
      </nav>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <div class="panel">
          <h2 class="font-display text-xl">Marketplace API keys</h2>
          <form class="mt-4 grid gap-3" (ngSubmit)="createKey()">
            <select class="input" name="slug" [(ngModel)]="productSlug" required>
              <option value="">Select product</option>
              @for (p of products(); track p.id) {
                <option [value]="p.slug">{{ p.name }}</option>
              }
            </select>
            <button class="btn btn-fill text-sm" type="submit" [disabled]="busy()">Create mk_live_ key</button>
          </form>
          @if (freshKey()) {
            <p class="mt-3 break-all rounded-lg bg-black/40 p-3 font-mono text-xs">{{ freshKey() }}</p>
          }
          <ul class="mt-4 space-y-2 text-sm">
            @for (k of keys(); track k.id) {
              <li class="flex justify-between gap-2 border-b border-line py-2">
                <span>{{ k.prefix }}… · {{ k.productSlug }}</span>
                <button class="text-xs text-red-400" type="button" (click)="revoke(k.id)">Revoke</button>
              </li>
            }
          </ul>
        </div>

        <div class="panel">
          <h2 class="font-display text-xl">Agent templates</h2>
          <p class="mt-1 text-xs text-muted">OpenClaw / Hermes / SpaceBot are templates — runtime is generic Docker/GPU.</p>
          <ul class="mt-4 space-y-2 text-sm">
            @for (a of agents(); track a.slug) {
              <li class="rounded-lg border border-line p-3">
                <p class="font-semibold">{{ a.name }}</p>
                <p class="text-xs text-muted">{{ a.dockerImage }} · GPU {{ a.requiredGPU || 'optional' }}</p>
              </li>
            }
          </ul>
          <h2 class="mt-8 font-display text-xl">Training jobs</h2>
          <p class="mt-1 text-xs text-muted">Each job runs on a prepaid GPU workspace billed per minute from your wallet (at least 1 hour of balance required to start).</p>
          <form class="mt-3 grid gap-2" (ngSubmit)="startTrain()">
            <input class="input" name="modelId" [(ngModel)]="modelId" placeholder="Base model id" />
            <input class="input" name="datasetId" [(ngModel)]="datasetId" placeholder="Dataset id" />
            <button class="btn btn-outline text-sm" type="submit" [disabled]="training()">Queue training</button>
          </form>
          @if (trainError()) {
            <p class="mt-2 text-xs text-red-400">{{ trainError() }}</p>
          }
          <ul class="mt-3 space-y-2 text-xs">
            @for (j of jobs(); track j.jobId) {
              <li class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                <span>
                  {{ j.jobId }} · {{ j.gpuType }} · {{ j.status }}
                  @if (j.pricePerHour != null) { · \${{ j.pricePerHour }}/h }
                  · spent \${{ j.cost || 0 }}
                </span>
                <span class="flex gap-2">
                  @if (j.rentalId && (j.status === 'running' || j.status === 'queued' || j.status === 'paused')) {
                    <a class="text-accent" routerLink="/gpu">Open workspace</a>
                    <button class="text-red-400" type="button" (click)="cancelTrain(j.jobId)">Cancel</button>
                  }
                </span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class BuyerConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  readonly products = signal<Product[]>([]);
  readonly keys = signal<Array<{ id: string; prefix: string; productSlug: string }>>([]);
  readonly agents = signal<Array<{ slug: string; name: string; dockerImage: string; requiredGPU: string }>>([]);
  readonly jobs = signal<
    Array<{
      jobId: string;
      gpuType: string;
      status: string;
      progress: number;
      cost: number;
      pricePerHour: number | null;
      rentalId: string | null;
    }>
  >([]);
  readonly training = signal(false);
  readonly trainError = signal('');
  readonly freshKey = signal('');
  readonly busy = signal(false);
  productSlug = '';
  modelId = '';
  datasetId = '';

  ngOnInit(): void {
    this.seo.set({ title: 'Buyer console' });
    this.productsApi.list().subscribe((p) => this.products.set(p));
    this.reloadKeys();
    this.http.get<any[]>(`${environment.apiUrl}/agent-templates`).subscribe({
      next: (rows) => this.agents.set(rows || []),
      error: () => this.agents.set([]),
    });
    this.http.get<any[]>(`${environment.apiUrl}/training-jobs`).subscribe({
      next: (rows) => this.jobs.set(rows || []),
      error: () => this.jobs.set([]),
    });
  }

  reloadKeys(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api-keys`).subscribe({
      next: (rows) => this.keys.set(rows || []),
      error: () => this.keys.set([]),
    });
  }

  createKey(): void {
    if (!this.productSlug) return;
    this.busy.set(true);
    this.http.post<{ apiKey: string }>(`${environment.apiUrl}/api-keys`, { productSlug: this.productSlug }).subscribe({
      next: (r) => {
        this.freshKey.set(r.apiKey || '');
        this.busy.set(false);
        this.reloadKeys();
      },
      error: () => this.busy.set(false),
    });
  }

  revoke(id: string): void {
    this.http.delete(`${environment.apiUrl}/api-keys/${id}`).subscribe({ next: () => this.reloadKeys() });
  }

  reloadJobs(): void {
    this.http.get<any[]>(`${environment.apiUrl}/training-jobs`).subscribe((rows) => this.jobs.set(rows || []));
  }

  startTrain(): void {
    this.training.set(true);
    this.trainError.set('');
    this.http.post(`${environment.apiUrl}/training-jobs`, { modelId: this.modelId, datasetId: this.datasetId }).subscribe({
      next: () => {
        this.training.set(false);
        this.reloadJobs();
      },
      error: (e) => {
        this.training.set(false);
        this.trainError.set(e?.error?.message || 'Could not start the training job.');
      },
    });
  }

  cancelTrain(jobId: string): void {
    if (!confirm('Cancel this job and release its GPU? Files on the workspace will be deleted.')) return;
    this.http.delete(`${environment.apiUrl}/training-jobs/${encodeURIComponent(jobId)}`).subscribe({
      next: () => this.reloadJobs(),
      error: (e) => this.trainError.set(e?.error?.message || 'Could not cancel the job.'),
    });
  }
}
