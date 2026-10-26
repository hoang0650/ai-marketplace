import { WalletBalanceService } from '../../services/wallet-balance.service';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  GpuDataCenter,
  GpuOffer,
  GpuOfferCloud,
  GpuOffersResponse,
  GpuRental,
  GpuRentalService,
  GpuVolume,
} from '../../services/api.services';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { SeoService } from '../../services/seo.service';
import { GPU_RENT_MESSAGES } from './gpu-rent.messages';

type CloudFilter = 'all' | 'secure' | 'community';

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
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {{ error() }}
        </p>
      }

      <div class="panel" data-testid="gpu-offers">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="font-display text-xl">{{ 'gpu.rent.chooseGpu' | t }}</h2>
            <p class="mt-1 text-xs text-muted">{{ 'gvol.liveNote' | t }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <label class="text-xs">
              <span class="text-muted">{{ 'gvol.attach' | t }}</span>
              <select
                class="input mt-1 block w-60 max-w-full"
                name="attachVolume"
                [ngModel]="attachVolumeId()"
                (ngModelChange)="setAttach($event)"
              >
                <option value="">{{ 'gvol.attachNone' | t }}</option>
                @for (v of activeVolumes(); track v.id) {
                  <option [value]="v.id" [disabled]="!!v.attachedRentalId">
                    {{ v.name }} · {{ v.sizeGb }} GB · {{ v.dataCenterId }}
                  </option>
                }
              </select>
            </label>
            <label class="text-xs">
              <span class="text-muted">{{ 'gvol.cloudFilter' | t }}</span>
              <select
                class="input mt-1 block w-44"
                name="cloudFilter"
                [ngModel]="cloudFilter()"
                (ngModelChange)="cloudFilter.set($event)"
                [disabled]="!!attachVolume()"
              >
                <option value="all">{{ 'gvol.cloud.all' | t }}</option>
                <option value="secure">{{ 'gvol.cloud.secure' | t }}</option>
                <option value="community">{{ 'gvol.cloud.community' | t }}</option>
              </select>
            </label>
          </div>
        </div>
        @if (attachVolume(); as v) {
          <p
            class="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300"
          >
            {{ 'gvol.onlyInDc' | t: { dc: v.dataCenterId } }}
          </p>
        }
        @if (loadingOffers()) {
          <p class="mt-4 text-sm text-muted">{{ 'gpu.rent.loading' | t }}</p>
        } @else {
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            @for (o of visibleOffers(); track o.id) {
              <button
                type="button"
                class="rounded-xl border p-4 text-left transition"
                [class.border-line]="selected()?.id !== o.id"
                [class.border-accent]="selected()?.id === o.id"
                [class.ring-2]="selected()?.id === o.id"
                (click)="select(o)"
                data-testid="gpu-offer"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-semibold">{{ o.name }}</p>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                    [class]="availClass(cardCloud(o)?.availability ?? o.availability)"
                    >{{
                      'gpu.rent.avail.' + (cardCloud(o)?.availability ?? o.availability) | t
                    }}</span
                  >
                </div>
                <p class="text-xs text-muted">{{ o.memoryGb }} GB VRAM</p>
                <p class="mt-3 font-mono text-lg">
                  {{ money(cardPrice(o))
                  }}<span class="text-xs text-muted">/{{ 'gpu.rent.hour' | t }}</span>
                </p>
                <p class="font-mono text-xs text-muted">
                  ≈ {{ money(cardPrice(o) / 60) }}/{{ 'gvol.perMin' | t }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1">
                  @for (c of cloudsFor(o); track c.type) {
                    <span
                      class="rounded px-1.5 py-0.5 text-[10px]"
                      [class.bg-emerald-500/15]="c.type === 'secure'"
                      [class.text-emerald-300]="c.type === 'secure'"
                      [class.bg-violet-500/15]="c.type === 'community'"
                      [class.text-violet-300]="c.type === 'community'"
                      >{{ 'gvol.cloud.' + c.type | t }}</span
                    >
                  }
                  @if (secureDcCount(o); as n) {
                    <span class="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-muted">{{
                      'gvol.dcCount' | t: { n }
                    }}</span>
                  }
                </div>
              </button>
            } @empty {
              <p class="text-sm text-muted">
                @if (attachVolume(); as v) {
                  {{ 'gvol.noOffersInDc' | t: { dc: v.dataCenterId } }}
                } @else {
                  {{ 'gpu.rent.noOffers' | t }}
                }
              </p>
            }
          </div>
        }

        @if (selected(); as o) {
          <form
            class="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end"
            (ngSubmit)="create()"
          >
            <label class="text-sm">
              <span class="text-muted">{{ 'gpu.rent.name' | t }}</span>
              <input class="input mt-1 w-full" name="name" [(ngModel)]="name" maxlength="80" />
            </label>
            @if (attachVolume(); as v) {
              <p class="text-xs text-sky-300 sm:pb-2">
                {{ 'gvol.mountedVolume' | t: { name: v.name, size: v.sizeGb, dc: v.dataCenterId } }}
              </p>
            } @else if (cloudsFor(o).length > 1) {
              <label class="text-sm">
                <span class="text-muted">{{ 'gvol.chooseCloud' | t }}</span>
                <select
                  class="input mt-1 w-full"
                  name="cloud"
                  [ngModel]="chosenCloud()"
                  (ngModelChange)="chosenCloud.set($event)"
                >
                  @for (c of cloudsFor(o); track c.type) {
                    <option [value]="c.type">
                      {{ 'gvol.cloud.' + c.type | t }} · {{ money(c.pricePerHour) }}/{{
                        'gpu.rent.hour' | t
                      }}
                    </option>
                  }
                </select>
              </label>
            } @else {
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
            }
            <button class="btn btn-fill" type="submit" [disabled]="busy() || !canAfford()">
              {{ busy() ? ('gpu.rent.creating' | t) : ('gpu.rent.rent' | t) }}
            </button>
          </form>
          <p class="mt-2 font-mono text-xs">
            {{ money(selectedPrice()) }}/{{ 'gpu.rent.hour' | t }} · ≈
            {{ money(selectedPrice() / 60) }}/{{ 'gvol.perMin' | t }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{
              (attachVolume() ? 'gvol.priceIncludesVol' : 'gvol.priceIncludes')
                | t: { disk: limits()?.diskGb ?? 20 }
            }}
            {{
              'gpu.rent.billingNote'
                | t
                  : {
                      hours: limits()?.minPrepayHours ?? 1,
                      grace: limits()?.terminateGraceHours ?? 24,
                    }
            }}
          </p>
          @if (!canAfford()) {
            <p class="mt-2 text-sm text-amber-400">
              {{
                'gpu.rent.needBalance'
                  | t: { amount: money(selectedPrice() * (limits()?.minPrepayHours ?? 1)) }
              }}
              <a routerLink="/wallet" class="underline">{{ 'gpu.rent.topUp' | t }}</a>
            </p>
          }
        }
      </div>

      <div class="panel" data-testid="gpu-volumes">
        <h2 class="font-display text-xl">{{ 'gvol.title' | t }}</h2>
        <p class="mt-1 max-w-3xl text-xs text-muted">{{ 'gvol.subtitle' | t }}</p>
        <form
          class="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_120px_auto] sm:items-end"
          (ngSubmit)="createVolume()"
        >
          <label class="text-sm">
            <span class="text-muted">{{ 'gvol.name' | t }}</span>
            <input
              class="input mt-1 w-full"
              name="volName"
              [(ngModel)]="volName"
              maxlength="40"
              placeholder="datasets"
            />
          </label>
          <label class="text-sm">
            <span class="text-muted">{{ 'gvol.dc' | t }}</span>
            <select class="input mt-1 w-full" name="volDc" [(ngModel)]="volDc">
              @for (d of dataCenters(); track d.id) {
                <option [value]="d.id" [disabled]="!d.gpuCount">
                  {{ 'gvol.dcOption' | t: { id: d.id, location: d.location, n: d.gpuCount } }}
                </option>
              }
            </select>
          </label>
          <label class="text-sm">
            <span class="text-muted">{{ 'gvol.size' | t }}</span>
            <input
              class="input mt-1 w-full"
              type="number"
              name="volSize"
              [(ngModel)]="volSize"
              [min]="volLimits().sizeMin"
              [max]="volLimits().sizeMax"
            />
          </label>
          <button
            class="btn btn-fill"
            type="submit"
            [disabled]="volBusy() || !volDc || activeVolumes().length >= volLimits().maxPerUser"
          >
            {{ volBusy() ? ('gvol.creating' | t) : ('gvol.create' | t) }}
          </button>
        </form>
        <p class="mt-2 font-mono text-xs">
          {{
            'gvol.preview'
              | t
                : {
                    month: money(volPreview().month),
                    hour: money(volPreview().hour),
                    gb: money(volLimits().pricePerGbMonth),
                  }
          }}
          <span class="text-muted">
            · /workspace · {{ 'gvol.limit' | t: { n: volLimits().maxPerUser } }}</span
          >
        </p>
        <ul class="mt-4 space-y-2">
          @for (v of activeVolumes(); track v.id) {
            <li
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
              data-testid="gpu-volume"
            >
              <div>
                <p class="font-semibold">{{ v.name }}</p>
                <p class="text-xs text-muted">
                  {{ v.sizeGb }} GB · {{ v.dataCenterId }} · {{ v.mountPath }} ·
                  {{ money(v.pricePerMonth) }}/{{ 'gvol.monthShort' | t }} · {{ 'gvol.spent' | t }}
                  {{ money(v.billedTotal) }}
                </p>
                <p class="mt-1 text-xs">
                  <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">{{
                    'gvol.status.' + v.status | t
                  }}</span>
                  @if (v.attachedRentalId) {
                    <span class="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-400">{{
                      'gvol.inUse' | t
                    }}</span>
                  }
                </p>
                @if (v.terminateAfter) {
                  <p class="mt-1 text-xs text-amber-400">
                    {{ 'gvol.fundsWarn' | t: { date: (v.terminateAfter | date: 'short') ?? '' } }}
                  </p>
                }
              </div>
              <button
                class="btn btn-outline text-xs text-red-400"
                type="button"
                [disabled]="!!v.attachedRentalId"
                (click)="deleteVolume(v)"
              >
                {{ 'gvol.delete' | t }}
              </button>
            </li>
          } @empty {
            <li class="text-sm text-muted">{{ 'gvol.empty' | t }}</li>
          }
        </ul>
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
                    {{ r.gpu.name }} · {{ r.gpu.memoryGb }} GB VRAM ·
                    @if (r.networkVolume) {
                      {{
                        'gvol.rentalVolume'
                          | t: { name: r.networkVolume.name || r.networkVolume.id }
                      }}
                      → /workspace
                    } @else {
                      {{ r.volumeGb }} GB /workspace
                    }
                    @if (r.cloudType) {
                      · {{ 'gvol.cloud.' + r.cloudType | t }}
                    }
                    @if (r.dataCenterId) {
                      · {{ r.dataCenterId }}
                    }
                  </p>
                  <p class="mt-2 text-sm">
                    <span class="rounded-full px-2 py-0.5 text-xs" [class]="statusClass(r)">{{
                      statusLabel(r)
                    }}</span>
                    <span class="ml-2 font-mono text-xs text-muted">
                      {{
                        money(r.status === 'stopped' ? r.stoppedPricePerHour : r.pricePerHour)
                      }}/{{ 'gpu.rent.hour' | t }} · {{ 'gpu.rent.spent' | t }}
                      {{ money(r.billedTotal) }}
                    </span>
                  </p>
                  @if (
                    r.stoppedReason === 'insufficient_funds' &&
                    r.terminateAfter &&
                    r.status !== 'terminated'
                  ) {
                    <p class="mt-2 text-xs text-amber-400">
                      {{
                        'gpu.rent.fundsStopped'
                          | t: { date: (r.terminateAfter | date: 'short') ?? '' }
                      }}
                    </p>
                  }
                </div>
                <div class="flex flex-wrap gap-2">
                  @if (r.status === 'running') {
                    <button
                      class="btn btn-fill text-xs"
                      type="button"
                      [disabled]="!r.ready"
                      (click)="open(r, 'lab')"
                    >
                      JupyterLab
                    </button>
                    <a
                      class="btn btn-outline text-xs"
                      [routerLink]="['/training/gpu', r.id, 'terminal']"
                      >Terminal</a
                    >
                    <button class="btn btn-outline text-xs" type="button" (click)="stop(r)">
                      {{ (r.networkVolume ? 'gvol.stopVolume' : 'gpu.rent.stop') | t }}
                    </button>
                  }
                  @if ((r.status === 'stopped' || r.status === 'error') && !r.networkVolume) {
                    <button class="btn btn-fill text-xs" type="button" (click)="start(r)">
                      {{ 'gpu.rent.start' | t }}
                    </button>
                  }
                  @if (r.status !== 'terminated') {
                    <button
                      class="btn btn-outline text-xs text-red-400"
                      type="button"
                      (click)="remove(r)"
                    >
                      {{ 'gpu.rent.delete' | t }}
                    </button>
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
  readonly dataCenters = signal<GpuDataCenter[]>([]);
  readonly volumes = signal<GpuVolume[]>([]);
  readonly activeVolumes = computed(() =>
    this.volumes().filter((v) => v.status === 'active' || v.status === 'creating'),
  );
  readonly cloudFilter = signal<CloudFilter>('all');
  readonly attachVolumeId = signal('');
  readonly attachVolume = computed(
    () => this.activeVolumes().find((v) => v.id === this.attachVolumeId()) || null,
  );
  readonly chosenCloud = signal<'secure' | 'community'>('secure');
  readonly volBusy = signal(false);
  /** GPUs the current filters allow: cloud type, and with a volume only secure stock in its data center. */
  readonly visibleOffers = computed(() => {
    this.attachVolume();
    this.cloudFilter();
    return this.offers()
      .filter((o) => this.cloudsFor(o).length > 0)
      .sort((a, b) => this.cardPrice(a) - this.cardPrice(b));
  });
  readonly volLimits = computed(
    () =>
      this.limits()?.networkVolume ?? {
        sizeMin: 10,
        sizeMax: 500,
        sizeDefault: 20,
        maxPerUser: 3,
        pricePerGbMonth: 0.0924,
        mountPath: '/workspace',
      },
  );
  readonly limits = signal<GpuOffersResponse['limits'] | null>(null);
  /** Same source as /wallet and the header: /wallet/summary.available (works even when GPU offers fail). */
  private readonly walletBalance = inject(WalletBalanceService);
  readonly available = this.walletBalance.available;
  readonly rentals = signal<GpuRental[]>([]);
  readonly selected = signal<GpuOffer | null>(null);
  readonly loadingOffers = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly selectedPrice = computed(() => {
    const o = this.selected();
    if (!o) return 0;
    const c = this.selectedCloud(o);
    if (!c) return o.pricePerHour;
    return this.attachVolume() ? c.networkVolumePricePerHour : c.pricePerHour;
  });
  readonly canAfford = computed(() => {
    const o = this.selected();
    if (!o) return false;
    return this.available() + 1e-9 >= this.selectedPrice() * (this.limits()?.minPrepayHours ?? 1);
  });

  name = '';
  volumeGb = 20;
  volName = '';
  volDc = '';
  volSize = 20;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.i18n.extend(GPU_RENT_MESSAGES);
    this.seo.set({ title: this.i18n.t('gpu.rent.title') });
    if (!this.browser) return;
    this.walletBalance.refresh();
    this.loadOffers();
    this.loadVolumes();
    this.refresh();
    this.timer = setInterval(() => {
      if (
        this.rentals().some((r) => r.status === 'creating' || (r.status === 'running' && !r.ready))
      )
        this.refresh(true);
    }, 8000);
    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  money(usd: number): string {
    return this.currency.formatFromUsd(Number(usd) || 0);
  }

  /** Clouds of an offer allowed by the filters (legacy offers without clouds count as secure). */
  cloudsFor(o: GpuOffer): GpuOfferCloud[] {
    const clouds: GpuOfferCloud[] = o.clouds?.length
      ? o.clouds
      : [
          {
            type: 'secure',
            pricePerHour: o.pricePerHour,
            pricePerMinute: o.pricePerHour / 60,
            networkVolumePricePerHour: o.pricePerHour,
            networkVolumePricePerMinute: o.pricePerHour / 60,
            availability: o.availability,
            dataCenters: [],
          },
        ];
    const vol = this.attachVolume();
    if (vol) {
      return clouds.filter(
        (c) =>
          c.type === 'secure' &&
          c.dataCenters.some((d) => d.id === vol.dataCenterId && d.availability !== 'unknown'),
      );
    }
    const f = this.cloudFilter();
    return f === 'all' ? clouds : clouds.filter((c) => c.type === f);
  }

  /** Cloud shown on a card: the cheapest allowed one. */
  cardCloud(o: GpuOffer): GpuOfferCloud | null {
    const list = this.cloudsFor(o);
    if (!list.length) return null;
    const key = this.attachVolume() ? 'networkVolumePricePerHour' : 'pricePerHour';
    return list.reduce((a, b) => (b[key] < a[key] ? b : a));
  }

  cardPrice(o: GpuOffer): number {
    const c = this.cardCloud(o);
    if (!c) return o.pricePerHour;
    return this.attachVolume() ? c.networkVolumePricePerHour : c.pricePerHour;
  }

  secureDcCount(o: GpuOffer): number {
    return o.clouds?.find((c) => c.type === 'secure')?.dataCenters.length ?? 0;
  }

  availClass(a: string): string {
    if (a === 'high') return 'bg-emerald-500/15 text-emerald-400';
    if (a === 'medium') return 'bg-sky-500/15 text-sky-400';
    return 'bg-amber-500/15 text-amber-400';
  }

  private selectedCloud(o: GpuOffer): GpuOfferCloud | null {
    const list = this.cloudsFor(o);
    return list.find((c) => c.type === this.chosenCloud()) || this.cardCloud(o);
  }

  volPreview(): { month: number; hour: number } {
    const gb = Math.max(0, Number(this.volSize) || 0);
    const perMonth = gb * this.volLimits().pricePerGbMonth;
    return { month: Math.ceil(perMonth * 100 - 1e-9) / 100, hour: perMonth / 730 };
  }

  setAttach(id: string): void {
    this.attachVolumeId.set(id || '');
    const o = this.selected();
    if (o && !this.cloudsFor(o).length) this.selected.set(null);
  }

  select(o: GpuOffer): void {
    this.selected.set(o);
    const c = this.cardCloud(o);
    if (c) this.chosenCloud.set(c.type);
    if (!this.name) this.name = `${o.name} workspace`;
  }

  loadVolumes(): void {
    this.api.volumes().subscribe({
      next: (r) => {
        this.volumes.set(r.volumes || []);
        if (this.attachVolumeId() && !this.attachVolume()) this.attachVolumeId.set('');
      },
      error: () => undefined,
    });
  }

  createVolume(): void {
    if (!this.volDc) return;
    this.volBusy.set(true);
    this.error.set('');
    this.api
      .createVolume({
        name: this.volName.trim() || undefined,
        dataCenterId: this.volDc,
        sizeGb: Number(this.volSize),
      })
      .subscribe({
        next: (r) => {
          this.volBusy.set(false);
          this.volumes.update((rows) => [r.volume, ...rows]);
          this.volName = '';
          this.walletBalance.refresh();
        },
        error: (e) => {
          this.volBusy.set(false);
          this.fail(e);
        },
      });
  }

  deleteVolume(v: GpuVolume): void {
    if (!confirm(this.i18n.t('gvol.confirmDelete', { name: v.name }))) return;
    this.error.set('');
    this.api.deleteVolume(v.id).subscribe({
      next: () => {
        this.volumes.update((rows) => rows.filter((x) => x.id !== v.id));
        if (this.attachVolumeId() === v.id) this.attachVolumeId.set('');
        this.walletBalance.refresh();
      },
      error: (e) => this.fail(e),
    });
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
        this.dataCenters.set(r.dataCenters || []);
        if (!this.volDc) this.volDc = (r.dataCenters || []).find((d) => d.gpuCount > 0)?.id ?? '';
        if (r.limits?.networkVolume) this.volSize = r.limits.networkVolume.sizeDefault;
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
            this.api
              .get(x.id)
              .subscribe({ next: (g) => this.patch(g.rental), error: () => undefined });
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
    const vol = this.attachVolume();
    const cloud = this.selectedCloud(o)?.type;
    this.api
      .create({
        offerId: o.id,
        name: this.name.trim() || undefined,
        ...(vol
          ? { volumeId: vol.id }
          : { volumeGb: Number(this.volumeGb) || undefined, ...(cloud ? { cloud } : {}) }),
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.rentals.update((rows) => [r.rental, ...rows]);
          this.selected.set(null);
          this.name = '';
          this.loadOffers();
          this.loadVolumes();
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
    if (!confirm(this.i18n.t(r.networkVolume ? 'gvol.confirmStopVolume' : 'gpu.rent.confirmStop')))
      return;
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
        this.loadVolumes();
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
    this.error.set(
      translated && translated !== key
        ? translated
        : e?.error?.message || this.i18n.t('gpu.err.PROVIDER_ERROR'),
    );
  }
}
