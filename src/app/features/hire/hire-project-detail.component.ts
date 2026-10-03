import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { HireMilestone, HireProject, HireService, HireTerminateReason } from '../../services/hire.service';
import { ChatService, DashboardService } from '../../services/api.services';
import { BuilderProject, BuilderService } from '../builder/builder.service';
import { DeviceFrameComponent } from '../builder/device-frame.component';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

interface MilestoneRow {
  title: string;
  amount: number;
  due: string;
}

const DAY = 86_400_000;

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** One hire project: negotiate the quote, set the payout phases, review demos, accept or terminate. */
@Component({
  selector: 'app-hire-project-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule, TPipe, DeviceFrameComponent],
  templateUrl: './hire-project-detail.component.html',
  styleUrl: './hire-project-detail.component.scss',
})
export class HireProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hire = inject(HireService);
  private readonly chat = inject(ChatService);
  private readonly dashboard = inject(DashboardService);
  private readonly builder = inject(BuilderService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(I18nService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly project = signal<HireProject | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly busy = signal(false);
  readonly actionError = signal('');
  readonly walletAvailable = signal<number | null>(null);
  readonly builderProjects = signal<BuilderProject[]>([]);

  quoteAmount: number | null = null;
  quoteNote = '';
  counterAmount: number | null = null;
  counterNote = '';
  declineNote = '';
  readonly rows = signal<MilestoneRow[]>([]);
  demoBuilderId = '';
  demoUrl = '';
  demoNote = '';
  revisionNote = '';
  showRevision = false;
  terminateReason: HireTerminateReason = 'not_as_requested';
  terminateNote = '';
  showTerminate = false;

  readonly role = computed(() => this.project()?.role || null);
  readonly current = computed<HireMilestone | null>(() => {
    const p = this.project();
    return p?.milestones.find((m) => m.id === p.currentMilestoneId) || null;
  });
  readonly rowsTotal = computed(() => round2(this.rows().reduce((s, r) => s + (Number(r.amount) || 0), 0)));
  readonly rowsMatch = computed(() => Math.abs(this.rowsTotal() - (this.project()?.quote.amount || 0)) < 0.01);
  readonly minDue = ymd(new Date(Date.now() + DAY));
  readonly previewSrc = computed<SafeResourceUrl | null>(() => {
    const m = this.current();
    const done = this.project()?.milestones.filter((x) => x.previewUrl) || [];
    const src = m?.previewUrl ? m : done[done.length - 1];
    if (!src?.previewUrl) return null;
    const device = src.previewKind === 'app' ? '?device=iphone' : '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${src.previewUrl}${device}`);
  });
  readonly previewKind = computed(() => {
    const m = this.current();
    if (m?.previewUrl) return m.previewKind;
    const done = this.project()?.milestones.filter((x) => x.previewUrl) || [];
    return done[done.length - 1]?.previewKind || null;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => this.load(pm.get('id') || ''));
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.hire.get(id).subscribe({
      next: (p) => {
        this.apply(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message || this.i18n.t('hire.err.generic'));
        this.loading.set(false);
      },
    });
  }

  private apply(p: HireProject): void {
    this.project.set(p);
    this.actionError.set('');
    this.quoteAmount = p.quote.amount || p.budget || p.listPrice || null;
    this.counterAmount = p.quote.amount || null;
    if (p.role === 'buyer' && p.status === 'quoted') {
      this.resetRows(3);
      this.loadWallet();
    }
    if (p.role === 'buyer' && p.status === 'active') this.loadWallet();
    if (p.role === 'seller' && p.status === 'active' && p.demoKind && !this.builderProjects().length) {
      this.builder.list(p.demoKind).subscribe({
        next: (res) => {
          this.builderProjects.set(res.projects);
          if (!this.demoBuilderId && res.projects[0]) this.demoBuilderId = res.projects[0].id;
        },
        error: () => this.builderProjects.set([]),
      });
    }
  }

  private loadWallet(): void {
    this.dashboard.walletSummary().subscribe({
      next: (w) => this.walletAvailable.set(w.available),
      error: () => this.walletAvailable.set(null),
    });
  }

  /** Splits the agreed amount evenly over `count` phases, due dates spread up to the desired deadline. */
  resetRows(count = this.rows().length || 3): void {
    const p = this.project();
    if (!p) return;
    const n = Math.min(10, Math.max(1, count));
    const total = p.quote.amount || 0;
    const each = Math.floor((total / n) * 100) / 100;
    const deadline = p.desiredDeadline ? new Date(p.desiredDeadline).getTime() : 0;
    const span = deadline > Date.now() + n * DAY ? deadline - Date.now() : n * 7 * DAY;
    const rows: MilestoneRow[] = [];
    for (let i = 0; i < n; i += 1) {
      rows.push({
        title: this.i18n.t('hire.ms.defaultTitle', { n: i + 1 }),
        amount: i === n - 1 ? round2(total - each * (n - 1)) : each,
        due: ymd(new Date(Date.now() + Math.round((span * (i + 1)) / n))),
      });
    }
    this.rows.set(rows);
  }

  addRow(): void {
    if (this.rows().length >= 10) return;
    this.resetRows(this.rows().length + 1);
  }

  removeRow(): void {
    if (this.rows().length <= 1) return;
    this.resetRows(this.rows().length - 1);
  }

  touchRows(): void {
    this.rows.update((r) => [...r]);
  }

  private run(call: Observable<HireProject>, after?: (p: HireProject) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    call.subscribe({
      next: (p) => {
        this.busy.set(false);
        this.apply(p);
        after?.(p);
      },
      error: (err) => {
        this.busy.set(false);
        const code = err?.error?.code;
        if (code === 'INSUFFICIENT_WALLET' || code === 'PAYOUT_HELD') {
          this.actionError.set(this.i18n.t('hire.err.wallet', { amount: err.error.amount ?? '' }));
        } else {
          this.actionError.set(err?.error?.message || this.i18n.t('hire.err.generic'));
        }
      },
    });
  }

  private confirm(key: string, params?: Record<string, string | number>): boolean {
    return !this.browser || window.confirm(this.i18n.t(key, params));
  }

  sendQuote(): void {
    const p = this.project();
    if (!p || !(Number(this.quoteAmount) > 0)) return;
    this.run(this.hire.quote(p.id, Number(this.quoteAmount), this.quoteNote.trim()), () => (this.quoteNote = ''));
  }

  decline(): void {
    const p = this.project();
    if (!p || !this.confirm('hire.confirm.decline')) return;
    this.run(this.hire.decline(p.id, this.declineNote.trim()));
  }

  sendCounter(): void {
    const p = this.project();
    if (!p || !(Number(this.counterAmount) > 0)) return;
    this.run(this.hire.counter(p.id, Number(this.counterAmount), this.counterNote.trim()), () => (this.counterNote = ''));
  }

  cancel(): void {
    const p = this.project();
    if (!p || !this.confirm('hire.confirm.cancel')) return;
    this.run(this.hire.cancel(p.id));
  }

  accept(): void {
    const p = this.project();
    if (!p || !this.rowsMatch()) return;
    const milestones = this.rows().map((r) => ({
      title: r.title.trim(),
      amount: round2(r.amount),
      dueAt: new Date(`${r.due}T23:59:00`).toISOString(),
    }));
    this.run(this.hire.accept(p.id, milestones));
  }

  submitDemo(): void {
    const p = this.project();
    if (!p) return;
    this.run(
      this.hire.submit(p.id, {
        builderProjectId: p.demoKind ? this.demoBuilderId || undefined : undefined,
        demoUrl: this.demoUrl.trim() || undefined,
        note: this.demoNote.trim(),
      }),
      () => {
        this.demoUrl = '';
        this.demoNote = '';
      },
    );
  }

  approve(): void {
    const p = this.project();
    const m = this.current();
    if (!p || !m) return;
    if (!this.confirm('hire.confirm.approve', { phase: m.index + 1, amount: `${m.amount} ${p.currency}` })) return;
    this.run(this.hire.approve(p.id));
  }

  requestRevision(): void {
    const p = this.project();
    if (!p || this.revisionNote.trim().length < 8) return;
    this.run(this.hire.revision(p.id, this.revisionNote.trim()), () => {
      this.revisionNote = '';
      this.showRevision = false;
    });
  }

  terminate(): void {
    const p = this.project();
    if (!p || this.terminateNote.trim().length < 8 || !this.confirm('hire.confirm.terminate')) return;
    this.run(this.hire.terminate(p.id, this.terminateReason, this.terminateNote.trim()), () => {
      this.showTerminate = false;
    });
  }

  openChat(): void {
    const p = this.project();
    if (!p) return;
    this.chat.start({ productId: p.productId }).subscribe({
      next: (c) => void this.router.navigate(['/messages', c.id]),
      error: (err) => this.actionError.set(err?.error?.message || this.i18n.t('hire.err.generic')),
    });
  }
}
