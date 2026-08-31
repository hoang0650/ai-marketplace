import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-docs-compute',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './docs-compute.component.html',
  styleUrl: './docs-compute.component.scss',
})
export class DocsComputeComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly apiBase = environment.apiUrl.replace(/\/v1\/?$/, '/v1');
  readonly supportEmail = 'support@aimarkets.vn';

  readonly flowDiagram = `Buyer → POST /v1/game-sessions { productSlug }
  → AI Markets webhook session.start
  ← streamHost / streamPort (internal)
  → Proxied player /v1/game-sessions/:id/player
  → Stream on aimarkets.vn
Stop → session.stop → bill usage (wallet)`;

  readonly registerExample = `POST ${environment.production ? 'https://api.aimarkets.vn/v1' : 'http://localhost:4100/v1'}/seller/compute/nodes
Authorization: Bearer <seller_jwt>

{
  "productSlug": "my-game-box",
  "webhookUrl": "https://seller.example.com/aim/webhook",
  "webhookSecret": "whsec_...",
  "streamHost": "10.0.0.5",
  "streamPort": 6080,
  "streamKind": "novnc"
}`;

  readonly webhookResponse = `{
  "streamHost": "10.0.0.5",
  "streamPort": 6080,
  "streamPath": "/",
  "streamKind": "novnc",
  "streamTls": false
}`;

  readonly buyerExample = `POST ${environment.production ? 'https://api.aimarkets.vn/v1' : 'http://localhost:4100/v1'}/game-sessions
Authorization: Bearer <buyer_jwt>

{ "productSlug": "my-game-box" }`;

  readonly toc = [
    { id: 'overview', labelKey: 'docsCompute.toc.overview' },
    { id: 'register', labelKey: 'docsCompute.toc.register' },
    { id: 'webhook', labelKey: 'docsCompute.toc.webhook' },
    { id: 'buyer', labelKey: 'docsCompute.toc.buyer' },
    { id: 'billing', labelKey: 'docsCompute.toc.billing' },
  ];

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('docsCompute.title') });
  }
}
