import { HttpClient } from '@angular/common/http';
import { Component, Injectable, Input, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FileAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: 'image' | 'file';
  url: string;
  downloadUrl: string;
}

export const ATTACH_MAX_BYTES = 25 * 1024 * 1024;
export const ATTACH_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,.pdf,.zip,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.mp4,.mp3';
const ALLOWED = /\.(png|jpe?g|webp|gif|pdf|zip|7z|docx?|xlsx?|pptx?|txt|csv|md|json|mp4|mp3)$/i;

/** API origin (signed attachment links may come back relative to it). */
const API_ORIGIN = (() => {
  try {
    return new URL(environment.apiUrl, typeof location !== 'undefined' ? location.href : 'https://api.aimarkets.vn').origin;
  } catch {
    return '';
  }
})();

export function absUrl(u: string): string {
  return u && u.startsWith('/') ? `${API_ORIGIN}${u}` : u;
}

/** Client-side precheck; the API re-validates type + content. Returns an i18n key or ''. */
export function attachmentProblem(file: File): string {
  if (file.size > ATTACH_MAX_BYTES) return 'attach.err.tooLarge';
  if (!ALLOWED.test(file.name)) return 'attach.err.type';
  return '';
}

export function fileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);

  upload(file: File, scope: 'chat' | 'hire' | 'complaint', scopeId: string): Observable<FileAttachment> {
    const form = new FormData();
    form.append('scope', scope);
    form.append('scopeId', scopeId);
    form.append('file', file, file.name);
    return this.http.post<FileAttachment>(`${environment.apiUrl}/attachments`, form);
  }
}

/** Image previews (click to open) + file chips with download links. */
@Component({
  selector: 'app-attachments',
  standalone: true,
  template: `
    @if (images().length) {
      <div class="att-imgs" [class.att-imgs--multi]="images().length > 1">
        @for (a of images(); track a.id) {
          <a [href]="abs(a.url)" target="_blank" rel="noopener noreferrer"><img [src]="abs(a.url)" [alt]="a.name" loading="lazy" /></a>
        }
      </div>
    }
    @for (a of files(); track a.id) {
      <a class="att-file" [href]="abs(a.downloadUrl)" rel="noopener noreferrer" [attr.download]="a.name">
        <span class="att-file__ico">{{ ext(a.name) }}</span>
        <span class="att-file__meta"><strong>{{ a.name }}</strong><em>{{ size(a.size) }}</em></span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 16 7 11h3V4h4v7h3l-5 5Zm-7 2h14v2H5v-2Z"/></svg>
      </a>
    }
  `,
  styles: [
    `
      :host { display: grid; gap: 6px; }
      .att-imgs { display: grid; gap: 4px; }
      .att-imgs--multi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .att-imgs img { display: block; width: 100%; max-width: 280px; max-height: 260px; object-fit: cover; border-radius: 10px; }
      .att-file { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; min-width: 220px; max-width: 320px;
        background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; text-decoration: none; }
      .att-file:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
      .att-file__ico { flex: none; width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; font: 700 10px/1 system-ui;
        text-transform: uppercase; background: #6366f1; color: #fff; }
      .att-file__meta { display: grid; min-width: 0; flex: 1; }
      .att-file__meta strong { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .att-file__meta em { font-style: normal; font-size: 11px; opacity: .7; }
    `,
  ],
})
export class AttachmentsComponent {
  @Input() items: FileAttachment[] | null | undefined = [];
  images = () => (this.items || []).filter((a) => a.kind === 'image');
  files = () => (this.items || []).filter((a) => a.kind !== 'image');
  abs = absUrl;
  size = fileSize;
  ext(name: string): string {
    return (name.split('.').pop() || 'file').slice(0, 4);
  }
}
