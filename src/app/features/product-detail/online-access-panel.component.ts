import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Product } from '../../models/marketplace.models';
import { isDatasetCategory } from '../../models/categories';
import { TPipe } from '../../i18n/t.pipe';
import { I18nService } from '../../i18n/i18n.service';

type Lang = 'curl' | 'python' | 'js';

/**
 * "Dùng online" panel for dataset and skill products. Buyers never get raw files: datasets are read
 * through the paginated rows API, skills run through the thin OpenClaw loader. Every request carries
 * the buyer's own license key (X-License-Key) and is re-checked by the server.
 */
@Component({
  selector: 'app-online-access-panel',
  standalone: true,
  imports: [DatePipe, TPipe],
  template: `
<section class="oa" data-testid="online-panel">
  <h3 class="oa-h">⚡ {{ 'pd.online.title' | t }}</h3>
  @if (owner) { <p class="oa-note">{{ 'pd.online.owner' | t }}</p> }

  <dl class="oa-grid">
    <dt>{{ 'pd.online.endpoint' | t }}</dt>
    <dd><code data-testid="online-endpoint">{{ endpoint() }}</code></dd>
    <dt>{{ 'pd.online.licenseKey' | t }}</dt>
    <dd>
      @if (licenseKey) {
        <code data-testid="online-license">{{ licenseKey }}</code>
        <button type="button" class="oa-btn" (click)="copy(licenseKey)">{{ 'pd.online.copy' | t }}</button>
      } @else { <span class="oa-muted">{{ 'pd.online.noKeyYet' | t }}</span> }
    </dd>
    @if (licenseExpiresAt) {
      <dt>{{ 'pd.online.remaining' | t }}</dt>
      <dd data-testid="online-remaining">
        @if (expired()) { <b class="oa-bad">{{ 'pd.online.expired' | t }}</b> }
        @else { <b>{{ remaining() }}</b> <span class="oa-muted">· {{ licenseExpiresAt | date: 'short' }}</span> }
      </dd>
    }
    @if (canUse) {
      <dt>{{ 'pd.online.apiKey' | t }}</dt>
      <dd>
        @if (apiKey()) {
          <code data-testid="online-apikey">{{ apiKey() }}</code>
          <button type="button" class="oa-btn" (click)="copy(apiKey())">{{ 'pd.online.copy' | t }}</button>
          <small class="oa-warn">{{ 'pd.online.keyOnce' | t }}</small>
        } @else {
          <button type="button" class="oa-btn oa-btn--fill" (click)="createKey()" [disabled]="creating()" data-testid="online-create-key">{{ 'pd.online.createKey' | t }}</button>
        }
        @if (keyErr()) { <small class="oa-bad">{{ keyErr() }}</small> }
      </dd>
    }
    <dt>{{ 'pd.online.quota' | t }}</dt>
    <dd class="oa-muted">{{ (dataset() ? 'pd.online.quotaDataset' : 'pd.online.quotaSkill') | t }}</dd>
  </dl>

  @if (!canUse) {
    <p class="oa-note">🔒 {{ 'pd.online.locked' | t }}</p>
  } @else {
    @if (!dataset()) {
      <p class="oa-sub">{{ 'pd.online.install' | t }}</p>
      <pre class="oa-code" data-testid="online-install">{{ installSnippet() }}</pre>
      <p class="oa-note">{{ 'pd.online.skillPrivacy' | t }}</p>
    }
    <div class="oa-tabs" role="tablist">
      @for (l of langs; track l) {
        <button type="button" class="oa-tab" [class.on]="lang() === l" (click)="lang.set(l)">{{ l === 'js' ? 'JavaScript' : l === 'python' ? 'Python' : 'cURL' }}</button>
      }
      <button type="button" class="oa-btn" (click)="copy(snippet())">{{ copied() ? ('pd.online.copied' | t) : ('pd.online.copy' | t) }}</button>
    </div>
    <pre class="oa-code" data-testid="online-snippet">{{ snippet() }}</pre>
    @if (dataset()) {
      <button type="button" class="oa-btn" (click)="preview()" [disabled]="previewing()" data-testid="online-preview">{{ 'pd.online.preview' | t }}</button>
      @if (previewOut()) { <pre class="oa-code oa-code--out" data-testid="online-preview-out">{{ previewOut() }}</pre> }
    }
    <p class="oa-muted oa-small">{{ 'pd.online.trace' | t }}</p>
  }
</section>
  `,
  styles: [`
.oa{margin-top:14px;border:1px solid var(--border,#e3e3e8);border-radius:12px;padding:14px;background:var(--surface,#fafafc)}
.oa-h{font-size:15px;font-weight:700;margin:0 0 8px}
.oa-grid{display:grid;grid-template-columns:max-content 1fr;gap:6px 12px;margin:0 0 10px;font-size:13px;align-items:center}
.oa-grid dt{color:var(--muted,#667);font-weight:600}
.oa-grid dd{margin:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.oa-grid code{font-size:12px;word-break:break-all}
.oa-code{background:#14141c;color:#e8e8f0;border-radius:8px;padding:10px;font-size:12px;overflow:auto;max-height:320px;white-space:pre;margin:6px 0}
.oa-code--out{max-height:220px}
.oa-tabs{display:flex;gap:4px;align-items:center;margin-top:8px}
.oa-tab{border:1px solid var(--border,#ddd);background:transparent;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer}
.oa-tab.on{background:#14141c;color:#fff}
.oa-btn{border:1px solid var(--border,#ccc);background:transparent;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer}
.oa-btn--fill{background:#14141c;color:#fff}
.oa-note{font-size:12.5px;color:var(--muted,#556);margin:6px 0}
.oa-sub{font-size:13px;font-weight:600;margin:10px 0 0}
.oa-muted{color:var(--muted,#778)}
.oa-small{font-size:12px}
.oa-warn{color:#b26a00}
.oa-bad{color:#c62828}
  `],
})
export class OnlineAccessPanelComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  @Input({ required: true }) product!: Product;
  @Input() canUse = false;
  @Input() owner = false;
  @Input() licenseKey = '';
  @Input() licenseExpiresAt: string | null = null;

  readonly langs: Lang[] = ['curl', 'python', 'js'];
  readonly lang = signal<Lang>('python');
  readonly apiKey = signal('');
  readonly creating = signal(false);
  readonly keyErr = signal('');
  readonly copied = signal(false);
  readonly previewing = signal(false);
  readonly previewOut = signal('');
  private readonly now = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly base = environment.apiUrl.replace(/\/$/, '');
  readonly dataset = computed(() => isDatasetCategory(this.product.category));
  readonly endpoint = computed(() =>
    this.dataset() ? `${this.base}/datasets/${this.product.slug}/rows` : `${this.base}/skills/${this.product.slug}/run`,
  );
  readonly expired = computed(() => !!this.licenseExpiresAt && new Date(this.licenseExpiresAt).getTime() <= this.now());
  readonly remaining = computed(() => {
    const ms = new Date(this.licenseExpiresAt || 0).getTime() - this.now();
    if (ms <= 0) return '0';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') this.timer = setInterval(() => this.now.set(Date.now()), 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private keyText(): string {
    return this.apiKey() || 'mk_live_xxx';
  }

  private licText(): string {
    return this.licenseKey || 'AIM-XXXX-XXXX-XXXX';
  }

  installSnippet(): string {
    const slug = this.product.slug;
    return [
      `curl -fL -o /tmp/${slug}.zip ${this.base}/skills/${slug}/loader.zip`,
      `mkdir -p ~/.openclaw/workspace/skills && unzip -o /tmp/${slug}.zip -d ~/.openclaw/workspace/skills/`,
      `export AIMARKETS_LICENSE_KEY=${this.licText()}`,
      `export AIMARKETS_API_KEY=${this.keyText()}`,
      `# kiểm tra / check:`,
      `python3 ~/.openclaw/workspace/skills/<skill>/scripts/aim_resource.py --check`,
    ].join('\n');
  }

  snippet(): string {
    const key = this.keyText();
    const lic = this.licText();
    const slug = this.product.slug;
    if (this.dataset()) {
      const url = `${this.base}/datasets/${slug}/rows`;
      if (this.lang() === 'curl') {
        return [
          `curl -s "${url}?split=train&offset=0&limit=100" \\`,
          `  -H "Authorization: Bearer ${key}" \\`,
          `  -H "X-License-Key: ${lic}"`,
        ].join('\n');
      }
      if (this.lang() === 'python') {
        return [
          'import requests',
          '',
          `URL = "${url}"`,
          `H = {"Authorization": "Bearer ${key}", "X-License-Key": "${lic}"}`,
          '',
          'rows, offset = [], 0',
          'while offset is not None:',
          '    r = requests.get(URL, headers=H, params={"split": "train", "offset": offset, "limit": 500}, timeout=30)',
          '    if r.status_code == 429:  # quota: wait and retry',
          '        import time; time.sleep(int(r.json().get("retryAfter", 60))); continue',
          '    r.raise_for_status()',
          '    page = r.json()',
          '    rows += page["rows"]',
          '    offset = page["nextOffset"]',
          'print(len(rows), "rows")',
        ].join('\n');
      }
      return [
        `const URL = '${url}';`,
        `const H = { Authorization: 'Bearer ${key}', 'X-License-Key': '${lic}' };`,
        '',
        'let offset = 0;',
        'const rows = [];',
        'while (offset !== null) {',
        "  const r = await fetch(`${URL}?split=train&offset=${offset}&limit=500`, { headers: H });",
        '  if (!r.ok) throw new Error(`${r.status} ${(await r.json()).code}`);',
        '  const page = await r.json();',
        '  rows.push(...page.rows);',
        '  offset = page.nextOffset;',
        '}',
        "console.log(rows.length, 'rows');",
      ].join('\n');
    }
    const url = `${this.base}/skills/${slug}`;
    if (this.lang() === 'curl') {
      return [
        `curl -s "${url}" \\`,
        `  -H "Authorization: Bearer ${key}" \\`,
        `  -H "X-License-Key: ${lic}"`,
      ].join('\n');
    }
    if (this.lang() === 'python') {
      return [
        'import requests',
        '',
        `r = requests.post("${url}/run",`,
        `    headers={"Authorization": "Bearer ${key}", "X-License-Key": "${lic}"},`,
        '    json={"script": "<script>.py", "argv": ["--help"], "files": []}, timeout=120)',
        'r.raise_for_status()',
        'print(r.json()["stdout"])',
      ].join('\n');
    }
    return [
      `const r = await fetch('${url}/run', {`,
      "  method: 'POST',",
      `  headers: { Authorization: 'Bearer ${key}', 'X-License-Key': '${lic}', 'Content-Type': 'application/json' },`,
      "  body: JSON.stringify({ script: '<script>.py', argv: ['--help'], files: [] }),",
      '});',
      'console.log((await r.json()).stdout);',
    ].join('\n');
  }

  createKey(): void {
    this.creating.set(true);
    this.keyErr.set('');
    this.http.post<{ apiKey: string }>(`${this.base}/api-keys`, { productSlug: this.product.slug, name: 'online' }).subscribe({
      next: (res) => {
        this.creating.set(false);
        this.apiKey.set(res.apiKey || '');
      },
      error: (e) => {
        this.creating.set(false);
        this.keyErr.set(e?.error?.message || 'Error');
      },
    });
  }

  preview(): void {
    if (!this.licenseKey && !this.owner) return;
    this.previewing.set(true);
    const headers = this.licenseKey ? new HttpHeaders({ 'X-License-Key': this.licenseKey }) : undefined;
    this.http.get<{ rows: unknown[]; total: number; traceId: string }>(`${this.base}/datasets/${this.product.slug}/rows`, {
      headers,
      params: { offset: 0, limit: 5 },
    }).subscribe({
      next: (res) => {
        this.previewing.set(false);
        this.previewOut.set(`total=${res.total} · trace=${res.traceId}\n` + res.rows.map((r) => JSON.stringify(r)).join('\n'));
      },
      error: (e) => {
        this.previewing.set(false);
        this.previewOut.set(`${e?.status || ''} ${e?.error?.code || ''} ${e?.error?.message || this.i18n.t('pd.licenseRequired')}`);
      },
    });
  }

  copy(text: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
