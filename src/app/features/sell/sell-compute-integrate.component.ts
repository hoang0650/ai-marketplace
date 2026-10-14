import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  SellerComputeService,
  ComputeNode,
  ComputeProductOption,
} from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { StreamDevice } from '../../models/marketplace.models';
import { categoryLabel } from '../../models/categories';
import { environment } from '../../../environments/environment';
import { SELL_COMPUTE_MESSAGES } from './sell-compute.messages';

type FieldErrors = Partial<
  Record<'product' | 'devices' | 'webhookUrl' | 'webhookSecret' | 'streamHost' | 'streamPort' | 'iframeUrl' | 'healthUrl' | 'mobileIframeUrl' | 'maxConcurrent', string>
>;

const SECRET_MIN = 16;

@Component({
  selector: 'app-sell-compute-integrate',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  templateUrl: './sell-compute-integrate.component.html',
  styleUrl: './sell-compute-integrate.component.scss',
})
export class SellComputeIntegrateComponent implements OnInit {
  private readonly computeApi = inject(SellerComputeService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly apiBase = environment.apiUrl;
  readonly nodes = signal<ComputeNode[]>([]);
  readonly allProducts = signal<ComputeProductOption[]>([]);
  readonly productsState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly busy = signal(false);
  readonly notice = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);
  readonly errors = signal<FieldErrors>({});
  /** Node being edited (product + hosting are fixed while editing). */
  readonly editing = signal<ComputeNode | null>(null);
  /** Secret generated in this session — shown once so the seller can copy it. */
  readonly freshSecret = signal('');
  readonly copied = signal(false);

  readonly computeProducts = computed(() => this.allProducts().filter((p) => p.reason !== 'NOT_COMPUTE_CATEGORY'));
  readonly eligibleProducts = computed(() => this.allProducts().filter((p) => p.eligible));
  readonly otherProducts = computed(() => this.allProducts().filter((p) => p.reason === 'NOT_COMPUTE_CATEGORY'));

  productSlug = '';
  name = '';
  kind: 'compute' | 'game' = 'game';
  connectMode: 'webhook' | 'static' = 'webhook';
  webhookUrl = '';
  webhookSecret = '';
  streamHost = '';
  streamPort = 6080;
  streamPath = '/';
  streamKind = 'novnc';
  streamTls = false;
  iframeUrl = '';
  healthUrl = '';
  region = '';
  maxConcurrent = 10;
  hostingMode: 'external' | 'aimarkets' = 'external';
  gpuType = 'NVIDIA GeForce RTX 4090';
  devicePc = true;
  deviceMobile = true;
  mobileIframeUrl = '';
  mobileStreamHost = '';
  mobileStreamPort = 0;
  mobileStreamPath = '';

  readonly flowDiagram = `PC (web/desktop)        → POST /v1/game-sessions { productSlug, client: "pc" }
Mobile (Android/iOS app) → POST /v1/game-sessions { productSlug, client: "android" | "ios" }
  → seller node serving that device: (1) your machine (webhook / static stream)
                                     (2) AI Markets hosted GPU pod
  → webhook session.start receives { device, profile } (PC 1080p60 · mobile 720p, touch)
  → proxied player on aimarkets.vn / in the app
Every minute → wallet debit, you receive net after platform fee
No heartbeat / no balance → auto stop (session.stop)`;

  constructor() {
    this.i18n.extend(SELL_COMPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sellCompute.title') });
    this.loadNodes();
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsState.set('loading');
    this.computeApi.listProducts().subscribe({
      next: (rows) => {
        this.allProducts.set(rows || []);
        this.productsState.set('ready');
        const eligible = this.eligibleProducts();
        if (!this.productSlug && eligible.length === 1) this.pickProduct(eligible[0].slug);
      },
      error: () => this.productsState.set('error'),
    });
  }

  loadNodes(): void {
    this.computeApi.listNodes().subscribe({
      next: (rows) => this.nodes.set(rows || []),
      error: () => this.nodes.set([]),
    });
  }

  categoryLabel(cat: string): string {
    const key = `cat.${cat}.label`;
    const label = this.i18n.t(key);
    return label !== key ? label : categoryLabel(cat) || cat;
  }

  /** Product choice also sets the node type from its category. */
  pickProduct(slug: string): void {
    this.productSlug = slug;
    const p = this.allProducts().find((x) => x.slug === slug);
    if (p?.category === 'gpu-compute') this.kind = 'compute';
    if (p?.category === 'game-server') this.kind = 'game';
    this.clearError('product');
  }

  selectedProduct(): ComputeProductOption | undefined {
    return this.allProducts().find((p) => p.slug === this.productSlug);
  }

  devices(): StreamDevice[] {
    const out: StreamDevice[] = [];
    if (this.devicePc) out.push('pc');
    if (this.deviceMobile) out.push('mobile');
    return out;
  }

  generateSecret(): void {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = `whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
    this.webhookSecret = secret;
    this.freshSecret.set(secret);
    this.copied.set(false);
    this.clearError('webhookSecret');
  }

  copySecret(): void {
    const s = this.freshSecret();
    if (!s || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(s).then(() => this.copied.set(true));
  }

  clearError(field: keyof FieldErrors): void {
    if (!this.errors()[field]) return;
    const next = { ...this.errors() };
    delete next[field];
    this.errors.set(next);
  }

  private urlError(raw: string, { httpsOnly }: { httpsOnly: boolean }): string | null {
    const v = raw.trim();
    if (!v) return null;
    try {
      const u = new URL(v);
      if (httpsOnly && u.protocol !== 'https:') return 'scn.err.https';
      if (!['http:', 'https:'].includes(u.protocol)) return 'scn.err.url';
      return null;
    } catch {
      return 'scn.err.url';
    }
  }

  /** Client-side checks mirroring the API rules; returns true when the form is valid. */
  validate(): boolean {
    const e: FieldErrors = {};
    const t = (k: string) => this.i18n.t(k);
    const editing = this.editing();
    if (!editing) {
      const p = this.selectedProduct();
      if (!p || !p.eligible) e.product = t('scn.err.product');
    }
    if (!this.devices().length) e.devices = t('scn.err.devices');
    const max = Number(this.maxConcurrent);
    if (!Number.isFinite(max) || max < 1 || max > 100) e.maxConcurrent = t('scn.err.max');
    const external = editing ? editing.external : this.hostingMode === 'external';
    if (external) {
      if (this.connectMode === 'webhook') {
        const url = this.webhookUrl.trim();
        if (!url || this.urlError(url, { httpsOnly: true })) e.webhookUrl = t('scn.err.webhookUrl');
        const secret = this.webhookSecret.trim();
        const keep = editing?.config?.hasWebhookSecret && !secret;
        if (!keep && secret.length < SECRET_MIN) e.webhookSecret = t('scn.err.secret');
      } else {
        if (!this.streamHost.trim()) e.streamHost = t('scn.err.streamHost');
        const port = Number(this.streamPort);
        if (!Number.isInteger(port) || port < 1 || port > 65535) e.streamPort = t('scn.err.streamPort');
      }
      const iframeErr = this.urlError(this.iframeUrl, { httpsOnly: true });
      if (iframeErr) e.iframeUrl = t(iframeErr);
      const healthErr = this.urlError(this.healthUrl, { httpsOnly: false });
      if (healthErr) e.healthUrl = t(healthErr);
      const mErr = this.deviceMobile ? this.urlError(this.mobileIframeUrl, { httpsOnly: true }) : null;
      if (mErr) e.mobileIframeUrl = t(mErr);
    }
    this.errors.set(e);
    return Object.keys(e).length === 0;
  }

  private externalBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { healthUrl: this.healthUrl.trim() };
    if (this.connectMode === 'webhook') {
      body['webhookUrl'] = this.webhookUrl.trim();
      if (this.webhookSecret.trim()) body['webhookSecret'] = this.webhookSecret.trim();
      body['streamHost'] = '';
      body['streamPort'] = 0;
    } else {
      body['webhookUrl'] = '';
      body['streamHost'] = this.streamHost.trim();
      body['streamPort'] = Number(this.streamPort) || 0;
      body['streamPath'] = this.streamPath.trim() || '/';
      body['streamKind'] = this.streamKind.trim() || 'novnc';
      body['streamTls'] = this.streamTls;
    }
    body['iframeUrl'] = this.iframeUrl.trim();
    if (this.deviceMobile && (this.mobileIframeUrl.trim() || this.mobileStreamHost.trim())) {
      body['mobileStream'] = {
        iframeUrl: this.mobileIframeUrl.trim() || undefined,
        host: this.connectMode === 'static' ? this.mobileStreamHost.trim() || undefined : undefined,
        port: this.connectMode === 'static' ? Number(this.mobileStreamPort) || undefined : undefined,
        path: this.connectMode === 'static' ? this.mobileStreamPath.trim() || undefined : undefined,
        kind: this.streamKind.trim() || undefined,
        tls: this.streamTls,
      };
    }
    return body;
  }

  submit(): void {
    if (this.busy()) return;
    this.notice.set(null);
    if (!this.validate()) {
      this.notice.set({ kind: 'err', text: this.i18n.t('scn.err.fix') });
      return;
    }
    this.busy.set(true);
    const editing = this.editing();
    const common: Record<string, unknown> = {
      name: this.name.trim() || undefined,
      region: this.region.trim(),
      maxConcurrent: Number(this.maxConcurrent),
      devices: this.devices(),
    };
    if (editing) {
      const body = editing.external ? { ...common, ...this.externalBody() } : common;
      this.computeApi.updateNode(editing.id, body as Parameters<SellerComputeService['updateNode']>[1]).subscribe({
        next: (node) => this.done('scn.updated', node),
        error: (err) => this.fail(err),
      });
      return;
    }
    const body: Record<string, unknown> = {
      ...common,
      productSlug: this.productSlug.trim().toLowerCase(),
      hosting: this.hostingMode,
      kind: this.kind,
    };
    if (this.hostingMode === 'aimarkets') {
      body['gpuType'] = this.gpuType.trim() || undefined;
      body['provider'] = 'aimarkets-gpu';
    } else {
      Object.assign(body, this.externalBody());
    }
    this.computeApi.registerNode(body as Parameters<SellerComputeService['registerNode']>[0]).subscribe({
      next: (node) => this.done('scn.saved', node),
      error: (err) => this.fail(err),
    });
  }

  private done(key: string, node: ComputeNode): void {
    this.busy.set(false);
    const productName = node?.productName || this.selectedProduct()?.name || this.productSlug;
    this.notice.set({ kind: 'ok', text: this.i18n.t(key, { name: node?.name || this.name, product: productName }) });
    this.resetForm();
    this.loadNodes();
  }

  private fail(err: { error?: { code?: string; message?: string } }): void {
    this.busy.set(false);
    const code = err?.error?.code || (err?.error?.message === 'PRODUCT_NOT_FOUND' ? 'PRODUCT_NOT_FOUND' : err?.error?.message === 'FORBIDDEN' ? 'FORBIDDEN' : '');
    const key = code ? `scn.err.${code}` : '';
    const mapped = key ? this.i18n.t(key) : '';
    this.notice.set({
      kind: 'err',
      text: mapped && mapped !== key ? mapped : err?.error?.message || this.i18n.t('scn.err.save'),
    });
  }

  resetForm(): void {
    this.editing.set(null);
    this.name = '';
    this.webhookUrl = '';
    this.webhookSecret = '';
    this.freshSecret.set('');
    this.streamHost = '';
    this.streamPort = 6080;
    this.streamPath = '/';
    this.iframeUrl = '';
    this.healthUrl = '';
    this.region = '';
    this.maxConcurrent = 10;
    this.mobileIframeUrl = '';
    this.mobileStreamHost = '';
    this.mobileStreamPort = 0;
    this.mobileStreamPath = '';
    this.errors.set({});
  }

  editNode(n: ComputeNode): void {
    this.resetForm();
    this.editing.set(n);
    this.productSlug = n.productSlug || '';
    this.hostingMode = n.external ? 'external' : 'aimarkets';
    this.kind = n.kind;
    this.name = n.name;
    this.region = n.region || '';
    this.maxConcurrent = n.maxConcurrent || 10;
    const devs = n.devices || ['pc', 'mobile'];
    this.devicePc = devs.includes('pc');
    this.deviceMobile = devs.includes('mobile');
    const c = n.config;
    if (c) {
      this.connectMode = c.webhookUrl || !c.streamHost ? 'webhook' : 'static';
      this.webhookUrl = c.webhookUrl;
      this.streamHost = c.streamHost;
      this.streamPort = c.streamPort || 6080;
      this.streamPath = c.streamPath || '/';
      this.streamKind = c.streamKind || 'novnc';
      this.streamTls = c.streamTls;
      this.iframeUrl = c.iframeUrl;
      this.healthUrl = c.healthUrl;
      this.mobileIframeUrl = c.mobileStream?.iframeUrl || '';
      this.mobileStreamHost = c.mobileStream?.host || '';
      this.mobileStreamPort = c.mobileStream?.port || 0;
      this.mobileStreamPath = c.mobileStream?.path || '';
    }
    this.notice.set(null);
    if (typeof document !== 'undefined') document.getElementById('scn-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  statusKey(status: string): string {
    return ['online', 'offline', 'creating', 'error'].includes(status) ? `scn.status.${status}` : '';
  }

  pingNode(id: string): void {
    this.computeApi.pingNode(id).subscribe({
      next: (r) =>
        this.notice.set({
          kind: r.ok ? 'ok' : 'err',
          text: this.i18n.t(r.ok ? 'sellx.integrate.pingOk' : 'sellx.integrate.pingFailed', { via: r.via ?? '' }),
        }),
      error: () => this.notice.set({ kind: 'err', text: this.i18n.t('scn.err.ping') }),
    });
  }

  removeNode(n: ComputeNode): void {
    if (typeof window !== 'undefined' && !window.confirm(this.i18n.t('scn.confirmRemove', { name: n.name }))) return;
    this.computeApi.deleteNode(n.id).subscribe({
      next: () => {
        this.notice.set({ kind: 'ok', text: this.i18n.t('scn.removed', { name: n.name }) });
        if (this.editing()?.id === n.id) this.resetForm();
        this.loadNodes();
      },
      error: () => this.notice.set({ kind: 'err', text: this.i18n.t('scn.err.remove') }),
    });
  }
}
