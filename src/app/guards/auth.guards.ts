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

export const creatorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isCreator() ? true : router.createUrlTree(['/auth/login']))),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureReady().pipe(
    map(() => (auth.isAdmin() ? true : router.createUrlTree(['/']))),
  );
};
