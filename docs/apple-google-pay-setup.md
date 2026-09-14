# Nạp ví AI Markets

| Bề mặt | Cổng |
|---|---|
| Web `aimarkets.vn/wallet` | **PayPal only** (Orders v2) |
| App iOS / Android | **IAP only** (`expo-iap`, consumable `aimarkets.wallet.5` … `100`) |

## Lấy biến môi trường IAP

Cần **Account Holder / Admin** trên App Store Connect và **Account owner** trên Play Console. Dán vào Dokploy của `ai-marketplace-api`. Không commit file `.p8` / JSON ra git.

---

### Apple — `APPLE_IAP_ISSUER_ID` · `APPLE_IAP_KEY_ID` · `APPLE_IAP_PRIVATE_KEY`

Đây là **In-App Purchase key** (App Store Server API). **Không** dùng key tab *App Store Connect API* (EAS/CI) — hai tab khác nhau, không thay thế được.

1. Mở [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access**.
2. Cột trái **Keys** → **In-App Purchase** (không chọn App Store Connect API).
3. **Generate In-App Purchase Key** (hoặc **+**). Tên gợi ý: `AI Markets IAP`.
4. Trên **cùng trang**:
   - **Issuer ID** (UUID, phía trên bảng) → `APPLE_IAP_ISSUER_ID`
   - Cột **Key ID** (10 ký tự) của key vừa tạo → `APPLE_IAP_KEY_ID`
5. **Download Key** — file `SubscriptionKey_XXXXXXXXXX.p8`, **tải được một lần**. Mở bằng Notepad, copy **cả khối**:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEG...
-----END PRIVATE KEY-----
```

→ `APPLE_IAP_PRIVATE_KEY`

Dokploy thường một dòng: thay xuống dòng bằng `\n`.

```
APPLE_IAP_BUNDLE_ID=app.phgroup.ai-market-vn
```

Mất file `.p8` thì revoke và tạo key mới. App IAP: **Apps → AI Markets (`app.phgroup.ai-market-vn`) → Monetization → In-App Purchases** — 5 consumable SKU trùng `aimarkets.wallet.5` … `100`. Paid Apps + thuế/ngân hàng phải Active.

---

### Google — `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Cần **cả** Google Cloud (tạo JSON) **và** Play Console (mời email service account). Chỉ tạo JSON mà không mời trên Play → API `401 insufficient permissions`.

**A. Google Cloud**

1. [Google Cloud Console](https://console.cloud.google.com) — project gắn Play (hoặc tạo `aimarkets-iap`).
2. **APIs & Services → Library** → bật **Google Play Android Developer API**.
3. **IAM & Admin → Service accounts → Create**. Tên: `aimarkets-play-iap`. Role Cloud: **Editor** (hoặc tối thiểu để hiện trên Play).
4. Mở service account → **Keys → Add key → Create new key → JSON**. Tải file một lần.

Toàn bộ nội dung JSON (một dòng hoặc base64) → `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

Trong JSON có `"client_email": "...@....iam.gserviceaccount.com"` — dùng bước B.

**B. Play Console**

1. [Play Console](https://play.google.com/console) → **Setup → API access** (hoặc Users and permissions). Link đúng Cloud project ở trên.
2. **Users and permissions → Invite new users**.
3. Email = `client_email` của service account (không phải Gmail cá nhân).
4. App access: thêm **AI Markets** package `app.phgroup.ai_market_vn`.
5. Bật **View financial data** (app) hoặc **View financial data, orders, and cancellation survey responses** (account). Nên thêm **View app information**.
6. Invite / Save. Đợi **vài giờ đến 24–48h** rồi mới verify được.

```
GOOGLE_PLAY_PACKAGE_NAME=app.phgroup.ai_market_vn
```

App phải có **ít nhất một AAB** Internal testing + 5 IAP Active cùng SKU.

---

### Dokploy (gợi ý)

```
APPLE_IAP_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APPLE_IAP_KEY_ID=ABCDE12345
APPLE_IAP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
APPLE_IAP_BUNDLE_ID=app.phgroup.ai-market-vn
GOOGLE_PLAY_PACKAGE_NAME=app.phgroup.ai_market_vn
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}
```

`IAP_SKIP_VERIFY` bị bỏ qua khi `NODE_ENV=production`.
