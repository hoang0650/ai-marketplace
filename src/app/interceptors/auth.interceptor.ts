import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { deviceId, deviceName } from '../services/device-id';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiUrl);
  if (!isApi) {
    return next(req);
  }

  const token = auth.token();
  const authed = req.clone({
    withCredentials: true,
    setHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Only the handoff/devices endpoints read these (cross-device sync).
      ...(token && req.url.includes('/handoff') && deviceId()
        ? { 'X-Device-Id': deviceId(), 'X-Device-Platform': 'web', 'X-Device-Name': encodeURIComponent(deviceName()) }
        : {}),
    },
  });

  const skipRefresh =
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/google') ||
    (req.method === 'GET' && req.url.includes('/auth/me'));

  if (skipRefresh) {
    return next(authed);
  }

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }
      return auth.refreshAccessToken().pipe(
        switchMap((ok) => {
          if (!ok) {
            if (!auth.hasValidAccessToken()) auth.clearSession();
            return throwError(() => err);
          }
          const nextToken = auth.token();
          return next(
            req.clone({
              withCredentials: true,
              setHeaders: nextToken ? { Authorization: `Bearer ${nextToken}` } : {},
            }),
          );
        }),
      );
    }),
  );
};
