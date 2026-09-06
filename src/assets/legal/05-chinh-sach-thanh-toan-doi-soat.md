# CHÍNH SÁCH THANH TOÁN VÀ ĐỐI SOÁT

## 1. Phương thức thanh toán

[TÊN SÀN] sử dụng các phương thức thanh toán được công bố tại thời điểm giao dịch.

**Payment provider:** [PAYMENT PROVIDER]

## 2. Giá

Giá hiển thị phải nêu rõ:
- loại tiền;
- đơn vị tính;
- chu kỳ;
- phí bổ sung nếu có;
- thuế/phí được áp dụng theo trường hợp.

## 3. Order

Mỗi giao dịch tạo Order ID duy nhất.

Order phải lưu snapshot các thông tin quan trọng tại thời điểm giao dịch.

## 4. Ledger

Nền tảng sử dụng ledger để ghi nhận:
- customer payment;
- seller entitlement;
- platform fee;
- provider cost;
- tax;
- refund;
- adjustment.

Ledger không phải tài khoản tiền gửi của người dùng.

## 5. Seller payout

Payout chỉ thực hiện khi:
- seller đủ điều kiện;
- giao dịch đủ điều kiện payout;
- không bị dispute/hold;
- thông tin payout hợp lệ.

## 6. Chargeback

Khi payment provider thông báo chargeback, nền tảng có quyền tạm giữ/điều chỉnh khoản entitlement liên quan và mở quy trình xác minh.

## 7. Idempotency

Mỗi payment/webhook/ledger transaction phải có idempotency key hoặc cơ chế tương đương để tránh ghi nhận hai lần.

## 8. Đối soát

Nền tảng thực hiện đối soát định kỳ giữa:
- order;
- payment;
- refund;
- ledger;
- payout;
- provider usage.
