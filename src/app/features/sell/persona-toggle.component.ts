import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';

/** Segmented role switch (Người bán / Người mua / …) with self-contained styles. */
@Component({
  selector: 'app-persona-toggle',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="pt" role="tablist">
      @for (p of personas; track p) {
        <button
          type="button"
          role="tab"
          class="pt__btn"
          [class.pt__btn--on]="p === value"
          [attr.aria-selected]="p === value"
          (click)="p !== value && valueChange.emit(p)">
          {{ ('payout.persona.' + p) | t }}
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
    .pt { display: inline-flex; gap: .25rem; padding: .25rem; background: #f1f1ef; border: 1px solid #e4e4e0; border-radius: 999px; flex-wrap: wrap; }
    .pt__btn {
      margin: 0; min-height: 2.1rem; padding: 0 1.05rem; border: 0; border-radius: 999px;
      background: transparent; color: #444; font: inherit; font-size: .85rem; font-weight: 700;
      cursor: pointer; transition: background .15s, color .15s, box-shadow .15s;
    }
    .pt__btn:hover { color: #111; background: rgba(255, 255, 255, .7); }
    .pt__btn--on, .pt__btn--on:hover { background: #111; color: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .18); }
    .pt__btn:focus-visible { outline: 2px solid #e53935; outline-offset: 2px; }
  `,
})
export class PersonaToggleComponent<T extends string = string> {
  @Input() personas: T[] = [];
  @Input() value: T | '' = '';
  @Output() valueChange = new EventEmitter<T>();
}
