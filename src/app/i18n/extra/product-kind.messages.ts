/** Product kind (digital vs physical goods) strings, merged by the seller product form. */
export const PRODUCT_KIND_MESSAGES = {
  vi: {
    'productKind.label': 'Loại sản phẩm',
    'productKind.DIGITAL': 'Sản phẩm số',
    'productKind.PHYSICAL': 'Hàng hóa vật lý',
    'productKind.required': 'Chọn loại sản phẩm: Sản phẩm số hoặc Hàng hóa vật lý.',
    'productKind.rateLine': 'Sàn khấu trừ {{total}}% ({{vat}}% GTGT + {{pit}}% TNCN) trên doanh thu đơn hàng — NĐ 252/2026, TT 18/2026.',
    'productKind.selfDeclare': 'Hộ kinh doanh / doanh nghiệp tự kê khai thuế — sàn không khấu trừ.',
    'productKind.undeclared': 'Chưa khai loại người bán: hoàn tất hồ sơ thuế để xem thuế suất áp dụng.',
    'productKind.defaulted': 'Mặc định',
  },
  en: {
    'productKind.label': 'Product type',
    'productKind.DIGITAL': 'Digital product',
    'productKind.PHYSICAL': 'Physical goods',
    'productKind.required': 'Choose a product type: Digital product or Physical goods.',
    'productKind.rateLine': 'The platform withholds {{total}}% ({{vat}}% VAT + {{pit}}% PIT) of order revenue — Decree 252/2026, Circular 18/2026.',
    'productKind.selfDeclare': 'Household businesses / companies self-declare tax — nothing is withheld.',
    'productKind.undeclared': 'Seller type not declared: complete your tax profile to see the applicable rate.',
    'productKind.defaulted': 'Defaulted',
  },
  zh: {
    'productKind.label': '商品类型',
    'productKind.DIGITAL': '数字产品',
    'productKind.PHYSICAL': '实物商品',
    'productKind.required': '请选择商品类型：数字产品或实物商品。',
    'productKind.rateLine': '平台代扣订单收入的 {{total}}%（增值税 {{vat}}% + 个人所得税 {{pit}}%）— 第252/2026号议定、第18/2026号通知。',
    'productKind.selfDeclare': '个体户/企业自行申报纳税 — 平台不代扣。',
    'productKind.undeclared': '尚未声明卖家类型：请完善税务资料以查看适用税率。',
    'productKind.defaulted': '默认',
  },
};
