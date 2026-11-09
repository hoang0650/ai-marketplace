# CHÍNH SÁCH CHƯƠNG TRÌNH AFFILIATE (TIẾP THỊ LIÊN KẾT)

**Nền tảng:** AI Markets  
**Website:** https://aimarkets.vn  
**Đơn vị vận hành:** Công ty TNHH giải pháp công nghệ PHGroup  
**MST:** 3703279135  
**Địa chỉ:** Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Thuận An, Tỉnh Bình Dương, Việt Nam  
**Điện thoại:** 0931 881 584  
**Email:** support@aimarkets.vn  
**Ngày công bố:** 05/11/2026
**Ngày hiệu lực:** 05/12/2026
**Phiên bản:** 2026.11.05

---

## Điều 1. Phạm vi và khái niệm

1. Chính sách này điều chỉnh Chương trình Affiliate (tiếp thị liên kết) trên AI Markets, là một phần không tách rời của Quy chế hoạt động sàn, Chính sách người bán và Thỏa thuận cung cấp dịch vụ cho người bán.
2. **Người giới thiệu (affiliate)** là người dùng có tài khoản AI Markets chia sẻ liên kết hoặc mã giới thiệu của mình để giới thiệu sản phẩm, gian hàng của người bán.
3. **Người bán tham gia** là người bán đã chủ động đặt tỷ lệ hoa hồng affiliate lớn hơn 0% cho sản phẩm hoặc cho toàn gian hàng.
4. **Đơn hàng giới thiệu** là đơn hàng được ghi nhận cho một người giới thiệu theo quy tắc tại Điều 4.
5. **Giá trị đơn hàng** dùng để tính hoa hồng là giá sau giảm giá mà người mua thực trả cho sản phẩm.

## Điều 1A. Vai trò

1. **Chủ quản và quản trị viên** vận hành chương trình, sổ hoa hồng và hồ sơ. Quản trị viên không phải tổ chức được cấp phép nhận, giữ và chi tiền.
2. **Người bán** tự đặt tỷ lệ hoa hồng và chịu khoản đó từ doanh thu của mình.
3. **Người giới thiệu** là một tư cách của tài khoản người dùng. Không có tuyến dưới, không có khoản nộp tiền để tham gia, không có hoa hồng tuyển dụng.
4. **Người mua** mở liên kết và thanh toán đơn bằng số dư trên nền tảng.
5. **Tổ chức thanh toán:** AI Markets đang làm việc trực tiếp với GPay để hoàn tất hợp đồng cung ứng dịch vụ cho dự án. Hợp đồng cho AI Markets chưa hoàn tất. Quan hệ sẵn có không chứng minh hợp đồng này đã ký hoặc phạm vi phép đã bao trùm mô hình. Tài khoản ngân hàng của Công ty đang nhận VietQR không phải giải pháp đã được cấp phép.

## Điều 1B. Quy trình đang chạy trên hệ thống

Các bước dưới đây mô tả mã và hợp đồng API hiện có. Không thêm cửa sổ, mức phí hay nhà cung cấp ngoài những gì hệ thống đang làm.

1. Người dùng đăng ký tài khoản thường. Không có bước đặt cọc.
2. `GET /v1/affiliate` chỉ trả mã khi `user.kyc.status` là verified. `GET /v1/affiliate/link` từ chối mã `KYC_REQUIRED` nếu chưa tới trạng thái đó. Biểu mẫu này không phải xác thực điện tử đã hoàn tất. Luật 122/2025/QH15 yêu cầu xác thực điện tử người tiếp thị liên kết từ 01/07/2026, trước khi thiết lập đường dẫn. Trang này không gắn nhãn đăng ký chương trình đã được cơ quan chấp thuận.
3. Rà soát mã số thuế của người bán là hồ sơ người bán, không cấp mã giới thiệu và không sửa trạng thái định danh điện tử.
4. Người bán đặt tỷ lệ 0–25%. Mặc định 0% là không tham gia. Sản phẩm “Bán bởi sàn” không lấy tỷ lệ bên thứ ba.
5. Người mua mở liên kết dạng đường dẫn sản phẩm hoặc gian hàng kèm `ref`. Ghi nhận là lượt nhấp cuối. Số ngày lấy từ cấu hình `attributionDays`, giá trị mã đang dùng khi không đặt biến là 30 ngày. Lượt nhấp lặp của cùng thiết bị trong 30 phút được tính một lần.
6. Đơn được ghi hoa hồng khi không phải tự giới thiệu, tỷ lệ lớn hơn 0, lượt nhấp còn trong cửa sổ, và tài khoản người giới thiệu còn hoạt động với hồ sơ nội bộ ở trạng thái verified tại thời điểm ghi nhận.
7. Hoa hồng ghi đủ lúc đơn hoàn tất, trạng thái `active`. Trong thời gian giữ hoặc khi đơn đang tranh chấp, số đó là đang giữ. Hết giữ, số còn lại là khả dụng. Hoàn hoặc hủy đảo theo tỷ lệ và có thể đưa dòng sang đã đảo.
8. Yêu cầu chi trả gửi `POST /v1/wallet/withdraw` với tư cách affiliate và tạo bút toán rút đang chờ. Bút toán đó không phải lệnh ngân hàng đã thực hiện. Chi qua tổ chức được phép chưa mở vì hợp đồng GPay cho AI Markets chưa hoàn tất.
9. Thuế không được trang này ấn 10% cho mọi người giới thiệu và không coi mẫu cam kết đã duyệt là miễn thuế. Khoản 2 Điều 50 Nghị định 253/2026/NĐ-CP chỉ thuộc nhóm thù lao cụ thể.
10. Tài khoản người giới thiệu không còn hoạt động thì lượt nhấp mới không được ghi nhận. Hoa hồng hợp lệ không bị xóa chỉ vì tài khoản bị khóa. Gian lận bị thu hồi theo Điều 8.
11. Mã giới thiệu và lượt nhấp là dữ liệu của người giới thiệu và người mua. Trang này không công bố hồ sơ thuế của người khác.

## Điều 2. Tham gia chương trình

1. Phản hồi của Bộ Công Thương yêu cầu người tiếp thị liên kết được xác thực điện tử từ 01/07/2026 và trước khi cấp mã hoặc ghi nhận hoa hồng. Ảnh CCCD, hộ chiếu và việc duyệt hồ sơ nội bộ không phải xác thực điện tử qua VNeID hoặc nhà cung cấp xác thực. Khi chưa có tích hợp được chứng minh, nền tảng không gắn nhãn đã hoàn tất xác thực điện tử. Liên kết, khi được cấp, có dạng `https://aimarkets.vn/product/<sản-phẩm>?ref=<mã>` hoặc `https://aimarkets.vn/store/<gian-hàng>?ref=<mã>`.
2. Tài khoản chưa qua bước kiểm tra hồ sơ mà chương trình đang yêu cầu thì không được cấp mã và không được ghi nhận hoa hồng. Kiểm tra hồ sơ đó vẫn không được mô tả là xác thực điện tử đã hoàn tất.
3. Việc tham gia của người bán là tự nguyện. Mặc định tỷ lệ hoa hồng là 0%, nghĩa là sản phẩm không tham gia chương trình.

## Điều 3. Tỷ lệ hoa hồng và người chịu chi phí

1. Người bán tự đặt tỷ lệ hoa hồng từ **0% đến 25% giá trị đơn hàng** (giá sau giảm giá), cho từng sản phẩm hoặc làm mức mặc định của gian hàng. Tỷ lệ của sản phẩm (nếu có) được ưu tiên hơn mức mặc định của gian hàng. Hệ thống từ chối mọi tỷ lệ lớn hơn 25%.
2. Hoa hồng affiliate do **người bán chi trả từ phần doanh thu của người bán**; không trừ vào phí dịch vụ sàn và không làm thay đổi phần thuế khấu trừ.
3. Hoa hồng của một đơn được ghi nhận riêng với phí sàn và với khoản thuế. Thuế không tính bằng một tỷ lệ cố định theo nhãn người bán trên trang này. Mức thuế, nếu phát sinh, theo tư cách, cư trú, bản chất thu nhập và văn bản có hiệu lực lúc chi trả.
4. Tỷ lệ được **chốt tại thời điểm đặt hàng**. Thay đổi tỷ lệ chỉ áp dụng cho đơn hàng phát sinh sau thời điểm thay đổi.
5. Chương trình chỉ áp dụng cho sản phẩm của người bán bên thứ ba; sản phẩm “Bán bởi sàn” không tham gia trừ khi nền tảng công bố khác.

## Điều 4. Ghi nhận đơn hàng giới thiệu

1. Nguyên tắc **nhấp chuột cuối cùng (last-click)**: khi người mua mở liên kết giới thiệu, hệ thống lưu mã lượt nhấp trên trình duyệt hoặc ứng dụng (và trên tài khoản nếu người mua đã đăng nhập). Đơn hàng được ghi nhận cho liên kết hợp lệ được nhấp gần nhất.
2. **Thời hạn ghi nhận** là 30 ngày kể từ lượt nhấp, trừ khi nền tảng công bố thời hạn khác trên trang Affiliate.
3. Liên kết sản phẩm chỉ ghi nhận đơn của đúng sản phẩm đó; liên kết gian hàng ghi nhận đơn của mọi sản phẩm tham gia thuộc gian hàng.
4. **Không ghi nhận** khi: người mua chính là người giới thiệu; người giới thiệu chính là người bán của sản phẩm; lượt nhấp đã hết hạn; sản phẩm có tỷ lệ 0%; hoặc tài khoản người giới thiệu bị tạm khóa.

## Điều 5. Ghi có, tạm giữ và rút tiền

1. Hoa hồng được ghi có vào ví của người giới thiệu ngay khi đơn hàng hoàn tất và được **tạm giữ 48 giờ** như doanh thu của người bán; nếu đơn hàng phát sinh khiếu nại, khoản hoa hồng tiếp tục bị giữ đến khi khiếu nại được giải quyết.
2. Sau thời gian tạm giữ, hoa hồng khả dụng được chi bằng VND về tài khoản đứng tên đúng người giới thiệu. Không có mức chi trả tối thiểu. Mọi số dư khả dụng lớn hơn 0 đều có thể được yêu cầu, trong đơn vị tiền của ví. Chỉ tạm giữ phần đang tranh chấp hoặc thuộc diện thu hồi có căn cứ. Không tịch thu toàn bộ khoản hợp lệ chỉ vì tài khoản bị khóa.
3. Trang Affiliate hiển thị: liên kết, số lượt nhấp, số đơn, hoa hồng đang tạm giữ, hoa hồng khả dụng và hoa hồng bị thu hồi.

## Điều 6. Thuế thu nhập cá nhân

1. Thuế trên hoa hồng được xác định theo tư cách, cư trú, bản chất thu nhập và văn bản có hiệu lực tại lúc chi trả. Trang này không áp dụng máy móc một tỷ lệ cố định, và không coi một mẫu cam kết đã duyệt là căn cứ miễn thuế.
2. Nếu người giới thiệu gửi một bản cam kết thuế, đó là tệp, năm và mã số thuế để quản trị viên duyệt hoặc từ chối, có lý do. Việc duyệt tệp không phải xác thực điện tử và không phải miễn thuế. Nghị định 253/2026/NĐ-CP, khoản 2 Điều 50, chỉ nói cam kết là căn cứ tạm thời chưa khấu trừ đối với nhóm thù lao cụ thể khi đủ điều kiện, không áp cho mọi hoa hồng.
3. Khoản đã khấu trừ, nếu có, được ghi trên lịch sử ví. Nghị định 252/2026/NĐ-CP, khoản 2 Điều 45, yêu cầu chủ quản nền tảng khai theo tháng số thuế đã khấu trừ đối với hoạt động kinh doanh của hộ và cá nhân kinh doanh. Trang này không xếp mọi hoa hồng người giới thiệu vào nhóm đó và không ghi lịch quý như quy tắc đã chốt.
4. Khoản thuế, nếu phát sinh, theo văn bản có hiệu lực tại thời điểm chi trả. Người giới thiệu tự chịu trách nhiệm quyết toán thuế của mình.

## Điều 7. Hành vi bị cấm

Người giới thiệu không được:
1. gửi thư rác, tin nhắn hàng loạt, bình luận rác hoặc quảng cáo không được người nhận đồng ý;
2. quảng cáo sai sự thật, gây nhầm lẫn về sản phẩm, giá, khuyến mại, hoặc tự xưng là người bán, là AI Markets hay đối tác chính thức;
3. đặt giá thầu từ khóa thương hiệu (“AI Markets”, “aimarkets”, tên gian hàng, tên sản phẩm và các biến thể) trên công cụ tìm kiếm, mạng xã hội hoặc nền tảng quảng cáo khi chưa được chấp thuận bằng văn bản;
4. tạo đơn hàng ảo, tự mua hoặc nhờ người khác mua để nhận hoa hồng, hoặc thông đồng với người bán, người mua để hoàn tiền sau khi nhận hoa hồng;
5. nhồi cookie (cookie stuffing), tự động mở liên kết, dùng iframe ẩn, phần mềm, tiện ích trình duyệt hoặc mọi kỹ thuật ghi nhận lượt nhấp mà người mua không chủ động thực hiện;
6. tự giới thiệu: dùng liên kết của mình để mua hàng cho chính mình, hoặc giới thiệu sản phẩm của chính mình;
7. sử dụng nội dung vi phạm pháp luật, Chính sách sử dụng chấp nhận được hoặc quyền sở hữu trí tuệ của người khác.

## Điều 8. Hoàn tiền, hủy đơn và thu hồi hoa hồng

1. Đơn hàng bị hoàn tiền hoặc hủy, toàn bộ hay một phần, thì hoa hồng tương ứng bị **đảo ngược theo đúng tỷ lệ** và trừ khỏi ví người giới thiệu.
2. Khi phát hiện gian lận hoặc vi phạm Điều 7, nền tảng có quyền thu hồi toàn bộ hoa hồng của các đơn hàng liên quan, kể cả khoản đã chuyển thành số dư khả dụng; tạm khóa tính năng affiliate hoặc tài khoản; và xử lý theo Quy trình xử lý vi phạm.
3. Nếu số dư ví không đủ để thu hồi, khoản chênh lệch được ghi nợ và bù trừ vào các khoản ghi có sau này.

## Điều 9. Trách nhiệm của người bán

1. Người bán chịu trách nhiệm về tỷ lệ hoa hồng đã đặt và chi trả hoa hồng từ doanh thu của mình theo Điều 3.
2. Người bán không được trực tiếp trả thưởng cho người giới thiệu ngoài nền tảng cho các đơn hàng phát sinh trên AI Markets.

## Điều 10. Sửa đổi

Nền tảng có thể sửa đổi chính sách này và thông báo trước theo Quy chế hoạt động. Thay đổi về tỷ lệ tối đa, thời hạn ghi nhận hoặc thuế chỉ áp dụng cho đơn hàng phát sinh sau ngày hiệu lực của bản sửa đổi.
