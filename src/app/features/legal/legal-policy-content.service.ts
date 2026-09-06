import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LegalPolicyMeta, resolveLegalPolicy } from './legal-policies.catalog';

@Injectable({ providedIn: 'root' })
export class LegalPolicyContentService {
  private readonly http = inject(HttpClient);

  load(slugOrAlias: string): Observable<{ meta: LegalPolicyMeta; markdown: string } | null> {
    const meta = resolveLegalPolicy(slugOrAlias);
    if (!meta) {
      return of(null);
    }
    return this.http.get(`/assets/legal/${meta.file}`, { responseType: 'text' }).pipe(
      map((markdown) => (markdown?.trim() ? { meta, markdown } : null)),
      catchError(() => of(null)),
    );
  }
}
