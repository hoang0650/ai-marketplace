import { ErrorHandler, Injectable } from '@angular/core';

/**
 * After a deploy, an open tab still runs the previous main bundle whose lazy chunks no longer
 * exist. Loading one fails ("Failed to fetch dynamically imported module" / ChunkLoadError):
 * reload once to pick up the new index.html. A sessionStorage stamp prevents reload loops.
 */
const KEY = 'phai.chunkReloadAt';
const WINDOW_MS = 60_000;

export function isChunkLoadError(err: unknown): boolean {
  const e = err as { name?: string; message?: string; rejection?: unknown } | null;
  if (e?.rejection) return isChunkLoadError(e.rejection);
  const msg = `${e?.name || ''} ${e?.message || String(err ?? '')}`;
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed/i.test(msg);
}

/** Reloads to `url` (or the current page) unless we already did so in the last minute. Returns true if reloading. */
export function reloadForNewVersion(url?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // storage blocked: still reload once per page life
  }
  if (url) window.location.assign(url);
  else window.location.reload();
  return true;
}

@Injectable()
export class ChunkAwareErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    super.handleError(error);
  }
}
