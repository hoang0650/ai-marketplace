# Google Pay Console — nộp ảnh buyflow

Trang Console đang mở (`app.rork.phhotel_pms_interface`) là **integration Android của PHHotel PMS**, merchant **PHGROUP TECHNOLOGY**. Không nộp ảnh AI Markets vào trang này.

IAP App Store / Google Play **không phải** Google Pay API. App AI Markets nạp ví bằng IAP — **không** tạo Android Google Pay API cho `app.phgroup.ai_market_vn`.

## Thứ tự (PMS trước, AI Markets sau)

Cùng một merchant ID. Mỗi sản phẩm là một **Add an integration**.

### 1. Xong PHHotel PMS trước

Trang hiện tại chỉ đúng nếu **app PMS Android thật sự gọi Google Pay API** (PaymentsClient / PayPal Google Pay native).

Trong code `phhotel-pms` hiện **không** có Google Pay API. Vì vậy:

- **Không** tải 5 ảnh IAP hay ảnh web AI Markets vào form Android này.
- Nếu PMS nhận tiền Google Pay trên **web** `phhotel.vn`: bên trái Console chọn **Add an integration → Website**, nộp 5 ảnh buyflow web khách sạn, rồi **Lưu**.
- Form Android PMS (`app.rork.phhotel_pms_interface`): **Cancel**, đừng Submit nếu app không mở Google Pay sheet.

### 2. Sau đó thêm AI Markets

Vẫn merchant PHGROUP → **Add an integration** (không tạo merchant mới):

| Integration | Khi nào |
|---|---|
| **Website** `https://aimarkets.vn` | Bắt buộc — web dùng Google Pay (qua PayPal) |
| Android `app.phgroup.ai_market_vn` | **Không** — app dùng Play Billing IAP |

Nộp 5 ảnh **web** AI Markets vào integration Website.

## 5 ô ảnh (tối đa 1MB / ảnh)

Chụp Chrome, buyflow thật trên `aimarkets.vn/wallet?method=gpay` khi đã có nút Google Pay. Mock HTML: `docs/gpay-review/`.

| Ô Console | Ảnh | File mẫu |
|---|---|---|
| Item selection | Trang sản phẩm, có Google Pay / Buy now | `01-select.html` |
| Pre-purchase screen | Ví, đã chọn Google Pay, số tiền | `02-pay.html` |
| Payment method screen | Apple Pay / Google Pay / PayPal, GPay đang chọn | `03-method.html` |
| Google Pay API payment screen | Sheet Google Pay (Android thường chặn screenshot — chụp máy khác hoặc ảnh lỗi cũng được) | `03-sheet.html` |
| Post-purchase screen | Lịch sử ví, +$10 Google Pay completed | `04-confirm.html` |

## Sửa 2 ô AI gắn Potential issue

Đừng nộp `04-confirm.png` vào ô **Google Pay API payment screen** — đó là lịch sử ví (post-purchase).

| Ô Console | File nộp lại | Lý do |
|---|---|---|
| Payment method screen | `03-method.png` | Dùng **Google Pay Acceptance Mark** (viên thuốc G Pay có viền). Không dùng logo chữ `G Pay` không viền. |
| Google Pay API payment screen | `03-sheet.png` | Widget Google Pay: Choose a way to pay + danh sách thẻ + nút Buy with G Pay |
| Post-purchase screen | `04-confirm.png` | Lịch sử ví thành công |

Hai ô kia (Item selection, Pre-purchase) đã AI verified thì giữ. Ô Post-purchase dùng `04-confirm.png`.

Mỗi ô: **Tải lên** lại file PNG < 1MB → **Lưu**.


## Ô 4 bị chặn screenshot

Google ghi rõ: Android có thể không cho chụp Google Pay sheet. Được phép:

- Ảnh chụp màn hình bằng máy khác
- Ảnh thông báo lỗi nếu sheet không mở

Không dùng screenshot IAP Google Play.
