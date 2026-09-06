# CHÍNH SÁCH HOÀN TIỀN

## 1. Nguyên tắc

Việc hoàn tiền phụ thuộc:
- loại sản phẩm;
- điều kiện giao dịch;
- trạng thái fulfillment;
- license;
- mức độ sử dụng;
- lỗi dịch vụ;
- quy định pháp luật áp dụng.

## 2. Các trường hợp có thể xem xét

Có thể xem xét hoàn tiền khi:
- giao dịch bị tính tiền sai;
- hệ thống thu tiền nhưng không cung cấp dịch vụ;
- dịch vụ có lỗi nghiêm trọng;
- seller không cung cấp dịch vụ theo cam kết;
- giao dịch bị lỗi kỹ thuật;
- pháp luật yêu cầu hoàn tiền.

## 3. Usage-based service

Đối với API/GPU/runtime đã sử dụng, khoản hoàn tiền có thể được tính theo phần usage thực tế và mức độ lỗi.

## 4. Digital products

Model, dataset, agent hoặc software đã tải xuống/đã cấp quyền sử dụng có thể áp dụng điều kiện hoàn tiền riêng được công bố trên product page, trong phạm vi pháp luật cho phép.

## 5. Quy trình

Buyer gửi Refund Request.

Nền tảng:
1. xác minh order;
2. kiểm tra payment;
3. kiểm tra usage;
4. kiểm tra policy;
5. lấy ý kiến seller nếu cần;
6. quyết định;
7. gửi refund qua payment provider nếu được chấp thuận.

## 6. Không xóa giao dịch

Refund không xóa Order hoặc Payment. Hệ thống tạo refund/reversal record riêng.
