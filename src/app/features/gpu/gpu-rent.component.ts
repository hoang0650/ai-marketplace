import { WalletBalanceService } from '../../services/wallet-balance.service';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GpuOffer, GpuOffersResponse, GpuRental, GpuRentalService } from '../../services/api.services';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-gpu-rent',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe],
  template: `
    <section class="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl">{{ 'gpu.rent.title' | t }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-muted">{{ 'gpu.rent.subtitle' | t }}</p>
        </div>
        <div class="rounded-xl border border-line px-4 py-3 text-right">
          <p class="text-xs text-muted">{{ 'gpu.rent.balance' | t }}</p>
          <p class="font-mono text-lg">{{ money(available()) }}</p>
          <a routerLink="/wallet" class="text-xs underline">{{ 'gpu.rent.topUp' | t }}</a>
        </div>
      </header>

      @if (error()) {
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error() }}</p>
      }

      <div class="panel">
        <h2 class="font-display text-xl">{{ 'gpu.rent.chooseGpu' | t }}</h2>
        @if (loadingOffers()) {
          <p class="mt-4 text-sm text-muted">{{ 'gpu.rent.loading' | t }}</p>
        } @else {
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            @for (o of offers(); track o.id) {
              <button
                type="button"
                class="rounded-xl border p-4 text-left transition"
                [class.border-line]="selected()?.id !== o.id"
                [class.border-accent]="selected()?.id === o.id"
                [class.ring-2]="selected()?.id === o.id"
                (click)="select(o)"
              >
                <p class="font-semibold">{{ o.name }}</p>
                <p class="text-xs text-muted">{{ o.memoryGb }} GB VRAM</p>
                <p class="mt-3 font-mono text-lg">{{ money(o.pricePerHour) }}<span class="text-xs text-muted">/{{ 'gpu.rent.hour' | t }}</span></p>
                <p class="mt-1 text-xs" [class.text-emerald-400]="o.availability === 'high'" [class.text-amber-400]="o.availability !== 'high'">
                  {{ 'gpu.rent.avail.' + o.availability | t }}
                </p>
              </button>
            } @empty {
              <p class="text-sm text-muted">{{ 'gpu.rent.noOffers' | t }}</p>
            }
          </div>
        }

        @if (selected(); as o) {
          <form class="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end" (ngSubmit)="create()">
            <label class="text-sm">
              <span class="text-muted">{{ 'gpu.rent.name' | t }}</span>
              <input class="input mt-1 w-full" name="name" [(ngModel)]="name" maxlength="80" />
            </label>
            <label class="text-sm">
              <span class="text-muted">{{ 'gpu.rent.volume' | t }}</span>
              <input
                class="input mt-1 w-full"
                type="number"
                name="volumeGb"
                [(ngModel)]="volumeGb"
                [min]="limits()?.volumeGb?.min ?? 10"
                [max]="limits()?.volumeGb?.max ?? 200"
              />
            </label>
            <button class="btn btn-fill" type="submit" [disabled]="busy() || !canAfford()">
              {{ busy() ? ('gpu.rent.creating' | t) : ('gpu.rent.rent' | t) }}
            </button>
          </form>
          <p class="mt-2 text-xs text-muted">
            {{ 'gpu.rent.billingNote' | t: { hours: limits()?.minPrepayHours ?? 1, grace: limits()?.terminateGraceHours ?? 24 } }}
          </p>
          @if (!canAfford()) {
            <p class="mt-2 text-sm text-amber-400">
              {{ 'gpu.rent.needBalance' | t: { amount: money(o.pricePerHour * (limits()?.minPrepayHours ?? 1)) } }}
              <a routerLink="/wallet" class="underline">{{ 'gpu.rent.topUp' | t }}</a>
            </p>
          }
        }
      </div>

      <div class="panel">
        <h2 class="font-display text-xl">{{ 'gpu.rent.myMachines' | t }}</h2>
        <ul class="mt-4 space-y-3">
          @for (r of rentals(); track r.id) {
            <li class="rounded-xl border border-line p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{{ r.name }}</p>
                  <p class="text-xs text-muted">
                    {{ r.gpu.name }} · {{ r.gpu.memoryGb }} GB VRAM · {{ r.volumeGb }} GB /workspace
                  </p>
                  <p class="mt-2 text-sm">
                    <span class="rounded-full px-2 py-0.5 text-xs" [class]="statusClass(r)">{{ statusLabel(r) }}</span>
                    <span class="ml-2 font-mono text-xs text-muted">
                      {{ money(r.status === 'stopped' ? r.stoppedPricePerHour : r.pricePerHour) }}/{{ 'gpu.rent.hour' | t }}
                      · {{ 'gpu.rent.spent' | t }} {{ money(r.billedTotal) }}
                    </span>
                  </p>
                  @if (r.stoppedReason === 'insufficient_funds' && r.terminateAfter && r.status !== 'terminated') {
                    <p class="mt-2 text-xs text-amber-400">
                      {{ 'gpu.rent.fundsStopped' | t: { date: (r.terminateAfter | date: 'short') ?? '' } }}
                    </p>
                  }
                </div>
                <div class="flex flex-wrap gap-2">
                  @if (r.status === 'running') {
                    <button class="btn btn-fill text-xs" type="button" [disabled]="!r.ready" (click)="open(r, 'lab')">JupyterLab</button>
                    <a class="btn btn-outline text-xs" [routerLink]="['/training/gpu', r.id, 'terminal']">Terminal</a>
                    <button class="btn btn-outline text-xs" type="button" (click)="stop(r)">{{ 'gpu.rent.stop' | t }}</button>
                  }
                  @if (r.status === 'stopped' || r.status === 'error') {
                    <button class="btn btn-fill text-xs" type="button" (click)="start(r)">{{ 'gpu.rent.start' | t }}</button>
                  }
                  @if (r.status !== 'terminated') {
                    <button class="btn btn-outline text-xs text-red-400" type="button" (click)="remove(r)">{{ 'gpu.rent.delete' | t }}</button>
                  }
                </div>
              </div>
            </li>
          } @empty {
            <li class="text-sm text-muted">{{ 'gpu.rent.empty' | t }}</li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class GpuRentComponent implements OnInit {
  private readonly api = inject(GpuRentalService);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly offers = signal<GpuOffer[]>([]);
  readonly limits = signal<GpuOffersResponse['limits'] | null>(null);
  /** Same source as /wallet and the header: /wallet/summary.available (works even when GPU offers fail). */
  private readonly walletBalance = inject(WalletBalanceService);
  readonly available = this.walletBalance.available;
  readonly rentals = signal<GpuRental[]>([]);
  readonly selected = signal<GpuOffer | null>(null);
  readonly loadingOffers = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly canAfford = computed(() => {
    const o = this.selected();
    if (!o) return false;
    return this.available() + 1e-9 >= o.pricePerHour * (this.limits()?.minPrepayHours ?? 1);
  });

  name = '';
  volumeGb = 20;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('gpu.rent.title') });
    if (!this.browser) return;
    this.walletBalance.refresh();
    this.loadOffers();
    this.refresh();
    this.timer = setInterval(() => {
      if (this.rentals().some((r) => r.status === 'creating' || (r.status === 'running' && !r.ready))) this.refresh(true);
    }, 8000);
    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  money(usd: number): string {
    return this.currency.formatFromUsd(Number(usd) || 0);
  }

  select(o: GpuOffer): void {
    this.selected.set(o);
    if (!this.name) this.name = `${o.name} workspace`;
  }

  loadOffers(): void {
    this.loadingOffers.set(true);
    this.api.offers().subscribe({
      next: (r) => {
        this.offers.set(r.offers || []);
        const preset = this.route.snapshot.queryParamMap.get('offer');
        const match = preset ? (r.offers || []).find((o) => o.id === preset) : undefined;
        if (match && !this.selected()) this.select(match);
        this.limits.set(r.limits);
        this.volumeGb = r.limits?.volumeGb?.default ?? 20;
        this.loadingOffers.set(false);
      },
      error: (e) => {
        this.loadingOffers.set(false);
        this.fail(e);
      },
    });
  }

  refresh(silent = false): void {
    // Rentals still booting are refreshed individually so their live status is pulled.
    this.api.list().subscribe({
      next: (r) => {
        this.rentals.set(r.rentals || []);
        for (const x of r.rentals || []) {
          if (x.status === 'creating' || (x.status === 'running' && !x.ready)) {
            this.api.get(x.id).subscribe({ next: (g) => this.patch(g.rental), error: () => undefined });
          }
        }
      },
      error: (e) => {
        if (!silent) this.fail(e);
      },
    });
  }

  create(): void {
    const o = this.selected();
    if (!o) return;
    this.busy.set(true);
    this.error.set('');
    this.api.create({ offerId: o.id, name: this.name.trim() || undefined, volumeGb: Number(this.volumeGb) || undefined }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.rentals.update((rows) => [r.rental, ...rows]);
        this.selected.set(null);
        this.name = '';
        this.loadOffers();
      },
      error: (e) => {
        this.busy.set(false);
        this.fail(e);
      },
    });
  }

  start(r: GpuRental): void {
    this.act(this.api.start(r.id));
  }

  stop(r: GpuRental): void {
    if (!confirm(this.i18n.t('gpu.rent.confirmStop'))) return;
    this.act(this.api.stop(r.id));
  }

  remove(r: GpuRental): void {
    if (!confirm(this.i18n.t('gpu.rent.confirmDelete', { name: r.name }))) return;
    this.act(this.api.remove(r.id));
  }

  open(r: GpuRental, target: 'lab' | 'terminal'): void {
    // Open synchronously so popup blockers allow it, then point it at the signed link.
    const win = window.open('about:blank', '_blank');
    this.api.open(r.id, target).subscribe({
      next: (res) => {
        const url = this.api.absoluteUrl(res.path);
        if (win) win.location.href = url;
        else window.location.href = url;
      },
      error: (e) => {
        win?.close();
        this.fail(e);
      },
    });
  }

  statusLabel(r: GpuRental): string {
    if (r.status === 'running' && !r.ready) return this.i18n.t('gpu.rent.status.booting');
    return this.i18n.t(`gpu.rent.status.${r.status}`);
  }

  statusClass(r: GpuRental): string {
    if (r.status === 'running' && r.ready) return 'bg-emerald-500/15 text-emerald-400';
    if (r.status === 'running' || r.status === 'creating') return 'bg-sky-500/15 text-sky-400';
    if (r.status === 'stopped') return 'bg-amber-500/15 text-amber-400';
    return 'bg-zinc-500/15 text-muted';
  }

  private act(obs: ReturnType<GpuRentalService['start']>): void {
    this.error.set('');
    obs.subscribe({
      next: (res) => {
        this.patch(res.rental);
        this.loadOffers();
      },
      error: (e) => this.fail(e),
    });
  }

  private patch(rental: GpuRental): void {
    this.rentals.update((rows) => rows.map((x) => (x.id === rental.id ? rental : x)));
  }

  private fail(e: { error?: { code?: string; message?: string } }): void {
    const code = e?.error?.code;
    const key = code ? `gpu.err.${code}` : '';
    const translated = key ? this.i18n.t(key) : '';
    this.error.set(translated && translated !== key ? translated : e?.error?.message || this.i18n.t('gpu.err.PROVIDER_ERROR'));
  }
}
