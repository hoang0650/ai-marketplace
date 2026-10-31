import { HttpErrorResponse } from '@angular/common/http';

export function adminHttpError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string | string[] } | string | null;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object' && body.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : body.message;
    }
  }
  return fallback;
}
