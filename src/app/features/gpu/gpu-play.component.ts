import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GpuGatewayService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-gpu-play',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase text-muted">Live GPU stream</p>
          <h2 class="font-display text-2xl">Game server</h2>
          <p class="mt-1 text-sm text-muted">
            Player is served by the marketplace API (ProxVN public host optional). No RunPod console iframe.
          </p>
        </div>
        <div class="flex gap-2">
          <span class="text-xs uppercase">{{ status() }}</span>
          <a class="btn btn-outline text-xs" routerLink="/dashboard/gpu">Servers</a>
        </div>
      </div>
      @if (error()) {
        <p class="mt-3 text-sm text-red-400">{{ error() }}</p>
      }
      @if (playerUrl()) {
        <iframe
          class="mt-4 h-[min(70vh,560px)] w-full rounded-xl border border-line bg-black"
          [src]="playerUrl()"
          title="GPU game stream"
          allow="fullscreen"
        ></iframe>
      }
    </section>
  `,
})
export class GpuPlayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly gpu = inject(GpuGatewayService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly status = signal('starting');
  readonly error = signal('');
  readonly playerUrl = signal<SafeResourceUrl | null>(null);
  private sessionId = '';

  ngOnInit(): void {
    this.seo.set({ title: 'GPU game stream' });
    const serverId = this.route.snapshot.paramMap.get('serverId') || '';
    this.gpu.createGameSession(serverId, 'default').subscribe({
      next: (sess) => {
        this.sessionId = sess.sessionId;
        this.status.set(sess.status);
        const token = this.auth.token() || '';
        const url = `${sess.playerUrl}?access_token=${encodeURIComponent(token)}`;
        this.playerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: (e) => {
        this.status.set('error');
        this.error.set(e?.error?.message || 'Could not start live stream');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.sessionId) this.gpu.closeGameSession(this.sessionId).subscribe({ error: () => undefined });
    this.sessionId = '';
  }
}
