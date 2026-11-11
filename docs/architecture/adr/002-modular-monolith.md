# ADR 002 — Một backend chia thành các module

**Trạng thái:** kế thừa code cũ. **Ngày:** 08/11/2026.

## Bối cảnh

Đơn hàng, kho, thanh toán và điểm cần phối hợp chặt chẽ. Nhóm cần cách tổ chức dễ phát triển và vận hành.

## Quyết định và lý do

Chạy một ứng dụng NestJS, bên trong chia module như Auth, Products, Orders và Payments. Các module dùng chung PostgreSQL để dễ cập nhật dữ liệu nhất quán. Cách này gọi là modular monolith.

## Phương án khác và hệ quả

Tách mỗi module thành một dịch vụ riêng giúp mở rộng độc lập nhưng tăng việc triển khai và xử lý lỗi giữa các dịch vụ. Phương án đã chọn đơn giản hơn; đổi lại một thay đổi có thể cần phát hành lại cả API. Tác vụ đối soát hiện chạy trong API nên API cần hoạt động liên tục.
