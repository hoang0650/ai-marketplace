import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, SellerComputeService, ComputeNode } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { Product } from '../../models/marketplace.models';
import { isComputeStreamCategory } from '../../models/categories';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sell-compute-integrate',
  standalone: true,
  imports: [RouterLink, FormsModule, TPipe],
  templateUrl: './sell-compute-integrate.component.html',
  styleUrl: './sell-compute-integrate.component.scss',
})
export class SellComputeIntegrateComponent implements OnInit {
  private readonly computeApi = inject(SellerComputeService);
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly apiBase = environment.apiUrl;
  readonly nodes = signal<ComputeNode[]>([]);
  readonly products = signal<Product[]>([]);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly err = signal('');

  productSlug = '';
  name = '';
  kind: 'compute' | 'game' = 'game';
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
  useWebhook = true;

  readonly flowDiagram = `Buyer → POST /v1/game-sessions { productSlug }
  → AI Markets webhook session.start → Seller infra
  ← streamHost / streamPort (internal)
  → Proxied player /v1/game-sessions/:id/player
  → Buyer streams on aimarkets.vn
Stop → session.stop → bill usage (wallet)`;

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sellCompute.title') });
    this.loadNodes();
    const slug = this.auth.user()?.creatorSlug;
    if (slug) {
      this.productsApi.list({ creatorSlug: slug }).subscribe((items) => {
        this.products.set(items.filter((p) => isComputeStreamCategory(p.category)));
      });
    }
  }

  loadNodes(): void {
    this.computeApi.listNodes().subscribe({
      next: (rows) => this.nodes.set(rows),
      error: () => this.nodes.set([]),
    });
  }

  submit(): void {
    if (!this.productSlug.trim()) {
      this.err.set(this.i18n.t('sellCompute.err.product'));
      return;
    }
    this.busy.set(true);
    this.err.set('');
    this.msg.set('');
    const body: Record<string, unknown> = {
      productSlug: this.productSlug.trim().toLowerCase(),
      name: this.name.trim() || undefined,
      kind: this.kind,
      region: this.region.trim() || undefined,
      maxConcurrent: this.maxConcurrent,
      healthUrl: this.healthUrl.trim() || undefined,
    };
    if (this.useWebhook) {
      body['webhookUrl'] = this.webhookUrl.trim();
      body['webhookSecret'] = this.webhookSecret.trim() || undefined;
    } else {
      body['streamHost'] = this.streamHost.trim();
      body['streamPort'] = Number(this.streamPort) || 0;
      body['streamPath'] = this.streamPath.trim() || '/';
      body['streamKind'] = this.streamKind.trim() || 'novnc';
      body['streamTls'] = this.streamTls;
    }
    if (this.iframeUrl.trim()) body['iframeUrl'] = this.iframeUrl.trim();

    this.computeApi.registerNode(body as Parameters<SellerComputeService['registerNode']>[0]).subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set(this.i18n.t('sellCompute.saved'));
        this.loadNodes();
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(e?.error?.message || this.i18n.t('sellCompute.err.save'));
      },
    });
  }

  pingNode(id: string): void {
    this.computeApi.pingNode(id).subscribe({
      next: (r) => this.msg.set(r.ok ? `Ping OK (${r.via})` : `Ping failed (${r.via})`),
      error: () => this.err.set(this.i18n.t('sellCompute.err.ping')),
    });
  }

  offlineNode(id: string): void {
    this.computeApi.deleteNode(id).subscribe({
      next: () => this.loadNodes(),
      error: () => this.err.set(this.i18n.t('sellCompute.err.delete')),
    });
  }
}
