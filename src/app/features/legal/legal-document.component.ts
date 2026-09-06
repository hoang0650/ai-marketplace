import { Component, OnInit, inject } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';
import { LegalService } from '../../../services/api.services';
import { LegalDocumentMeta } from '../../../models/marketplace.models';

/** Versioned legal pages loaded from Marketplace Core (not hard-coded in components). */
@Component({
  selector: 'app-legal-document',
  standalone: true,
  imports: [NgIf, DatePipe, RouterLink],
  template: `
    <div class="legal-page">
      <a routerLink="/" class="legal-page__back">← AI Markets</a>
      <p class="legal-page__eyebrow" *ngIf="doc">{{ doc.documentType }} · v{{ doc.version }}</p>
      <h1>{{ doc?.title || 'Đang tải…' }}</h1>
      <p class="legal-page__meta" *ngIf="doc?.effectiveAt">
        Hiệu lực: {{ doc?.effectiveAt | date: 'dd/MM/yyyy' }}
      </p>
      <p class="legal-page__summary" *ngIf="doc?.summary">{{ doc?.summary }}</p>
      <pre class="legal-page__body" *ngIf="doc?.content">{{ doc?.content }}</pre>
      <p class="legal-page__error" *ngIf="error">{{ error }}</p>
      <p class="legal-page__note">
        Tài liệu pháp lý được phiên bản hóa trên máy chủ (LegalDocument). Nội dung phản ánh mô hình
        sàn TMĐT trung gian tại Việt Nam: phân biệt Platform Direct / Third-Party Seller / Provider hạ tầng.
      </p>
    </div>
  `,
  styles: [
    `
      .legal-page {
        max-width: 48rem;
        margin: 0 auto;
        padding: 2.5rem 1.25rem 4rem;
        color: var(--text, #1a1a1a);
      }
      .legal-page__back {
        display: inline-block;
        margin-bottom: 1.25rem;
        color: inherit;
        opacity: 0.7;
        text-decoration: none;
        font-size: 0.9rem;
      }
      .legal-page__eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.75rem;
        opacity: 0.55;
        margin: 0 0 0.5rem;
      }
      h1 {
        font-size: 1.75rem;
        line-height: 1.25;
        margin: 0 0 0.75rem;
      }
      .legal-page__meta,
      .legal-page__summary,
      .legal-page__note {
        opacity: 0.75;
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .legal-page__body {
        white-space: pre-wrap;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 0.98rem;
        line-height: 1.65;
        background: color-mix(in srgb, currentColor 4%, transparent);
        border-radius: 12px;
        padding: 1.25rem 1.35rem;
        margin: 1.5rem 0;
        overflow-x: auto;
      }
      .legal-page__error {
        color: #b42318;
      }
      .legal-page__note {
        margin-top: 2rem;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class LegalDocumentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly legal = inject(LegalService);
  private readonly seo = inject(SeoService);

  doc: LegalDocumentMeta | null = null;
  error = '';

    ngOnInit(): void {
    const type =
      this.route.snapshot.data['documentType'] ||
      this.route.snapshot.paramMap.get('type');
    if (!type) {
      this.error = 'Thiếu loại tài liệu pháp lý.';
      return;
    }
    this.legal.get(String(type)).subscribe({
      next: (doc) => {
        this.doc = doc;
        this.seo.set({
          title: doc.title,
          description: doc.summary || doc.title,
        });
      },
      error: () => {
        this.error =
          'Không tải được tài liệu. Kiểm tra API /v1/legal hoặc seed ensureLegalDocuments.';
      },
    });
  }
}
