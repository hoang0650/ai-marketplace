# CHÍNH SÁCH AGENT / CONTAINER SECURITY

**Nền tảng:** AI Markets  
**Website:** https://aimarkets.vn  
**Đơn vị vận hành:** Công ty TNHH giải pháp công nghệ PHGroup  
**MST:** 3703279135  
**Địa chỉ:** Lô A1-15 Đường Bình Hoà 24, khu dân cư Đồng An 4, Phường Bình Hòa, Thành phố Thuận An, Tỉnh Bình Dương, Việt Nam  
**Email:** support@aimarkets.vn  
**Ngày hiệu lực:** 06/09/2026  

---
## Điều 1. Mục tiêu

Bảo vệ buyer, seller, platform và infrastructure provider khỏi agent/container độc hại.

## Điều 2. Seller declaration

Seller phải khai báo:
- source repository;
- image;
- version;
- dependencies;
- required permissions;
- ports;
- volumes;
- network;
- environment variables;
- credential requirements.

## Điều 3. Cấm

Không được cung cấp image/agent có:
- credential stealer;
- malware;
- ransomware;
- hidden miner;
- backdoor;
- reverse shell trái phép;
- persistence trái phép.

## Điều 4. Sandbox

Agent/container phải được triển khai với quyền tối thiểu.

Không dùng:
- privileged;
- host filesystem;
- host Docker socket;
- unrestricted host network;

trừ khi admin phê duyệt cho use case hợp lệ.

## Điều 5. Secrets

Secret phải được inject bằng secret manager/runtime secret.

Không ghi secret vào:
- Docker image;
- Git;
- MongoDB plaintext;
- frontend;
- log.

## Điều 6. Incident

Khi phát hiện agent độc hại:
1. stop deployment;
2. revoke endpoint;
3. preserve evidence;
4. suspend listing;
5. notify affected parties khi cần;
6. xử lý seller theo policy.
