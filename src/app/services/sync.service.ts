import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface SyncEvent {
  seq: number;
  type: string;
  data: any;
  at: string;
  /** Sent by this same device. */
  self: boolean;
}

/**
 * Long-polls GET /v1/handoff/sync while logged in, so every open tab / phone of the user
 * sees the same Builder state, build progress and device links. Resumes from its cursor
 * after a disconnect; `reset` events tell listeners to refetch from the server.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private running = false;
  private cursor = '';
  private gen = 0;

  readonly events = new Subject<SyncEvent>();
  readonly connected = signal(false);
  readonly revoked = signal(false);

  constructor() {
    if (!this.browser) return;
    effect(() => {
      if (this.auth.isAuthenticated()) this.start();
      else this.stop();
    });
  }

  start(): void {
    if (this.running || this.revoked()) return;
    this.running = true;
    void this.loop(++this.gen);
  }

  stop(): void {
    this.running = false;
    this.gen++;
    this.connected.set(false);
  }

  private async loop(gen: number): Promise<void> {
    let backoff = 1000;
    while (this.running && gen === this.gen) {
      try {
        const url = `${environment.apiUrl}/handoff/sync?wait=25&since=${encodeURIComponent(this.cursor)}`;
        const r = await firstValueFrom(this.http.get<{ cursor: string; reset: boolean; events: SyncEvent[] }>(url));
        if (gen !== this.gen) return;
        const first = !this.cursor;
        this.cursor = r.cursor;
        this.connected.set(true);
        backoff = 1000;
        if (r.reset && !first) this.events.next({ seq: 0, type: 'reset', data: {}, at: new Date().toISOString(), self: false });
        for (const e of r.events) this.events.next(e);
        if (document.hidden) await sleep(4000);
      } catch (e: any) {
        this.connected.set(false);
        if (e?.status === 403 && e?.error?.error?.code === 'DEVICE_REVOKED') {
          this.revoked.set(true);
          this.running = false;
          return;
        }
        if (e?.status === 401) {
          this.running = false;
          return;
        }
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 30_000);
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
