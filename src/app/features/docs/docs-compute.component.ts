import { DOCS_RUNTIME_MESSAGES } from './docs-runtime.messages';
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

  readonly flowDiagram = `Seller: POST /v1/auth/login → token → POST /v1/seller/compute/nodes
Buyer  → POST /v1/game-sessions { productSlug, client? }
  → device = pc | mobile (client or User-Agent)
  → (1) External node: webhook session.start → stream upstream (or static stream)
  → (2) Hosted: GPU Pod via AI Markets AI (ai.aimarkets.vn)
  → (3) Dedicated game server: private server, connect = IP:port
  → Player /v1/game-sessions/:id/player · stream via /v1/game-sessions/:id/proxy/*
Live → heartbeat every 30s · wallet debited every minute
Stop (user / idle / insufficient_funds) → final minute rounded up · webhook session.stop`;

  readonly registerExample = `# External (seller infra) — 201 Created
POST https://api.aimarkets.vn/v1/seller/compute/nodes
Authorization: Bearer <seller_token>
{
  "hosting": "external",
  "productSlug": "my-game-box",
  "name": "HCM box 1",
  "kind": "game",
  "webhookUrl": "https://seller.example.com/aim/webhook",
  "webhookSecret": "whsec_at_least_16_chars",
  "streamHost": "stream.your-domain.com",
  "streamPort": 443,
  "streamKind": "novnc",
  "devices": ["pc", "mobile"],
  "mobileStream": { "host": "mobile-stream.your-domain.com", "port": 8443, "kind": "hls" },
  "healthUrl": "https://seller.example.com/health",
  "maxConcurrent": 4
}

# AI Markets hosted GPU pod
POST https://api.aimarkets.vn/v1/seller/compute/nodes
{
  "hosting": "aimarkets",
  "productSlug": "my-game-box",
  "gpuType": "NVIDIA GeForce RTX 4090",
  "kind": "game",
  "devices": ["pc"]
}`;

  readonly hostedExample = `POST https://api.aimarkets.vn/v1/seller/compute/nodes/hosted
Authorization: Bearer <seller_token>
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
  "nodeId": "ext_…",
  "client": "android",
  "device": "mobile",
  "profile": {
    "device": "mobile", "maxWidth": 1280, "maxHeight": 720, "fps": 60,
    "bitrateKbps": 6000, "orientation": "landscape",
    "inputs": ["touch", "virtual-gamepad", "gamepad"]
  }
}`;

  readonly webhookResponse = `{
  "streamHost": "stream.your-domain.com",
  "streamPort": 443,
  "streamPath": "/",
  "streamKind": "novnc",
  "streamTls": true
}`;

  readonly buyerExample = `POST ${environment.production ? 'https://api.aimarkets.vn/v1' : 'http://localhost:4100/v1'}/game-sessions
Authorization: Bearer <buyer_token>

{ "productSlug": "my-game-box", "client": "pc" }

→ 201 { "sessionId", "status": "live", "device", "profile", "streamKind", "playerUrl",
        "heartbeatMs": 30000, "idleTimeoutMs": 600000, "billedMinutes", "billedCost", … }

POST .../game-sessions/:sessionId/heartbeat   (every heartbeatMs)
→ { "ok": true, "status", "ratePerHour", "billedMinutes", "billedCost", "currency", "available", "minutesLeft" }
→ 410 SESSION_STOPPED { stopReason, … } once the session has ended

GET    .../game-sessions/:sessionId          (state)
GET    .../game-sessions/:sessionId/player?access_token=<buyer_token>   (HTML player)
DELETE .../game-sessions/:sessionId          (stop + final bill → { ok, billedCost, billedMinutes })`;

  readonly curlExample = `API=https://api.aimarkets.vn/v1

# 1) Log in → access token (field "token")
TOKEN=$(curl -sS -X POST "$API/auth/login" -H "Content-Type: application/json" \\
  -d '{"email":"seller@example.com","password":"…"}' | jq -r .token)

# 2) Which of my listings can carry a node?
curl -sS "$API/seller/compute/products" -H "Authorization: Bearer $TOKEN"

# 3) Register an external node → 201 { id, status: "online", config, … }
curl -sS -X POST "$API/seller/compute/nodes" \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{
    "hosting": "external",
    "productSlug": "my-game-box",
    "name": "HCM box 1",
    "kind": "game",
    "webhookUrl": "https://seller.example.com/aim/webhook",
    "webhookSecret": "whsec_at_least_16_chars",
    "streamHost": "stream.your-domain.com",
    "streamPort": 443,
    "streamKind": "novnc",
    "devices": ["pc"],
    "maxConcurrent": 2
  }'

# 4) Buyer: start → heartbeat → stop
S=$(curl -sS -X POST "$API/game-sessions" -H "Authorization: Bearer $BUYER" \\
  -H "Content-Type: application/json" -d '{"productSlug":"my-game-box","client":"pc"}')
SID=$(echo "$S" | jq -r .sessionId)
curl -sS -X POST "$API/game-sessions/$SID/heartbeat" -H "Authorization: Bearer $BUYER"
# → {"ok":true,"status":"live","ratePerHour":0.6,"billedMinutes":0,"billedCost":0,"currency":"USD","available":…,"minutesLeft":…}
curl -sS -X DELETE "$API/game-sessions/$SID" -H "Authorization: Bearer $BUYER"
# → {"ok":true,"billedCost":0.01,"billedMinutes":1}

# 5) Take the node offline
curl -sS -X DELETE "$API/seller/compute/nodes/$NODE_ID" -H "Authorization: Bearer $TOKEN"`;

  readonly nodeExample = `// Node 18+ (built-in fetch)
const API = 'https://api.aimarkets.vn/v1';
const TOKEN = process.env.AIM_TOKEN;          // seller access token
const NODE_ID = process.env.NODE_ID;
const h = { Authorization: \`Bearer \${TOKEN}\`, 'Content-Type': 'application/json' };

const nodes = await (await fetch(\`\${API}/seller/compute/nodes\`, { headers: h })).json();
console.log(nodes.map((n) => \`\${n.id} \${n.name} \${n.status} \${n.devices}\`));

const patched = await fetch(\`\${API}/seller/compute/nodes/\${NODE_ID}\`, {
  method: 'PATCH', headers: h,
  body: JSON.stringify({ maxConcurrent: 3, devices: ['pc', 'mobile'] }),
});
console.log('PATCH', patched.status, (await patched.json()).maxConcurrent);

const ping = await fetch(\`\${API}/seller/compute/nodes/\${NODE_ID}/ping\`, { method: 'POST', headers: h });
console.log('PING', ping.status, await ping.json());`;

  readonly nodeWebhookExample = `// Express receiver: verify X-AIM-Signature, answer session.start with the stream.
import crypto from 'node:crypto';
import express from 'express';
const SECRET = process.env.AIM_WEBHOOK_SECRET;
const app = express();
app.post('/aim/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const expected = crypto.createHmac('sha256', SECRET).update(req.body).digest('hex');
  const got = req.get('X-AIM-Signature') || '';
  if (!/^[a-f0-9]{64}$/i.test(got) ||
      !crypto.timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'))) return res.sendStatus(401);
  const evt = JSON.parse(req.body);
  if (evt.event === 'session.start') {
    return res.json({ streamHost: 'stream.your-domain.com', streamPort: 443, streamPath: '/', streamKind: 'novnc', streamTls: true });
  }
  res.json({ ok: true });
});
app.listen(8080);`;

  readonly pythonExample = `# Python 3 + requests
import os, requests
API = "https://api.aimarkets.vn/v1"
s = requests.Session()
s.headers["Authorization"] = f"Bearer {os.environ['AIM_TOKEN']}"   # seller access token

eligible = [p for p in s.get(f"{API}/seller/compute/products").json() if p["eligible"]]
print("eligible:", [p["slug"] for p in eligible])

r = s.post(f"{API}/seller/compute/nodes/{os.environ['NODE_ID']}/ping")
print("ping:", r.status_code, r.json())`;

  readonly pythonWebhookExample = `import hmac, hashlib, json, os
from flask import Flask, request, abort, jsonify
SECRET = os.environ["AIM_WEBHOOK_SECRET"].encode()
app = Flask(__name__)
@app.post("/aim/webhook")
def hook():
    raw = request.get_data()
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(request.headers.get("X-AIM-Signature", ""), expected):
        abort(401)
    evt = json.loads(raw)
    if evt["event"] == "session.start":
        return jsonify(streamHost="stream.your-domain.com", streamPort=443, streamPath="/", streamKind="novnc", streamTls=True)
    return jsonify(ok=True)`;

  readonly webhookStopPayload = `{
  "event": "session.stop",
  "timestamp": "2026-10-25T09:12:12.000Z",
  "sessionId": "gs_…",
  "buyerId": "…",
  "client": "pc",
  "device": "pc",
  "reason": "user",
  "minutes": 1,
  "billedCost": 0.01
}`;

  readonly dedicatedExample = `POST https://api.aimarkets.vn/v1/game-sessions
{ "productSlug": "game-server-minecraft-java" }
→ { "sessionId": "gs_…", "status": "starting", "dedicated": true, "streamKind": "tcp",
    "game": "minecraft-java", "connect": null, … }

GET https://api.aimarkets.vn/v1/game-sessions/gs_…        (poll every ~5 s)
→ { "status": "live", "connect": { "host": "<allocated-host>", "port": 30000, "address": "<allocated-host>:30000" }, … }

DELETE https://api.aimarkets.vn/v1/game-sessions/gs_…     (stop + destroy the server)
→ { "ok": true, "billedCost": 0.01, "billedMinutes": 3 }`;

  readonly toc = [
    { id: 'remote-desktop', labelKey: 'docsRuntime.rdp.title' },
    { id: 'overview', labelKey: 'docsCompute.toc.overview' },
    { id: 'auth', labelKey: 'docsCompute.toc.auth' },
    { id: 'register', labelKey: 'docsCompute.toc.register' },
    { id: 'devices', labelKey: 'docsCompute.toc.devices' },
    { id: 'hosted', labelKey: 'docsCompute.toc.hosted' },
    { id: 'webhook', labelKey: 'docsCompute.toc.webhook' },
    { id: 'buyer', labelKey: 'docsCompute.toc.buyer' },
    { id: 'dedicated', labelKey: 'docsCompute.toc.dedicated' },
    { id: 'billing', labelKey: 'docsCompute.toc.billing' },
    { id: 'examples', labelKey: 'docsCompute.toc.examples' },
  ];

  constructor() {
    this.i18n.extend(DOCS_COMPUTE_MESSAGES);
  }

  ngOnInit(): void {
    this.i18n.extend(DOCS_RUNTIME_MESSAGES);
    this.seo.set({ title: this.i18n.t('docsCompute.title') });
  }
}
