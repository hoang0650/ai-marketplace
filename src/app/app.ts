import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './i18n/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `:host { display: block; min-height: 100vh; }`,
})
export class App {
  constructor(i18n: I18nService) {
    i18n.setLang(i18n.lang());
  }
}
