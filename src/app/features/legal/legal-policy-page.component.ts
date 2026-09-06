import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { combineLatest } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import {
  LEGAL_POLICIES,
  LEGAL_POLICY_GROUPS,
  LegalPolicyMeta,
} from './legal-policies.catalog';
import { renderLegalMarkdown } from './legal-markdown';
import { LegalPolicyContentService } from './legal-policy-content.service';

@Component({
  selector: 'app-legal-policy-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './legal-policy-page.component.html',
  styleUrl: './legal-policy-page.component.scss',
})
export class LegalPolicyPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(LegalPolicyContentService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly nav = LEGAL_POLICIES;
  readonly navGroups = LEGAL_POLICY_GROUPS.map((g) => ({
    ...g,
    items: LEGAL_POLICIES.filter((p) => p.group === g.id),
  }));

  meta: LegalPolicyMeta | null = null;
  html: SafeHtml | null = null;
  error = '';
  loading = true;
  navOpen = false;
  prev: LegalPolicyMeta | null = null;
  next: LegalPolicyMeta | null = null;

  get groupLabel(): string {
    if (!this.meta) return '';
    return LEGAL_POLICY_GROUPS.find((g) => g.id === this.meta!.group)?.label || '';
  }

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.data])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, data]) => {
        const slug = String(data['policySlug'] || params.get('slug') || params.get('type') || '');
        this.open(slug);
      });
  }

  private open(slug: string): void {
    this.loading = true;
    this.error = '';
    this.html = null;
    this.meta = null;
    this.prev = null;
    this.next = null;
    this.navOpen = false;

    this.content.load(slug).subscribe((doc) => {
      this.loading = false;
      if (!doc) {
        this.error = 'Không tìm thấy tài liệu pháp lý này.';
        this.seo.set({ title: 'Không tìm thấy chính sách' });
        return;
      }
      this.meta = doc.meta;
      this.html = this.sanitizer.bypassSecurityTrustHtml(renderLegalMarkdown(doc.markdown));
      const idx = LEGAL_POLICIES.findIndex((p) => p.slug === doc.meta.slug);
      this.prev = idx > 0 ? LEGAL_POLICIES[idx - 1] : null;
      this.next = idx >= 0 && idx < LEGAL_POLICIES.length - 1 ? LEGAL_POLICIES[idx + 1] : null;
      this.seo.set({
        title: `${doc.meta.title} | AI Markets`,
        description: doc.meta.summary,
      });
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
