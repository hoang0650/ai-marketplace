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

Mọi đơn hàng trên website và ứng dụng được thanh toán **duy nhất bằng số dư ví AI Markets** (“Pay with AI Markets wallet only”). Cổng GPay/VietQR và các phương thức khác dưới đây chỉ dùng để nạp tiền vào ví, không dùng để thanh toán trực tiếp đơn hàng.

| Kênh | Đối tác | Phương thức | Mục đích |
|---|---|---|---|
| Website | Cổng thanh toán GPay | ATM, thẻ ngân hàng, VietQR | Nạp tiền vào ví |
| Ứng dụng iOS | Apple In-App Purchase | Theo tài khoản Apple của người mua | Nạp tiền vào ví |
| Ứng dụng Android | Google Play Billing | Theo tài khoản Google Play của người mua | Nạp tiền vào ví |
| Website và ứng dụng | Ví AI Markets | Số dư đã nạp qua các kênh trên | Thanh toán đơn hàng |

Nền tảng không lưu thông tin thẻ của người mua. Nền tảng hiện không nhận thanh toán qua PayPal hoặc phương thức khác ngoài danh sách trên.

## Điều 2. Giá và mã giảm giá

1. Giá sản phẩm, dịch vụ và số dư ví có thể được hiển thị bằng VNĐ, USD hoặc Nhân dân tệ (CNY) theo đơn vị tiền tệ hiển thị do người dùng lựa chọn. Khi nạp ví, số tiền nạp được quy đổi theo tỷ giá hiển thị trên trang nạp tiền tại thời điểm nạp.
2. Giá hiển thị phải nêu rõ: loại tiền, đơn vị tính (token, ký tự, phút, giờ, chu kỳ 30 ngày…), phí bổ sung nếu có và điều kiện áp dụng. Người mua thanh toán giá sau giảm (nếu có); phí sàn do người bán chịu và không cộng thêm vào giá của người mua.
3. Mã giảm giá: khoản giảm giá được áp dụng vào giá trị đơn hàng trước khi tính phí sàn; khoản giảm giá do người bán phát hành do người bán chịu. Giỏ hàng có thể hiển thị khoản giảm giá của người bán và khoản giảm giá của nền tảng (“Platform discount”).

## Điều 3. Ví người mua

1. Người mua nạp tiền vào ví qua cổng GPay (ATM, thẻ, VietQR) trên website hoặc hệ thống thanh toán trong ứng dụng; số tiền nạp được quy đổi theo tỷ giá hiển thị tại thời điểm nạp.
2. Số dư ví là **phương thức duy nhất để thanh toán đơn hàng** trên nền tảng, gồm cả trừ dần phí sử dụng (API, GPU, máy chủ trò chơi, token agent) và phí thuê bao agent tự gia hạn.
3. Người mua **được rút số dư ví** tại mục “Withdraw” của ví sau khi hoàn tất xác minh danh tính (eKYC) bằng CCCD/hộ chiếu; khi chưa xác minh, chức năng rút tiền chưa được sử dụng. Tiền hoàn được trả về ví hoặc phương thức thanh toán ban đầu theo [Chính sách hoàn tiền](06-chinh-sach-hoan-tien.md).
4. Số dư ví và sổ cái nội bộ phản ánh dữ liệu giao dịch và nghĩa vụ đối soát; không phải tài khoản tiền gửi hay tài khoản thanh toán, không được trả lãi.

## Điều 4. Thanh toán trong ứng dụng

Trên ứng dụng, người mua nạp tiền vào ví qua Apple In-App Purchase hoặc Google Play Billing theo chính sách của Apple/Google; đơn hàng được thanh toán bằng số dư ví như trên website. Đơn hàng, hóa đơn và quyền khiếu nại của người mua giống như trên website. Phí kho ứng dụng (Google Play 15%, App Store 30%) do Apple/Google thu, không phải doanh thu của nền tảng và không phải thuế; khoản này được khấu trừ khi đối soát với người bán.

## Điều 5. Đơn hàng

1. Mỗi giao dịch có mã đơn hàng duy nhất và lưu bản chụp giá, giảm giá (nếu có), phí sàn, phí kho ứng dụng (nếu có), thuế khấu trừ 8%, người bán tại thời điểm giao kết.
2. Đơn hàng có các trạng thái: chờ thanh toán, đã thanh toán, đang cung cấp, hoàn tất, hoàn tiền, tranh chấp; mọi thay đổi được ghi nhật ký.
3. Kết quả thanh toán được xác thực qua webhook có chữ ký; mỗi giao dịch, webhook, bút toán có khóa chống trùng để chỉ được ghi nhận một lần.

## Điều 6. Sổ cái và đối soát

Nền tảng ghi nhận riêng từng khoản: tiền người mua thanh toán; doanh thu người bán; phí sàn; phí kho ứng dụng; chi phí nhà cung cấp hạ tầng; thuế khấu trừ; hoàn tiền; điều chỉnh. Đối soát định kỳ giữa đơn hàng, thanh toán, hoàn tiền, sổ cái, chi trả và số liệu sử dụng.

## Điều 7. Chi trả cho người bán

1. Doanh thu người bán = giá trị đơn sau giảm giá − phí sàn (20%) − thuế khấu trừ (8%) − phí kho ứng dụng (nếu có) − hoàn tiền/điều chỉnh. Phí sàn và thuế được khấu trừ khi đơn hàng hoàn tất nên số dư hiển thị của người bán là số dư ròng.
2. Doanh thu được **tạm giữ 48 giờ** kể từ khi ghi nhận; khoản liên quan khiếu nại, tranh chấp đang giải quyết tiếp tục được tạm giữ.
3. Chi trả theo yêu cầu rút tiền của người bán đã xác minh (bao gồm eKYC), về tài khoản ngân hàng đứng tên người bán, khi khoản tiền đủ điều kiện và thông tin nhận tiền hợp lệ.

## Điều 8. Hoàn tiền và bồi hoàn

1. Hoàn tiền không xóa đơn hàng hay giao dịch gốc; hệ thống tạo bản ghi hoàn tiền riêng và điều chỉnh doanh thu người bán, phí sàn, thuế tương ứng.
2. Khi đối tác thanh toán hoặc kho ứng dụng thông báo bồi hoàn (chargeback/refund), nền tảng có quyền thu hồi quyền lợi tương ứng (số dư ví đã nạp, quyền sử dụng), tạm giữ khoản liên quan của người bán và mở quy trình xác minh.

## Điều 9. Cấm giao dịch ngoài nền tảng

Người bán và người mua không được thỏa thuận thanh toán ngoài nền tảng cho giao dịch phát sinh trên nền tảng. Giao dịch ngoài nền tảng không được hỗ trợ khiếu nại, hoàn tiền.
