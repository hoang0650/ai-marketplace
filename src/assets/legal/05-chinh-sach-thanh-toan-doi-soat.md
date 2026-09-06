# CHÍNH SÁCH THANH TOÁN VÀ ĐỐI SOÁT

**Nền tảng:** AI Markets  
**Website:** https://aimarkets.vn  
**Đơn vị vận hành:** Công ty TNHH giải pháp công nghệ PHGroup  
**MST:** 3703279135  
**Địa chỉ:** Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Thuận An, Tỉnh Bình Dương, Việt Nam  
**Email:** support@aimarkets.vn  
**Ngày hiệu lực:** 07/09/2026  

---
## Điều 1. Phương thức thanh toán

AI Markets sử dụng các phương thức thanh toán được công bố tại thời điểm giao dịch.

**Payment provider:** Cổng thanh toán được công bố trên aimarkets.vn

## Điều 2. Giá

Giá hiển thị phải nêu rõ:
- loại tiền;
- đơn vị tính;
- chu kỳ;
- phí bổ sung nếu có;
- thuế/phí được áp dụng theo trường hợp.

**Phí sàn 20%** không cộng vào giá khách trừ khi product/category có pricing model khác.

## Điều 2a. Phí Google Play (CHPlay) và App Store

Khi thanh toán bằng In-App Purchase trên ứng dụng:

- **Google Play / CHPlay:** Google thu phí dịch vụ theo điều khoản Google tại thời điểm giao dịch. Mặc định đối soát **15%** trên giá niêm yết.
- **App Store:** Apple thu hoa hồng theo Apple Developer Program. Mặc định đối soát **30%** trên giá niêm yết (có thể 15% theo chương trình Small Business / subscription năm 2+).

Phí cửa hàng **không phải phí sàn**, **không phải thuế**, **không thuộc doanh thu AI Markets**. Sàn khấu trừ snapshot khi tính seller payable / payout vì số tiền thực nhận từ cửa hàng đã bị cắt.

Thanh toán web / ví aimarkets.vn không áp phí CHPlay hay App Store.

## Điều 3. Order

Mỗi giao dịch tạo Order ID duy nhất.

Order phải lưu snapshot các thông tin quan trọng tại thời điểm giao dịch.

## Điều 4. Ledger

Nền tảng sử dụng ledger để ghi nhận:
- customer payment;
- seller entitlement;
- platform fee;
- store fee (Google Play / App Store IAP);
- provider cost;
- tax;
- refund;
- adjustment.

Ledger không phải tài khoản tiền gửi của người dùng.

## Điều 5. Seller payout

Payout chỉ thực hiện khi:
- seller đủ điều kiện;
- giao dịch đủ điều kiện payout;
- không bị dispute/hold;
- thông tin payout hợp lệ.

Khoản payout = seller net sau phí sàn, phí CHPlay/App Store (nếu IAP), thuế khấu trừ, phí thanh toán và điều chỉnh hoàn/chargeback.

## Điều 6. Chargeback

Khi payment provider thông báo chargeback, nền tảng có quyền tạm giữ/điều chỉnh khoản entitlement liên quan và mở quy trình xác minh.

## Điều 7. Idempotency

Mỗi payment/webhook/ledger transaction phải có idempotency key hoặc cơ chế tương đương để tránh ghi nhận hai lần.

## Điều 8. Đối soát

Nền tảng thực hiện đối soát định kỳ giữa:
- order;
- payment;
- refund;
- ledger;
- payout;
- provider usage.
