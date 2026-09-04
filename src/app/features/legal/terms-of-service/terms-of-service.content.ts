export type LegalBlock = {
  h3?: string;
  h4?: string;
  p?: string[];
  ul?: string[];
  strongP?: string;
};

export type LegalSection = {
  title: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  title: string;
  lastUpdatedLabel: string;
  subtitle?: string;
  sections: LegalSection[];
};

/** Điều khoản AI Markets — cùng khung SaaS PHGROUP, bổ sung phần sàn AI / agent. */
export const TERMS_DOCS: LegalDoc = {
  title: 'Thoả thuận sử dụng Dịch vụ AI Markets & hệ sinh thái PHHotel',
  lastUpdatedLabel: 'Cập nhật lần cuối',
  subtitle:
    'Giữa Khách hàng và Công ty TNHH Giải Pháp Công Nghệ PHGROUP (“PHHotel” / “AI Markets”). Áp dụng cho nền tảng AI Markets (https://aimarkets.vn), các agent/model trên sàn, và liên kết với PHHotel PMS (web, app).',
  sections: [
    {
      title: '',
      blocks: [
        {
          p: [
            'Đây là thỏa thuận pháp lý giữa Khách hàng với Công ty TNHH Giải Pháp Công Nghệ PHGROUP khi sử dụng AI Markets và các dịch vụ phần mềm liên quan trong hệ sinh thái PHHotel.',
            'Bằng việc đăng ký, đăng bán/mua agent, thanh toán hoặc tiếp tục sử dụng, Khách hàng đồng ý với Thỏa thuận này dưới hình thức giao dịch điện tử.',
            'Website: https://aimarkets.vn — PHHotel PMS: https://phhotel.vn — Hỗ trợ: hotro@phhotel.vn',
          ],
        },
      ],
    },
    {
      title: 'Điều 1: Định nghĩa',
      blocks: [
        {
          p: [
            '1.1 AI Markets: Nền tảng giới thiệu, phân phối, kết nối và/hoặc vận hành các giải pháp AI (agent, model, công cụ) phục vụ ngành khách sạn và doanh nghiệp, tại https://aimarkets.vn.',
            '1.2 PHHotel PMS: Phần mềm quản lý khách sạn (web, ứng dụng di động, App Clip) có thể tích hợp với AI Markets.',
            '1.3 Dịch vụ: Quyền truy cập AI Markets và/hoặc module AI liên kết theo gói đã đăng ký.',
            '1.4 Khách hàng: Người mua/sử dụng; Nhà cung cấp agent: bên đăng bán hoặc cung cấp agent trên sàn (nếu được mở).',
            '1.5 Dữ liệu Khách hàng: Dữ liệu tài khoản, cấu hình, prompt, nhật ký sử dụng AI và dữ liệu nghiệp vụ được đưa vào công cụ AI.',
          ],
        },
      ],
    },
    {
      title: 'Điều 2: Dịch vụ và kích hoạt',
      blocks: [
        {
          p: [
            '2.1 PHHotel cung cấp truy cập AI Markets và tích hợp với PHHotel PMS theo mô tả sản phẩm từng thời kỳ.',
            '2.2 Khách hàng tự bảo mật tài khoản, khóa API (nếu có) và thiết bị đăng nhập.',
            '2.3 Nhà cung cấp agent chịu trách nhiệm về tính hợp pháp, chất lượng và quyền sở hữu trí tuệ của agent mình đăng tải.',
          ],
        },
      ],
    },
    {
      title: 'Điều 3–4: Phí và thanh toán',
      blocks: [
        {
          p: [
            'Phí thuê bao, phí dùng AI (token/lượt gọi), phí đăng bán hoặc phí giao dịch (nếu có) được công bố trên AI Markets / PHHotel hoặc hợp đồng riêng. Không bao gồm phí đối tác thứ ba (cổng thanh toán, nhà cung cấp model, kho ứng dụng…). Thanh toán theo hướng dẫn trên nền tảng.',
          ],
        },
      ],
    },
    {
      title: 'Điều 5–7: Tạm dừng, huỷ, dùng thử',
      blocks: [
        {
          p: [
            'PHHotel có quyền tạm dừng/huỷ khi quá hạn thanh toán, vi phạm pháp luật hoặc Thỏa thuận, theo yêu cầu cơ quan nhà nước, hoặc vì bảo trì/an ninh. Tài khoản dùng thử có thể bị giới hạn tính năng và xóa dữ liệu khi hết hạn.',
          ],
        },
      ],
    },
    {
      title: 'Điều 8–9: Quyền và nghĩa vụ',
      blocks: [
        {
          p: ['Khách hàng / Nhà cung cấp cam kết:'],
          ul: [
            'Không dùng AI cho lừa đảo, spam, phát tán mã độc, xâm phạm dữ liệu cá nhân trái phép, hoặc nội dung bị cấm;',
            'Không đưa bí mật nhà nước hoặc dữ liệu bị cấm chia sẻ vào prompt/agent;',
            'Kiểm tra kết quả AI trước khi dùng cho giá phòng, hợp đồng, tư vấn pháp lý/y tế/tài chính hoặc gửi khách lưu trú;',
            'Tôn trọng bản quyền model/agent và không đảo ngược hệ thống;',
            'Thanh toán đúng hạn và cung cấp thông tin đăng ký chính xác.',
          ],
        },
      ],
    },
    {
      title: 'Điều 10–12: Hỗ trợ, bảo trì, an ninh',
      blocks: [
        {
          p: [
            'Hỗ trợ: hotro@phhotel.vn và kênh trên aimarkets.vn / phhotel.vn. Hệ thống có thể bảo trì có thông báo. Sự cố an ninh phải được báo ngay để phối hợp xử lý.',
          ],
        },
      ],
    },
    {
      title: 'Điều 13–15: Giới hạn trách nhiệm, đối tác, sở hữu trí tuệ',
      blocks: [
        {
          p: [
            'Dịch vụ cung cấp “nguyên trạng”. Kết quả AI có thể sai; Khách hàng chịu trách nhiệm quyết định cuối. Trong phạm vi pháp luật cho phép, trách nhiệm bồi thường của PHHotel không vượt quá phí đã thanh toán trong 03 tháng liền kề trước sự kiện (trừ lỗi cố ý mà pháp luật không cho giới hạn). Model/hạ tầng bên thứ ba tuân theo điều khoản của họ. PHGROUP giữ quyền đối với nền tảng; agent của Nhà cung cấp thuộc quyền của họ theo thỏa thuận đăng bán.',
          ],
        },
      ],
    },
    {
      title: 'Điều 16–18: Bảo mật, thông báo, bất khả kháng',
      blocks: [
        {
          p: [
            'Hai bên bảo mật thông tin thương mại và dữ liệu. Thông báo qua email/ứng dụng/website. Sự kiện bất khả kháng miễn trách trong thời gian cản trở thực hiện nghĩa vụ.',
          ],
        },
      ],
    },
    {
      title: 'Điều 19: Bảo vệ dữ liệu cá nhân',
      blocks: [
        {
          p: [
            'Việc xử lý dữ liệu cá nhân tuân Nghị định 13/2023/NĐ-CP và Chính sách bảo mật tại https://phhotel.vn/privacy-policy (và trang bảo mật AI Markets nếu có). Khách hàng chỉ đưa dữ liệu cá nhân vào AI khi đã có cơ sở pháp lý phù hợp.',
          ],
        },
      ],
    },
    {
      title: 'Điều 20–24: Hiệu lực, chung, vi phạm, lưu trữ',
      blocks: [
        {
          p: [
            'Thỏa thuận có hiệu lực khi chấp thuận/sử dụng Dịch vụ. Luật Việt Nam điều chỉnh; tranh chấp tại Tòa án có thẩm quyền tại Việt Nam sau thương lượng. PHHotel có thể cập nhật điều khoản trên https://aimarkets.vn/terms-of-service và https://phhotel.vn/terms-of-service. Vi phạm có thể dẫn tới khóa tài khoản. Dữ liệu sau huỷ được xử lý theo quy trình lưu trữ/xóa và pháp luật.',
          ],
        },
      ],
    },
    {
      title: 'Điều 25: Liên kết PHHotel PMS',
      blocks: [
        {
          p: [
            'Khi AI Markets được gọi từ PHHotel PMS (web/app), Khách hàng đồng thời tuân thủ Thoả thuận sử dụng phần mềm PHHotel PMS. Nếu xung đột về cùng một chủ đề, điều khoản sản phẩm cụ thể (PMS hoặc AI Markets) được ưu tiên cho phạm vi sản phẩm đó.',
          ],
        },
      ],
    },
  ],
};
