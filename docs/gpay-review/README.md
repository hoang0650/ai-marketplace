# Google Pay Console — không dùng cho web AI Markets

Web `aimarkets.vn` **không** dùng Apple Pay hay Google Pay API.

Nạp ví trên website là hai kênh song song:

- VietQR: chuyển khoản vào tài khoản hiển thị lúc nạp, admin đối soát.
- GPay: cổng của Công ty Cổ phần Thanh toán G (`g-pay.vn`), chỉ khi API `/v1/gpay/config` báo `enabled`. Đây không phải Google Pay.

App iOS/Android nạp bằng IAP (Play Billing / App Store), không phải Google Pay API và không được dẫn sang GPay trên web.

Không thêm Website integration cho aimarkets.vn trên Google Pay Console.
Không thêm Android `app.phgroup.ai_market_vn` vào Google Pay Console (app dùng Play Billing IAP).
Không nộp ảnh AI Markets vào form Android PMS (`app.rork.phhotel_pms_interface`).

File HTML trong thư mục này là mock cũ, không còn là buyflow production.
