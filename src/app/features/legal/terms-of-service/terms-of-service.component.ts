import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  templateUrl: './terms-of-service.component.html',
  styleUrl: './terms-of-service.component.css',
})
export class TermsOfServiceComponent implements OnInit {
  private readonly seo = inject(SeoService);
  lastUpdated = new Date('2026-08-09');

  ngOnInit(): void {
    this.seo.set({
      title: 'Thỏa thuận sử dụng',
      description: 'Thỏa thuận chấp thuận bảo vệ và xử lý dữ liệu cá nhân / điều khoản sử dụng PH AI Market.',
    });
  }
}
