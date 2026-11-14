import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

const DOCS_NAV_MESSAGES = {
  vi: {
    'docsNav.label': 'Mục tài liệu',
    'docsNav.overview': 'Tổng quan',
    'docsNav.pricing': 'Giá theo đơn vị',
    'docsNav.api': 'API Gateway',
    'docsNav.compute': 'GPU / Game',
    'docsNav.models': 'Endpoint model',
  },
  en: {
    'docsNav.label': 'Docs sections',
    'docsNav.overview': 'Overview',
    'docsNav.pricing': 'Per-unit pricing',
    'docsNav.api': 'API Gateway',
    'docsNav.compute': 'GPU / Game',
    'docsNav.models': 'Model endpoints',
  },
  zh: {
    'docsNav.label': '文档目录',
    'docsNav.overview': '概览',
    'docsNav.pricing': '按单位定价',
    'docsNav.api': 'API 网关',
    'docsNav.compute': 'GPU / 游戏',
    'docsNav.models': '模型端点',
  },
};

@Component({
  selector: 'app-docs-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="docs-shell">
      <nav class="docs-shell__nav" [attr.aria-label]="'docsNav.label' | t">
        <a routerLink="/docs" routerLinkActive="is-on" [routerLinkActiveOptions]="{ exact: true }">{{ 'docsNav.overview' | t }}</a>
        <a routerLink="/docs" fragment="pricing-units">{{ 'docsNav.pricing' | t }}</a>
        <a routerLink="/docs/api-usage" routerLinkActive="is-on">{{ 'docsNav.api' | t }}</a>
        <a routerLink="/docs/compute-streaming" routerLinkActive="is-on">{{ 'docsNav.compute' | t }}</a>
        <a routerLink="/docs/models" routerLinkActive="is-on" [routerLinkActiveOptions]="{ exact: false }">{{ 'docsNav.models' | t }}</a>
      </nav>
      <div class="docs-shell__main">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    .docs-shell {
      display: grid;
      gap: 1rem;
      min-width: 0;
      max-width: 100%;
    }
    .docs-shell__nav {
      display: flex;
      gap: 0.4rem;
      max-width: 100%;
      overflow-x: auto;
      padding-bottom: 0.15rem;
      -webkit-overflow-scrolling: touch;
    }
    .docs-shell__nav a {
      flex: 0 0 auto;
      text-decoration: none;
      color: var(--color-ink);
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .docs-shell__nav a.is-on,
    .docs-shell__nav a:hover {
      border-color: var(--color-lux-gold, #c9a961);
      color: var(--color-ink);
    }
    .docs-shell__nav a.is-on {
      background: var(--color-ink);
      color: var(--color-paper, #fff);
    }
    .docs-shell__main {
      min-width: 0;
      max-width: 100%;
    }
    .docs-shell code,
    .docs-shell pre {
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 100%;
    }
    .docs-shell .seller-docs__toc {
      flex-wrap: nowrap;
      overflow-x: auto;
      max-width: 100%;
    }
    .docs-shell .seller-docs__toc a {
      flex: 0 0 auto;
    }
    .docs-shell .seller-docs__table-wrap,
    .docs-shell .docs-table-wrap,
    .docs-shell .docs-model__table-wrap {
      max-width: 100%;
      overflow-x: auto;
    }
    @media (min-width: 960px) {
      .docs-shell {
        grid-template-columns: 13.5rem minmax(0, 1fr);
        align-items: start;
        gap: 1.5rem;
      }
      .docs-shell__nav {
        flex-direction: column;
        position: sticky;
        top: 1rem;
        overflow: visible;
        padding: 0;
      }
      .docs-shell__nav a {
        white-space: normal;
        border-radius: 10px;
      }
    }
  `,
})
export class DocsShellComponent {
  private readonly i18n = inject(I18nService);
  constructor() {
    this.i18n.extend(DOCS_NAV_MESSAGES);
  }
}
