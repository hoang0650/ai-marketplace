import { AfterViewInit, Component, ElementRef, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

const DOCS_NAV_MESSAGES = {
  vi: {
    'docsNav.label': 'Mục tài liệu',
    'docsNav.guides': 'Hướng dẫn',
    'docsNav.onThisPage': 'Trên trang này',
    'docsNav.overview': 'Tổng quan',
    'docsNav.pricing': 'Giá theo đơn vị',
    'docsNav.api': 'API Gateway',
    'docsNav.compute': 'GPU / Game',
    'docsNav.models': 'Endpoint model',
    'docsNav.jump': 'Chọn trang',
  },
  en: {
    'docsNav.label': 'Docs sections',
    'docsNav.guides': 'Guides',
    'docsNav.onThisPage': 'On this page',
    'docsNav.overview': 'Overview',
    'docsNav.pricing': 'Per-unit pricing',
    'docsNav.api': 'API Gateway',
    'docsNav.compute': 'GPU / Game',
    'docsNav.models': 'Model endpoints',
    'docsNav.jump': 'Choose a page',
  },
  zh: {
    'docsNav.label': '文档目录',
    'docsNav.guides': '指南',
    'docsNav.onThisPage': '本页目录',
    'docsNav.overview': '概览',
    'docsNav.pricing': '按单位定价',
    'docsNav.api': 'API 网关',
    'docsNav.compute': 'GPU / 游戏',
    'docsNav.models': '模型端点',
    'docsNav.jump': '选择页面',
  },
};

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

@Component({
  selector: 'app-docs-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="docs-shell">
      <aside class="docs-shell__side">
        <p class="docs-shell__kicker">{{ 'docsNav.guides' | t }}</p>
        <label class="docs-shell__jump">
          <span class="sr-only">{{ 'docsNav.jump' | t }}</span>
          <select (change)="jump($event)">
            <option value="/docs">{{ 'docsNav.overview' | t }}</option>
            <option value="/docs#pricing-units">{{ 'docsNav.pricing' | t }}</option>
            <option value="/docs/api-usage">{{ 'docsNav.api' | t }}</option>
            <option value="/docs/compute-streaming">{{ 'docsNav.compute' | t }}</option>
            <option value="/docs/models">{{ 'docsNav.models' | t }}</option>
          </select>
        </label>
        <nav class="docs-shell__nav" [attr.aria-label]="'docsNav.label' | t">
          <a routerLink="/docs" routerLinkActive="is-on" [routerLinkActiveOptions]="{ exact: true }">{{ 'docsNav.overview' | t }}</a>
          <a routerLink="/docs" fragment="pricing-units">{{ 'docsNav.pricing' | t }}</a>
          <a routerLink="/docs/api-usage" routerLinkActive="is-on">{{ 'docsNav.api' | t }}</a>
          <a routerLink="/docs/compute-streaming" routerLinkActive="is-on">{{ 'docsNav.compute' | t }}</a>
          <a routerLink="/docs/models" routerLinkActive="is-on">{{ 'docsNav.models' | t }}</a>
        </nav>
      </aside>

      <div class="docs-shell__main" #main>
        @if (toc.length) {
          <details class="docs-shell__toc-mobile">
            <summary>{{ 'docsNav.onThisPage' | t }}</summary>
            @for (item of toc; track item.id) {
              <a [href]="'#' + item.id" [class.is-deep]="item.level === 3" [class.is-current]="item.id === activeId">{{ item.text }}</a>
            }
          </details>
        }
        <ng-content></ng-content>
      </div>

      <aside class="docs-shell__toc" [attr.aria-label]="'docsNav.onThisPage' | t">
        @if (toc.length) {
          <p class="docs-shell__kicker">{{ 'docsNav.onThisPage' | t }}</p>
          @for (item of toc; track item.id) {
            <a [href]="'#' + item.id" [class.is-deep]="item.level === 3" [class.is-current]="item.id === activeId">{{ item.text }}</a>
          }
        }
      </aside>
    </div>
  `,
  styles: `
    .page:has(.docs-shell) { max-width: 90rem; }
    .docs-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.25rem;
      min-width: 0;
      max-width: 100%;
    }
    .docs-shell__kicker {
      margin: 0 0 0.45rem;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-muted);
    }
    .docs-shell__jump { display: block; margin-bottom: 0.75rem; }
    .docs-shell__jump select {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--color-line);
      border-radius: 10px;
      background: var(--color-surface);
      color: var(--color-ink);
      padding: 0.45rem 0.7rem;
      font: inherit;
      font-weight: 700;
    }
    .docs-shell__nav { display: none; }
    .docs-shell__toc { display: none; }
    .docs-shell__toc-mobile {
      margin: 0 0 1rem;
      border: 1px solid var(--color-line);
      border-radius: 12px;
      background: var(--color-surface);
      padding: 0.55rem 0.8rem;
    }
    .docs-shell__toc-mobile summary { cursor: pointer; font-weight: 800; font-size: 0.88rem; }
    .docs-shell__toc-mobile a, .docs-shell__toc a {
      display: block;
      text-decoration: none;
      color: var(--color-muted);
      font-size: 0.84rem;
      line-height: 1.35;
      padding: 0.28rem 0 0.28rem 0.55rem;
      border-left: 2px solid transparent;
    }
    .docs-shell__toc-mobile a.is-deep, .docs-shell__toc a.is-deep { padding-left: 1rem; font-size: 0.8rem; }
    .docs-shell__toc-mobile a.is-current, .docs-shell__toc a.is-current {
      color: var(--color-ink);
      border-left-color: var(--color-lux-gold, #c9a961);
      font-weight: 800;
    }
    .docs-shell__main { min-width: 0; max-width: 100%; }
    .docs-shell__main > .docs-hub,
    .docs-shell__main > .seller-docs,
    .docs-shell .docs-hub,
    .docs-shell .seller-docs { max-width: 51.25rem; margin: 0; }
    .docs-shell .docs-hub h1,
    .docs-shell .seller-docs h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.9rem, 3vw, 2.55rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin: 0.2rem 0 0.7rem;
    }
    .docs-shell .docs-hub__lede,
    .docs-shell .seller-docs__lede {
      font-size: 1.05rem;
      line-height: 1.7;
      max-width: 40rem;
    }
    .docs-shell .docs-hub__crumb,
    .docs-shell .seller-docs__crumb {
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .docs-shell h2 {
      font-size: 1.35rem;
      line-height: 1.3;
      margin: 2.1rem 0 0.7rem;
      scroll-margin-top: 1rem;
    }
    .docs-shell h3 {
      font-size: 1.05rem;
      margin: 1.35rem 0 0.45rem;
      scroll-margin-top: 1rem;
    }
    .docs-shell p, .docs-shell li { line-height: 1.7; }
    .docs-shell .seller-docs__toc { display: none; }
    .docs-shell .docs-hub__guides { grid-template-columns: 1fr; }
    .docs-shell .docs-card h2 { border-top: 0; margin: 0; font-size: 1.15rem; }
    .docs-shell .seller-docs__table-wrap,
    .docs-shell .docs-table-wrap,
    .docs-shell .docs-model__table-wrap {
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-line);
      border-radius: 12px;
      background: var(--color-surface);
    }
    .docs-shell table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.88rem; }
    .docs-shell th, .docs-shell td {
      text-align: left;
      vertical-align: top;
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid var(--color-line);
    }
    .docs-shell th {
      position: sticky;
      top: 0;
      background: var(--color-mist);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      z-index: 1;
    }
    .docs-shell tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--color-mist) 65%, transparent); }
    .docs-shell td code, .docs-shell th code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; }
    .docs-shell code, .docs-shell pre { overflow-wrap: anywhere; max-width: 100%; }
    .docs-shell .seller-docs__warn,
    .docs-shell .docs-hub__warn {
      border: 1px solid color-mix(in srgb, var(--color-lux-gold, #c9a961) 45%, var(--color-line));
      border-left: 3px solid var(--color-lux-gold, #c9a961);
      background: color-mix(in srgb, var(--color-lux-gold, #c9a961) 14%, var(--color-surface));
      color: var(--color-ink);
      border-radius: 12px;
      padding: 0.85rem 1rem;
    }
    .docs-endpoints { display: grid; gap: 0.45rem; margin: 0.75rem 0 1rem; }
    .docs-endpoints > div {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--color-line);
      border-radius: 10px;
      background: var(--color-surface);
    }
    .docs-endpoints code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; }
    .docs-verb {
      display: inline-flex;
      align-items: center;
      min-width: 3.4rem;
      justify-content: center;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .docs-verb--get { background: #e7f6ec; color: #146c36; }
    .docs-verb--post { background: #e8eefc; color: #1d4e9e; }
    .docs-verb--delete { background: #fdecec; color: #9b1c1c; }
    [data-theme='dark'] .docs-verb--get { background: #143222; color: #b7ebc9; }
    [data-theme='dark'] .docs-verb--post { background: #1a2744; color: #c5d6ff; }
    [data-theme='dark'] .docs-verb--delete { background: #3a1818; color: #ffc9c9; }
    .docs-shell a:focus-visible,
    .docs-shell button:focus-visible,
    .docs-shell select:focus-visible,
    .docs-shell input:focus-visible {
      outline: 2px solid var(--color-lux-gold, #c9a961);
      outline-offset: 2px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    @media (min-width: 960px) {
      .docs-shell { grid-template-columns: 12.5rem minmax(0, 1fr); align-items: start; }
      .docs-shell__jump { display: none; }
      .docs-shell__nav { display: grid; gap: 0.2rem; position: sticky; top: 1rem; }
      .docs-shell__nav a {
        text-decoration: none;
        color: var(--color-muted);
        border-radius: 8px;
        padding: 0.45rem 0.65rem;
        font-size: 0.9rem;
        font-weight: 700;
      }
      .docs-shell__nav a:hover { background: var(--color-mist); color: var(--color-ink); }
      .docs-shell__nav a.is-on {
        background: color-mix(in srgb, var(--color-lux-gold, #c9a961) 22%, var(--color-surface));
        color: var(--color-ink);
        box-shadow: inset 2px 0 0 var(--color-lux-gold, #c9a961);
      }
    }
    @media (min-width: 1200px) {
      .docs-shell {
        grid-template-columns: 13rem minmax(0, 51.25rem) 12.5rem;
        justify-content: center;
        gap: 1.75rem;
      }
      .docs-shell__toc {
        display: block;
        position: sticky;
        top: 1rem;
        max-height: calc(100vh - 2rem);
        overflow: auto;
      }
      .docs-shell__toc-mobile { display: none; }
    }
  `,
})
export class DocsShellComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private sub?: Subscription;
  private observer?: IntersectionObserver;
  toc: TocItem[] = [];
  activeId = '';

  constructor() {
    this.i18n.extend(DOCS_NAV_MESSAGES);
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.collect());
    this.sub = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      setTimeout(() => this.collect(), 0);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.observer?.disconnect();
  }

  jump(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const [path, hash] = value.split('#');
    void this.router.navigate([path], hash ? { fragment: hash } : undefined);
  }

  private collect(): void {
    const main = this.host.nativeElement.querySelector('.docs-shell__main') as HTMLElement | null;
    if (!main) return;
    const heads = [...main.querySelectorAll('h2, h3')].filter((el) => !el.closest('.docs-card'));
    this.toc = heads
      .map((el, index) => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return null;
        if (!el.id) {
          el.id = `doc-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || index}`;
        }
        return { id: el.id, text, level: el.tagName === 'H3' ? 3 : 2 } as TocItem;
      })
      .filter((item): item is TocItem => !!item);
    this.observer?.disconnect();
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) this.activeId = visible.target.id;
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] },
    );
    heads.forEach((el) => this.observer?.observe(el));
    if (!this.activeId && this.toc[0]) this.activeId = this.toc[0].id;
  }
}
