export interface LegalPolicyMeta {
  slug: string;
  file: string;
  title: string;
  summary: string;
  group: 'core' | 'commerce' | 'data' | 'ops';
}

export const LEGAL_POLICY_GROUPS: { id: LegalPolicyMeta['group']; label: string }[] = [
  { id: 'core', label: 'Quy chế & điều khoản' },
  { id: 'commerce', label: 'Mua bán & thanh toán' },
  { id: 'data', label: 'Dữ liệu & bản quyền' },
  { id: 'ops', label: 'Vận hành sàn' },
];

/** Public catalog — maps to AI_Marketplace_Policies/*.md (served from /assets/legal). */
export const LEGAL_POLICIES: LegalPolicyMeta[] = [
  {
    slug: 'thong-tin-chu-quan-nen-tang',
    file: '24-thong-tin-chu-quan-nen-tang.md',
    title: 'Thông tin chủ quản nền tảng',
    summary: 'Thông tin pháp lý, địa chỉ, mã số thuế và đầu mối liên hệ của đơn vị chủ quản AI Markets.',
    group: 'core',
  },
  {
    slug: 'quy-che-hoat-dong-san-tmdt',
    file: '01-quy-che-hoat-dong-san-tmdt.md',
    title: 'Quy chế hoạt động sàn TMĐT',
    summary: 'Mô hình sàn, sản phẩm được phép, phí và thuế, thanh toán và giải quyết khiếu nại.',
    group: 'core',
  },
  {
    slug: 'dieu-khoan-su-dung',
    file: '02-dieu-khoan-su-dung.md',
    title: 'Điều khoản sử dụng',
    summary: 'Tài khoản, dịch vụ định kỳ, nội dung AI, hành vi cấm và giới hạn trách nhiệm.',
    group: 'core',
  },
  {
    slug: 'chinh-sach-nguoi-ban',
    file: '03-chinh-sach-nguoi-ban.md',
    title: 'Chính sách người bán',
    summary: 'Bắt buộc khai báo loại người bán và MST, eKYC, giấy chứng nhận đăng ký kinh doanh, phí sàn, thuế theo loại người bán, giữ tiền 48 giờ.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-nguoi-mua',
    file: '04-chinh-sach-nguoi-mua.md',
    title: 'Chính sách người mua',
    summary: 'Quyền, nghĩa vụ người mua. Lệnh rút số dư nạp đang tắt. Hoàn tiền là thủ tục riêng.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-thanh-toan-doi-soat',
    file: '05-chinh-sach-thanh-toan-doi-soat.md',
    title: 'Thanh toán và đối soát',
    summary: 'Đơn hàng thanh toán bằng số dư nội bộ. Website nạp ví bằng VietQR vào VPBank 395951335. IAP chỉ nạp ví trong ứng dụng. Đối soát 48 giờ, chi trả trong 07 ngày làm việc (không tính các ngày thứ bảy, chủ nhật và các ngày nghỉ lễ).',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoan-tien',
    file: '06-chinh-sach-hoan-tien.md',
    title: 'Chính sách hoàn tiền',
    summary: 'Điều kiện hoàn theo loại sản phẩm, thời hạn 48 giờ và chấm dứt dịch vụ.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-khieu-nai-tranh-chap',
    file: '07-chinh-sach-khieu-nai-tranh-chap.md',
    title: 'Khiếu nại và tranh chấp',
    summary: 'Tiếp nhận 24 giờ, xác minh 01 ngày làm việc, người bán phản hồi 02 ngày làm việc, quyết định 07 ngày làm việc; khiếu nại lại trong 07 ngày.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-bao-mat-va-du-lieu',
    file: '08-chinh-sach-bao-mat-va-du-lieu.md',
    title: 'Bảo mật và dữ liệu cá nhân',
    summary: 'Bảo vệ dữ liệu cá nhân theo Luật 91/2025/QH15; dữ liệu lưu trữ tại Việt Nam trên máy chủ 123HOST.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-ip-ban-quyen-license',
    file: '09-chinh-sach-ip-ban-quyen-license.md',
    title: 'Sở hữu trí tuệ và license',
    summary: 'Quyền SHTT, thông báo và gỡ bỏ, phạm vi quyền người mua.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-su-dung-chap-nhan-duoc',
    file: '10-chinh-sach-su-dung-chap-nhan-duoc.md',
    title: 'Sử dụng chấp nhận được (AUP)',
    summary: 'Danh mục cấm kinh doanh, hành vi cấm trên API, GPU và agent.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-kiem-duyet-san-pham-ai',
    file: '11-chinh-sach-kiem-duyet-san-pham-ai.md',
    title: 'Kiểm duyệt sản phẩm AI',
    summary: 'Luồng duyệt model, agent, API, mẫu website, dataset và dịch vụ chuyên môn trọn gói trước khi hiển thị.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-agent-container-security',
    file: '12-chinh-sach-agent-container-security.md',
    title: 'An ninh agent và container',
    summary: 'Cách ly, khóa bí mật, BYOK và xử lý agent độc hại.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xac-minh-nguoi-ban',
    file: '13-quy-trinh-xac-minh-nguoi-ban.md',
    title: 'Quy trình xác minh người bán',
    summary: 'Hồ sơ xác minh, trạng thái duyệt và xác nhận thỏa thuận người bán.',
    group: 'ops',
  },
  {
    slug: 'quy-trinh-xu-ly-vi-pham',
    file: '14-quy-trinh-xu-ly-vi-pham.md',
    title: 'Quy trình xử lý vi phạm',
    summary: 'Mức độ vi phạm, gỡ bỏ trong 24 giờ theo yêu cầu cơ quan nhà nước.',
    group: 'ops',
  },
  {
    slug: 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
    file: '15-mau-hop-dong-cung-cap-dich-vu-nguoi-ban.md',
    title: 'Thỏa thuận người bán',
    summary: 'Phiên bản v2026.10.05: hợp đồng điện tử giữa sàn và người bán về phí, đối soát, eKYC và rút tiền.',
    group: 'core',
  },
  {
    slug: 'chinh-sach-cookies',
    file: '16-chinh-sach-cookies.md',
    title: 'Chính sách cookies',
    summary: 'Cookie cần thiết, phân tích tự vận hành, bên thứ ba và quyền quản lý.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-luu-tru-va-cung-cap-du-lieu',
    file: '17-chinh-sach-luu-tru-va-cung-cap-du-lieu.md',
    title: 'Lưu trữ và cung cấp dữ liệu',
    summary: 'Thời hạn lưu trữ (sản phẩm 01 năm, giao dịch 03 năm), tạm giữ và cung cấp dữ liệu.',
    group: 'data',
  },
  {
    slug: 'chinh-sach-thue',
    file: '18-chinh-sach-thue.md',
    title: 'Chính sách thuế',
    summary: 'Phí sàn không phải thuế. Chưa công bố bảng khấu trừ đã được kế toán đối chiếu với văn bản năm 2026.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-hoa-don',
    file: '19-chinh-sach-hoa-don.md',
    title: 'Chính sách hóa đơn',
    summary: 'Phân biệt hóa đơn phí dịch vụ của sàn và hóa đơn của người bán.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-affiliate',
    file: '20-chinh-sach-affiliate.md',
    title: 'Chính sách chương trình Affiliate',
    summary: 'Hoa hồng 0–25% do người bán đặt, nhấp cuối, giữ 48 giờ. Xác thực điện tử chưa được triển khai.',
    group: 'commerce',
  },
  {
    slug: 'quy-trinh-tiep-thi-lien-ket',
    file: '29-quy-trinh-tiep-thi-lien-ket.md',
    title: 'Quy trình tiếp thị liên kết (Affiliate)',
    summary: 'Năm vai trò và mười sáu bước theo khoản 11 Mục XI Quy chế. Một cấp, không phí tham gia.',
    group: 'commerce',
  },
  {
    slug: 'chinh-sach-xep-hang-uu-tien-hien-thi',
    file: '21-chinh-sach-xep-hang-uu-tien-hien-thi.md',
    title: 'Xếp hạng và ưu tiên hiển thị',
    summary: 'Tiêu chí xếp hạng, nhãn quảng cáo, sản phẩm bán bởi sàn và giảm giá của nền tảng.',
    group: 'commerce',
  },
  {
    slug: 'quy-che-livestream-ban-hang',
    file: '22-quy-che-livestream-ban-hang.md',
    title: 'Quy chế livestream bán hàng',
    summary: 'Trạng thái tính năng livestream và điều kiện tuân thủ trước khi vận hành.',
    group: 'ops',
  },
  {
    slug: 'chinh-sach-giao-nhan-san-pham-so',
    file: '23-chinh-sach-giao-nhan-san-pham-so.md',
    title: 'Giao nhận hàng hóa và dịch vụ',
    summary: 'Bàn giao sản phẩm số, thời hạn dịch vụ chuyên môn và điều kiện giao hàng vật lý.',
    group: 'commerce',
  },
  {
    slug: 'quyen-va-nghia-vu-cac-ben',
    file: '25-quyen-va-nghia-vu-cac-ben.md',
    title: 'Quyền và nghĩa vụ của các bên',
    summary: 'Quyền và nghĩa vụ của chủ quản nền tảng, người bán, người mua và người tiếp thị liên kết.',
    group: 'core',
  },
  {
    slug: 'chinh-sach-gia-ca',
    file: '26-chinh-sach-gia-ca.md',
    title: 'Chính sách giá cả',
    summary: 'Giá, hạch toán và thanh toán trong nước bằng VND. Không công bố bảng thuế suất đã đối chiếu.',
    group: 'commerce',
  },
  {
    slug: 'dieu-kien-va-han-che-cung-cap',
    file: '28-dieu-kien-va-han-che-cung-cap.md',
    title: 'Điều kiện và hạn chế cung cấp dịch vụ',
    summary: 'Thị trường Việt Nam, năng lực giao kết, không cam kết 24/7, không giao hàng vật lý.',
    group: 'commerce',
  },
  {
    slug: 'phuong-thuc-cung-cap-va-cham-dut-dich-vu',
    file: '27-phuong-thuc-cung-cap-va-cham-dut-dich-vu.md',
    title: 'Cung cấp và chấm dứt dịch vụ',
    summary: 'Phương thức kích hoạt, bàn giao, tạm ngừng, chấm dứt và xử lý dữ liệu, khoản tiền còn lại.',
    group: 'core',
  },
];

const ALIASES: Record<string, string> = {
  terms: 'dieu-khoan-su-dung',
  'terms-of-service': 'dieu-khoan-su-dung',
  privacy: 'chinh-sach-bao-mat-va-du-lieu',
  'privacy-policy': 'chinh-sach-bao-mat-va-du-lieu',
  'marketplace-rules': 'quy-che-hoat-dong-san-tmdt',
  'seller-policy': 'chinh-sach-nguoi-ban',
  'buyer-policy': 'chinh-sach-nguoi-mua',
  'payment-policy': 'chinh-sach-thanh-toan-doi-soat',
  'refund-policy': 'chinh-sach-hoan-tien',
  'dispute-policy': 'chinh-sach-khieu-nai-tranh-chap',
  'complaint-policy': 'chinh-sach-khieu-nai-tranh-chap',
  'intellectual-property': 'chinh-sach-ip-ban-quyen-license',
  'acceptable-use': 'chinh-sach-su-dung-chap-nhan-duoc',
  'data-policy': 'chinh-sach-bao-mat-va-du-lieu',
  'seller-agreement': 'mau-hop-dong-cung-cap-dich-vu-nguoi-ban',
  cookies: 'chinh-sach-cookies',
  'tax-policy': 'chinh-sach-thue',
  'invoice-policy': 'chinh-sach-hoa-don',
  'affiliate-policy': 'chinh-sach-affiliate',
  affiliate: 'chinh-sach-affiliate',
  'affiliate-process': 'quy-trinh-tiep-thi-lien-ket',
  ranking: 'chinh-sach-xep-hang-uu-tien-hien-thi',
  livestream: 'quy-che-livestream-ban-hang',
  delivery: 'chinh-sach-giao-nhan-san-pham-so',
  conditions: 'dieu-kien-va-han-che-cung-cap',
};

export function resolveLegalPolicy(slugOrAlias: string | null | undefined): LegalPolicyMeta | undefined {
  const raw = String(slugOrAlias || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!raw) return undefined;
  const slug = ALIASES[raw] || raw;
  return LEGAL_POLICIES.find((p) => p.slug === slug);
}
