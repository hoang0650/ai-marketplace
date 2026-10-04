import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, ReplaySubject, tap, map, of, catchError, shareReplay, switchMap, filter, take } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserRole, SignupRole, UserPreferences, UserProfileExtras } from '../models/marketplace.models';

interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface GooglePrefill {
  email: string;
  name: string;
  avatarUrl?: string;
  googleSignupToken: string;
  hasAccount: boolean;
}

const TOKEN_KEY = 'phai.token';
const USER_KEY = 'phai.user';

function decodeJwt(token: string): { exp?: number; role?: string; email?: string; userId?: string; sub?: string } | null {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    return JSON.parse(json) as { exp?: number; role?: string; email?: string; userId?: string; sub?: string };
  } catch {
    return null;
  }
}

function tokenUnexpired(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 > Date.now() + 5000;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);
  private readonly readySignal = signal(false);
  private readonly ready$ = new ReplaySubject<boolean>(1);

  private refreshInFlight$: Observable<boolean> | null = null;
  private hydrateGen = 0;

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly authReady = this.readySignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal() || tokenUnexpired(this.tokenSignal()));
  readonly isCreator = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'seller' || role === 'talent' || role === 'freelancer' || role === 'employer' || role === 'admin';
  });
  /** Seller-only capability (shop, coupons, dashboard, compute). */
  readonly isSeller = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'seller' || role === 'admin';
  });
  /** Freelancer — applies to jobs and delivers work. */
  readonly isFreelancer = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'freelancer' || role === 'admin';
  });
  /** Employer / HR — posts jobs. */
  readonly isEmployer = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'employer' || role === 'admin';
  });
  readonly isTalent = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'talent' || role === 'admin';
  });
  readonly isAdmin = computed(() => {
    const role = this.userSignal()?.role || decodeJwt(this.tokenSignal() || '')?.role;
    return role === 'admin';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreFromStorage();
    }
    this.markReady();
    if (this.tokenSignal()) {
      this.refreshMe().subscribe();
    }
  }

  ensureReady(): Observable<boolean> {
    if (this.readySignal()) return of(true);
    return this.ready$.pipe(
      filter(Boolean),
      take(1),
    );
  }

  hasValidAccessToken(): boolean {
    return tokenUnexpired(this.tokenSignal());
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  loginWithGoogle(payload: { idToken?: string; code?: string }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/google/login`, {
        idToken: payload.idToken,
        code: payload.code,
        redirectUri: 'postmessage',
      }, { withCredentials: true })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  register(payload: {
    email: string;
    name: string;
    password: string;
    confirmPassword?: string;
    role?: SignupRole;
    /** @deprecated use role */
    asCreator?: boolean;
    avatarUrl?: string;
    googleSignupToken?: string;
  }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  /** Google for signup: returns prefill data only (no session, no account). */
  googlePrefill(payload: {
    idToken?: string;
    code?: string;
    redirectUri?: string;
  }): Observable<GooglePrefill> {
    return this.http.post<GooglePrefill>(`${environment.apiUrl}/auth/google/prefill`, payload);
  }

  refreshAccessToken(): Observable<boolean> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<AuthResponse>(`${environment.apiUrl}/auth/refresh-token`, {}, { withCredentials: true })
        .pipe(
          tap((res) => this.persist(res)),
          map(() => true),
          catchError(() => of(false)),
          shareReplay(1),
        );
      this.refreshInFlight$.subscribe({
        complete: () => {
          this.refreshInFlight$ = null;
        },
      });
    }
    return this.refreshInFlight$;
  }

  clearSession(): void {
    this.hydrateGen += 1;
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.markReady();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  refreshMe(): Observable<User | null> {
    const gen = this.hydrateGen;
    return this.http.get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => {
        if (gen !== this.hydrateGen) return;
        this.setUser(user);
        this.markReady();
      }),
      catchError((err: HttpErrorResponse) => {
        if (gen !== this.hydrateGen) return of(this.userSignal());
        if (err.status === 401 || err.status === 403) {
          return this.refreshAccessToken().pipe(
            switchMap((ok) => {
              if (gen !== this.hydrateGen) return of(this.userSignal());
              if (!ok) {
                if (!tokenUnexpired(this.tokenSignal())) this.clearSession();
                this.markReady();
                return of(this.userSignal());
              }
              return this.http.get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true }).pipe(
                tap((user) => {
                  if (gen !== this.hydrateGen) return;
                  this.setUser(user);
                }),
                catchError(() => of(this.userSignal())),
              );
            }),
          );
        }
        this.markReady();
        return of(this.userSignal());
      }),
    );
  }

  updateProfile(patch: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    profile?: Partial<UserProfileExtras>;
    preferences?: Partial<UserPreferences>;
  }): Observable<User> {
    return this.http
      .patch<User>(`${environment.apiUrl}/auth/me`, patch)
      .pipe(tap((user) => this.setUser(user)));
  }

  /** Endpoints that rotate the refresh token (password change, sign out everywhere). */
  rotateSession(path: 'password' | 'sessions/revoke-all', body: Record<string, string> = {}): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/${path}`, body, { withCredentials: true })
      .pipe(tap((res) => this.persist(res)));
  }

  unlinkGoogle(): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/google/unlink`, {})
      .pipe(tap((user) => this.setUser(user)));
  }

  persistToken(token: string): void {
    this.tokenSignal.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  private persist(res: AuthResponse): void {
    this.hydrateGen += 1;
    this.tokenSignal.set(res.token);
    this.setUser(res.user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, res.token);
    }
    this.markReady();
  }

  private setUser(user: User): void {
    this.userSignal.set(user);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        /* quota */
      }
    }
  }

  private restoreFromStorage(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !tokenUnexpired(token)) {
      if (token) localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return;
    }
    this.tokenSignal.set(token);
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      const payload = decodeJwt(token);
      if (payload?.email || payload?.userId || payload?.sub) {
        this.userSignal.set({
          id: String(payload.userId || payload.sub || ''),
          email: String(payload.email || ''),
          name: String(payload.email || 'Member').split('@')[0],
          role: (payload.role as UserRole) || 'buyer',
          createdAt: '',
        });
      }
      return;
    }
    try {
      const user = JSON.parse(raw) as User;
      if (user?.id || user?.email) this.userSignal.set(user);
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  private markReady(): void {
    this.readySignal.set(true);
    this.ready$.next(true);
  }
}
