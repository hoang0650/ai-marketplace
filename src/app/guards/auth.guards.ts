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

/** Sellers list every category; talent only custom-work (hire) listings — the API enforces the split. */
export const listingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isSeller() || auth.isTalent() ? true : router.createUrlTree(['/auth/login']))),
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
