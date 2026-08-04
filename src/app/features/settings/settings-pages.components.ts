import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';
import { AuthService } from '../../services/auth.service';
import { AccountExtrasService } from './account-extras.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings-activity',
  standalone: true,
  template: `
    <header class="head">
      <div>
        <h1>Lịch sử hoạt động</h1>
        <p>Xem lại thay đổi hồ sơ, bảo mật và phiên đăng nhập</p>
      </div>
      <button type="button" class="btn-ghost" (click)="reload()">Tải lại</button>
    </header>
    <div class="divider"></div>
    <p class="empty">Chưa có hoạt động nào.</p>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    p { margin: .35rem 0 0; color: #777; }
    .btn-ghost { border: 1px solid #ddd; background: #fff; border-radius: 10px; min-height: 2.3rem; padding: 0 .9rem; font: inherit; font-weight: 700; cursor: pointer; }
    .divider { height: 1px; background: #f0f0f0; margin: 1rem 0; }
    .empty { color: #999; }
  `,
})
export class SettingsActivityComponent {
  constructor() {
    inject(SeoService).set({ title: 'Lịch sử hoạt động' });
  }
  reload(): void {}
}

@Component({
  selector: 'app-settings-security',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>Bảo mật</h1>
    <p class="lede">Quản lý mật khẩu, xác thực hai lớp và phiên đăng nhập.</p>

    <section class="row">
      <div>
        <h2>Mật khẩu</h2>
        <p>Tạo mật khẩu cho tài khoản này để bạn cũng có thể đăng nhập bằng email và mật khẩu.</p>
      </div>
      <button type="button" class="btn-dark" (click)="msg.set('Tính năng đổi mật khẩu sẽ sớm có.')">Tạo mật khẩu</button>
    </section>

    <section class="row">
      <div>
        <h2>Xác thực hai lớp</h2>
        <p>Quản lý thiết bị mã đăng nhập bằng ứng dụng xác thực.</p>
      </div>
      <span class="status">Chưa bật</span>
    </section>

    <section class="block">
      <div class="block__head">
        <div>
          <h2>Thiết bị xác thực</h2>
          <p>Tài khoản có thể gắn tối đa 10 thiết bị TOTP.</p>
        </div>
        <button type="button" class="link" (click)="msg.set('Đã tải lại.')">Tải lại</button>
      </div>
      <p class="muted">Chưa cấu hình thiết bị xác thực.</p>
      <label>
        <span>Tên thiết bị mới</span>
        <div class="inline">
          <input [(ngModel)]="deviceName" name="deviceName" placeholder="Ứng dụng xác thực" />
          <button type="button" class="btn-dark" (click)="addDevice()">Thêm thiết bị</button>
        </div>
      </label>
    </section>

    <section class="block">
      <div class="block__head">
        <h2>Phiên đăng nhập <small>1 đang hoạt động</small></h2>
        <button type="button" class="link">Tải lại</button>
      </div>
      <div class="session">
        <div>
          <strong>Chrome · Windows · Máy tính</strong>
          <p>Không rõ vị trí · Phiên hiện tại</p>
        </div>
        <button type="button" class="btn-ghost" (click)="msg.set('Không thể thu hồi phiên hiện tại.')">Thu hồi</button>
      </div>
    </section>

    @if (msg()) {
      <p class="toast">{{ msg() }}</p>
    }
  `,
  styles: `
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .lede { margin: .35rem 0 1.1rem; color: #777; }
    .row, .block { padding: 1rem 0; border-top: 1px solid #f0f0f0; }
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    h2 { margin: 0 0 .3rem; font-size: 1rem; }
    h2 small { margin-left: .45rem; color: #888; font-size: .8rem; font-weight: 600; }
    p { margin: 0; color: #777; font-size: .88rem; line-height: 1.45; }
    .status { color: #888; font-weight: 700; font-size: .88rem; }
    .block__head { display: flex; justify-content: space-between; gap: .75rem; margin-bottom: .75rem; }
    .muted { color: #999; margin-bottom: .85rem !important; }
    label { display: grid; gap: .35rem; font-size: .85rem; font-weight: 700; }
    .inline { display: grid; grid-template-columns: 1fr auto; gap: .5rem; }
    input { border: 1px solid #e5e5e5; border-radius: 10px; padding: .7rem .8rem; font: inherit; font-weight: 500; }
    .btn-dark, .btn-ghost, .link { font: inherit; font-weight: 800; cursor: pointer; border-radius: 10px; }
    .btn-dark { border: 0; background: #171717; color: #fff; min-height: 2.4rem; padding: 0 1rem; }
    .btn-ghost { border: 1px solid #ddd; background: #fff; min-height: 2.3rem; padding: 0 .9rem; }
    .link { border: 0; background: transparent; color: #666; font-size: .85rem; }
    .session { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .85rem; border: 1px solid #ececec; border-radius: 12px; }
    .session strong { display: block; font-size: .92rem; }
    .session p { margin-top: .2rem; }
    .toast { margin-top: 1rem; color: #15803d; font-size: .88rem; }
    @media (max-width: 720px) { .row, .session, .inline { grid-template-columns: 1fr; display: grid; } }
  `,
})
export class SettingsSecurityComponent {
  readonly msg = signal('');
  deviceName = '';
  constructor() {
    inject(SeoService).set({ title: 'Bảo mật' });
  }
  addDevice(): void {
    if (!this.deviceName.trim()) {
      this.msg.set('Nhập tên thiết bị.');
      return;
    }
    this.msg.set(`Đã ghi nhận thiết bị "${this.deviceName.trim()}" (demo).`);
    this.deviceName = '';
  }
}

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Kênh nhận thông báo</h1>
    <p class="lede">Xem nơi nhận các cập nhật quan trọng về tài khoản, đơn hàng, tranh chấp và cộng đồng.</p>

    <article class="card">
      <div class="left">
        <span class="icon">📬</span>
        <div>
          <strong>Hộp thư {{ brand }}</strong>
          <em>Luôn hoạt động</em>
          <p>Thông báo trong ứng dụng luôn được gửi vào hộp thư của bạn.</p>
        </div>
      </div>
      <a routerLink="/notifications" class="btn-ghost">Xem hộp thư thông báo</a>
    </article>

    <article class="card">
      <div class="left">
        <span class="icon">✈️</span>
        <div>
          <strong>Telegram</strong>
          <em class="off">Chưa kết nối</em>
          <p>Liên kết Telegram để nhận cập nhật đơn hàng và bảo mật nhanh hơn.</p>
        </div>
      </div>
      <a routerLink="/settings/connections" class="btn-ghost">Quản lý liên kết</a>
    </article>
  `,
  styles: `
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .lede { margin: .35rem 0 1.1rem; color: #777; }
    .card { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 1rem 0; border-top: 1px solid #f0f0f0; }
    .left { display: flex; gap: .8rem; }
    .icon { width: 2.4rem; height: 2.4rem; border-radius: 10px; background: #f5f5f5; display: grid; place-items: center; }
    strong { display: block; font-size: .95rem; }
    em { display: inline-block; margin-top: .2rem; font-style: normal; font-size: .75rem; font-weight: 800; color: #15803d; background: #e8f8ef; border-radius: 999px; padding: .12rem .45rem; }
    em.off { color: #888; background: #f3f4f6; }
    p { margin: .35rem 0 0; color: #777; font-size: .85rem; }
    .btn-ghost { border: 1px solid #ddd; background: #fff; border-radius: 10px; min-height: 2.35rem; padding: 0 .9rem; text-decoration: none; color: #222; font-weight: 800; font-size: .85rem; display: inline-flex; align-items: center; white-space: nowrap; }
    @media (max-width: 720px) { .card { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SettingsNotificationsComponent {
  readonly brand = environment.brandName;
  constructor() {
    inject(SeoService).set({ title: 'Kênh thông báo' });
  }
}

@Component({
  selector: 'app-settings-connections',
  standalone: true,
  template: `
    <h1>Liên kết tài khoản</h1>
    <p class="lede">Kết nối Google, Telegram và các nền tảng khác.</p>

    <section class="block">
      <div class="block__head">
        <h2>Đăng nhập bằng Google <em [class.on]="extras.googleLinked">{{ extras.googleLinked ? 'Đã kết nối' : 'Chưa kết nối' }}</em></h2>
        <button type="button" class="link" (click)="reload()">Tải lại</button>
      </div>
      @if (extras.googleLinked) {
        <p>{{ auth.user()?.email }} · Liên kết gần đây</p>
        <p class="warn">Hãy tạo mật khẩu trước khi ngắt kết nối Google.</p>
        <button type="button" class="btn-ghost" (click)="toggleGoogle(false)">Ngắt Google</button>
      } @else {
        <button type="button" class="btn-dark" (click)="toggleGoogle(true)">Liên kết Google</button>
      }
    </section>

    <section class="block">
      <div class="block__head">
        <h2>Thông báo Telegram <em [class.on]="extras.telegramLinked">{{ extras.telegramLinked ? 'Đã kết nối' : 'Chưa kết nối' }}</em></h2>
        <button type="button" class="link" (click)="reload()">Tải lại</button>
      </div>
      <p>Liên kết bot Telegram để nhận thông báo đơn hàng và bảo mật.</p>
      <button type="button" class="btn-dark" (click)="toggleTelegram(!extras.telegramLinked)">
        {{ extras.telegramLinked ? 'Ngắt Telegram' : 'Liên kết Telegram' }}
      </button>
    </section>
  `,
  styles: `
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .lede { margin: .35rem 0 1rem; color: #777; }
    .block { padding: 1rem 0; border-top: 1px solid #f0f0f0; }
    .block__head { display: flex; justify-content: space-between; gap: .75rem; margin-bottom: .55rem; }
    h2 { margin: 0; font-size: 1rem; display: flex; flex-wrap: wrap; gap: .45rem; align-items: center; }
    em { font-style: normal; font-size: .72rem; font-weight: 800; color: #888; background: #f3f4f6; border-radius: 999px; padding: .12rem .45rem; }
    em.on { color: #15803d; background: #e8f8ef; }
    p { margin: 0 0 .55rem; color: #777; font-size: .88rem; }
    .warn { color: #b45309; }
    .btn-dark, .btn-ghost, .link { font: inherit; font-weight: 800; cursor: pointer; border-radius: 10px; }
    .btn-dark { border: 0; background: #171717; color: #fff; min-height: 2.4rem; padding: 0 1rem; }
    .btn-ghost { border: 1px solid #ddd; background: #fff; min-height: 2.35rem; padding: 0 .9rem; }
    .link { border: 0; background: transparent; color: #666; font-size: .85rem; }
  `,
})
export class SettingsConnectionsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly extrasApi = inject(AccountExtrasService);
  extras = this.extrasApi.load();

  ngOnInit(): void {
    inject(SeoService).set({ title: 'Liên kết tài khoản' });
    this.reload();
  }

  reload(): void {
    this.extras = this.extrasApi.load();
  }

  toggleGoogle(on: boolean): void {
    this.extras = this.extrasApi.save({ googleLinked: on });
  }

  toggleTelegram(on: boolean): void {
    this.extras = this.extrasApi.save({ telegramLinked: on });
  }
}

@Component({
  selector: 'app-settings-feed',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>Cá nhân hóa Feed</h1>
    <p class="lede">Điều chỉnh gợi ý nội dung và quảng cáo theo sở thích của bạn.</p>

    <section class="card">
      <div class="row">
        <div>
          <strong>Cá nhân hóa nội dung</strong>
          <p>Dùng hoạt động của bạn để đề xuất sản phẩm và bài viết phù hợp hơn.</p>
        </div>
        <label class="switch">
          <input type="checkbox" [(ngModel)]="personalizeContent" name="pc" (ngModelChange)="persist()" />
        </label>
      </div>
      <div class="row">
        <div>
          <strong>Cá nhân hóa quảng cáo</strong>
          <p>Cho phép hiển thị quảng cáo phù hợp hơn với sở thích của bạn.</p>
        </div>
        <label class="switch">
          <input type="checkbox" [(ngModel)]="personalizeAds" name="pa" (ngModelChange)="persist()" />
        </label>
      </div>
    </section>

    <section class="card">
      <div class="row">
        <div>
          <strong>Đặt lại hồ sơ gợi ý</strong>
          <p>Xóa dữ liệu hành vi dùng để gợi ý. Không ảnh hưởng tài khoản hay bookmark.</p>
        </div>
        <button type="button" class="btn-ghost" [disabled]="!personalizeContent && !personalizeAds" (click)="reset()">
          Đặt lại cá nhân hóa
        </button>
      </div>
    </section>
    @if (msg()) {
      <p class="toast">{{ msg() }}</p>
    }
  `,
  styles: `
    h1 { margin: 0; font-size: 1.4rem; font-weight: 800; }
    .lede { margin: .35rem 0 1rem; color: #777; }
    .card { border: 1px solid #ececec; border-radius: 14px; padding: .35rem 1rem; margin-bottom: .85rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .9rem 0; }
    .row + .row { border-top: 1px solid #f0f0f0; }
    strong { display: block; font-size: .95rem; }
    p { margin: .25rem 0 0; color: #777; font-size: .85rem; }
    .switch input { width: 2.6rem; height: 1.35rem; accent-color: #e53935; }
    .btn-ghost { border: 1px solid #ddd; background: #fff; border-radius: 10px; min-height: 2.35rem; padding: 0 .9rem; font: inherit; font-weight: 800; cursor: pointer; }
    .btn-ghost:disabled { opacity: .45; cursor: not-allowed; }
    .toast { color: #15803d; font-size: .88rem; }
    @media (max-width: 720px) { .row { flex-direction: column; align-items: flex-start; } }
  `,
})
export class SettingsFeedComponent implements OnInit {
  private readonly extrasApi = inject(AccountExtrasService);
  readonly msg = signal('');
  personalizeContent = false;
  personalizeAds = false;

  ngOnInit(): void {
    inject(SeoService).set({ title: 'Cá nhân hóa Feed' });
    const ex = this.extrasApi.load();
    this.personalizeContent = ex.personalizeContent;
    this.personalizeAds = ex.personalizeAds;
  }

  persist(): void {
    this.extrasApi.save({
      personalizeContent: this.personalizeContent,
      personalizeAds: this.personalizeAds,
    });
  }

  reset(): void {
    this.personalizeContent = false;
    this.personalizeAds = false;
    this.persist();
    this.msg.set('Đã đặt lại cá nhân hóa.');
  }
}
