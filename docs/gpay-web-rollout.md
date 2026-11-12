# GPay trên website, cạnh VietQR

PR này chỉ bật **giao diện** website. Nó không deploy API, không ghi biến môi trường production, và không làm một khoản thanh toán chưa cấu hình thành công.

## Việc website đã làm

- `environment.gpayEnabled` và `environment.prod.ts` là `true`.
- `/wallet` mặc định vẫn là **Chuyển khoản VietQR**. GPay là tab thứ hai.
- Tab GPay chỉ tạo đơn khi `GET /v1/gpay/config` trả `enabled: true`, và chỉ hiện nút cổng hoặc QR khi `portalEnabled` / `qrEnabled` là true.
- `POST /v1/gpay/checkout` luôn gửi `platform: "web"`.
- Trang có `platform=ios`, `client=ios`, `app=ios`, `shell=ios` hoặc user-agent `AIMarkets-iOS` / `AIM-iOS` / `aimarkets-ios` thì ẩn GPay. Safari trên iPhone vẫn là website.
- App iOS/Android giữ IAP. Repo này không thêm đường dẫn từ app iOS sang cổng web.

Khi API còn `GPAY_ENABLED` tắt hoặc thiếu credential, tab GPay báo kênh chưa sẵn sàng và VietQR vẫn dùng được.

## API `hoang0650/ai-marketplace-api`

Không có thay đổi mã API trong PR này. Nhánh `master` công khai (đọc ngày 07/11/2026) đã có:

- `POST /v1/gpay/checkout`, `POST /v1/gpay/qr` trả `503` `GPAY_DISABLED` khi cờ tắt.
- Webhook `POST /v1/gpay/webhook` không bị cờ đó chặn. Relay secret sai thì `401`. Chữ ký sai thì `401` `GPAY_BAD_SIGNATURE`. Không tắt kiểm tra chữ ký.
- Ghi có đi qua `settleOrderEvent`: đơn đã `completed` được trả lại, không ghi có lần hai.
- VietQR thủ công nằm ở `src/config/bank-transfer.js` và không phụ thuộc `GPAY_ENABLED`.

Cần deploy/cấu hình trên host API (Dokploy hoặc tương đương), không commit giá trị:

| Biến | Việc cần làm |
|---|---|
| `GPAY_ENABLED` | Đặt `true` hoặc `1` thì mới tạo được đơn mới. Không đặt thì mặc định tắt. |
| `GPAY_MERCHANT_CODE`, `GPAY_PASSWORD`, `GPAY_PRIVATE_KEY` | Credential merchant cho QR/VA. Thiếu một trong ba thì `qrEnabled` vẫn false dù cờ bật. |
| `GPAY_PORTAL_MERCHANT_CODE`, `GPAY_PORTAL_PASSWORD` | Credential cổng. Nếu không đặt, cổng dùng chung hai biến merchant ở trên. Cổng còn cần `GPAY_PRIVATE_KEY`. |
| `GPAY_SANDBOX` | Mặc định **không** phải live: chỉ khi giá trị là `false` thì client gọi host production (`payment.g-pay.vn`, `mpa-va.g-pay.vn`). Để trống là sandbox. |
| `GPAY_PUBLIC_KEY` | Để trống thì dùng public key nhúng sẵn, chọn theo sandbox hay live. Không thay bằng khóa riêng nếu chưa có khóa GPay cấp. |
| `GPAY_RELAY_SECRET` | Shared secret header `x-gpay-relay-secret`. Để trống thì API **bỏ qua** bước này nhưng vẫn kiểm tra chữ ký. Nên đặt khi bật live. |
| `GPAY_WEBHOOK_URL` | Mặc định trong code là `https://api.phhotel.vn/gpay/webhook`. Code ghi GPay chỉ đăng ký webhook phía PHHotel rồi relay đơn `AIM…` về `/v1/gpay/webhook`. Không trỏ GPay thẳng vào API này nếu relay đó còn là đường đang dùng. |
| `GPAY_MIN_TOPUP_VND` | Tùy chọn. Mặc định code `10000`. |
| `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`, `BANK_BIN` | VietQR. Thiếu thì tab VietQR báo chưa khả dụng. Không liên quan cờ GPay. |

Các biến host tùy chọn, chỉ khi GPay yêu cầu khác mặc định: `GPAY_VA_BASE_URL`, `GPAY_PORTAL_BASE_URL`, `GPAY_VA_BANK_CODE`, `GPAY_ACCOUNT_TYPE`, `GPAY_QR_TERMINAL_ID`, `GPAY_QR_STORE_CODE`, `GPAY_QR_SOURCE_OF_FUND`, `GPAY_PORTAL_PAYMENT_METHOD`.

`GET /v1/gpay/config` sau khi cấu hình phải có `available: true`, `enabled: true`, và `portalEnabled` hoặc `qrEnabled` là true. Trước đó website không được coi là đã nhận thanh toán GPay.

Không có thay đổi số dư, không chạy thanh toán thử trên production từ PR này.

## Pháp lý công khai

Đã sửa các trang đang công bố, cho khớp cách vận hành ở trên, và gỡ các câu trước đó nói GPay là trung gian thanh toán duy nhất theo giấy phép và hợp đồng đã ký:

- Chính sách thanh toán và đối soát, phiên bản 2.3
- Quy chế, Mục XI và các đoạn nạp ví / đối tác thanh toán
- Thỏa thuận người bán, Điều 6.1 và Điều 7.3 (mã phiên bản `v2026.10.05` giữ nguyên vì màn xác minh người bán và API đang ghi nhận mã này)
- Một dòng đối tác trong chính sách bảo mật

Chưa công bố vì không có chứng từ trong repo này:

- Số hợp đồng và ngày ký với GPay
- Giấy phép của nhà cung cấp áp vào đúng quan hệ merchant của AI Markets
- Tài khoản chuyên dùng, sơ đồ luồng tiền, biện pháp bảo đảm số dư
- Đề án Bộ Công Thương (DOCX đang được sửa riêng, không nằm trong repo; không đưa tài khoản rà soát nội bộ lên trang công khai)

Chi trả người bán trong thỏa thuận vẫn là chuyển khoản VND vào tài khoản đứng tên người bán trong 07 ngày làm việc (không tính các ngày thứ bảy, chủ nhật và các ngày nghỉ lễ) sau 48 giờ tạm giữ. Không mô tả chi hộ qua GPay, vì payout engine công khai không gọi GPay.
