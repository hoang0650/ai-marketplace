import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { CATEGORY_GROUP_LABEL, CATEGORY_META, categoriesByGroup } from '../models/categories';
import { CategoryGroup } from '../models/marketplace.models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly brand = environment.brandName;
  readonly navCategories = CATEGORY_META;
  readonly groupLabel = CATEGORY_GROUP_LABEL;
  readonly modelCategories = categoriesByGroup('models');
  readonly skillCategories = categoriesByGroup('skills');
  readonly hireCategories = categoriesByGroup('hire');
  readonly categoryOpen = signal(false);

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleCategories(): void {
    this.categoryOpen.update((v) => !v);
  }

  closeCategories(): void {
    this.categoryOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.categoryOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.querySelector('.nav-dd')?.contains(target)) {
      this.closeCategories();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCategories();
  }

  logout(): void {
    this.auth.logout();
  }

  groupTitle(group: CategoryGroup): string {
    return this.groupLabel[group];
  }
}
