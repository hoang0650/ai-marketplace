import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsShellComponent } from './docs-shell.component';
import { DocsCodeComponent } from './docs-code.component';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';
import { DOCS_PRICING_MESSAGES } from './docs-pricing.messages';

@Component({
  selector: 'app-docs-hub',
  standalone: true,
  imports: [RouterLink, TPipe, DocsShellComponent, DocsCodeComponent],
  templateUrl: './docs-hub.component.html',
  styleUrl: './docs-hub.component.scss',
})
export class DocsHubComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  readonly brand = environment.brandName;
  readonly apiBase = environment.apiUrl.replace(/\/v1\/?$/, '/v1');

  readonly guides = [
    {
      path: '/docs/api-usage',
      titleKey: 'docs.guide.api.title',
      descKey: 'docs.guide.api.desc',
      tagKey: 'docs.guide.api.tag',
      icon: 'api',
    },
    {
      path: '/docs/compute-streaming',
      titleKey: 'docs.guide.compute.title',
      descKey: 'docs.guide.compute.desc',
      tagKey: 'docs.guide.compute.tag',
      icon: 'gpu',
    },
    {
      path: '/docs/models',
      titleKey: 'docs.guide.models.title',
      descKey: 'docs.guide.models.desc',
      tagKey: 'docs.guide.models.tag',
      icon: 'models',
    },
  ];

  readonly steps = [
    { n: 1, titleKey: 'docs.steps.s1.title', bodyKey: 'docs.steps.s1.body' },
    { n: 2, titleKey: 'docs.steps.s2.title', bodyKey: 'docs.steps.s2.body' },
    { n: 3, titleKey: 'docs.steps.s3.title', bodyKey: 'docs.steps.s3.body' },
    { n: 4, titleKey: 'docs.steps.s4.title', bodyKey: 'docs.steps.s4.body' },
  ];

  readonly pricingFields = [
    { field: 'usageUnit', key: 'docs.pricing.field.usageUnit' },
    { field: 'usageRate', key: 'docs.pricing.field.usageRate' },
    { field: 'inputRate', key: 'docs.pricing.field.inputRate' },
    { field: 'outputRate', key: 'docs.pricing.field.outputRate' },
    { field: 'cachedInputRate', key: 'docs.pricing.field.cachedInputRate' },
    { field: 'minCharge', key: 'docs.pricing.field.minCharge' },
    { field: 'currency', key: 'docs.pricing.field.currency' },
  ];

  readonly unitRows = [
    { code: '1_token', counted: 'docs.pricing.counted.tokens', buys: 'docs.pricing.buy.token' },
    { code: '1k_tokens', counted: 'docs.pricing.counted.tokens', buys: 'docs.pricing.buy.1kTokens' },
    { code: '1m_tokens', counted: 'docs.pricing.counted.tokens', buys: 'docs.pricing.buy.1mTokens' },
    { code: '1k_characters', counted: 'docs.pricing.counted.chars', buys: 'docs.pricing.buy.1kChars' },
    { code: '1m_characters', counted: 'docs.pricing.counted.chars', buys: 'docs.pricing.buy.1mChars' },
    { code: '1_second', counted: 'docs.pricing.counted.seconds', buys: 'docs.pricing.buy.second' },
    { code: '1_minute', counted: 'docs.pricing.counted.seconds', buys: 'docs.pricing.buy.minute' },
    { code: '1_hour', counted: 'docs.pricing.counted.seconds', buys: 'docs.pricing.buy.hour' },
    { code: '1_request', counted: 'docs.pricing.counted.requests', buys: 'docs.pricing.buy.request' },
    { code: '1_image', counted: 'docs.pricing.counted.images', buys: 'docs.pricing.buy.image' },
  ];

  readonly measureRows = [
    { dim: 'docs.pricing.dim.chars', body: 'docs.pricing.measure.chars' },
    { dim: 'docs.pricing.dim.tokens', body: 'docs.pricing.measure.tokens' },
    { dim: 'docs.pricing.dim.cached', body: 'docs.pricing.measure.cached' },
    { dim: 'docs.pricing.dim.images', body: 'docs.pricing.measure.images' },
    { dim: 'docs.pricing.dim.requests', body: 'docs.pricing.measure.requests' },
    { dim: 'docs.pricing.dim.time', body: 'docs.pricing.measure.time' },
  ];

  readonly boundRows: Array<{ dim: string; max: string; maxKey?: string }> = [
    { dim: 'docs.pricing.dim.tokens', max: '2 000 000' },
    { dim: 'docs.pricing.dim.chars', max: '2 000 000' },
    { dim: 'docs.pricing.dim.images', max: '32' },
    { dim: 'docs.pricing.dim.requests', max: '1' },
    { dim: 'docs.pricing.dim.time', max: '', maxKey: 'docs.pricing.bound.seconds' },
  ];

  readonly exampleRows = [
    { unit: '1_token', measured: 'docs.pricing.ex.token.measured', rate: 'docs.pricing.ex.token.rate', charge: '$0.0045' },
    { unit: '1k_tokens', measured: 'docs.pricing.ex.1k.measured', rate: 'docs.pricing.ex.1k.rate', charge: '$1.00' },
    {
      unit: '1m_tokens',
      measured: 'docs.pricing.ex.1m.measured',
      rate: 'docs.pricing.ex.1m.rate',
      charge: '(200×3 + 800×0.30 + 200×15) / 1 000 000 = $0.00384',
    },
    { unit: '1k_characters', measured: 'docs.pricing.ex.1kChars.measured', rate: 'docs.pricing.ex.1kChars.rate', charge: '$0.004' },
    { unit: '1m_characters', measured: 'docs.pricing.ex.1mChars.measured', rate: 'docs.pricing.ex.1mChars.rate', charge: '$0.005' },
    { unit: '1_second', measured: 'docs.pricing.ex.second.measured', rate: 'docs.pricing.ex.second.rate', charge: '$0.03' },
    { unit: '1_minute', measured: 'docs.pricing.ex.minute.measured', rate: 'docs.pricing.ex.minute.rate', charge: '$0.90' },
    { unit: '1_hour', measured: 'docs.pricing.ex.hour.measured', rate: 'docs.pricing.ex.hour.rate', charge: '$0.03' },
    { unit: '1_request', measured: 'docs.pricing.ex.request.measured', rate: 'docs.pricing.ex.request.rate', charge: '$0.02' },
    { unit: '1_image', measured: 'docs.pricing.ex.image.measured', rate: 'docs.pricing.ex.image.rate', charge: '$0.12' },
  ];

  readonly roundNotes = [
    'docs.pricing.round.seconds',
    'docs.pricing.round.proRata',
    'docs.pricing.round.wallet',
    'docs.pricing.round.fx',
    'docs.pricing.round.settle',
    'docs.pricing.round.session',
  ];

  readonly pricingSample = `{
  "model": "usage",
  "currency": "USD",
  "usageUnit": "1k_tokens",
  "usageRate": 0.5,
  "inputRate": 0.4,
  "outputRate": 1.2,
  "cachedInputRate": 0.1,
  "minCharge": 0.01
}`;

  readonly meterSample = `{
  "unit": "1k_tokens",
  "rate": 0.5,
  "currency": "USD",
  "inputRate": 0.4,
  "outputRate": 1.2,
  "cachedInputRate": 0.1,
  "minCharge": 0.01,
  "rounding": "exact_pro_rata_round6"
}`;

  readonly roundingFormula = 'USD = half_up_6((quantity / unitSize) × rateUSD)';

  readonly openaiUsageSample = `{
  "usage": {
    "prompt_tokens": 1000,
    "completion_tokens": 200,
    "prompt_tokens_details": { "cached_tokens": 800 }
  }
}`;

  readonly imageReportSample = `{
  "usage": {
    "report": { "unit": "image", "quantity": 2 }
  }
}`;

  readonly tokenReportSample = `{
  "usage": {
    "report": { "unit": "1k_tokens", "input": 1000, "output": 200, "cached": 800 }
  }
}`;

  readonly usageHeaderSample = 'X-AIM-Usage: {"unit":"second","quantity":12}';

  ngOnInit(): void {
    this.i18n.extend(DOCS_PRICING_MESSAGES);
    this.seo.set({
      title: this.i18n.t('docs.title'),
      description: this.i18n.t('docs.lede'),
    });
  }
}
