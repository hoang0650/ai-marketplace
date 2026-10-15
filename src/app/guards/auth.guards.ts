import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']))),
  );
};

export const sellerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isSeller() ? true : router.createUrlTree(['/auth/login']))),
  );
};

export const talentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isTalent() ? true : router.createUrlTree(['/auth/login']))),
  );
};

export const freelancerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isFreelancer() ? true : router.createUrlTree(['/auth/login']))),
  );
};

export const employerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isEmployer() ? true : router.createUrlTree(['/auth/login']))),
  );
};

/** Only sellers list products (Hire/Work is discontinued, so legacy talent accounts cannot list). */
export const listingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isSeller() ? true : router.createUrlTree(['/auth/login']))),
  );
};

/** Admin or staff with the 'finance.tax' permission (kế toán thuế). */
export const taxStaffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isTaxStaff() ? true : router.createUrlTree(['/']))),
  );
};

/** /dashboard: sellers get the creator dashboard; everyone else (signed in) gets the buyer console. Never bounces to /marketplace. */
export const dashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => {
      if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/dashboard' } });
      return auth.isSeller() || auth.isAdmin() ? true : router.createUrlTree(['/account/console']);
    }),
  );
};

/** @deprecated use sellerGuard — kept for existing routes. */
export const creatorGuard = sellerGuard;

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isAdmin() ? true : router.createUrlTree(['/']))),
  );
};
