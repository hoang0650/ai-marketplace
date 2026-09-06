# CHÍNH SÁCH AGENT / CONTAINER SECURITY

## 1. Mục tiêu

Bảo vệ buyer, seller, platform và infrastructure provider khỏi agent/container độc hại.

## 2. Seller declaration

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

## 3. Cấm

Không được cung cấp image/agent có:
- credential stealer;
- malware;
- ransomware;
- hidden miner;
- backdoor;
- reverse shell trái phép;
- persistence trái phép.

## 4. Sandbox

Agent/container phải được triển khai với quyền tối thiểu.

Không dùng:
- privileged;
- host filesystem;
- host Docker socket;
- unrestricted host network;

trừ khi admin phê duyệt cho use case hợp lệ.

## 5. Secrets

Secret phải được inject bằng secret manager/runtime secret.

Không ghi secret vào:
- Docker image;
- Git;
- MongoDB plaintext;
- frontend;
- log.

## 6. Incident

Khi phát hiện agent độc hại:
1. stop deployment;
2. revoke endpoint;
3. preserve evidence;
4. suspend listing;
5. notify affected parties khi cần;
6. xử lý seller theo policy.
