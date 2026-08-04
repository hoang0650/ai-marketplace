import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { DeploymentService, ProductService } from '../../services/api.services';

@Component({
  selector: 'app-work-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './work-dashboard.component.html',
  styleUrl: './work-dashboard.component.scss',
})
export class WorkDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly deployments = inject(DeploymentService);
  private readonly products = inject(ProductService);

  readonly servicesCount = signal(0);
  readonly jobsCount = signal(0);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.seo.set({ title: 'Work · Bảng công việc' });
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.deployments.mine().subscribe({
      next: (rows) => {
        this.servicesCount.set(rows.length);
        this.loading.set(false);
      },
      error: () => {
        this.servicesCount.set(0);
        this.loading.set(false);
      },
    });
    const slug = this.auth.user()?.creatorSlug;
    if (slug) {
      this.products.list({ creatorSlug: slug }).subscribe((items) => this.jobsCount.set(items.length));
    }
  }
}
