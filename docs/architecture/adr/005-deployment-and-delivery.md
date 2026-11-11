# ADR 005 — Triển khai AWS EC2 và phát hành tự động

**Trạng thái:** Đã chọn hướng triển khai; chưa triển khai và kiểm chứng production. **Cập nhật:** 11/11/2026.

## Bối cảnh

Repo cũ có Docker Compose cho database, job migration, API và Web. Assignment 2 yêu cầu HTTPS, CI/CD, registry, health check và production có thể truy cập. Nhóm muốn tận dụng cấu hình hiện có và ưu tiên chi phí miễn phí trong thời gian làm bài.

## Quyết định

Dự kiến dùng một máy **AWS EC2 Ubuntu** chạy Docker Compose gồm Caddy, Next.js Web, NestJS API và PostgreSQL. **Duck DNS** trỏ subdomain tới IP public; **Caddy** cấp HTTPS và định tuyến Web/API. PostgreSQL dùng volume, không mở cổng trực tiếp ra Internet.

**GitHub Actions** chạy lint, test, build, tạo image gắn commit SHA hoặc phiên bản, đẩy lên **GHCR** và triển khai. Pipeline chạy migration có kiểm soát, health check và smoke test; dừng khi thất bại và cung cấp cách rollback. Các thành phần CI/CD này cần được hiện thực trong repo mới.

## Lý do và hệ quả

Phương án kế thừa Docker Compose và phù hợp hướng server Ubuntu của nhóm. Nhóm phải tự quản lý máy chủ, DNS, secret, log, backup và khôi phục. AWS Free Plan/credit có điều kiện và thời hạn; cần kiểm tra tài khoản, chi phí EC2, ổ đĩa và IP để bảo đảm phù hợp ngân sách trước khi tạo tài nguyên.

Web cần `API_INTERNAL_URL` đúng ở build cho rewrites và runtime cho BFF. Migration production phải được kiểm tra tương thích và sao lưu dữ liệu; không mặc định chạy seed demo. Rollback image không tự hoàn tác migration database. Nếu dùng EC2 ARM, image phải được build tương thích kiến trúc máy.

Sơ đồ production phản ánh thiết kế dự kiến. Trước nghiệm thu, cập nhật theo tài nguyên và kết nối thực sự đã triển khai.
