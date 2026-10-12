import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/marketplace.models';
import { WORK_BOARD_ENABLED } from '../../models/feature-flags';

function afterAuthRoute(user: User, next: string): string {
  const pathOnly = String(next || '').split('?')[0];
  const skip =
    !pathOnly ||
    pathOnly === '/' ||
    pathOnly.startsWith('/auth/') ||
    pathOnly.startsWith('//');
  if (!skip && next.startsWith('/')) return next;
  if (user.role === 'admin') return '/admin';
  if (user.role === 'seller') return '/dashboard';
  if (user.role === 'talent') return WORK_BOARD_ENABLED ? '/work/talents' : '/sell';
  if (user.role === 'freelancer') return WORK_BOARD_ENABLED ? '/work/manage/contracts' : '/';
  if (user.role === 'employer') return WORK_BOARD_ENABLED ? '/work/manage' : '/';
  return '/marketplace';
}

@Component({
  selector: 'app-google-auth-callback',
  standalone: true,
  template: `
    <section class="page route-enter" style="max-width: 28rem; margin: 4rem auto; text-align: center">
      <p>Đang hoàn tất đăng nhập Google…</p>
    </section>
  `,
})
export class GoogleAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const q = this.route.snapshot.queryParamMap;
    const token = q.get('token') || '';
    const next = q.get('next') || '/';
    if (!token) {
      void this.router.navigate(['/auth/login'], { queryParams: { google: 'error' } });
      return;
    }
    this.auth.persistToken(token);
    this.auth.refreshMe().subscribe({
      next: (user) => {
        if (!user) {
          void this.router.navigate(['/auth/login'], { queryParams: { google: 'error' } });
          return;
        }
        void this.router.navigateByUrl(afterAuthRoute(user, next), { replaceUrl: true });
      },
      error: () => {
        void this.router.navigate(['/auth/login'], { queryParams: { google: 'error' } });
      },
    });
  }
}
