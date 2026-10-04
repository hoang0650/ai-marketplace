import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountActivityItem, CurrentSessionInfo } from '../../models/marketplace.models';

/** Read-only account data for the settings pages (profile writes go through AuthService). */
@Injectable({ providedIn: 'root' })
export class AccountExtrasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  activity(): Observable<{ items: AccountActivityItem[] }> {
    return this.http.get<{ items: AccountActivityItem[] }>(`${this.base}/activity`);
  }

  currentSession(): Observable<CurrentSessionInfo> {
    return this.http.get<CurrentSessionInfo>(`${this.base}/sessions/current`);
  }
}
