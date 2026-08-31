import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GpuGatewayService } from '../../services/api.services';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-gpu-play',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase text-muted">{{ 'compute.play.kicker' | t }}</p>
          <h2 class="font-display text-2xl">{{ title() }}</h2>
          <p class="mt-1 text-sm text-muted">{{ 'compute.play.sub' | t }}</p>
        </div>
        <div class="flex gap-2">
          <span class="text-xs uppercase">{{ status() }}</span>
          @if (productSlug()) {
            <a class="btn btn-outline text-xs" [routerLink]="['/product', productSlug()]">{{ 'compute.play.backProduct' | t }}</a>
          } @else {
            <a class="btn btn-outline text-xs" routerLink="/dashboard/gpu">{{ 'compute.play.servers' | t }}</a>
          }
        </div>
      </div>
      @if (error()) {
        <p class="mt-3 text-sm text-red-400">{{ error() }}</p>
      }
      @if (playerUrl()) {
        <iframe
          class="mt-4 h-[min(70vh,560px)] w-full rounded-xl border border-line bg-black"
          [src]="playerUrl()"
          title="GPU stream"
          allow="fullscreen; autoplay"
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
  private readonly i18n = inject(I18nService);
  readonly status = signal('starting');
  readonly error = signal('');
  readonly playerUrl = signal<SafeResourceUrl | null>(null);
  readonly productSlug = signal('');
  readonly title = signal('');
  private sessionId = '';

  ngOnInit(): void {
    const productSlug = this.route.snapshot.paramMap.get('productSlug') || '';
    const serverId = this.route.snapshot.paramMap.get('serverId') || '';
    this.productSlug.set(productSlug);
    this.title.set(
      productSlug ? productSlug : this.i18n.t('compute.play.gameServer'),
    );
    this.seo.set({ title: this.i18n.t('compute.play.seo') });

    const req = productSlug
      ? this.gpu.createGameSession({ productSlug })
      : serverId
        ? this.gpu.createGameSession(serverId)
        : null;

    if (!req) {
      this.status.set('error');
      this.error.set(this.i18n.t('compute.play.missingTarget'));
      return;
    }

    req.subscribe({
      next: (sess) => {
        this.sessionId = sess.sessionId;
        this.status.set(sess.status);
        if (sess.productSlug) this.productSlug.set(sess.productSlug);
        const token = this.auth.token() || '';
        const url = `${sess.playerUrl}?access_token=${encodeURIComponent(token)}`;
        this.playerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: (e) => {
        this.status.set('error');
        this.error.set(e?.error?.message || this.i18n.t('compute.play.startFailed'));
      },
    });
  }

  ngOnDestroy(): void {
    if (this.sessionId) this.gpu.closeGameSession(this.sessionId).subscribe({ error: () => undefined });
    this.sessionId = '';
  }
}
