import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LegalPolicyMeta, resolveLegalPolicy } from './legal-policies.catalog';

function looksLikeHtmlShell(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase();
  return (
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    head.includes('<head>') && head.includes('<meta')
  );
}

@Injectable({ providedIn: 'root' })
export class LegalPolicyContentService {
  private readonly http = inject(HttpClient);

  load(slugOrAlias: string): Observable<{ meta: LegalPolicyMeta; markdown: string } | null> {
    const meta = resolveLegalPolicy(slugOrAlias);
    if (!meta) {
      return of(null);
    }
    // Relative to app origin; files ship from src/assets/legal (inside the frontend repo).
    return this.http.get(`assets/legal/${meta.file}`, { responseType: 'text' }).pipe(
      map((raw) => {
        const markdown = raw?.trim() || '';
        if (!markdown || looksLikeHtmlShell(markdown)) {
          return null;
        }
        return { meta, markdown };
      }),
      catchError(() => of(null)),
    );
  }
}
