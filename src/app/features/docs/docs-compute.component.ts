import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';
import { DOCS_COMPUTE_MESSAGES } from './docs-compute.messages';

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

  readonly flowDiagram = `Buyer → POST /v1/game-sessions { productSlug, client? }
  → device = pc | mobile (client or User-Agent)
  → (1) External node: webhook session.start → stream upstream
  → (2) Hosted: GPU Pod via AI Markets AI (ai.aimarkets.vn)
  → Proxied player /v1/game-sessions/:id/player
Live → heartbeat every 30s · wallet debited every minute
Stop (user / idle / insufficient_funds) → final minute rounded up`;

  readonly registerExample = `# External (seller infra)
POST .../seller/compute/nodes
{
  "productSlug": "my-game-box",
  "hosting": "external",
  "webhookUrl": "https://seller.example.com/aim/webhook",
  "streamHost": "10.0.0.5",
  "streamPort": 6080,
  "devices": ["pc", "mobile"],
  "mobileStream": { "host": "10.0.0.6", "port": 8443, "kind": "hls" },
  "maxConcurrent": 4
}

# AI Markets hosted GPU pod
POST .../seller/compute/nodes
{
  "productSlug": "my-game-box",
  "hosting": "aimarkets",
  "gpuType": "NVIDIA GeForce RTX 4090",
  "kind": "game",
  "devices": ["pc"]
}`;

  readonly hostedExample = `POST .../seller/compute/nodes/hosted
{
  "productSlug": "my-game-box",
  "gpuType": "NVIDIA GeForce RTX 4090",
  "kind": "game"
}`;

  readonly webhookPayload = `{
  "event": "session.start",
  "timestamp": "2026-10-04T08:00:00.000Z",
  "sessionId": "gs_…",
  "productSlug": "my-game-box",
  "buyerId": "…",
  "buyerEmail": "buyer@example.com",
  "nodeId": "…",
  "client": "android",
  "device": "mobile",
  "profile": {
    "device": "mobile", "maxWidth": 1280, "maxHeight": 720, "fps": 60,
    "bitrateKbps": 6000, "orientation": "landscape",
    "inputs": ["touch", "virtual-gamepad", "gamepad"]
  }
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

{ "productSlug": "my-game-box", "client": "pc" }

→ { "sessionId", "status", "device", "profile", "playerUrl", "heartbeatMs": 30000, … }

POST .../game-sessions/:sessionId/heartbeat   (every heartbeatMs)
→ { "ok": true, "ratePerHour", "billedMinutes", "billedCost", "available", "minutesLeft" }

DELETE .../game-sessions/:sessionId   (stop + final bill)`;

  readonly toc = [
    { id: 'overview', labelKey: 'docsCompute.toc.overview' },
    { id: 'register', labelKey: 'docsCompute.toc.register' },
    { id: 'devices', labelKey: 'docsCompute.toc.devices' },
    { id: 'hosted', labelKey: 'docsCompute.toc.hosted' },
    { id: 'webhook', labelKey: 'docsCompute.toc.webhook' },
    { id: 'buyer', labelKey: 'docsCompute.toc.buyer' },
    { id: 'billing', labelKey: 'docsCompute.toc.billing' },
  ];

  constructor() {
    this.i18n.extend(DOCS_COMPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('docsCompute.title') });
  }
}
