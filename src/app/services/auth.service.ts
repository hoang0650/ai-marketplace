import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/marketplace.models';

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

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
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  loginWithGoogle(payload: { idToken?: string; code?: string }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/google/login`, {
        idToken: payload.idToken,
        code: payload.code,
        redirectUri: 'postmessage',
      })
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  register(payload: {
    email: string;
    name: string;
    password: string;
    asCreator?: boolean;
  }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap((res) => this.persist(res)), map((res) => res.user));
  }

  logout(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('phai.token');
    }
    void this.router.navigateByUrl('/');
  }

  refreshMe(): Observable<User | null> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => this.userSignal.set(user)),
      catchError(() => {
        this.userSignal.set(null);
        this.tokenSignal.set(null);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('phai.token');
        }
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

  private persist(res: AuthResponse): void {
    this.userSignal.set(res.user);
    this.tokenSignal.set(res.token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('phai.token', res.token);
    }
  }
}
