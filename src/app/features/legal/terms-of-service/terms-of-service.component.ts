import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { SeoService } from '../../../services/seo.service';
import { LegalDoc, TERMS_DOCS } from './terms-of-service.content';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.css',
})
export class TermsOfServiceComponent implements OnInit {
  private readonly seo = inject(SeoService);
  lastUpdated = new Date('2026-09-04');
  doc: LegalDoc = TERMS_DOCS;

  ngOnInit(): void {
    this.seo.set({
      title: 'Thỏa thuận sử dụng AI Markets',
      description:
        'Thoả thuận sử dụng dịch vụ AI Markets và hệ sinh thái PHHotel (PMS web/app, agent AI).',
    });
  }
}
