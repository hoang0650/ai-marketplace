# CHÍNH SÁCH NGƯỜI MUA

**Nền tảng:** AI Markets  
**Website:** https://aimarkets.vn  
**Đơn vị vận hành:** Công ty TNHH giải pháp công nghệ PHGroup  
**MST:** 3703279135  
**Địa chỉ:** Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Thuận An, Tỉnh Bình Dương, Việt Nam  
**Điện thoại:** 0931 881 584  
**Email:** support@aimarkets.vn  
**Ngày hiệu lực:** 04/10/2026  
**Phiên bản:** 2.0

---

## Điều 1. Quyền của người mua

- Được cung cấp đầy đủ thông tin sản phẩm, giá, đơn vị tính, phí, điều kiện sử dụng, giấy phép và thông tin người bán trước khi mua;
- Phân biệt rõ sản phẩm “Bán bởi sàn” và “Bán bởi Seller – tên cửa hàng”;
- Nhận email xác nhận đơn hàng; xem lịch sử đơn hàng, mức sử dụng, số dư ví và chứng từ giao dịch;
- Được hoàn tiền theo [Chính sách hoàn tiền](06-chinh-sach-hoan-tien.md), được khiếu nại theo [Chính sách khiếu nại và tranh chấp](07-chinh-sach-khieu-nai-tranh-chap.md);
- Được bảo vệ dữ liệu cá nhân theo [Chính sách bảo mật](08-chinh-sach-bao-mat-va-du-lieu.md);
- Đánh giá sản phẩm đã mua một cách trung thực.

## Điều 2. Nghĩa vụ của người mua

- Cung cấp thông tin đăng ký chính xác và thanh toán đầy đủ;
- Sử dụng sản phẩm đúng giấy phép và [Chính sách sử dụng chấp nhận được](10-chinh-sach-su-dung-chap-nhan-duoc.md);
- Không chia sẻ khóa API, tài khoản trái phép; không dịch ngược nhằm vượt qua cơ chế bảo mật; không lạm dụng GPU, API;
- Duy trì đủ số dư ví với dịch vụ trả theo mức sử dụng hoặc thuê bao tự gia hạn.

## Điều 3. Đặt hàng và thanh toán

1. Người mua có thể lưu sản phẩm vào giỏ hàng, danh sách yêu thích (đồng bộ giữa website và ứng dụng), kiểm tra tổng giá rồi xác nhận thanh toán.
2. Đơn hàng được thanh toán **duy nhất bằng số dư ví AI Markets**. Chuyển khoản ngân hàng (Mã QR VietQR) vào Tài khoản thanh toán của Công ty trên website và Apple In-App Purchase / Google Play Billing trên ứng dụng chỉ dùng để nạp tiền vào ví.
3. Giá và số dư ví được hiển thị bằng VNĐ, USD hoặc Nhân dân tệ (CNY) theo đơn vị tiền tệ người dùng lựa chọn; số tiền nạp được quy đổi theo tỷ giá hiển thị tại thời điểm nạp. Người mua thanh toán giá sau giảm (nếu có).
4. Người mua được rút số dư ví tại mục “Withdraw” của ví sau khi hoàn tất xác minh danh tính (eKYC) bằng CCCD/hộ chiếu. Chi tiết tại [Chính sách thanh toán](05-chinh-sach-thanh-toan-doi-soat.md).

## Điều 4. Dịch vụ theo mức sử dụng (API, token)

1. Phí được tính theo số liệu hệ thống ghi nhận (lượt gọi, token đầu vào/đầu ra, ký tự…) và trừ dần vào số dư ví.
2. Người mua xem chi tiết từng lượt và tổng (số lượt, token, số tiền) tại trang Lịch sử sử dụng hoặc qua API `GET /v1/usage/me`.
3. Số liệu hệ thống là căn cứ tính phí, trừ trường hợp sai lệch được xác minh.

## Điều 5. Thuê GPU và máy chủ trò chơi

1. **Thuê GPU:** người mua nạp tiền trước, chọn cấu hình và khởi tạo máy; số dư phải đủ tối thiểu 01 giờ theo giá đang chạy. Phí tính theo **phút sử dụng**; phí lưu trữ ổ đĩa khi máy dừng (nếu có) được niêm yết trước. Hệ thống cảnh báo khi số dư sắp hết, **tự động dừng máy khi hết số dư** và **xóa máy sau 24 giờ** nếu người mua không nạp thêm; dữ liệu trên máy bị xóa sẽ không khôi phục được.
2. **Máy chủ trò chơi / GPU streaming:** số dư phải đủ tối thiểu 01 phút; phí trừ **mỗi phút** trong khi phiên chạy, phút lẻ cuối được làm tròn lên. Phiên tự dừng khi hết số dư hoặc khi không còn tín hiệu từ thiết bị trong 5 phút. Mỗi người mua có một phiên cho mỗi sản phẩm; chuyển thiết bị (PC ↔ điện thoại) sẽ dừng phiên cũ để không bị tính tiền hai lần.
3. Người mua tự chịu trách nhiệm về phần mềm, trò chơi tự cài đặt trên máy thuê và phải có quyền sử dụng hợp pháp.

## Điều 6. Dịch vụ AI agent (Bán bởi sàn)

1. **Thuê bao:** 199.000 VNĐ/agent cho mỗi chu kỳ 30 ngày (hoặc giá trị tương đương theo đơn vị tiền tệ hiển thị), trả trước từ số dư ví; thời gian gia hạn được cộng tiếp vào ngày hết hạn hiện tại. Mỗi agent có không gian làm việc riêng và đăng nhập bằng tài khoản AI Markets.
2. **Tự động gia hạn** được bật mặc định và có thể tắt bất cứ lúc nào tại trang agent. Nền tảng nhắc trước ngày hết hạn 3 ngày (thông báo và email), trừ phí trước ngày hết hạn 1 ngày; nếu số dư không đủ, hệ thống thông báo và thử lại sau mỗi 6 giờ.
3. **Phí token:** khi dùng mô hình do nền tảng cung cấp, sau mỗi lượt chạy hệ thống trừ phí bằng giá gốc của nhà cung cấp mô hình **cộng 25%** và ghi nhận số token; mô hình miễn phí không phát sinh phí token. Khi dùng khóa API của mình (**BYOK**), nền tảng không thu phí token; khóa được mã hóa khi lưu và chỉ dùng cho agent của chính người mua.
4. **Hết hạn:** agent bị khóa (không khởi chạy, đăng nhập, cấp khóa SSH, gọi mô hình), khóa SSH đang hiệu lực bị thu hồi. Dữ liệu trong không gian agent được giữ **30 ngày** kể từ ngày hết hạn, sau đó bị xóa và người mua được thông báo.
5. Người mua chịu trách nhiệm về nội dung agent gửi qua kênh nhắn tin đã kết nối và về khóa SSH tạm thời mình tạo.

## Điều 7. Mẫu website/ứng dụng

Người mua xem demo trực tiếp trước khi mua. Sau khi thanh toán, người mua nhận quyền sử dụng theo giấy phép, được tạo bản sao riêng trong AI App Builder để chỉnh sửa (dùng khóa AI của người mua) và đẩy mã nguồn lên kho GitHub của mình; không được đăng bán lại thành mẫu mới.

## Điều 8. Dịch vụ chuyên môn trọn gói (làm website, làm ứng dụng, marketing, SEO, sáng tạo nội dung, tự động hóa quy trình)

1. Là dịch vụ do người bán cung cấp cho người mua theo hợp đồng dịch vụ quy định tại Điều 513 Bộ luật Dân sự 2015, giao kết khi người mua đặt mua và thanh toán bằng số dư ví. Phạm vi công việc, kết quả bàn giao, thời hạn và giá do người bán công bố trên trang dịch vụ.
2. Giá được xác định theo gói hoặc theo kết quả bàn giao, không tính theo giờ, ngày hay tháng làm việc. Người bán tự quyết định phương pháp, thời gian, công cụ, nhân sự thực hiện và chịu trách nhiệm về kết quả bàn giao.
3. Giữa người mua với người bán và nhân sự của người bán không phát sinh quan hệ lao động. Nền tảng không tuyển dụng, không tư vấn, giới thiệu việc làm, không cung ứng hay cho thuê lại lao động; trang dịch vụ không được chứa tin tuyển dụng, vị trí việc làm, tiền lương hoặc hồ sơ xin việc.
4. Phí sàn, khấu trừ thuế, tạm giữ, hoàn tiền và giải quyết khiếu nại áp dụng như đối với các sản phẩm khác.

## Điều 9. Khóa API và bảo mật

Khóa API, khóa SSH là thông tin bí mật. Nếu bị lộ, người mua phải thu hồi ngay và báo cho nền tảng. Người mua chịu phí phát sinh từ khóa của mình cho đến khi khóa bị thu hồi.

## Điều 10. Khiếu nại

Khi gửi khiếu nại, người mua nên cung cấp: mã đơn hàng, sản phẩm, thời gian, mô tả vấn đề và bằng chứng. Khiếu nại gửi trong **48 giờ** kể từ khi giao dịch giúp khoản tiền của người bán được tạm giữ trong lúc xem xét. Không gửi mật khẩu, khóa API hoặc khóa bí mật trong hồ sơ khiếu nại.
