# Setup Apple Pay và Google Pay (AI Markets web)

Web nạp ví bằng **Apple Pay, Google Pay, PayPal** (cả ba đi PayPal Orders v2). App iOS/Android nạp bằng **IAP**. Không dùng SePay.

Google Pay merchant ID PHGROUP dùng chung. PHHotel PMS tạo trước; AI Markets thêm integration **Website** sau.

## 0. Điều kiện API

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_SANDBOX=false
FRONTEND_URL=https://aimarkets.vn
PAYPAL_APPLE_PAY=true
PAYPAL_GOOGLE_PAY=true
PAYPAL_APPLE_PAY_DOMAINS=aimarkets.vn,www.aimarkets.vn
```

`GET https://api.aimarkets.vn/v1/paypal/config` → `enabled: true`, `applePay: true`, `googlePay: true`.

## 1. PayPal

[PayPal Developer](https://developer.paypal.com/dashboard) → Live → REST app PHGroup → Features → bật **Apple Pay** và **Google Pay**.

## 2. Apple Pay domain

File PayPal (không tạo Merchant ID trên developer.apple.com):

`https://aimarkets.vn/.well-known/apple-developer-merchantid-domain-association`

HTTPS 200, không redirect. Register domain trong PayPal Manage hoặc `node src/scripts/register-apple-pay-domain.js aimarkets.vn www.aimarkets.vn`.

## 3. Google Pay Console

Cùng merchant **PHGROUP TECHNOLOGY · BCR2DN5TXG63RMVJ** — không tạo merchant mới.

1. **Add an integration → Website** `https://aimarkets.vn`.
2. Không thêm Android `app.phgroup.ai_market_vn` (IAP).
3. Ảnh buyflow: `docs/gpay-review/`. Ô **Google Pay API payment** phải là `UPLOAD-google-pay-api-payment.png` (widget chọn thẻ, nền đen). **Không** nộp `04-confirm.png` vào ô đó.

## 4. Web

`/wallet?method=apple|gpay|paypal` — SDK `components=buttons,applepay,googlepay` (không dùng `enable-funding=applepay,googlepay`: PayPal trả 400 với merchant VN).

## 5. App

IAP `expo-iap` → `POST /v1/iap/verify`. `salesChannel` `APP_STORE` / `GOOGLE_PLAY`.
