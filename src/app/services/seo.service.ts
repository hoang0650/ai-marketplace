import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set(options: { title?: string; description?: string; image?: string }): void {
    const pageTitle = options.title
      ? `${options.title} · ${environment.brandName}`
      : environment.brandName;
    this.title.setTitle(pageTitle);
    if (options.description) {
      this.meta.updateTag({ name: 'description', content: options.description });
      this.meta.updateTag({ property: 'og:description', content: options.description });
    }
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    if (options.image) {
      this.meta.updateTag({ property: 'og:image', content: options.image });
    }
  }
}
