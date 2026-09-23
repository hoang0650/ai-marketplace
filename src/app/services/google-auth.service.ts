import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  constructor(private readonly http: HttpClient) {}

  private resolveConfig(config?: Partial<GoogleAuthConfig>): GoogleAuthConfig {
    const clientId = String(config?.clientId || environment.googleClientId || '').trim();
    return { enabled: !!clientId, clientId };
  }

  getConfig(): Observable<GoogleAuthConfig> {
    return this.http.get<GoogleAuthConfig>(`${environment.apiUrl}/auth/google/config`).pipe(
      map((config) => this.resolveConfig(config)),
      catchError(() => of(this.resolveConfig())),
    );
  }

  /** Redirect through the API host so Google never checks the frontend JS origin. */
  startRedirect(returnTo?: string, mode: 'login' | 'signup' = 'login'): void {
    if (typeof window === 'undefined') return;
    const path = `${window.location.pathname}${window.location.search}`;
    const fallback =
      path.startsWith('/auth/') ? `${window.location.origin}/` : `${window.location.origin}${path}`;
    const url = new URL(`${environment.apiUrl}/auth/google/start`);
    url.searchParams.set('returnTo', returnTo || fallback);
    if (mode === 'signup') url.searchParams.set('mode', 'signup');
    window.location.assign(url.toString());
  }
}
