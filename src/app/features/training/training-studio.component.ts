import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  GpuOffer,
  GpuRentalService,
  TrainingDataset,
  TrainingFile,
  TrainingJob,
  TrainingLimits,
  TrainingService,
  TrainingSource,
  TrainingTask,
} from '../../services/api.services';
import { CurrencyService } from '../../i18n/currency.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { SeoService } from '../../services/seo.service';

const TASKS: Record<TrainingSource, TrainingTask[]> = {
  raw: ['llm-sft', 'image-classification', 'tabular', 'custom'],
  video: ['action-recognition', 'motion-scoring', 'custom'],
  audio: ['speech-recognition', 'audio-classification', 'custom'],
};

const ACCEPT: Record<TrainingSource, string> = {
  raw: '.jsonl,.json,.csv,.tsv,.parquet,.txt,.zip,.tar,.gz,.tgz',
  video: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.mkv,.avi,.m4v',
  audio: 'audio/*,.wav,.mp3,.m4a,.flac,.ogg,.opus,.aac,.webm',
};

/** Tasks that fine-tune a Hugging Face checkpoint, with the API's default. */
const BASE_MODELS: Partial<Record<TrainingTask, string>> = {
  'llm-sft': 'Qwen/Qwen2.5-0.5B-Instruct',
  'speech-recognition': 'openai/whisper-small',
  'audio-classification': 'facebook/wav2vec2-base',
};

const DEFAULT_EPOCHS: Partial<Record<TrainingTask, string>> = {
  'llm-sft': '2',
  'image-classification': '10',
  'action-recognition': '60',
  'speech-recognition': '5',
  'audio-classification': '20',
};

const LABELLED_TASKS: TrainingTask[] = ['action-recognition', 'audio-classification'];

const stem = (name: string) => name.trim().toLowerCase().replace(/\.[^.]+$/, '');

const ACTIVE_JOB = ['queued', 'running', 'paused'];

interface UploadRow {
  key: string;
  name: string;
  progress: number;
  error: string;
}

@Component({
  selector: 'app-training-studio',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe],
  template: `
    <section class="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl">{{ 'train.title' | t }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-muted">{{ 'train.subtitle' | t }}</p>
        </div>
        <div class="rounded-xl border border-line px-4 py-3 text-right">
          <p class="text-xs text-muted">{{ 'gpu.rent.balance' | t }}</p>
          <p class="font-mono text-lg">{{ money(available()) }}</p>
          <a routerLink="/wallet" class="text-xs underline">{{ 'gpu.rent.topUp' | t }}</a>
        </div>
      </header>

      <nav class="flex flex-wrap gap-2" role="tablist">
        @for (s of sources; track s) {
          <button
            type="button"
            role="tab"
            class="rounded-xl border px-4 py-3 text-left transition"
            [class.border-line]="source() !== s"
            [class.border-accent]="source() === s"
            [class.ring-2]="source() === s"
            [attr.aria-selected]="source() === s"
            (click)="switchSource(s)"
          >
            <p class="font-semibold">{{ 'train.source.' + s | t }}</p>
            <p class="max-w-xs text-xs text-muted">{{ 'train.source.' + s + '.hint' | t }}</p>
          </button>
        }
      </nav>

      @if (error()) {
        <p class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{{ error() }}</p>
      }

      <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <!-- Datasets -->
        <div class="panel space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-display text-xl">{{ 'train.datasets' | t }}</h2>
            <span class="text-xs text-muted">{{ 'train.limits' | t: { mb: fileMaxMb(), files: limits()?.maxFiles ?? 500 } }}</span>
          </div>

          <div class="flex flex-wrap gap-2">
            @for (d of datasets(); track d.id) {
              <button
                type="button"
                class="rounded-lg border px-3 py-2 text-left text-sm"
                [class.border-line]="selectedId() !== d.id"
                [class.border-accent]="selectedId() === d.id"
                (click)="selectedId.set(d.id)"
              >
                <span class="font-semibold">{{ d.name }}</span>
                <span class="block text-xs text-muted">{{ d.fileCount }} {{ 'train.files' | t }} · {{ bytes(d.totalBytes) }}</span>
              </button>
            } @empty {
              <p class="text-sm text-muted">{{ 'train.noDatasets' | t }}</p>
            }
          </div>

          <form class="grid gap-2 sm:grid-cols-[1fr_auto]" (ngSubmit)="createDataset()">
            <input class="input" name="newName" [(ngModel)]="newName" maxlength="80" [placeholder]="'train.newDatasetPh.' + source() | t" />
            <button class="btn btn-outline text-sm" type="submit" [disabled]="busy() || !newName.trim()">{{ 'train.createDataset' | t }}</button>
          </form>

          @if (selected(); as d) {
            <div class="space-y-3 rounded-xl border border-line p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-semibold">{{ d.name }}</p>
                <button class="text-xs text-red-400" type="button" (click)="deleteDataset(d)">{{ 'train.deleteDataset' | t }}</button>
              </div>

              @if (source() === 'raw') {
                <label class="block text-sm">
                  <span class="text-muted">{{ 'train.hfDataset' | t }}</span>
                  <input
                    class="input mt-1 w-full"
                    name="hf"
                    [ngModel]="d.hfDataset"
                    (change)="saveHf(d, $any($event.target).value)"
                    placeholder="owner/dataset"
                  />
                  <span class="text-xs text-muted">{{ 'train.hfHint' | t }}</span>
                </label>
              }

              @if (source() === 'video') {
                <div class="grid gap-2 sm:grid-cols-2">
                  <label class="text-sm">
                    <span class="text-muted">{{ 'train.uploadLabel' | t }}</span>
                    <input class="input mt-1 w-full" name="uploadLabel" [(ngModel)]="uploadLabel" maxlength="60" [placeholder]="'train.labelPh' | t" />
                  </label>
                  <label class="text-sm">
                    <span class="text-muted">{{ 'train.uploadRole' | t }}</span>
                    <select class="input mt-1 w-full" name="uploadRole" [(ngModel)]="uploadRole">
                      <option value="sample">{{ 'train.role.sample' | t }}</option>
                      <option value="reference">{{ 'train.role.reference' | t }}</option>
                    </select>
                  </label>
                </div>
              }
              @if (source() === 'audio') {
                <div class="grid gap-2 sm:grid-cols-2">
                  <label class="text-sm">
                    <span class="text-muted">{{ 'train.uploadLabel.audio' | t }}</span>
                    <input class="input mt-1 w-full" name="uploadLabel" [(ngModel)]="uploadLabel" maxlength="60" [placeholder]="'train.labelPh.audio' | t" />
                  </label>
                  <label class="flex cursor-pointer flex-col justify-end text-sm">
                    <span class="text-muted">{{ 'train.importTranscripts' | t }}</span>
                    <span class="btn btn-outline mt-1 text-xs">{{ 'train.importTranscripts.btn' | t }}</span>
                    <input class="hidden" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" (change)="importTranscripts($event, d)" />
                  </label>
                </div>
                <p class="text-xs text-muted">{{ 'train.importTranscripts.hint' | t }}</p>
                @if (notice()) {
                  <p class="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{{ notice() }}</p>
                }
              }

              <label class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm hover:border-accent">
                <span class="font-semibold">{{ 'train.pickFiles.' + source() | t }}</span>
                <span class="text-xs text-muted">{{ 'train.accept.' + source() | t }}</span>
                <input class="hidden" type="file" multiple [accept]="accept()" (change)="onPick($event, d)" />
              </label>

              @for (u of uploads(); track u.key) {
                <div class="text-xs">
                  <div class="flex justify-between gap-2">
                    <span class="truncate">{{ u.name }}</span>
                    <span [class.text-red-400]="u.error">{{ u.error || u.progress + '%' }}</span>
                  </div>
                  <div class="mt-1 h-1 rounded bg-line"><div class="h-1 rounded bg-accent" [style.width.%]="u.progress"></div></div>
                </div>
              }

              <ul class="divide-y divide-line text-sm">
                @for (f of d.files; track f.id) {
                  <li class="flex flex-wrap items-center gap-2 py-2">
                    <span class="min-w-0 flex-1 truncate" [title]="f.filename">{{ f.filename }}</span>
                    <span class="text-xs text-muted">{{ bytes(f.size) }}</span>
                    @if (f.status === 'pending') {
                      <span class="text-xs text-amber-400">{{ 'train.pending' | t }}</span>
                    }
                    @if (source() === 'video') {
                      <input
                        class="input w-36 py-1 text-xs"
                        [ngModel]="f.label"
                        (change)="saveFile(d, f, { label: $any($event.target).value })"
                        maxlength="60"
                        [placeholder]="'train.labelPh' | t"
                      />
                      <select class="input w-32 py-1 text-xs" [ngModel]="f.role" (ngModelChange)="saveFile(d, f, { role: $event })">
                        <option value="sample">{{ 'train.role.sample' | t }}</option>
                        <option value="reference">{{ 'train.role.reference' | t }}</option>
                      </select>
                    }
                    @if (source() === 'audio') {
                      <input
                        class="input w-36 py-1 text-xs"
                        [ngModel]="f.label"
                        (change)="saveFile(d, f, { label: $any($event.target).value })"
                        maxlength="60"
                        [placeholder]="'train.labelPh.audio' | t"
                      />
                    }
                    <button class="text-xs text-red-400" type="button" (click)="deleteFile(d, f)" [attr.aria-label]="'train.deleteFile' | t">✕</button>
                    @if (source() === 'audio') {
                      <textarea
                        class="input min-h-[2.5rem] w-full py-1 text-xs"
                        rows="2"
                        maxlength="2000"
                        [ngModel]="f.transcript"
                        (change)="saveFile(d, f, { transcript: $any($event.target).value })"
                        [placeholder]="'train.transcriptPh' | t"
                      ></textarea>
                    }
                  </li>
                } @empty {
                  <li class="py-2 text-xs text-muted">{{ 'train.noFiles' | t }}</li>
                }
              </ul>
              @if (source() !== 'raw' && d.labels.length) {
                <p class="text-xs text-muted">{{ 'train.labelsSummary' | t: { labels: d.labels.join(', ') } }}</p>
              }
              @if (source() === 'audio' && d.fileCount) {
                <p class="text-xs text-muted">{{ 'train.transcribed' | t: { n: d.transcribedCount || 0, total: d.fileCount } }}</p>
              }
            </div>
          }

          <details class="rounded-xl border border-line p-4 text-sm" [open]="source() !== 'raw'">
            <summary class="cursor-pointer font-semibold">{{ 'train.guide.' + source() | t }}</summary>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-muted">
              @for (i of guideItems(); track i) {
                <li>{{ 'train.guide.' + source() + '.' + i | t }}</li>
              }
            </ul>
          </details>
        </div>

        <!-- Train -->
        <form class="panel space-y-4" (ngSubmit)="startJob()">
          <h2 class="font-display text-xl">{{ 'train.start' | t }}</h2>

          <div class="space-y-2">
            @for (task of tasks(); track task) {
              <label class="flex cursor-pointer gap-3 rounded-xl border p-3" [class.border-accent]="taskSel() === task" [class.border-line]="taskSel() !== task">
                <input type="radio" name="task" [value]="task" [ngModel]="taskSel()" (ngModelChange)="taskSel.set($event)" />
                <span>
                  <span class="font-semibold">{{ 'train.task.' + task | t }}</span>
                  <span class="block text-xs text-muted">{{ 'train.task.' + task + '.hint' | t }}</span>
                </span>
              </label>
            }
          </div>

          @if (baseModelDefault(); as def) {
            <label class="block text-sm">
              <span class="text-muted">{{ 'train.baseModel' | t }}</span>
              <input class="input mt-1 w-full" name="modelId" [(ngModel)]="modelIds[taskSel()]" [placeholder]="def" />
              @if (taskSel() === 'speech-recognition') {
                <span class="text-xs text-muted">{{ 'train.baseModel.asrHint' | t }}</span>
              }
            </label>
          }
          @if (taskSel() === 'speech-recognition') {
            <label class="block text-sm">
              <span class="text-muted">{{ 'train.language' | t }}</span>
              <input class="input mt-1 w-full" name="language" [(ngModel)]="language" maxlength="3" placeholder="vi" />
              <span class="text-xs text-muted">{{ 'train.language.hint' | t }}</span>
            </label>
          }
          @if (taskSel() === 'audio-classification') {
            <label class="block text-sm">
              <span class="text-muted">{{ 'train.maxSeconds' | t }}</span>
              <input class="input mt-1 w-full" type="number" step="1" name="maxSeconds" [(ngModel)]="maxSeconds" min="1" max="30" />
            </label>
          }
          @if (taskSel() === 'tabular') {
            <label class="block text-sm">
              <span class="text-muted">{{ 'train.target' | t }}</span>
              <input class="input mt-1 w-full" name="target" [(ngModel)]="target" [placeholder]="'train.targetPh' | t" />
            </label>
          }
          @if (hasEpochs()) {
            <label class="block text-sm">
              <span class="text-muted">{{ 'train.epochs' | t }}</span>
              <input class="input mt-1 w-full" type="number" name="epochs" [(ngModel)]="epochs" min="1" max="500" [placeholder]="defaultEpochs()" />
            </label>
          }
          @if (taskSel() === 'action-recognition') {
            <div class="grid gap-2 sm:grid-cols-2">
              <label class="text-sm">
                <span class="text-muted">{{ 'train.windowSec' | t }}</span>
                <input class="input mt-1 w-full" type="number" step="0.5" name="windowSec" [(ngModel)]="windowSec" min="0.5" max="10" />
              </label>
              <label class="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="mirror" [(ngModel)]="mirror" />
                <span>{{ 'train.mirror' | t }}</span>
              </label>
            </div>
          }

          <label class="block text-sm">
            <span class="text-muted">{{ 'train.gpu' | t }}</span>
            <select class="input mt-1 w-full" name="offer" [(ngModel)]="offerId">
              @for (o of offers(); track o.id) {
                <option [value]="o.id">{{ o.name }} · {{ o.memoryGb }} GB · {{ money(o.pricePerHour) }}/{{ 'gpu.rent.hour' | t }}</option>
              }
            </select>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" name="autoStop" [(ngModel)]="autoStop" />
            <span>{{ 'train.autoStop' | t }}</span>
          </label>

          @if (readiness(); as msg) {
            <p class="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">{{ msg }}</p>
          }
          <p class="text-xs text-muted">{{ 'train.billingNote' | t: { hours: minPrepayHours() } }}</p>
          <button class="btn btn-fill w-full" type="submit" [disabled]="starting() || !!readiness() || !offerId">
            {{ starting() ? ('train.starting' | t) : ('train.startBtn' | t) }}
          </button>
        </form>
      </div>

      <!-- Jobs -->
      <div class="panel">
        <h2 class="font-display text-xl">{{ 'train.jobs' | t }}</h2>
        <ul class="mt-4 space-y-3">
          @for (j of jobs(); track j.jobId) {
            <li class="rounded-xl border border-line p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold">
                    {{ 'train.task.' + j.task | t }}
                    <span class="text-xs font-normal text-muted">· {{ 'train.source.' + j.source | t }} · {{ j.datasetName || j.modelId || j.jobId }}</span>
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ j.gpuType }} · {{ j.createdAt | date: 'short' }}
                    @if (j.pricePerHour != null) { · {{ money(j.pricePerHour) }}/{{ 'gpu.rent.hour' | t }} }
                    · {{ 'gpu.rent.spent' | t }} {{ money(j.cost || 0) }}
                  </p>
                  <p class="mt-2 text-sm">
                    <span class="rounded-full px-2 py-0.5 text-xs" [class]="statusClass(j)">{{ 'train.status.' + j.status | t }}</span>
                    @if (j.stage && isActive(j)) {
                      <span class="ml-2 text-xs text-muted">{{ stageLabel(j.stage) }}</span>
                    }
                  </p>
                  @if (isActive(j) || j.status === 'succeeded') {
                    <div class="mt-2 h-1.5 w-64 max-w-full rounded bg-line">
                      <div class="h-1.5 rounded bg-accent transition-all" [style.width.%]="j.progress"></div>
                    </div>
                  }
                  @if (metricLine(j); as m) {
                    <p class="mt-2 text-xs">{{ m }}</p>
                  }
                </div>
                <div class="flex flex-wrap gap-2">
                  @if (j.artifact) {
                    <button class="btn btn-fill text-xs" type="button" (click)="download(j)">
                      {{ 'train.download' | t }} ({{ bytes(j.artifact.size) }})
                    </button>
                  }
                  @if (j.rentalId && j.workspaceStatus === 'running') {
                    <button class="btn btn-outline text-xs" type="button" (click)="openWorkspace(j)">JupyterLab</button>
                  }
                  @if (j.rentalId && j.workspaceStatus && j.workspaceStatus !== 'terminated') {
                    <button class="btn btn-outline text-xs text-red-400" type="button" (click)="cancel(j)">
                      {{ (isActive(j) ? 'train.cancel' : 'train.release') | t }}
                    </button>
                  }
                </div>
              </div>
              @if (j.logs) {
                <details class="mt-3">
                  <summary class="cursor-pointer text-xs text-muted">{{ 'train.logs' | t }}</summary>
                  <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 font-mono text-[11px]">{{ j.logs }}</pre>
                </details>
              }
            </li>
          } @empty {
            <li class="text-sm text-muted">{{ 'train.noJobs' | t }}</li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class TrainingStudioComponent implements OnInit {
  private readonly api = inject(TrainingService);
  private readonly gpu = inject(GpuRentalService);
  private readonly currency = inject(CurrencyService);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly sources: TrainingSource[] = ['raw', 'video', 'audio'];
  readonly source = signal<TrainingSource>('video');
  readonly datasets = signal<TrainingDataset[]>([]);
  readonly limits = signal<TrainingLimits | null>(null);
  readonly selectedId = signal('');
  readonly selected = computed(() => this.datasets().find((d) => d.id === this.selectedId()) ?? null);
  readonly uploads = signal<UploadRow[]>([]);
  readonly jobs = signal<TrainingJob[]>([]);
  readonly offers = signal<GpuOffer[]>([]);
  readonly available = signal(0);
  readonly minPrepayHours = signal(1);
  readonly taskSel = signal<TrainingTask>('action-recognition');
  readonly tasks = computed(() => TASKS[this.source()]);
  readonly accept = computed(() => ACCEPT[this.source()]);
  readonly guideItems = computed(() => (this.source() === 'raw' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6]));
  readonly hasEpochs = computed(() => this.taskSel() in DEFAULT_EPOCHS);
  readonly defaultEpochs = computed(() => DEFAULT_EPOCHS[this.taskSel()] ?? '');
  readonly baseModelDefault = computed(() => BASE_MODELS[this.taskSel()] ?? '');
  readonly busy = signal(false);
  readonly starting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  newName = '';
  uploadLabel = '';
  uploadRole: 'sample' | 'reference' = 'sample';
  modelIds: Partial<Record<TrainingTask, string>> = { ...BASE_MODELS };
  target = '';
  epochs: number | null = null;
  windowSec = 2;
  mirror = true;
  language = 'vi';
  maxSeconds = 10;
  offerId = '';
  autoStop = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Client-side checklist mirroring the API rules, so the start button explains what is missing. */
  readonly readiness = computed(() => {
    const d = this.selected();
    const task = this.taskSel();
    const ready = (d?.files || []).filter((f) => f.status === 'ready');
    if (this.source() === 'raw' && d?.hfDataset && ['llm-sft', 'image-classification', 'custom'].includes(task)) return '';
    if (!d) return this.i18n.t('train.need.dataset');
    if (!ready.length) return this.i18n.t('train.need.files');
    if (LABELLED_TASKS.includes(task)) {
      if (ready.some((f) => !f.label)) return this.i18n.t(task === 'audio-classification' ? 'train.need.labelEachAudio' : 'train.need.labelEach');
      if (new Set(ready.map((f) => f.label)).size < 2) return this.i18n.t('train.need.twoLabels');
    }
    if (task === 'speech-recognition' && !ready.some((f) => f.transcript)) return this.i18n.t('train.need.transcripts');
    if (task === 'motion-scoring' && !ready.some((f) => f.role === 'reference')) return this.i18n.t('train.need.reference');
    return '';
  });

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('train.title') });
    if (!this.browser) return;
    this.loadDatasets();
    this.loadJobs();
    this.gpu.offers().subscribe({
      next: (r) => {
        const offers = [...(r.offers || [])].sort((a, b) => a.pricePerHour - b.pricePerHour);
        this.offers.set(offers);
        this.offerId = offers.find((o) => o.availability !== 'unknown')?.id || offers[0]?.id || '';
        this.available.set(r.wallet?.available ?? 0);
        this.minPrepayHours.set(r.limits?.minPrepayHours ?? 1);
      },
      error: (e) => this.fail(e),
    });
    this.timer = setInterval(() => {
      if (this.jobs().some((j) => this.isActive(j))) this.loadJobs(true);
    }, 10000);
    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  money(usd: number): string {
    return this.currency.formatFromUsd(Number(usd) || 0);
  }

  bytes(n: number): string {
    const v = Number(n) || 0;
    if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(1)} GB`;
    if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(v / 1024))} KB`;
  }

  fileMaxMb(): number {
    const l = this.limits();
    const s = this.source();
    if (!l) return { raw: 2048, video: 1024, audio: 200 }[s];
    const max = { raw: l.rawFileMaxBytes, video: l.videoFileMaxBytes, audio: l.audioFileMaxBytes }[s];
    return Math.round((max || 0) / 1024 / 1024);
  }

  isActive(j: TrainingJob): boolean {
    return ACTIVE_JOB.includes(j.status);
  }

  switchSource(s: TrainingSource): void {
    if (this.source() === s) return;
    this.source.set(s);
    this.taskSel.set(TASKS[s][0]);
    this.selectedId.set('');
    this.uploads.set([]);
    this.uploadLabel = '';
    this.notice.set('');
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.api.listDatasets(this.source()).subscribe({
      next: (r) => {
        this.datasets.set(r.datasets || []);
        this.limits.set(r.limits);
        if (!this.selected() && r.datasets?.length) this.selectedId.set(r.datasets[0].id);
      },
      error: (e) => this.fail(e),
    });
  }

  loadJobs(silent = false): void {
    this.api.listJobs().subscribe({
      next: (rows) => this.jobs.set(rows || []),
      error: (e) => {
        if (!silent) this.fail(e);
      },
    });
  }

  createDataset(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.busy.set(true);
    this.error.set('');
    this.api.createDataset({ name, source: this.source() }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.newName = '';
        this.datasets.update((rows) => [r.dataset, ...rows]);
        this.selectedId.set(r.dataset.id);
      },
      error: (e) => {
        this.busy.set(false);
        this.fail(e);
      },
    });
  }

  deleteDataset(d: TrainingDataset): void {
    if (!confirm(this.i18n.t('train.confirmDeleteDataset', { name: d.name }))) return;
    this.api.deleteDataset(d.id).subscribe({
      next: () => {
        this.datasets.update((rows) => rows.filter((x) => x.id !== d.id));
        this.selectedId.set(this.datasets()[0]?.id || '');
      },
      error: (e) => this.fail(e),
    });
  }

  saveHf(d: TrainingDataset, value: string): void {
    this.api.updateDataset(d.id, { hfDataset: String(value || '').trim() }).subscribe({
      next: (r) => this.patchDataset(r.dataset),
      error: (e) => this.fail(e),
    });
  }

  saveFile(d: TrainingDataset, f: TrainingFile, body: { label?: string; role?: 'sample' | 'reference'; transcript?: string }): void {
    this.api.updateFile(d.id, f.id, body).subscribe({
      next: (r) => this.patchDataset(r.dataset),
      error: (e) => this.fail(e),
    });
  }

  /** CSV / TSV lines "filename,transcript" (header optional) matched to uploaded clips by file name. */
  async importTranscripts(event: Event, d: TrainingDataset): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    this.notice.set('');
    const byName = new Map<string, TrainingFile>();
    for (const f of d.files) {
      byName.set(f.filename.trim().toLowerCase(), f);
      byName.set(stem(f.filename), f);
    }
    let matched = 0;
    let missed = 0;
    let latest: TrainingDataset | null = null;
    for (const line of (await file.text()).split(/\r?\n/)) {
      const cut = line.search(/[,\t|]/);
      if (cut <= 0) continue;
      const name = line.slice(0, cut).trim().replace(/^"|"$/g, '');
      const text = line.slice(cut + 1).trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      if (!text || ['filename', 'file', 'path', 'tên file'].includes(name.toLowerCase())) continue;
      const target = byName.get(name.toLowerCase()) || byName.get(stem(name.split(/[\\/]/).pop() || ''));
      if (!target) {
        missed++;
        continue;
      }
      try {
        latest = (await firstValueFrom(this.api.updateFile(d.id, target.id, { transcript: text }))).dataset;
        matched++;
      } catch (e) {
        this.fail(e as { error?: { code?: string; message?: string } });
        break;
      }
    }
    if (latest) this.patchDataset(latest);
    this.notice.set(this.i18n.t('train.importTranscripts.done', { n: matched, miss: missed }));
  }

  deleteFile(d: TrainingDataset, f: TrainingFile): void {
    this.api.deleteFile(d.id, f.id).subscribe({
      next: (r) => this.patchDataset(r.dataset),
      error: (e) => this.fail(e),
    });
  }

  async onPick(event: Event, d: TrainingDataset): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.error.set('');
    for (const file of files) {
      await this.uploadOne(d, file);
    }
  }

  private async uploadOne(d: TrainingDataset, file: File): Promise<void> {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const row: UploadRow = { key, name: file.name, progress: 0, error: '' };
    this.uploads.update((rows) => [...rows, row]);
    const set = (patch: Partial<UploadRow>) =>
      this.uploads.update((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    try {
      const req = await firstValueFrom(
        this.api.requestUpload(d.id, {
          filename: file.name,
          size: file.size,
          contentType: file.type,
          label: this.source() !== 'raw' ? this.uploadLabel.trim() : undefined,
          role: this.source() === 'video' ? this.uploadRole : undefined,
        }),
      );
      await new Promise<void>((resolve, reject) => {
        this.api.putToStorage(req.upload.url, file).subscribe({
          next: (ev) => {
            if (ev.type === HttpEventType.UploadProgress && ev.total) set({ progress: Math.round((ev.loaded / ev.total) * 100) });
            if (ev.type === HttpEventType.Response) resolve();
          },
          error: reject,
        });
      });
      const done = await firstValueFrom(this.api.completeUpload(d.id, req.file.id));
      this.patchDataset(done.dataset);
      this.uploads.update((rows) => rows.filter((r) => r.key !== key));
    } catch (e) {
      const err = e as { error?: { code?: string; message?: string }; status?: number };
      set({ error: this.message(err) || this.i18n.t('train.err.upload') });
      this.loadDatasets();
    }
  }

  startJob(): void {
    if (this.readiness()) return;
    const task = this.taskSel();
    const config: Record<string, unknown> = {};
    if (this.hasEpochs() && this.epochs) config['epochs'] = Number(this.epochs);
    if (task === 'tabular' && this.target.trim()) config['target'] = this.target.trim();
    if (task === 'action-recognition') {
      config['windowSec'] = Number(this.windowSec) || 2;
      config['mirror'] = this.mirror;
    }
    if (task === 'speech-recognition') config['language'] = this.language.trim().toLowerCase() || 'vi';
    if (task === 'audio-classification') config['maxSeconds'] = Number(this.maxSeconds) || 10;
    this.starting.set(true);
    this.error.set('');
    this.api
      .createJob({
        source: this.source(),
        task,
        datasetId: this.selected()?.id,
        modelId: BASE_MODELS[task] ? (this.modelIds[task] || '').trim() || BASE_MODELS[task] : undefined,
        offerId: this.offerId,
        config,
        autoStop: this.autoStop,
      })
      .subscribe({
        next: (job) => {
          this.starting.set(false);
          this.jobs.update((rows) => [job, ...rows]);
        },
        error: (e) => {
          this.starting.set(false);
          this.fail(e);
        },
      });
  }

  cancel(j: TrainingJob): void {
    const key = this.isActive(j) ? 'train.confirmCancel' : 'train.confirmRelease';
    if (!confirm(this.i18n.t(key))) return;
    this.api.cancelJob(j.jobId).subscribe({
      next: (row) => this.jobs.update((rows) => rows.map((x) => (x.jobId === row.jobId ? row : x))),
      error: (e) => this.fail(e),
    });
  }

  openWorkspace(j: TrainingJob): void {
    if (!j.rentalId) return;
    const win = window.open('about:blank', '_blank');
    this.gpu.open(j.rentalId, 'lab').subscribe({
      next: (res) => {
        const url = this.gpu.absoluteUrl(res.path);
        if (win) win.location.href = url;
        else window.location.href = url;
      },
      error: (e) => {
        win?.close();
        this.fail(e);
      },
    });
  }

  download(j: TrainingJob): void {
    this.api.artifact(j.jobId).subscribe({
      next: (r) => (window.location.href = r.url),
      error: (e) => this.fail(e),
    });
  }

  stageLabel(stage: string): string {
    const key = `train.stage.${stage}`;
    const text = this.i18n.t(key);
    return text === key ? stage : text;
  }

  metricLine(j: TrainingJob): string {
    const m = j.metrics || {};
    const parts: string[] = [];
    const pct = (v: unknown) => `${Math.round(Number(v) * 1000) / 10}%`;
    if (m['valAccuracy'] != null) parts.push(`${this.i18n.t('train.metric.valAccuracy')}: ${pct(m['valAccuracy'])}`);
    if (m['accuracy'] != null) parts.push(`${this.i18n.t('train.metric.accuracy')}: ${pct(m['accuracy'])}`);
    if (m['meanScore'] != null) parts.push(`${this.i18n.t('train.metric.meanScore')}: ${m['meanScore']}/100`);
    if (m['r2'] != null) parts.push(`R²: ${m['r2']}`);
    if (m['werAfter'] != null) parts.push(`WER: ${pct(m['werBefore'])} → ${pct(m['werAfter'])}`);
    else if (m['werBefore'] != null) parts.push(`${this.i18n.t('train.metric.werBase')}: ${pct(m['werBefore'])}`);
    if (m['hours'] != null) parts.push(`${m['hours']} ${this.i18n.t('train.metric.hours')}`);
    if (m['trainLoss'] != null) parts.push(`loss: ${m['trainLoss']}`);
    else if (m['loss'] != null) parts.push(`loss: ${m['loss']}`);
    if (m['labels'] != null && LABELLED_TASKS.includes(j.task)) parts.push(`${m['labels']} ${this.i18n.t('train.metric.labels')}`);
    return parts.join(' · ');
  }

  statusClass(j: TrainingJob): string {
    if (j.status === 'succeeded') return 'bg-emerald-500/15 text-emerald-400';
    if (j.status === 'running' || j.status === 'queued') return 'bg-sky-500/15 text-sky-400';
    if (j.status === 'paused') return 'bg-amber-500/15 text-amber-400';
    if (j.status === 'failed') return 'bg-red-500/15 text-red-400';
    return 'bg-zinc-500/15 text-muted';
  }

  private patchDataset(d: TrainingDataset): void {
    this.datasets.update((rows) => rows.map((x) => (x.id === d.id ? d : x)));
  }

  private message(e: { error?: { code?: string; message?: string } }): string {
    const code = e?.error?.code;
    for (const prefix of ['train.err.', 'gpu.err.']) {
      const key = code ? `${prefix}${code}` : '';
      const text = key ? this.i18n.t(key) : '';
      if (text && text !== key) return text;
    }
    return e?.error?.message || '';
  }

  private fail(e: { error?: { code?: string; message?: string } }): void {
    this.error.set(this.message(e) || this.i18n.t('gpu.err.PROVIDER_ERROR'));
  }
}
