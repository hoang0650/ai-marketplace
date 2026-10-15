import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TPipe } from '../../i18n/t.pipe';
import { HandoffService, LinkedDevice } from '../../services/handoff.service';
import { SyncService } from '../../services/sync.service';

/** /account/devices — "Thiết bị đã kết nối": list, last active, revoke. */
@Component({
  selector: 'app-devices-page',
  standalone: true,
  imports: [TPipe, DatePipe],
  template: `
    <section class="dv">
      <h1>{{ 'devices.title' | t }}</h1>
      <p class="dv__sub">{{ 'devices.sub' | t }}</p>
      @if (error()) {
        <p class="dv__err">{{ error() }}</p>
      }
      <ul class="dv__list">
        @for (d of devices(); track d.id) {
          <li class="dv__item" [class.dv__item--off]="d.revoked">
            <span class="dv__icon">{{ d.platform === 'web' ? '💻' : '📱' }}</span>
            <div class="dv__main">
              <strong>{{ d.name || ('devices.platform.' + d.platform | t) }}</strong>
              @if (d.current) {
                <span class="dv__tag">{{ 'devices.current' | t }}</span>
              }
              @if (d.linkedVia === 'handoff') {
                <span class="dv__tag dv__tag--soft">{{ 'devices.viaHandoff' | t }}</span>
              }
              <p>{{ 'devices.lastActive' | t }}: {{ d.lastActiveAt | date: 'short' }} · {{ 'devices.added' | t }}: {{ d.createdAt | date: 'shortDate' }}</p>
            </div>
            @if (d.revoked) {
              <span class="dv__revoked">{{ 'devices.revoked' | t }}</span>
            } @else if (!d.current) {
              <button type="button" (click)="revoke(d)" [disabled]="busy() === d.id">{{ 'devices.revoke' | t }}</button>
            }
          </li>
        } @empty {
          <li class="dv__empty">{{ 'devices.empty' | t }}</li>
        }
      </ul>
      <p class="dv__note">{{ 'devices.note' | t }}</p>
    </section>
  `,
  styles: `
    .dv { max-width: 44rem; margin: 0 auto; padding: 1.6rem 1rem 3rem; display: grid; gap: .9rem; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .dv__sub, .dv__note { margin: 0; opacity: .75; font-size: .88rem; }
    .dv__err { color: #e53935; margin: 0; }
    .dv__list { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
    .dv__item { display: flex; gap: .8rem; align-items: center; border: 1px solid rgba(127,127,127,.3); border-radius: 14px; padding: .8rem 1rem; }
    .dv__item--off { opacity: .55; }
    .dv__icon { font-size: 1.5rem; }
    .dv__main { flex: 1; min-width: 0; }
    .dv__main p { margin: .2rem 0 0; font-size: .78rem; opacity: .7; }
    .dv__tag { margin-left: .4rem; font-size: .7rem; border-radius: 999px; padding: .1rem .5rem; background: #111; color: #fff; }
    .dv__tag--soft { background: rgba(127,127,127,.2); color: inherit; }
    .dv__item button { border: 1px solid #e53935; color: #e53935; background: none; border-radius: 999px; padding: .3rem .8rem; cursor: pointer; font-weight: 600; }
    .dv__revoked { font-size: .78rem; color: #e53935; }
    .dv__empty { opacity: .7; }
  `,
})
export class DevicesPageComponent {
  private readonly api = inject(HandoffService);
  readonly devices = signal<LinkedDevice[]>([]);
  readonly error = signal('');
  readonly busy = signal('');

  constructor() {
    this.load();
    const sub = inject(SyncService).events.subscribe((e) => {
      if (e.type.startsWith('device.') || e.type === 'reset') this.load();
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  load(): void {
    this.api.devices().subscribe({
      next: (r) => this.devices.set(r.devices),
      error: (e) => this.error.set(e?.error?.error?.message || 'Không tải được danh sách thiết bị.'),
    });
  }

  revoke(d: LinkedDevice): void {
    this.busy.set(d.id);
    this.api.revoke(d.id).subscribe({
      next: () => {
        this.busy.set('');
        this.load();
      },
      error: (e) => {
        this.busy.set('');
        this.error.set(e?.error?.error?.message || 'Không thu hồi được.');
      },
    });
  }
}
