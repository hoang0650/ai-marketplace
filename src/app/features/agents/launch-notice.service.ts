import { Injectable, signal } from '@angular/core';
import { MarketplaceAgent, OpenClawLaunchResult } from './agents.models';

export interface LaunchNotice {
  kind: 'success' | 'error';
  agentId: string;
  brand: string;
  result: OpenClawLaunchResult;
}

/** App-wide modal that tells the buyer what a Launch did (charge, plan period, next step, refund). */
@Injectable({ providedIn: 'root' })
export class LaunchNoticeService {
  readonly notice = signal<LaunchNotice | null>(null);
  /** Re-run hook for the "Try again" button (set by the page that launched). */
  private retryFn: (() => void) | null = null;

  /**
   * Show the outcome of a Launch. Quiet for a plain re-open of an already paid agent
   * (the tab itself is the feedback) and for a cancelled rent confirm.
   */
  report(agent: MarketplaceAgent, brand: string, result: OpenClawLaunchResult, retry?: () => void): void {
    if (result.code === 'RENT_CANCELLED') return;
    if (result.success && !result.rental) return;
    this.retryFn = retry || null;
    this.notice.set({ kind: result.success ? 'success' : 'error', agentId: agent.id, brand, result });
  }

  canRetry(): boolean {
    return Boolean(this.retryFn);
  }

  retry(): void {
    const fn = this.retryFn;
    this.close();
    fn?.();
  }

  close(): void {
    this.notice.set(null);
    this.retryFn = null;
  }
}
