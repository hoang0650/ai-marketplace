import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface AdminBankDeposit {
  id: string;
  status: 'pending' | 'credited' | 'expired' | 'cancelled';
  amountUsd: number;
  amountVnd: number;
  vndPerUsd: number;
  content: string;
  createdAt: string | null;
  creditedAt: string | null;
  expiresAt: string | null;
  reviewNote: string;
  user: { id: string; name: string; email: string } | null;
}

/** Admin: match VietQR bank transfers (by memo) and credit wallets with one click. */
@Component({
  selector: 'app-admin-bank-deposits',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, DatePipe],
  template: `
    <section class="page">
      <h1>Bank transfer deposits (VietQR)</h1>
      <p>Match the <strong>transfer content</strong> and VND amount on the bank statement, then credit. Nothing is credited automatically.</p>
      <div class="filters">
        <select [(ngModel)]="status" (change)="load()" name="status">
          <option value="pending">Pending ({{ pending() }})</option>
          <option value="credited">Credited</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
        <input [(ngModel)]="q" name="q" placeholder="Content (AIM …) / email" (keyup.enter)="load()" />
        <button type="button" (click)="load()">Search</button>
      </div>
      @if (msg()) { <p class="msg">{{ msg() }}</p> }
      <table class="tbl">
        <thead>
          <tr><th>Created</th><th>User</th><th>Content</th><th>VND</th><th>USD credit</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (d of items(); track d.id) {
            <tr>
              <td>{{ d.createdAt | date: 'short' }}</td>
              <td>{{ d.user?.email }}<br /><small>{{ d.user?.name }}</small></td>
              <td><code>{{ d.content }}</code></td>
              <td>{{ d.amountVnd | number: '1.0-0' }} ₫</td>
              <td>{{ d.amountUsd | currency: 'USD': 'symbol-narrow': '1.2-2' }}</td>
              <td>{{ d.status }}@if (d.reviewNote) {<br /><small>{{ d.reviewNote }}</small>}</td>
              <td>
                @if (d.status === 'pending' || d.status === 'expired') {
                  <button type="button" [disabled]="busy() === d.id" (click)="credit(d)">Credit wallet</button>
                  <button type="button" [disabled]="busy() === d.id" (click)="cancel(d)">Cancel</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7">No deposits.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [
    `
      .filters { display: flex; gap: 0.5rem; margin: 1rem 0; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th, .tbl td { padding: 0.5rem; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      .tbl button { margin-right: 0.25rem; }
    `,
  ],
})
export class AdminBankDepositsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/bank-deposits`;
  readonly items = signal<AdminBankDeposit[]>([]);
  readonly pending = signal(0);
  readonly busy = signal('');
  readonly msg = signal('');
  status = 'pending';
  q = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http
      .get<{ items: AdminBankDeposit[]; pending: number }>(this.base, { params: { status: this.status, q: this.q } })
      .subscribe({
        next: (r) => {
          this.items.set(r.items || []);
          this.pending.set(r.pending || 0);
        },
        error: (e) => this.msg.set(e?.error?.message || 'Load failed'),
      });
  }

  credit(d: AdminBankDeposit): void {
    const ok = confirm(`Credit ${d.amountUsd} USD to ${d.user?.email}?\nContent: ${d.content}\nAmount received must be ${d.amountVnd.toLocaleString('vi-VN')} VND.`);
    if (!ok) return;
    const note = prompt('Bank reference / note (optional)') || '';
    this.act(d, 'credit', note);
  }

  cancel(d: AdminBankDeposit): void {
    const note = prompt(`Cancel ${d.content}? Reason:`);
    if (note === null) return;
    this.act(d, 'cancel', note);
  }

  private act(d: AdminBankDeposit, action: 'credit' | 'cancel', note: string): void {
    this.busy.set(d.id);
    this.http.post(`${this.base}/${d.id}/${action}`, { note }).subscribe({
      next: () => {
        this.busy.set('');
        this.msg.set(`${action === 'credit' ? 'Credited' : 'Cancelled'} ${d.content}`);
        this.load();
      },
      error: (e) => {
        this.busy.set('');
        this.msg.set(e?.error?.message || 'Action failed');
      },
    });
  }
}
