import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../services/seo.service';
import { ProductService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

type Tab = 'orders' | 'complaints' | 'refunds' | 'projects' | 'licenses' | 'keys';
const TABS: Tab[] = ['orders', 'complaints', 'refunds', 'projects', 'licenses', 'keys'];
const API = environment.apiUrl;

interface BuyerOrder { id: string; productName: string; amount: number; currency: string; status: string; disputeStatus: string; canDispute?: boolean; createdAt: string; buyerId?: string }
interface BuyerComplaint { id: string; caseRef: string; productName: string; status: string; createdAt: string; orderId?: string; hireProjectId?: string; decision?: string }
interface WalletTx { id: string; type: string; amount: number; currency: string; note: string; status: string; createdAt: string }
interface HireRow { id: string; role: string; status: string; productName: string; sellerName: string; listPrice: number; currency: string; milestones?: Array<{ status: string }> }
interface LicenseRow { id: string; licenseKey: string; productName: string; sellerName: string; term: string; expiresAt: string | null; status: string; valid: boolean }

/** /account/console — Bảng điều khiển người mua: đơn hàng, khiếu nại, hoàn tiền, dự án dịch vụ, license, API key. */
@Component({
  selector: 'app-buyer-console',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, TPipe],
  styles: [`
    .hub-tabs { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.25rem; }
    .hub-tab { border: 1px solid var(--line, rgba(0,0,0,.15)); border-radius: 999px; padding: .4rem .9rem; font-size: .85rem; background: transparent; cursor: pointer; }
    .hub-tab.is-on { background: #111; color: #fff; border-color: #111; }
    .hub-tab b { margin-left: .35rem; font-weight: 600; opacity: .8; }
    .hub-cards { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top: 1.25rem; }
    .hub-card { border: 1px solid var(--line, rgba(0,0,0,.12)); border-radius: 10px; padding: .8rem 1rem; text-align: left; background: var(--panel, #fff); cursor: pointer; }
    .hub-card strong { display: block; font-size: 1.4rem; }
    .hub-card span { font-size: .8rem; opacity: .7; }
    .hub-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    .hub-table th, .hub-table td { text-align: left; padding: .55rem .5rem; border-bottom: 1px solid var(--line, rgba(0,0,0,.08)); vertical-align: top; }
    .hub-table th { font-weight: 600; opacity: .7; font-size: .78rem; text-transform: uppercase; }
    .hub-actions { display: flex; flex-wrap: wrap; gap: .5rem; font-size: .8rem; }
    .hub-badge { display: inline-block; border-radius: 999px; padding: .1rem .55rem; font-size: .75rem; background: rgba(0,0,0,.06); }
    .hub-badge.ok { background: #e6f6ec; color: #11683a; } .hub-badge.warn { background: #fff4d6; color: #8a5a00; } .hub-badge.bad { background: #fde8e8; color: #9b1c1c; }
    .hub-empty { padding: 1.5rem 0; opacity: .7; }
    .hub-note { font-size: .8rem; opacity: .75; margin-top: .75rem; }
    .hub-wrap { overflow-x: auto; }
  `],
  template: `
    <section class="page route-enter">
      <h1 class="font-display text-3xl">{{ 'bhub.title' | t }}</h1>
      <p class="mt-2 text-muted">{{ 'bhub.subtitle' | t }}</p>

      <div class="hub-cards">
        <button type="button" class="hub-card" (click)="go('orders')"><strong>{{ orders().length }}</strong><span>{{ 'bhub.card.orders' | t }}</span></button>
        <button type="button" class="hub-card" (click)="go('complaints')"><strong>{{ openComplaints() }}</strong><span>{{ 'bhub.card.complaintsOpen' | t }}</span></button>
        <button type="button" class="hub-card" (click)="go('refunds')"><strong>{{ refundTotal() | currency: 'USD' }}</strong><span>{{ 'bhub.card.refunded' | t }}</span></button>
        <button type="button" class="hub-card" (click)="go('projects')"><strong>{{ activeProjects() }}</strong><span>{{ 'bhub.card.projectsActive' | t }}</span></button>
        <button type="button" class="hub-card" (click)="go('licenses')"><strong>{{ validLicenses() }}</strong><span>{{ 'bhub.card.licenses' | t }}</span></button>
      </div>

      <nav class="hub-tabs" role="tablist">
        @for (x of tabs; track x) {
          <button type="button" role="tab" class="hub-tab" [class.is-on]="tab() === x" [attr.aria-selected]="tab() === x" (click)="go(x)">
            {{ 'bhub.tab.' + x | t }}<b>{{ count(x) }}</b>
          </button>
        }
        <a class="hub-tab" routerLink="/wallet">{{ 'bhub.tab.wallet' | t }}</a>
      </nav>

      <div class="panel mt-6 hub-wrap">
        @switch (tab()) {
          @case ('orders') {
            <h2 class="font-display text-xl">{{ 'bhub.orders.title' | t }}</h2>
            @if (orders().length) {
              <table class="hub-table mt-3">
                <thead><tr><th>{{ 'bhub.col.date' | t }}</th><th>{{ 'bhub.col.product' | t }}</th><th>{{ 'bhub.col.amount' | t }}</th><th>{{ 'bhub.col.status' | t }}</th><th>{{ 'bhub.col.actions' | t }}</th></tr></thead>
                <tbody>
                  @for (o of orders(); track o.id) {
                    <tr>
                      <td>{{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}<br /><span class="hub-note">#{{ o.id.slice(-8).toUpperCase() }}</span></td>
                      <td>{{ o.productName }}</td>
                      <td>{{ o.amount | currency: o.currency || 'USD' }}</td>
                      <td>
                        <span class="hub-badge" [class.ok]="o.status === 'paid'" [class.warn]="o.status === 'pending'" [class.bad]="o.status === 'refunded'">{{ 'bhub.order.status.' + o.status | t }}</span>
                        @if (o.disputeStatus && o.disputeStatus !== 'none') { <br /><span class="hub-badge warn">{{ 'bhub.order.dispute.' + o.disputeStatus | t }}</span> }
                      </td>
                      <td class="hub-actions">
                        <a class="link-accent" [routerLink]="['/orders', o.id]">{{ 'bhub.order.detail' | t }}</a>
                        @if (o.status === 'paid' && (!o.disputeStatus || o.disputeStatus === 'none')) {
                          <a class="link-accent" routerLink="/complaints/new" [queryParams]="{ orderId: o.id, kind: 'buyer_seller' }">{{ 'bhub.order.complain' | t }}</a>
                          <a class="link-accent" routerLink="/complaints/new" [queryParams]="{ orderId: o.id, kind: 'buyer_seller', intent: 'refund' }">{{ 'bhub.order.refund' | t }}</a>
                        } @else if (complaintFor(o.id); as c) {
                          <a class="link-accent" [routerLink]="['/complaints', c.id]">{{ c.caseRef }}</a>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="hub-note">{{ 'bhub.orders.note' | t }}</p>
            } @else { <p class="hub-empty">{{ 'bhub.orders.empty' | t }}</p> }
          }
          @case ('complaints') {
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-display text-xl">{{ 'bhub.complaints.title' | t }}</h2>
              <a class="btn btn-outline text-xs" routerLink="/complaints/new">{{ 'bhub.complaints.new' | t }}</a>
            </div>
            @if (complaints().length) {
              <table class="hub-table mt-3">
                <thead><tr><th>{{ 'bhub.col.case' | t }}</th><th>{{ 'bhub.col.product' | t }}</th><th>{{ 'bhub.col.status' | t }}</th><th>{{ 'bhub.col.date' | t }}</th><th></th></tr></thead>
                <tbody>
                  @for (c of complaints(); track c.id) {
                    <tr>
                      <td><strong>{{ c.caseRef }}</strong></td>
                      <td>{{ c.productName || '—' }}</td>
                      <td><span class="hub-badge" [class.ok]="c.status === 'closed' || c.status === 'decided'" [class.warn]="c.status !== 'closed' && c.status !== 'decided'">{{ 'complaint.status.' + c.status | t }}</span>
                        @if (c.decision) { <br /><span class="hub-note">{{ 'complaint.decision.' + c.decision | t }}</span> }</td>
                      <td>{{ c.createdAt | date: 'dd/MM/yyyy' }}</td>
                      <td class="hub-actions"><a class="link-accent" [routerLink]="['/complaints', c.id]">{{ 'bhub.complaints.open' | t }}</a>
                        @if (c.hireProjectId) { <a class="link-accent" [routerLink]="['/hire/projects', c.hireProjectId]">{{ 'bhub.tab.projects' | t }}</a> }</td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="hub-note">{{ 'bhub.complaints.note' | t }}</p>
            } @else { <p class="hub-empty">{{ 'bhub.complaints.empty' | t }}</p> }
          }
          @case ('refunds') {
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-display text-xl">{{ 'bhub.refunds.title' | t }}</h2>
              <a class="btn btn-outline text-xs" routerLink="/wallet">{{ 'bhub.refunds.ledger' | t }}</a>
            </div>
            @if (refunds().length) {
              <table class="hub-table mt-3">
                <thead><tr><th>{{ 'bhub.col.date' | t }}</th><th>{{ 'bhub.col.content' | t }}</th><th>{{ 'bhub.col.amount' | t }}</th><th>{{ 'bhub.col.status' | t }}</th></tr></thead>
                <tbody>
                  @for (r of refunds(); track r.id) {
                    <tr><td>{{ r.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td><td>{{ r.note }}</td><td>+{{ r.amount | currency: r.currency || 'USD' }}</td>
                      <td><span class="hub-badge ok">{{ (r.status === 'completed' ? 'bhub.refund.done' : 'bhub.refund.pending') | t }}</span></td></tr>
                  }
                </tbody>
              </table>
            } @else { <p class="hub-empty">{{ 'bhub.refunds.empty' | t }}</p> }
            <p class="hub-note">{{ 'bhub.refunds.note' | t }} <a class="link-accent" routerLink="/legal/chinh-sach-hoan-tien">{{ 'bhub.refunds.policy' | t }}</a></p>
          }
          @case ('projects') {
            <h2 class="font-display text-xl">{{ 'bhub.projects.title' | t }}</h2>
            @if (projects().length) {
              <table class="hub-table mt-3">
                <thead><tr><th>{{ 'bhub.col.product' | t }}</th><th>{{ 'bhub.col.seller' | t }}</th><th>{{ 'bhub.col.amount' | t }}</th><th>{{ 'bhub.col.progress' | t }}</th><th>{{ 'bhub.col.status' | t }}</th><th></th></tr></thead>
                <tbody>
                  @for (p of projects(); track p.id) {
                    <tr><td>{{ p.productName }}</td><td>{{ p.sellerName }}</td><td>{{ p.listPrice | currency: p.currency || 'USD' }}</td>
                      <td>{{ approved(p) }}/{{ p.milestones?.length || 0 }} {{ 'bhub.projects.phases' | t }}</td>
                      <td><span class="hub-badge" [class.ok]="p.status === 'completed'" [class.warn]="p.status === 'active'" [class.bad]="p.status === 'terminated'">{{ 'bhub.project.status.' + p.status | t }}</span></td>
                      <td><a class="link-accent" [routerLink]="['/hire/projects', p.id]">{{ 'bhub.projects.open' | t }}</a></td></tr>
                  }
                </tbody>
              </table>
            } @else { <p class="hub-empty">{{ 'bhub.projects.empty' | t }}</p> }
          }
          @case ('licenses') {
            <h2 class="font-display text-xl">{{ 'bhub.licenses.title' | t }}</h2>
            @if (licenses().length) {
              <table class="hub-table mt-3">
                <thead><tr><th>{{ 'bhub.col.product' | t }}</th><th>{{ 'bhub.col.seller' | t }}</th><th>{{ 'bhub.col.key' | t }}</th><th>{{ 'bhub.col.expires' | t }}</th><th>{{ 'bhub.col.status' | t }}</th></tr></thead>
                <tbody>
                  @for (l of licenses(); track l.id) {
                    <tr><td>{{ l.productName }}</td><td>{{ l.sellerName }}</td><td><code>{{ l.licenseKey }}</code></td>
                      <td>{{ l.expiresAt ? (l.expiresAt | date: 'dd/MM/yyyy') : ('bhub.licenses.perpetual' | t) }}</td>
                      <td><span class="hub-badge" [class.ok]="l.valid" [class.bad]="!l.valid">{{ (l.valid ? 'bhub.licenses.valid' : 'bhub.licenses.expired') | t }}</span></td></tr>
                  }
                </tbody>
              </table>
            } @else { <p class="hub-empty">{{ 'bhub.licenses.empty' | t }}</p> }
          }
          @case ('keys') {
            <h2 class="font-display text-xl">{{ 'bhub.keys.title' | t }}</h2>
            <p class="hub-note">{{ 'bhub.keys.hint' | t }}</p>
            <form class="mt-4 grid gap-3" style="max-width: 480px" (ngSubmit)="createKey()">
              <select class="input" name="slug" [(ngModel)]="productSlug" required>
                <option value="">{{ 'bhub.keys.select' | t }}</option>
                @for (p of products(); track p.id) { <option [value]="p.slug">{{ p.name }}</option> }
              </select>
              <button class="btn btn-fill text-sm" type="submit" [disabled]="busy()">{{ 'bhub.keys.create' | t }}</button>
            </form>
            @if (freshKey()) { <p class="mt-3 break-all rounded-lg bg-black/40 p-3 font-mono text-xs">{{ freshKey() }}</p> }
            <ul class="mt-4 space-y-2 text-sm">
              @for (k of keys(); track k.id) {
                <li class="flex justify-between gap-2 border-b border-line py-2"><span>{{ k.prefix }}… · {{ k.productSlug }}</span>
                  <button class="text-xs text-red-400" type="button" (click)="revoke(k.id)">{{ 'bhub.keys.revoke' | t }}</button></li>
              } @empty { <li class="hub-empty">{{ 'bhub.keys.empty' | t }}</li> }
            </ul>
            <p class="hub-note"><a class="link-accent" routerLink="/training">{{ 'bhub.keys.training' | t }}</a> · <a class="link-accent" routerLink="/dashboard/gpu">{{ 'bhub.keys.gpu' | t }}</a></p>
          }
        }
      </div>
    </section>
  `,
})
export class BuyerConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  readonly tabs = TABS;
  readonly tab = signal<Tab>('orders');
  readonly orders = signal<BuyerOrder[]>([]);
  readonly complaints = signal<BuyerComplaint[]>([]);
  readonly wallet = signal<WalletTx[]>([]);
  readonly projects = signal<HireRow[]>([]);
  readonly licenses = signal<LicenseRow[]>([]);
  readonly products = signal<Product[]>([]);
  readonly keys = signal<Array<{ id: string; prefix: string; productSlug: string }>>([]);
  readonly freshKey = signal('');
  readonly busy = signal(false);
  productSlug = '';

  /** Refunds: wallet credits that are refunds (hoàn tiền/hoàn phí) — the wallet ledger is the source of truth. */
  readonly refunds = computed(() => this.wallet().filter((t) => t.type === 'credit' && /(^|\\s)(hoàn (tiền|phí)|refund)/i.test(t.note || '')));
  readonly refundTotal = computed(() => this.refunds().reduce((s, r) => s + (Number(r.amount) || 0), 0));
  readonly openComplaints = computed(() => this.complaints().filter((c) => c.status !== 'closed').length);
  readonly activeProjects = computed(() => this.projects().filter((p) => p.status === 'active').length);
  readonly validLicenses = computed(() => this.licenses().filter((l) => l.valid).length);

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('bhub.title') });
    this.route.queryParamMap.subscribe((q) => {
      const t = q.get('tab') as Tab;
      this.tab.set(TABS.includes(t) ? t : 'orders');
      if (this.tab() === 'keys' && !this.products().length) this.productsApi.list().subscribe((p) => this.products.set(p));
    });
    const me = this.auth.user()?.id;
    this.get<BuyerOrder[]>('/orders', (r) => this.orders.set((r || []).filter((o) => !me || !o.buyerId || o.buyerId === me)));
    this.get<BuyerComplaint[]>('/complaints', (r) => this.complaints.set(r || []));
    this.get<WalletTx[]>('/wallet', (r) => this.wallet.set(Array.isArray(r) ? r : []));
    this.get<HireRow[]>('/hire/projects', (r) => this.projects.set((r || []).filter((p) => p.role === 'buyer')));
    this.get<LicenseRow[]>('/licenses/me', (r) => this.licenses.set(r || []));
    this.reloadKeys();
  }

  private get<T>(path: string, ok: (r: T) => void): void {
    this.http.get<T>(`${API}${path}`).subscribe({ next: ok, error: () => ok([] as unknown as T) });
  }

  go(t: Tab): void {
    this.router.navigate([], { queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  count(t: Tab): number {
    return { orders: this.orders(), complaints: this.complaints(), refunds: this.refunds(), projects: this.projects(), licenses: this.licenses(), keys: this.keys() }[t].length;
  }

  complaintFor(orderId: string): BuyerComplaint | undefined {
    return this.complaints().find((c) => c.orderId === orderId);
  }

  approved(p: HireRow): number {
    return (p.milestones || []).filter((m) => m.status === 'approved').length;
  }

  reloadKeys(): void {
    this.get<Array<{ id: string; prefix: string; productSlug: string }>>('/api-keys', (r) => this.keys.set(r || []));
  }

  createKey(): void {
    if (!this.productSlug) return;
    this.busy.set(true);
    this.http.post<{ apiKey: string }>(`${API}/api-keys`, { productSlug: this.productSlug }).subscribe({
      next: (r) => { this.freshKey.set(r.apiKey || ''); this.busy.set(false); this.reloadKeys(); },
      error: () => this.busy.set(false),
    });
  }

  revoke(id: string): void {
    this.http.delete(`${API}/api-keys/${id}`).subscribe({ next: () => this.reloadKeys() });
  }
}
