import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css',
})
export class PrivacyPolicyComponent implements OnInit {
  private readonly seo = inject(SeoService);
  lastUpdated = new Date('2026-08-09');

  ngOnInit(): void {
    this.seo.set({
      title: 'Chính sách bảo mật',
      description: 'Chính sách bảo mật và xử lý dữ liệu cá nhân của AI Markets.',
    });
  }
}
