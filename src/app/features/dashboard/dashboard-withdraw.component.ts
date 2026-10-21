import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { PayoutAccountResponse, WalletSummary, WalletTx } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';

type TxFilter = 'all' | 'credit' | 'debit' | 'deposit' | 'withdraw';
const PAGE = 12;

/** /dashboard/withdraw — balance cards, compact payout form, filterable paginated ledger. */
@Component({
  selector: 'app-dashboard-withdraw',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, TPipe],
  template: `
    <div class="wd">
      @if (summary(); as s) {
        <div class="wd__cards">
          <div class="wd__card wd__card--main">
            <span>{{ 'wd.available' | t }}</span>
            <strong>{{ s.available | currency: s.currency : 'symbol-narrow' : '1.2-2' }}</strong>
            <small>{{ 'wd.availableHint' | t }}</small>
          </div>
          <div class="wd__card">
            <span>{{ 'wd.held' | t }}</span>
            <strong>{{ s.held | currency: s.currency : 'symbol-narrow' : '1.2-2' }}</strong>
            <small>{{ 'wd.heldHint' | t: { h: s.holdHours || 48 } }}</small>
          </div>
          <div class="wd__card">
            <span>{{ 'wd.pending' | t }}</span>
            <strong>{{ pendingTotal() | currency: s.currency : 'symbol-narrow' : '1.2-2' }}</strong>
            <small>{{ 'wd.pendingHint' | t: { n: pendingCount() } }}</small>
          </div>
        </div>
      }

      <div class="wd__grid">
        <form class="wd__panel" (ngSubmit)="withdraw()">
          <h2>{{ 'wd.request' | t }}</h2>
          <label class="wd__label" for="wd-amount">{{ 'wd.amount' | t }}</label>
          <div class="wd__amount">
            <span>{{ summary()?.currency || 'USD' }}</span>
            <input id="wd-amount" type="number" min="1" step="0.01" name="amount" [(ngModel)]="amount" inputmode="decimal" />
            <button type="button" (click)="amount = maxAmount()">{{ 'wd.max' | t }}</button>
          </div>
          @if (summary()?.policy; as pol) {
            @if (pol.totalFeeRate !== null && pol.totalFeeRate !== undefined) {
              <p class="wd__fee">{{ 'wd.fee' | t: { r: (pol.totalFeeRate * 100).toFixed(1) } }}</p>
            }
          }

          <div class="wd__bank">
            <div class="wd__bank-head">
              <span class="wd__label">{{ 'wd.bank' | t }}</span>
              <a routerLink="/settings" class="wd__link">{{ 'wd.editBank' | t }}</a>
            </div>
            @if (account()?.account; as a) {
              <p><strong>{{ a.bankName }}</strong> · {{ a.accountNumberMasked }}</p>
              <p class="wd__muted">{{ a.accountName }}</p>
            } @else {
              <p class="wd__muted">{{ 'wd.noBank' | t }}</p>
            }
          </div>

          <button class="wd__submit" type="submit" [disabled]="busy() || !canSubmit()">{{ busy() ? '…' : ('wd.submit' | t) }}</button>
          @if (msg()) { <p class="wd__msg" [class.wd__msg--err]="msgErr()">{{ msg() }}</p> }

          @if (summary()?.holds?.length) {
            <div class="wd__holds">
              <span class="wd__label">{{ 'wd.holds' | t }}</span>
              @for (h of summary()!.holds; track h.orderId) {
                <div class="wd__hold">
                  <span class="wd__name">{{ h.productName }}</span>
                  <span class="badge" [class.badge--red]="h.kind === 'dispute'" [class.badge--amber]="h.kind !== 'dispute'">
                    {{ (h.kind === 'dispute' ? 'wd.hold.dispute' : 'wd.hold.window') | t }}
                  </span>
                  <span class="wd__amt">{{ h.amount | currency: h.currency : 'symbol-narrow' }}</span>
                </div>
              }
            </div>
          }
        </form>

        <section class="wd__panel">
          <div class="wd__ledger-head">
            <h2>{{ 'wd.history' | t }}</h2>
            <div class="wd__filters" role="tablist">
              @for (f of filters; track f) {
                <button type="button" role="tab" [class.on]="filter() === f" [attr.aria-selected]="filter() === f" (click)="setFilter(f)">
                  {{ ('wd.f.' + f) | t }}
                </button>
              }
            </div>
          </div>
          <label class="wd__check"><input type="checkbox" [ngModel]="hideFailed()" (ngModelChange)="hideFailed.set($event); page.set(0)" name="hf" /> {{ 'wd.hideFailed' | t }}</label>
          @if (!visible().length) {
            <p class="wd__muted wd__empty">{{ 'wd.empty' | t }}</p>
          } @else {
            <table class="wd__table">
              <thead><tr><th>{{ 'wd.col.date' | t }}</th><th>{{ 'wd.col.type' | t }}</th><th>{{ 'wd.col.note' | t }}</th><th>{{ 'wd.col.status' | t }}</th><th class="r">{{ 'wd.col.amount' | t }}</th></tr></thead>
              <tbody>
                @for (t of visible(); track t.id) {
                  <tr>
                    <td class="nowrap">{{ t.createdAt | date: 'dd/MM/yy' }}</td>
                    <td><span class="type type--{{ t.type }}">{{ ('wd.f.' + t.type) | t }}</span></td>
                    <td class="note" [title]="t.note">{{ t.note }}</td>
                    <td><span class="badge badge--{{ t.status || 'completed' }}">{{ ('wd.s.' + (t.status || 'completed')) | t }}</span></td>
                    <td class="r nowrap" [class.neg]="t.type === 'debit' || t.type === 'withdraw'">
                      {{ t.type === 'debit' || t.type === 'withdraw' ? '−' : '+' }}{{ t.amount | currency: t.currency : 'symbol-narrow' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="wd__pager">
              <button type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">‹</button>
              <span>{{ page() + 1 }} / {{ pages() }} · {{ filtered().length }}</span>
              <button type="button" [disabled]="page() + 1 >= pages()" (click)="page.set(page() + 1)">›</button>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .wd { display: grid; gap: 1.25rem; }
    .wd__cards { display: grid; gap: .75rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (max-width: 760px) { .wd__cards { grid-template-columns: 1fr; } }
    .wd__card { display: grid; gap: .2rem; padding: 1rem 1.15rem; border: 1px solid var(--color-line, #e5e2da); border-radius: 14px; background: var(--color-surface, #fff); }
    .wd__card span { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; opacity: .65; font-weight: 600; }
    .wd__card strong { font-size: 1.55rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .wd__card small { font-size: .75rem; opacity: .6; }
    .wd__card--main { border-color: #c9a961; background: linear-gradient(135deg, rgba(201,169,97,.12), transparent); }
    .wd__grid { display: grid; gap: 1.25rem; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); align-items: start; }
    @media (max-width: 960px) { .wd__grid { grid-template-columns: 1fr; } }
    .wd__panel { display: grid; gap: .7rem; padding: 1.15rem; border: 1px solid var(--color-line, #e5e2da); border-radius: 14px; background: var(--color-surface, #fff); min-width: 0; }
    .wd__panel h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .wd__label { font-size: .75rem; font-weight: 600; opacity: .7; }
    .wd__amount { display: flex; align-items: center; height: 2.6rem; border: 1px solid var(--color-line, #d9d5cb); border-radius: 10px; overflow: hidden; }
    .wd__amount span { padding: 0 .7rem; font-size: .8rem; font-weight: 600; opacity: .6; border-right: 1px solid var(--color-line, #e5e2da); height: 100%; display: flex; align-items: center; }
    .wd__amount input { flex: 1; min-width: 0; height: 100%; border: 0; padding: 0 .7rem; font-size: 1rem; background: transparent; color: inherit; outline: none; }
    .wd__amount button { height: 100%; padding: 0 .8rem; border: 0; border-left: 1px solid var(--color-line, #e5e2da); background: transparent; color: #a8883f; font-weight: 700; font-size: .78rem; cursor: pointer; }
    .wd__fee, .wd__muted { margin: 0; font-size: .78rem; opacity: .65; }
    .wd__bank { padding: .7rem .8rem; border-radius: 10px; background: rgba(127,127,127,.07); font-size: .85rem; }
    .wd__bank p { margin: .15rem 0 0; }
    .wd__bank-head { display: flex; justify-content: space-between; }
    .wd__link { font-size: .75rem; color: #a8883f; font-weight: 600; }
    .wd__submit { height: 2.5rem; border: 0; border-radius: 10px; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
    :host-context([data-theme='dark']) .wd__submit { background: #c9a961; color: #111; }
    .wd__submit:disabled { opacity: .45; cursor: not-allowed; }
    .wd__msg { margin: 0; font-size: .82rem; color: #2f8f5b; } .wd__msg--err { color: #d0453a; }
    .wd__holds { display: grid; gap: .35rem; border-top: 1px solid var(--color-line, #e5e2da); padding-top: .6rem; }
    .wd__hold { display: grid; grid-template-columns: 1fr auto auto; gap: .5rem; align-items: center; font-size: .8rem; }
    .wd__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wd__amt { font-variant-numeric: tabular-nums; font-weight: 600; }
    .wd__ledger-head { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: space-between; align-items: center; }
    .wd__filters { display: flex; gap: .25rem; flex-wrap: wrap; }
    .wd__filters button { border: 1px solid var(--color-line, #e5e2da); background: transparent; color: inherit; border-radius: 999px; padding: .2rem .7rem; font-size: .75rem; cursor: pointer; }
    .wd__filters button.on { background: #111; color: #fff; border-color: #111; }
    .wd__check { font-size: .75rem; opacity: .75; display: flex; gap: .35rem; align-items: center; }
    .wd__empty { padding: 2rem 0; text-align: center; }
    .wd__table { width: 100%; border-collapse: collapse; font-size: .8rem; table-layout: fixed; }
    .wd__table th { text-align: left; font-size: .68rem; text-transform: uppercase; letter-spacing: .05em; opacity: .55; padding: .35rem .4rem; border-bottom: 1px solid var(--color-line, #e5e2da); }
    .wd__table th:nth-child(1) { width: 4.6rem; } .wd__table th:nth-child(2) { width: 5.6rem; } .wd__table th:nth-child(4) { width: 6.4rem; } .wd__table th:nth-child(5) { width: 6.6rem; }
    .wd__table td { padding: .5rem .4rem; border-bottom: 1px solid rgba(127,127,127,.12); vertical-align: middle; }
    .note { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .85; }
    .r { text-align: right; } .nowrap { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .neg { color: #d0453a; } td.r:not(.neg) { color: #2f8f5b; font-weight: 600; }
    .type { font-weight: 600; }
    .badge { display: inline-block; padding: .1rem .5rem; border-radius: 999px; font-size: .68rem; font-weight: 700; background: rgba(127,127,127,.15); }
    .badge--completed { background: rgba(47,143,91,.14); color: #2f8f5b; }
    .badge--pending, .badge--amber { background: rgba(214,158,46,.16); color: #a86f00; }
    .badge--failed, .badge--red { background: rgba(208,69,58,.14); color: #d0453a; }
    .badge--cancelled { background: rgba(127,127,127,.15); color: #777; }
    .wd__pager { display: flex; justify-content: flex-end; align-items: center; gap: .6rem; font-size: .78rem; }
    .wd__pager button { width: 1.9rem; height: 1.9rem; border: 1px solid var(--color-line, #e5e2da); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
    .wd__pager button:disabled { opacity: .35; }
  `],
})
export class DashboardWithdrawComponent implements OnInit {
  private readonly api = inject(DashboardService);
  readonly txs = signal<WalletTx[]>([]);
  readonly summary = signal<WalletSummary | null>(null);
  readonly account = signal<PayoutAccountResponse | null>(null);
  readonly msg = signal('');
  readonly msgErr = signal(false);
  readonly busy = signal(false);
  readonly filter = signal<TxFilter>('all');
  readonly hideFailed = signal(true);
  readonly page = signal(0);
  readonly filters: TxFilter[] = ['all', 'credit', 'debit', 'deposit', 'withdraw'];
  amount = 100;

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.txs().filter(
      (t) => (f === 'all' || t.type === f) && !(this.hideFailed() && (t.status === 'failed' || t.status === 'cancelled')),
    );
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  readonly visible = computed(() => this.filtered().slice(this.page() * PAGE, (this.page() + 1) * PAGE));
  readonly pendingTxs = computed(() => this.txs().filter((t) => t.type === 'withdraw' && t.status === 'pending'));
  readonly pendingTotal = computed(() => this.pendingTxs().reduce((a, t) => a + (Number(t.amount) || 0), 0));
  readonly pendingCount = computed(() => this.pendingTxs().length);

  ngOnInit(): void {
    this.reload();
  }

  maxAmount(): number {
    return Math.floor((this.summary()?.available || 0) * 100) / 100;
  }

  canSubmit(): boolean {
    const a = Number(this.amount);
    return a > 0 && a <= this.maxAmount() && this.summary()?.policy?.canWithdraw !== false;
  }

  setFilter(f: TxFilter): void {
    this.filter.set(f);
    this.page.set(0);
  }

  reload(): void {
    this.api.wallet().subscribe((t) => this.txs.set(t));
    this.api.walletSummary().subscribe((s) => this.summary.set(s));
    this.api.payoutAccount().subscribe({ next: (a) => this.account.set(a), error: () => this.account.set(null) });
  }

  withdraw(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.api.withdraw(Number(this.amount)).subscribe({
      next: (tx) => {
        this.busy.set(false);
        this.txs.update((list) => [tx, ...list]);
        this.msgErr.set(false);
        this.msg.set(`✓ ${tx.amount} — pending admin confirmation`);
        this.api.walletSummary().subscribe((s) => this.summary.set(s));
      },
      error: (err) => {
        this.busy.set(false);
        this.msgErr.set(true);
        this.msg.set(err?.error?.message || 'Withdraw failed');
      },
    });
  }
}
