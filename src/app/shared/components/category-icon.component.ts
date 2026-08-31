import { Component, input } from '@angular/core';

export type CategoryIconId =
  | 'text-to-text'
  | 'text-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'inference'
  | 'api-endpoint'
  | 'hire-agent'
  | 'skill-pack';

@Component({
  selector: 'app-category-icon',
  standalone: true,
  template: `
    <svg
      class="cat-icon"
      [class.cat-icon--sm]="size() === 'sm'"
      [class.cat-icon--lg]="size() === 'lg'"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('text-to-text') {
          <path
            d="M14 18h20M14 24h14M14 30h17"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <rect
            x="10"
            y="12"
            width="28"
            height="24"
            rx="4"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M18 36l-4 4v-4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        }
        @case ('text-to-image') {
          <rect
            x="9"
            y="11"
            width="30"
            height="26"
            rx="3"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle cx="17" cy="19" r="2.5" fill="currentColor" />
          <path
            d="M12 33l8-8 6 6 4-4 6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M32 14l4-3v6"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
        @case ('text-to-video') {
          <rect
            x="8"
            y="14"
            width="32"
            height="22"
            rx="3"
            stroke="currentColor"
            stroke-width="2"
          />
          <path d="M8 20h32" stroke="currentColor" stroke-width="2" />
          <path
            d="M14 14V11a2 2 0 012-2h16a2 2 0 012 2v3"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path d="M21 26l8 5-8 5v-10z" fill="currentColor" />
        }
        @case ('image-to-video') {
          <rect
            x="11"
            y="16"
            width="22"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="2"
          />
          <rect
            x="15"
            y="12"
            width="22"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="1.75"
            opacity="0.55"
          />
          <path d="M19 28l6 4 6-4v-8l-6-4-6 4v8z" stroke="currentColor" stroke-width="1.75" />
          <path d="M25 20v8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
        }
        @case ('inference') {
          <rect
            x="12"
            y="12"
            width="24"
            height="24"
            rx="4"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M18 18h12M18 24h12M18 30h8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="33" cy="15" r="3" stroke="currentColor" stroke-width="1.75" />
          <path
            d="M33 18v3M33 27v3M30 24h-3M36 24h3"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        }
        @case ('api-endpoint') {
          <path
            d="M16 16l-4 8 4 8M32 16l4 8-4 8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M22 14l4 20"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
        }
        @case ('hire-agent') {
          <rect
            x="13"
            y="16"
            width="22"
            height="18"
            rx="5"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle cx="19" cy="24" r="2" fill="currentColor" />
          <circle cx="29" cy="24" r="2" fill="currentColor" />
          <path
            d="M20 30h8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M24 10v4M18 12h12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M10 22h3M35 22h3"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        }
        @case ('skill-pack') {
          <path
            d="M24 10l14 7v14l-14 7-14-7V17l14-7z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M24 10v28M10 17l14 7 14-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        }
        @default {
          <circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="2" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .cat-icon {
      width: 2.75rem;
      height: 2.75rem;
      color: rgba(255, 255, 255, 0.92);
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
    }

    .cat-icon--sm {
      width: 2rem;
      height: 2rem;
    }

    .cat-icon--lg {
      width: 3.25rem;
      height: 3.25rem;
    }
  `,
})
export class CategoryIconComponent {
  readonly name = input.required<CategoryIconId | string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
}
