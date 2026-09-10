import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, of, catchError, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/marketplace.models';

interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

  private refreshInFlight$: Observable<boolean> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isCreator = computed(
    () => this.userSignal()?.role === 'creator' || this.userSignal()?.role === 'admin',
  );
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('phai.token');
      if (token) {
        this.tokenSignal.set(token);
        this.refreshMe().subscribe();
      }
    }
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
    asCreator?: boolean;
  }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
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
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('phai.token');
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  refreshMe(): Observable<User | null> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => this.userSignal.set(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  updateProfile(patch: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
  }): Observable<User> {
    return this.http
      .patch<User>(`${environment.apiUrl}/auth/me`, patch)
      .pipe(tap((user) => this.userSignal.set(user)));
  }

  persistToken(token: string): void {
    this.tokenSignal.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('phai.token', token);
    }
  }

  private persist(res: AuthResponse): void {
    this.userSignal.set(res.user);
    this.tokenSignal.set(res.token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('phai.token', res.token);
    }
  }
}
