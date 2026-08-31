import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sell-api-usage-docs',
  standalone: true,
  imports: [RouterLink, TPipe],
  templateUrl: './sell-api-usage.component.html',
  styleUrl: './sell-api-usage.component.scss',
})
export class SellApiUsageDocsComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly supportEmail = 'support@aimarkets.vn';
  readonly brand = environment.brandName;
  readonly apiBase = environment.apiUrl.replace(/\/v1\/?$/, '/v1');

  readonly flowDiagram = `Buyer (JWT hoặc mk_live_ key)
  → POST /v1/chat/completions
  → AI Markets API (meter + ví)
  → denglish-api /v1/infer
  → Provider (Featherless, OpenRouter, RunPod…)
  ← usage { input_tokens, output_tokens }
  → UsageEvent + UsageStat + WalletTx`;

  readonly sampleResponse = `{
  "usage": {
    "input_tokens": 12,
    "output_tokens": 48,
    "total_tokens": 60
  },
  "marketplace": {
    "cost": 0.0012,
    "provider": "featherless"
  }
}`;

  readonly curlExample = `curl ${environment.production ? 'https://api.aimarkets.vn/v1' : 'http://localhost:4100/v1'}/chat/completions \\
  -H "Authorization: Bearer mk_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "your-product-slug",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;

  readonly toc = [
    { id: 'principle', labelKey: 'sellDocs.toc.principle' },
    { id: 'flow', labelKey: 'sellDocs.toc.flow' },
    { id: 'seller-setup', labelKey: 'sellDocs.toc.setup' },
    { id: 'buyer-api', labelKey: 'sellDocs.toc.buyerApi' },
    { id: 'seller-stats', labelKey: 'sellDocs.toc.stats' },
    { id: 'faq', labelKey: 'sellDocs.toc.faq' },
  ];

  readonly faq = [
    { qKey: 'sellDocs.faq.q1', aKey: 'sellDocs.faq.a1' },
    { qKey: 'sellDocs.faq.q2', aKey: 'sellDocs.faq.a2' },
    { qKey: 'sellDocs.faq.q3', aKey: 'sellDocs.faq.a3' },
    { qKey: 'sellDocs.faq.q4', aKey: 'sellDocs.faq.a4' },
  ];

  ngOnInit(): void {
    this.seo.set({ title: this.i18n.t('sellDocs.title') });
  }
}
