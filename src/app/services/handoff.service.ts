import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HandoffTarget {
  kind: 'builder' | 'agent';
  id: string;
  title: string;
  path: string;
}

export interface HandoffCode {
  code: string;
  expiresAt: string;
  ttlSeconds: number;
  url: string;
  deepLink: string;
  qrSvg: string;
  target: HandoffTarget;
}

export interface LinkedDevice {
  id: string;
  name: string;
  platform: 'web' | 'ios' | 'android' | 'other';
  linkedVia: 'handoff' | 'session';
  lastActiveAt: string;
  createdAt: string;
  revoked: boolean;
  current: boolean;
}

@Injectable({ providedIn: 'root' })
export class HandoffService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/handoff`;

  create(kind: HandoffTarget['kind'], id: string): Observable<HandoffCode> {
    return this.http.post<HandoffCode>(this.base, { kind, id });
  }
  cancel(code: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${encodeURIComponent(code)}`);
  }
  claim(code: string): Observable<{ ok: boolean; target: HandoffTarget }> {
    return this.http.post<{ ok: boolean; target: HandoffTarget }>(`${this.base}/claim`, { code });
  }
  devices(): Observable<{ devices: LinkedDevice[] }> {
    return this.http.get<{ devices: LinkedDevice[] }>(`${this.base}/devices`);
  }
  revoke(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/devices/${id}`);
  }
}
