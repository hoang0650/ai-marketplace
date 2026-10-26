import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/api.services';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AdminFacet, AdminPage, AdminProductRow, AdminUserRow } from '../../models/marketplace.models';
import { ADMIN_PEOPLE_MESSAGES } from './admin-people.messages';

type View = 'users' | 'products';
const SIZES = [20, 50, 100];
const USER_ROLES = ['buyer', 'seller', 'admin'];
const USER_STATUSES = ['active', 'suspended', 'blocked', 'inactive', 'deleted'];
const PRODUCT_STATUSES = ['published', 'unpublished', 'pending_review', 'suspended', 'blocked', 'inactive'];

/** Query-param names per list, so back from a detail page restores the same page and filters. */
const KEYS = {
  users: { q: 'uq', role: 'urole', status: 'ustatus', page: 'upage', limit: 'ulimit' },
  products: { q: 'pq', category: 'pcat', type: 'ptype', status: 'pstatus', seller: 'pseller', page: 'ppage', limit: 'plimit' },
} as const;

/** Admin → "Người dùng & sản phẩm": every user and product, server-side paginated, searchable and filterable. */
@Component({
  selector: 'app-admin-people',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TPipe],
  template: `
    <div class="ap mt-6">
      <div class="ap-switch" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="view() === 'users'" [class.on]="view() === 'users'" (click)="setView('users')">
          {{ 'admin.people.users' | t }}
          @if (users(); as u) { <span class="ap-count">{{ u.total }}</span> }
        </button>
        <button type="button" role="tab" [attr.aria-selected]="view() === 'products'" [class.on]="view() === 'products'" (click)="setView('products')">
          {{ 'admin.people.products' | t }}
          @if (products(); as p) { <span class="ap-count">{{ p.total }}</span> }
        </button>
      </div>

      <div class="panel mt-4">
        @if (view() === 'users') {
          <div class="ap-filters">
            <input class="ap-input ap-search" type="search" [placeholder]="'admin.people.searchUsers' | t"
              [ngModel]="uq()" (ngModelChange)="onSearch('users', $event)" [attr.aria-label]="'admin.people.searchUsers' | t" />
            <select class="ap-input" [ngModel]="urole()" (ngModelChange)="patch('users', { role: $event })" [attr.aria-label]="'admin.people.allRoles' | t">
              <option value="">{{ 'admin.people.allRoles' | t }}</option>
              @for (r of userRoles; track r) { <option [value]="r">{{ roleLabel(r) }}</option> }
            </select>
            <select class="ap-input" [ngModel]="ustatus()" (ngModelChange)="patch('users', { status: $event })" [attr.aria-label]="'admin.people.allStatuses' | t">
              <option value="">{{ 'admin.people.allStatuses' | t }}</option>
              @for (s of userStatuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
            </select>
            <select class="ap-input" [ngModel]="ulimit()" (ngModelChange)="patch('users', { limit: +$event })" [attr.aria-label]="'admin.people.perPage' | t: { n: ulimit() }">
              @for (n of sizes; track n) { <option [ngValue]="n">{{ 'admin.people.perPage' | t: { n } }}</option> }
            </select>
            <span class="ap-sort text-muted">↓ {{ 'admin.people.sortNewest' | t }}</span>
          </div>

          <ul class="ap-list" [class.ap-busy]="loading()">
            @for (u of users()?.items || []; track u.id) {
              <li>
                <a class="ap-row" [routerLink]="['/admin/users', u.id]">
                  <span class="ap-main">
                    @if (u.avatarUrl) { <img class="ap-ava" [src]="u.avatarUrl" alt="" loading="lazy" /> }
                    @else { <span class="ap-ava ap-ava--blank" aria-hidden="true">{{ (u.name || '?').charAt(0) }}</span> }
                    <span class="min-w-0">
                      <span class="ap-name">{{ u.name }}</span>
                      <span class="ap-sub">{{ u.email }}@if (u.creatorSlug) { · &#64;{{ u.creatorSlug }} }</span>
                    </span>
                  </span>
                  <span class="ap-meta">
                    <span>{{ roleLabel(u.role) }} · <span [class]="'ap-st ap-st--' + u.accountStatus">{{ statusLabel(u.accountStatus) }}</span></span>
                    @if (u.createdAt) { <span class="ap-date">{{ 'admin.people.joined' | t: { date: (u.createdAt | date: 'dd/MM/yyyy') || '' } }}</span> }
                  </span>
                </a>
              </li>
            } @empty {
              @if (!loading()) { <li class="ap-empty">{{ error() ? ('admin.people.error' | t) : ('admin.people.empty' | t) }}</li> }
            }
          </ul>
          @if (users(); as pg) {
            <nav class="ap-pager" [attr.aria-label]="'admin.people.users' | t">
              <span class="text-muted">{{ rangeLabel(pg) }}</span>
              <span class="ap-pages">
                <button type="button" [disabled]="pg.page <= 1" (click)="go('users', pg.page - 1)" [attr.aria-label]="'admin.people.prev' | t">‹</button>
                @for (n of pageList(pg); track $index) {
                  @if (n === 0) { <span class="ap-gap">…</span> }
                  @else { <button type="button" [class.on]="n === pg.page" [attr.aria-current]="n === pg.page ? 'page' : null" (click)="go('users', n)" [attr.aria-label]="'admin.people.page' | t: { n }">{{ n }}</button> }
                }
                <button type="button" [disabled]="pg.page >= pg.pages" (click)="go('users', pg.page + 1)" [attr.aria-label]="'admin.people.next' | t">›</button>
              </span>
            </nav>
          }
        } @else {
          <div class="ap-filters">
            <input class="ap-input ap-search" type="search" [placeholder]="'admin.people.searchProducts' | t"
              [ngModel]="pq()" (ngModelChange)="onSearch('products', $event)" [attr.aria-label]="'admin.people.searchProducts' | t" />
            <select class="ap-input" [ngModel]="pcat()" (ngModelChange)="patch('products', { category: $event })" [attr.aria-label]="'admin.people.allCategories' | t">
              <option value="">{{ 'admin.people.allCategories' | t }}</option>
              @for (c of facets().categories; track c.id) { <option [value]="c.id">{{ i18n.catLabel(c.id) }} ({{ c.count }})</option> }
            </select>
            <select class="ap-input" [ngModel]="ptype()" (ngModelChange)="patch('products', { type: $event })" [attr.aria-label]="'admin.people.allTypes' | t">
              <option value="">{{ 'admin.people.allTypes' | t }}</option>
              @for (c of facets().types; track c.id) { <option [value]="c.id">{{ c.id }} ({{ c.count }})</option> }
            </select>
            <select class="ap-input" [ngModel]="pstatus()" (ngModelChange)="patch('products', { status: $event })" [attr.aria-label]="'admin.people.allStatuses' | t">
              <option value="">{{ 'admin.people.allStatuses' | t }}</option>
              @for (s of productStatuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
            </select>
            <select class="ap-input" [ngModel]="pseller()" (ngModelChange)="patch('products', { seller: $event })" [attr.aria-label]="'admin.people.allSellers' | t">
              <option value="">{{ 'admin.people.allSellers' | t }}</option>
              @for (c of facets().sellers; track c.id) { <option [value]="c.id">{{ c.name || c.slug }} ({{ c.count }})</option> }
            </select>
            <select class="ap-input" [ngModel]="plimit()" (ngModelChange)="patch('products', { limit: +$event })" [attr.aria-label]="'admin.people.perPage' | t: { n: plimit() }">
              @for (n of sizes; track n) { <option [ngValue]="n">{{ 'admin.people.perPage' | t: { n } }}</option> }
            </select>
            <span class="ap-sort text-muted">↓ {{ 'admin.people.sortNewest' | t }}</span>
          </div>

          <ul class="ap-list" [class.ap-busy]="loading()">
            @for (p of products()?.items || []; track p.id) {
              <li>
                <a class="ap-row" [routerLink]="['/admin/products', p.id]">
                  <span class="ap-main">
                    <span class="min-w-0">
                      <span class="ap-name">{{ p.name }}</span>
                      <span class="ap-sub">{{ p.slug }}@if (p.creatorName) { · {{ 'admin.people.by' | t: { name: p.creatorName } }} }</span>
                    </span>
                  </span>
                  <span class="ap-meta">
                    <span>{{ i18n.catLabel(p.category) }} · {{ 'admin.people.sold' | t: { n: p.salesCount } }}</span>
                    <span class="ap-date">
                      <span [class]="'ap-st ap-st--' + productState(p)">{{ statusLabel(productState(p)) }}</span>
                      @if (p.productType) { · {{ p.productType }} }
                      @if (p.createdAt) { · {{ p.createdAt | date: 'dd/MM/yyyy' }} }
                    </span>
                  </span>
                </a>
              </li>
            } @empty {
              @if (!loading()) { <li class="ap-empty">{{ error() ? ('admin.people.error' | t) : ('admin.people.empty' | t) }}</li> }
            }
          </ul>
          @if (products(); as pg) {
            <nav class="ap-pager" [attr.aria-label]="'admin.people.products' | t">
              <span class="text-muted">{{ rangeLabel(pg) }}</span>
              <span class="ap-pages">
                <button type="button" [disabled]="pg.page <= 1" (click)="go('products', pg.page - 1)" [attr.aria-label]="'admin.people.prev' | t">‹</button>
                @for (n of pageList(pg); track $index) {
                  @if (n === 0) { <span class="ap-gap">…</span> }
                  @else { <button type="button" [class.on]="n === pg.page" [attr.aria-current]="n === pg.page ? 'page' : null" (click)="go('products', n)" [attr.aria-label]="'admin.people.page' | t: { n }">{{ n }}</button> }
                }
                <button type="button" [disabled]="pg.page >= pg.pages" (click)="go('products', pg.page + 1)" [attr.aria-label]="'admin.people.next' | t">›</button>
              </span>
            </nav>
          }
        }
        @if (hasFilters()) {
          <button type="button" class="ap-clear" (click)="clear()">{{ 'admin.people.clear' | t }}</button>
        }
        @if (error()) {
          <button type="button" class="ap-clear" (click)="load()">{{ 'admin.people.retry' | t }}</button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .ap-switch { display: inline-flex; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--color-line); border-radius: 999px; background: var(--color-surface); }
      .ap-switch button { display: inline-flex; align-items: center; gap: 0.4rem; border: 0; background: transparent; color: inherit; border-radius: 999px; padding: 0.4rem 0.95rem; font: inherit; font-weight: 600; cursor: pointer; }
      .ap-switch button.on { background: var(--color-ink); color: var(--color-surface); }
      .ap-count { font-size: 0.75rem; opacity: 0.75; font-variant-numeric: tabular-nums; }
      .ap-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
      .ap-input { min-height: 2.5rem; border: 1px solid var(--color-line); border-radius: 0.6rem; background: var(--color-surface); color: inherit; padding: 0.4rem 0.7rem; font: inherit; font-size: 0.875rem; max-width: 100%; }
      .ap-search { flex: 1 1 16rem; min-width: 0; }
      .ap-sort { font-size: 0.8rem; margin-left: auto; white-space: nowrap; }
      .ap-list { margin-top: 0.75rem; list-style: none; padding: 0; transition: opacity 0.15s; }
      .ap-busy { opacity: 0.5; }
      .ap-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.7rem 0.25rem; border-bottom: 1px solid var(--color-line); font-size: 0.875rem; }
      .ap-row:hover .ap-name { color: var(--color-accent); }
      .ap-main { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
      .ap-ava { width: 2rem; height: 2rem; flex: none; border-radius: 999px; object-fit: cover; background: var(--color-line); }
      .ap-ava--blank { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; }
      .ap-name { display: block; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ap-sub { display: block; color: var(--color-muted); font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ap-meta { display: flex; flex-direction: column; align-items: flex-end; text-align: right; color: var(--color-muted); flex: none; }
      .ap-date { font-size: 0.75rem; }
      .ap-st--active, .ap-st--published { color: #15803d; }
      .ap-st--suspended, .ap-st--pending_review, .ap-st--unpublished { color: #b45309; }
      .ap-st--blocked, .ap-st--deleted { color: #b91c1c; }
      .ap-empty { padding: 1.5rem 0; color: var(--color-muted); }
      .ap-pager { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.6rem; margin-top: 0.9rem; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
      .ap-pages { display: flex; flex-wrap: wrap; gap: 0.25rem; }
      .ap-pages button { min-width: 2.25rem; height: 2.25rem; border: 1px solid var(--color-line); border-radius: 0.5rem; background: var(--color-surface); color: inherit; font: inherit; cursor: pointer; }
      .ap-pages button.on { background: var(--color-ink); color: var(--color-surface); border-color: var(--color-ink); }
      .ap-pages button:disabled { opacity: 0.4; cursor: default; }
      .ap-gap { padding: 0 0.3rem; align-self: center; }
      .ap-clear { margin-top: 0.75rem; margin-right: 0.75rem; font-size: 0.85rem; color: var(--color-accent); text-decoration: underline; background: none; border: 0; cursor: pointer; }
      @media (max-width: 640px) {
        .ap-filters .ap-input:not(.ap-search) { flex: 1 1 calc(50% - 0.25rem); }
        .ap-search { flex-basis: 100%; }
        .ap-sort { margin-left: 0; }
        .ap-row { align-items: flex-start; flex-direction: column; gap: 0.3rem; }
        .ap-meta { align-items: flex-start; text-align: left; padding-left: 2.7rem; }
        .ap-pager { justify-content: center; }
      }
    `,
  ],
})
export class AdminPeopleComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly api = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sizes = SIZES;
  readonly userRoles = USER_ROLES;
  readonly userStatuses = USER_STATUSES;
  readonly productStatuses = PRODUCT_STATUSES;

  readonly view = signal<View>('users');
  readonly uq = signal('');
  readonly urole = signal('');
  readonly ustatus = signal('');
  readonly upage = signal(1);
  readonly ulimit = signal(20);
  readonly pq = signal('');
  readonly pcat = signal('');
  readonly ptype = signal('');
  readonly pstatus = signal('');
  readonly pseller = signal('');
  readonly ppage = signal(1);
  readonly plimit = signal(20);

  readonly users = signal<AdminPage<AdminUserRow> | null>(null);
  readonly products = signal<AdminPage<AdminProductRow> | null>(null);
  readonly facets = signal<{ categories: AdminFacet[]; types: AdminFacet[]; sellers: AdminFacet[] }>({
    categories: [],
    types: [],
    sellers: [],
  });
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly hasFilters = computed(() =>
    this.view() === 'users'
      ? !!(this.uq() || this.urole() || this.ustatus())
      : !!(this.pq() || this.pcat() || this.ptype() || this.pstatus() || this.pseller()),
  );

  private debounce: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private lastKey = '';
  private sub = this.route.queryParamMap.subscribe((q) => this.fromUrl(q));

  constructor() {
    this.i18n.extend(ADMIN_PEOPLE_MESSAGES);
  }

  ngOnInit(): void {
    // Count for the other list's switch badge, and the product filter options.
    this.api.adminProducts({ limit: 20, facets: 1 }).subscribe({
      next: (r) => {
        if (r.facets) this.facets.set(r.facets);
        if (!this.products()) this.products.set(r);
      },
      error: () => undefined,
    });
    if (this.view() === 'products') {
      this.api.adminUsers({ limit: 20 }).subscribe({
        next: (r) => {
          if (!this.users()) this.users.set(r);
        },
        error: () => undefined,
      });
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.debounce) clearTimeout(this.debounce);
  }

  roleLabel(r: string): string {
    const k = `admin.people.role.${r}`;
    const t = this.i18n.t(k);
    return t === k ? r : t;
  }

  statusLabel(s: string): string {
    const k = `admin.people.status.${s || 'active'}`;
    const t = this.i18n.t(k);
    return t === k ? s : t;
  }

  productState(p: AdminProductRow): string {
    if (p.moderationStatus && p.moderationStatus !== 'active') return p.moderationStatus;
    return p.published ? 'published' : 'unpublished';
  }

  rangeLabel(pg: AdminPage<unknown>): string {
    if (!pg.total) return this.i18n.t('admin.people.total', { total: 0 });
    const from = (pg.page - 1) * pg.limit + 1;
    const to = Math.min(pg.total, pg.page * pg.limit);
    return this.i18n.t('admin.people.range', { from, to, total: pg.total });
  }

  /** 1 … 4 5 [6] 7 8 … 20 — 0 marks a gap. */
  pageList(pg: AdminPage<unknown>): number[] {
    const n = pg.pages;
    const cur = pg.page;
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const out: number[] = [1];
    const lo = Math.max(2, cur - 1);
    const hi = Math.min(n - 1, cur + 1);
    if (lo > 2) out.push(0);
    for (let i = lo; i <= hi; i++) out.push(i);
    if (hi < n - 1) out.push(0);
    out.push(n);
    return out;
  }

  setView(v: View): void {
    this.navigate({ view: v === 'users' ? null : v });
  }

  onSearch(list: View, value: string): void {
    (list === 'users' ? this.uq : this.pq).set(value);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.debounce = null;
      this.patch(list, { q: value.trim() });
    }, 300);
  }

  /** Any filter change goes back to page 1. */
  patch(list: View, change: Partial<Record<'q' | 'role' | 'status' | 'category' | 'type' | 'seller' | 'limit', string | number>>): void {
    const keys = KEYS[list] as Record<string, string>;
    const params: Record<string, string | number | null> = { [keys['page']]: null };
    for (const [k, v] of Object.entries(change)) {
      const isDefault = v === '' || v === null || v === undefined || (k === 'limit' && v === 20);
      params[keys[k]] = isDefault ? null : v;
    }
    this.navigate(params);
  }

  go(list: View, page: number): void {
    this.navigate({ [KEYS[list].page]: page > 1 ? page : null });
  }

  clear(): void {
    const keys = KEYS[this.view()] as Record<string, string>;
    const params: Record<string, null> = {};
    for (const k of Object.keys(keys)) if (k !== 'limit') params[keys[k]] = null;
    (this.view() === 'users' ? this.uq : this.pq).set('');
    this.navigate(params);
  }

  load(force = true): void {
    const v = this.view();
    const params: Record<string, string | number> =
      v === 'users'
        ? { page: this.upage(), limit: this.ulimit(), q: this.uq().trim(), role: this.urole(), status: this.ustatus() }
        : {
            page: this.ppage(),
            limit: this.plimit(),
            q: this.pq().trim(),
            category: this.pcat(),
            type: this.ptype(),
            status: this.pstatus(),
            seller: this.pseller(),
          };
    const key = v + JSON.stringify(params);
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    const mine = ++this.seq;
    this.loading.set(true);
    this.error.set(false);
    const done = (ok: boolean) => {
      if (mine !== this.seq) return;
      this.loading.set(false);
      this.error.set(!ok);
    };
    if (v === 'users') {
      this.api.adminUsers(params).subscribe({
        next: (r) => {
          if (mine === this.seq) this.users.set(r);
          done(true);
        },
        error: () => done(false),
      });
    } else {
      this.api.adminProducts(params).subscribe({
        next: (r) => {
          if (mine === this.seq) this.products.set(r);
          done(true);
        },
        error: () => done(false),
      });
    }
  }

  private navigate(params: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private fromUrl(q: ParamMap): void {
    const int = (k: string, d: number) => {
      const n = Number.parseInt(q.get(k) || '', 10);
      return Number.isFinite(n) && n > 0 ? n : d;
    };
    const size = (k: string) => {
      const n = int(k, 20);
      return SIZES.includes(n) ? n : 20;
    };
    this.view.set(q.get('view') === 'products' ? 'products' : 'users');
    // Keep what the admin is typing (e.g. a trailing space) unless the URL really differs.
    const uq = q.get('uq') || '';
    if (this.debounce === null && uq !== this.uq().trim()) this.uq.set(uq);
    this.urole.set(q.get('urole') || '');
    this.ustatus.set(q.get('ustatus') || '');
    this.upage.set(int('upage', 1));
    this.ulimit.set(size('ulimit'));
    const pq = q.get('pq') || '';
    if (this.debounce === null && pq !== this.pq().trim()) this.pq.set(pq);
    this.pcat.set(q.get('pcat') || '');
    this.ptype.set(q.get('ptype') || '');
    this.pstatus.set(q.get('pstatus') || '');
    this.pseller.set(q.get('pseller') || '');
    this.ppage.set(int('ppage', 1));
    this.plimit.set(size('plimit'));
    this.load(false);
  }
}
