import { Component, OnInit, inject, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { combineLatest } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
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
  imports: [RouterLink, RouterLinkActive, TPipe],
  templateUrl: './legal-policy-page.component.html',
  styleUrl: './legal-policy-page.component.scss',
})
export class LegalPolicyPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(LegalPolicyContentService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  readonly nav = LEGAL_POLICIES;
  readonly navGroups = LEGAL_POLICY_GROUPS.map((g) => ({
    ...g,
    items: LEGAL_POLICIES.filter((p) => p.group === g.id),
  }));

  meta: LegalPolicyMeta | null = null;
  html: SafeHtml | null = null;
  errorKey = '';
  loading = true;
  navOpen = false;
  prev: LegalPolicyMeta | null = null;
  next: LegalPolicyMeta | null = null;

  constructor() {
    effect(() => {
      this.i18n.lang();
      this.syncSeo();
    });
  }

  groupLabel(id: string): string {
    return this.i18n.t(`legal.group.${id}`);
  }

  policyTitle(p: LegalPolicyMeta): string {
    return this.i18n.t(`legal.policy.${p.slug}.title`);
  }

  policySummary(p: LegalPolicyMeta): string {
    return this.i18n.t(`legal.policy.${p.slug}.summary`);
  }

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.data])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, data]) => {
        const slug = String(data['policySlug'] || params.get('slug') || params.get('type') || '');
        this.open(slug);
      });
  }

  private syncSeo(): void {
    if (this.errorKey && !this.meta) {
      this.seo.set({ title: this.i18n.t('legal.doc.notFoundTitle') });
      return;
    }
    if (!this.meta) return;
    this.seo.set({
      title: `${this.policyTitle(this.meta)} | AI Markets`,
      description: this.policySummary(this.meta),
    });
  }

  private open(slug: string): void {
    this.loading = true;
    this.errorKey = '';
    this.html = null;
    this.meta = null;
    this.prev = null;
    this.next = null;
    this.navOpen = false;

    this.content.load(slug).subscribe((doc) => {
      this.loading = false;
      if (!doc) {
        this.errorKey = 'legal.doc.notFound';
        this.syncSeo();
        return;
      }
      this.meta = doc.meta;
      this.html = this.sanitizer.bypassSecurityTrustHtml(renderLegalMarkdown(doc.markdown));
      const idx = LEGAL_POLICIES.findIndex((p) => p.slug === doc.meta.slug);
      this.prev = idx > 0 ? LEGAL_POLICIES[idx - 1] : null;
      this.next = idx >= 0 && idx < LEGAL_POLICIES.length - 1 ? LEGAL_POLICIES[idx + 1] : null;
      this.syncSeo();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
