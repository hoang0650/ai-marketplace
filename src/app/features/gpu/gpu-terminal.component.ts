import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GpuGatewayService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-gpu-terminal',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase text-muted">Project / terminal</p>
          <h2 class="font-display text-2xl">Web terminal</h2>
        </div>
        <div class="flex gap-2">
          <span class="text-xs uppercase tracking-wide" [class.text-emerald-400]="status()==='connected'" [class.text-amber-300]="status()==='connecting'" [class.text-red-400]="status()==='error'">{{ status() }}</span>
          <button class="btn btn-outline text-xs" type="button" (click)="connect()" [disabled]="status()==='connecting'">Connect</button>
          <button class="btn btn-outline text-xs" type="button" (click)="disconnect()">Disconnect</button>
          <a class="btn btn-outline text-xs" routerLink="/dashboard/gpu">Back</a>
        </div>
      </div>
      @if (error()) {
        <p class="mt-3 text-sm text-red-400">{{ friendlyError() }}</p>
      }
      <pre #term class="mt-4 h-[420px] overflow-auto rounded-xl bg-black p-4 font-mono text-sm leading-relaxed text-emerald-300 outline-none" tabindex="0" (keydown)="onKey($event)"></pre>
      <p class="mt-2 text-xs text-muted">Ctrl+C / Ctrl+D / Ctrl+L · input stays on this origin · no RunPod console iframe</p>
    </section>
  `,
})
export class GpuTerminalComponent implements OnInit, OnDestroy {
  @ViewChild('term') termRef?: ElementRef<HTMLPreElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly gpu = inject(GpuGatewayService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private ws: WebSocket | null = null;
  private sessionId = '';
  readonly status = signal<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  readonly error = signal('');
  projectId = 'default';
  serverId = '';

  ngOnInit(): void {
    this.seo.set({ title: 'GPU terminal' });
    this.projectId = this.route.snapshot.paramMap.get('projectId') || 'default';
    this.serverId = this.route.snapshot.queryParamMap.get('serverId') || '';
    if (this.serverId) this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  friendlyError(): string {
    const c = this.error();
    const map: Record<string, string> = {
      UNAUTHORIZED: 'Please sign in again.',
      FORBIDDEN: 'You do not own this GPU server.',
      SESSION_EXPIRED: 'Terminal session expired.',
      SERVER_NOT_READY: 'Server is not running yet.',
      TERMINAL_TIMEOUT: 'Idle timeout — reconnect when ready.',
      PROVIDER_UNAVAILABLE: 'GPU provider is unavailable.',
    };
    return map[c] || c;
  }

  connect(): void {
    if (!this.serverId) {
      this.error.set('SERVER_NOT_FOUND');
      this.status.set('error');
      return;
    }
    this.disconnect();
    this.status.set('connecting');
    this.error.set('');
    this.gpu.createTerminal(this.serverId, this.projectId).subscribe({
      next: (sess) => {
        this.sessionId = sess.sessionId;
        const token = this.auth.token() || '';
        const ws = new WebSocket(this.gpu.wsUrl(sess.sessionId, token));
        this.ws = ws;
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            if (msg.type === 'status') this.status.set(msg.status === 'connected' ? 'connected' : 'connecting');
            if (msg.type === 'output') this.write(msg.data || '');
            if (msg.type === 'error') {
              this.error.set(msg.code || msg.message || 'error');
              this.status.set('error');
            }
          } catch {
            this.write(String(ev.data));
          }
        };
        ws.onerror = () => {
          this.status.set('error');
          this.error.set('TERMINAL_CONNECTION_FAILED');
        };
        ws.onclose = () => {
          if (this.status() === 'connected') this.status.set('idle');
        };
      },
      error: (e) => {
        this.status.set('error');
        this.error.set(e?.error?.code || e?.error?.message || 'TERMINAL_CONNECTION_FAILED');
      },
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    if (this.sessionId) {
      this.gpu.closeTerminal(this.sessionId).subscribe({ error: () => undefined });
      this.sessionId = '';
    }
    this.status.set('idle');
  }

  onKey(ev: KeyboardEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    ev.preventDefault();
    let data = '';
    if (ev.ctrlKey && ev.key.toLowerCase() === 'c') data = '\x03';
    else if (ev.ctrlKey && ev.key.toLowerCase() === 'd') data = '\x04';
    else if (ev.ctrlKey && ev.key.toLowerCase() === 'l') data = '\x0c';
    else if (ev.key === 'Enter') data = '\r';
    else if (ev.key === 'Backspace') data = '\x7f';
    else if (ev.key.length === 1) data = ev.key;
    else return;
    this.ws.send(JSON.stringify({ type: 'input', data }));
  }

  private write(text: string): void {
    const el = this.termRef?.nativeElement;
    if (!el) return;
    el.textContent = (el.textContent || '') + text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    el.scrollTop = el.scrollHeight;
  }
}
