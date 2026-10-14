import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';

/**
 * "← Back" link for sub-pages: goes back in in-app history, or to `fallback`
 * (default /admin) when the page was opened directly (new tab, bookmark, reload).
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [TPipe],
  template: `<button type="button" class="back-btn" (click)="back()" data-testid="back-button">
    <span aria-hidden="true">←</span> {{ 'common.back' | t }}
  </button>`,
  styles: `
    :host { display: block; margin: 0 0 0.5rem; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.75rem; border-radius: 999px;
      border: 1px solid var(--color-line, #e5e5e5); background: var(--color-surface, transparent);
      color: var(--color-muted, #666); font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .back-btn:hover, .back-btn:focus-visible { color: var(--color-ink, #111); border-color: var(--color-ink, #111); }
  `,
})
export class BackButtonComponent {
  readonly fallback = input('/admin');
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  back(): void {
    const hasInAppHistory = Boolean(this.router.lastSuccessfulNavigation?.previousNavigation);
    if (hasInAppHistory) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(this.fallback());
    }
  }
}
