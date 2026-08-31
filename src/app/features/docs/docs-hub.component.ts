import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-docs-hub',
  standalone: true,
  imports: [RouterLink, TPipe],
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
  ];

  readonly steps = [
    { n: 1, titleKey: 'docs.steps.s1.title', bodyKey: 'docs.steps.s1.body' },
    { n: 2, titleKey: 'docs.steps.s2.title', bodyKey: 'docs.steps.s2.body' },
    { n: 3, titleKey: 'docs.steps.s3.title', bodyKey: 'docs.steps.s3.body' },
    { n: 4, titleKey: 'docs.steps.s4.title', bodyKey: 'docs.steps.s4.body' },
  ];

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('docs.title'),
      description: this.i18n.t('docs.lede'),
    });
  }
}
