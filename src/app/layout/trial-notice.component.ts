import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { TPipe } from '../i18n/t.pipe';

const DISMISS_KEY = 'aimarkets.trialNotice.dismissed';

/** Amber bar above every page while e-commerce registration is pending. */
@Component({
  selector: 'app-trial-notice',
  standalone: true,
  imports: [TPipe],
  template: `
    @if (enabled && !dismissed()) {
      <div class="trial-notice" role="region" aria-labelledby="trial-notice-text">
        <p id="trial-notice-text">{{ 'notice.trial' | t }}</p>
        <button type="button" (click)="dismiss()" [attr.aria-label]="'notice.dismiss' | t">×</button>
      </div>
    }
  `,
  styles: `
    .trial-notice {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: calc(0.45rem + env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) 0.45rem
        max(0.75rem, env(safe-area-inset-left));
      background: #fbf6ea;
      color: #5c4816;
      border-bottom: 1px solid #e6d3a1;
      font-size: 0.84rem;
      line-height: 1.45;
    }
    .trial-notice p {
      margin: 0;
      flex: 1;
      min-width: 0;
    }
    .trial-notice button {
      flex: none;
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
    }
    .trial-notice button:hover {
      background: rgba(92, 72, 22, 0.08);
    }
    @media (max-width: 767.98px) {
      .trial-notice {
        align-items: flex-start;
        font-size: 0.8rem;
      }
      .trial-notice button {
        width: 44px;
        height: 44px;
      }
    }
    :host-context([data-theme='dark']) .trial-notice {
      background: #2c2618;
      color: #f3e6c4;
      border-bottom-color: #6d5a32;
    }
    :host-context([data-theme='dark']) .trial-notice button:hover {
      background: rgba(243, 230, 196, 0.08);
    }
  `,
})
export class TrialNoticeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  readonly enabled = environment.trialNotice;
  readonly dismissed = signal(false);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === '1') this.dismissed.set(true);
      } catch {
        /* private mode */
      }
    });
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  }
}
