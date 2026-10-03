import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkService } from '../../services/work.service';
import { TPipe } from '../../i18n/t.pipe';

/** Work is a listing board: AI Markets only takes the listing fee and is not a party to deals made there. */
@Component({
  selector: 'app-work-disclaimer',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <div class="work-disclaimer">
      <strong>{{ 'work.fee.title' | t: { fee: feeLabel() } }}</strong>
      <p>
        {{ 'work.disclaimer' | t }}
        <a routerLink="/marketplace">{{ 'work.disclaimer.link' | t }}</a>
      </p>
    </div>
  `,
  styles: `
    .work-disclaimer { margin: 0 0 1rem; padding: .75rem .95rem; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; font-size: .85rem; line-height: 1.5; }
    .work-disclaimer p { margin: .25rem 0 0; }
    .work-disclaimer a { color: inherit; font-weight: 700; }
  `,
})
export class WorkDisclaimerComponent implements OnInit {
  private readonly work = inject(WorkService);
  readonly feeLabel = signal('20.000đ');

  ngOnInit(): void {
    this.work.listingFee().subscribe((f) => this.feeLabel.set(`${f.vnd.toLocaleString('vi-VN')}đ`));
  }
}
