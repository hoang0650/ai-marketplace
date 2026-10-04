# CHÍNH SÁCH AN NINH AGENT VÀ CONTAINER

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

## Điều 1. Mục tiêu

Bảo vệ người mua, người bán, nền tảng và nhà cung cấp hạ tầng khỏi agent, container, máy GPU bị lạm dụng hoặc độc hại.

## Điều 2. Không gian AI agent của nền tảng

1. Mỗi người mua có không gian làm việc riêng cho từng agent (OpenClaw, Hermes Agent, SpaceBot, NanoClaw, Paperclip, Open WebUI), đăng nhập bằng tài khoản AI Markets.
2. Khóa API của người mua (BYOK) được mã hóa khi lưu và chỉ được giải mã để chuyển cho agent của chính người mua.
3. Khóa SSH tạm thời có thời hạn, người mua có thể thu hồi bất cứ lúc nào; mọi khóa đã cấp được lưu nhật ký.
4. Khi thuê bao hết hạn, agent bị khóa và khóa SSH đang hiệu lực bị thu hồi; dữ liệu được giữ 30 ngày rồi đưa vào quy trình xóa (tự động hoặc do quản trị viên thực hiện), người mua được thông báo khi dữ liệu đã bị xóa.

## Điều 3. Khai báo của người bán

Người bán cung cấp agent, image phải khai báo: kho mã nguồn; image; phiên bản; thư viện phụ thuộc; quyền cần thiết; cổng; volume; mạng; biến môi trường; khóa bí mật cần thiết.

## Điều 4. Nội dung bị cấm

Image, agent không được chứa: công cụ đánh cắp thông tin xác thực; mã độc; mã độc tống tiền; chương trình đào tiền mã hóa ẩn; cửa hậu; reverse shell trái phép; cơ chế duy trì truy cập trái phép.

## Điều 5. Cách ly

Agent, container, máy GPU chạy với quyền tối thiểu. Không dùng chế độ đặc quyền, hệ thống tệp của máy chủ, Docker socket của máy chủ hay mạng máy chủ không giới hạn, trừ khi quản trị viên phê duyệt cho trường hợp hợp lệ. Lưu lượng tới không gian làm việc đi qua proxy của nền tảng và có kiểm soát đích kết nối.

## Điều 6. Khóa bí mật

Khóa bí mật được cung cấp qua cơ chế quản lý bí mật lúc chạy. Không ghi khóa bí mật vào image, Git, cơ sở dữ liệu dạng rõ, giao diện người dùng hay nhật ký.

## Điều 7. Xử lý sự cố

Khi phát hiện agent, máy độc hại:
1. dừng tài nguyên;
2. thu hồi điểm truy cập, khóa SSH, khóa API;
3. bảo toàn bằng chứng;
4. tạm ẩn sản phẩm liên quan;
5. thông báo cho các bên bị ảnh hưởng khi cần;
6. xử lý theo [Quy trình xử lý vi phạm](14-quy-trinh-xu-ly-vi-pham.md).
