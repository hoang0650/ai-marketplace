import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/api.services';
import { SeoService } from '../../services/seo.service';
import { Product } from '../../models/marketplace.models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { environment } from '../../../environments/environment';
import { CATEGORY_META } from '../../models/categories';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly brand = environment.brandName;
  readonly tagline = environment.brandTagline;
  readonly featured = signal<Product[]>([]);
  readonly categories = CATEGORY_META;

  ngOnInit(): void {
    this.seo.set({
      title: 'Home',
      description: this.tagline,
    });
    this.productsApi.list({ featured: true }).subscribe((items) => this.featured.set(items));
  }
}
