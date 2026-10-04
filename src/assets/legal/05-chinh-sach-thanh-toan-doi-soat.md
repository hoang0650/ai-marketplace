# CHÍNH SÁCH THANH TOÁN VÀ ĐỐI SOÁT

**Nền tảng:** AI Markets  
**Website:** https://aimarkets.vn  
**Đơn vị vận hành:** Công ty TNHH giải pháp công nghệ PHGroup  
**MST:** 3703279135  
**Địa chỉ:** Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Thuận An, Tỉnh Bình Dương, Việt Nam  
**Điện thoại:** 1900 6159  
**Email:** support@aimarkets.vn  
**Ngày hiệu lực:** 04/10/2026  
**Phiên bản:** 2.0

---

## Điều 1. Đối tác và phương thức thanh toán

| Kênh | Đối tác | Phương thức |
|---|---|---|
| Website | Cổng thanh toán GPay | Mã QR, thẻ ngân hàng |
| Ứng dụng iOS | Apple In-App Purchase | Theo tài khoản Apple của người mua |
| Ứng dụng Android | Google Play Billing | Theo tài khoản Google Play của người mua |
| Website và ứng dụng | Số dư ví AI Markets | Số dư đã nạp qua các kênh trên |

Nền tảng không lưu thông tin thẻ của người mua. Nền tảng hiện không nhận thanh toán qua PayPal hoặc phương thức khác ngoài danh sách trên.

## Điều 2. Giá

Giá hiển thị phải nêu rõ: loại tiền, đơn vị tính (token, ký tự, phút, giờ, chu kỳ 30 ngày…), phí bổ sung nếu có và điều kiện áp dụng. Người mua thanh toán giá niêm yết; phí sàn do người bán chịu và không cộng thêm vào giá của người mua.

## Điều 3. Ví người mua

1. Người mua nạp tiền vào ví qua cổng GPay hoặc hệ thống thanh toán trong ứng dụng.
2. Số dư ví **chỉ dùng để thanh toán trên nền tảng**, gồm cả trừ dần phí sử dụng (API, GPU, máy chủ trò chơi, token agent) và phí thuê bao agent tự gia hạn.
3. Người mua **không rút số dư ví về tài khoản ngân hàng**. Tiền hoàn được trả về ví hoặc phương thức thanh toán ban đầu theo [Chính sách hoàn tiền](06-chinh-sach-hoan-tien.md).
4. Số dư ví và sổ cái nội bộ chỉ phản ánh quyền sử dụng dịch vụ và dữ liệu đối soát; không phải tiền gửi, không được trả lãi.

## Điều 4. Thanh toán trong ứng dụng

Trên ứng dụng, sản phẩm số được thanh toán qua Apple In-App Purchase hoặc Google Play Billing theo chính sách của Apple/Google. Đơn hàng, hóa đơn và quyền khiếu nại của người mua giống như trên website. Phí kho ứng dụng do Apple/Google thu, không phải doanh thu của nền tảng và không phải thuế; khoản này được khấu trừ khi đối soát với người bán.

## Điều 5. Đơn hàng

1. Mỗi giao dịch có mã đơn hàng duy nhất và lưu bản chụp giá, phí sàn, phí kho ứng dụng (nếu có), thuế khấu trừ (nếu có), người bán tại thời điểm giao kết.
2. Đơn hàng có các trạng thái: chờ thanh toán, đã thanh toán, đang cung cấp, hoàn tất, hoàn tiền, tranh chấp; mọi thay đổi được ghi nhật ký.
3. Kết quả thanh toán được xác thực qua webhook có chữ ký; mỗi giao dịch, webhook, bút toán có khóa chống trùng để chỉ được ghi nhận một lần.

## Điều 6. Sổ cái và đối soát

Nền tảng ghi nhận riêng từng khoản: tiền người mua thanh toán; doanh thu người bán; phí sàn; phí kho ứng dụng; chi phí nhà cung cấp hạ tầng; thuế khấu trừ; hoàn tiền; điều chỉnh. Đối soát định kỳ giữa đơn hàng, thanh toán, hoàn tiền, sổ cái, chi trả và số liệu sử dụng.

## Điều 7. Chi trả cho người bán

1. Doanh thu người bán = giá trị đơn − phí sàn − phí kho ứng dụng (nếu có) − thuế khấu trừ (nếu có) − hoàn tiền/điều chỉnh.
2. Doanh thu được **tạm giữ 48 giờ** kể từ khi ghi nhận; khoản liên quan khiếu nại, tranh chấp đang giải quyết tiếp tục được tạm giữ.
3. Chi trả theo yêu cầu rút tiền của người bán đã xác minh, về tài khoản ngân hàng đứng tên người bán, khi khoản tiền đủ điều kiện và thông tin nhận tiền hợp lệ.

## Điều 8. Hoàn tiền và bồi hoàn

1. Hoàn tiền không xóa đơn hàng hay giao dịch gốc; hệ thống tạo bản ghi hoàn tiền riêng và điều chỉnh doanh thu người bán, phí sàn, thuế tương ứng.
2. Khi đối tác thanh toán hoặc kho ứng dụng thông báo bồi hoàn (chargeback/refund), nền tảng có quyền thu hồi quyền lợi tương ứng (số dư ví đã nạp, quyền sử dụng), tạm giữ khoản liên quan của người bán và mở quy trình xác minh.

## Điều 9. Cấm giao dịch ngoài nền tảng

Người bán và người mua không được thỏa thuận thanh toán ngoài nền tảng cho giao dịch phát sinh trên nền tảng. Giao dịch ngoài nền tảng không được hỗ trợ khiếu nại, hoàn tiền.
