# Release notes — BrewLite v1.0.0

> **Trạng thái:** bản nháp để nhóm review (Task 5.4.2, issue #40). Chỉ ghi lại nội dung có trong `main` và minh chứng đã lưu ở `docs/evidence/`. Mục đánh dấu **[CẦN XÁC NHẬN]** phải được người phụ trách điền hoặc kiểm tra trước khi tạo tag.

| Mục | Giá trị |
| --- | --- |
| Phiên bản | `v1.0.0` (đề xuất; nhóm xác nhận số phiên bản) |
| Commit phát hành | **[CẦN XÁC NHẬN]** SHA 40 ký tự của `main` tại thời điểm tag |
| Ngày phát hành | **[CẦN XÁC NHẬN]** |
| Production | https://brewlite-a2.duckdns.org (EC2 + Caddy + DuckDNS; xem [minh chứng 5.3.1/5.4.1](../evidence/task-5.3.1-5.4.1-deploy.md)) |
| Image GHCR | `brewlite-api`, `brewlite-api-migrate`, `brewlite-web`, tag = SHA commit (CD tag theo `${{ github.sha }}`) |

## Tính năng chính

Mọi mục dưới đây đã được merge vào `main` qua PR; việc "đã merge" **không** thay cho nghiệm thu, xem phần Kiểm thử và Hạn chế.

**Khách hàng (Web/PWA)**
- Menu có tìm kiếm/lọc, trạng thái tải/trống/lỗi (PR #47); Products API `GET /products`, `GET /products/:id` (PR #44).
- Chi tiết món: size/topping/đường/đá/ghi chú/số lượng; backend tính lại giá (PR #50, #52).
- Giỏ hàng, checkout, lịch sử đơn (PR #56); PWA và phục hồi kết nối (PR #59).
- Đăng ký/đăng nhập JWT, hồ sơ, đổi mật khẩu (PR #49).
- Thanh toán ZaloPay Sandbox, callback/query và chống xử lý trùng (PR #51).
- Mã khuyến mãi `BREW10` (PR #53), tích điểm và hạng thành viên (PR #55).

**Admin**
- Trang tổng quan, Nguyên liệu, Công thức & món, Đơn hàng, Đối soát (PR #53, #57, #58, #64).
- Tài khoản Admin **không** được seed; cấp quyền bằng SQL trên DB (xem [README](../../README.md#chạy-thử-trang-admin) và [kịch bản demo](../handover/demo-script.md)).

**Vận hành**
- Docker Compose local (Web/API/PostgreSQL), `GET /health` (API) và `GET /api/health` (Web) (PR #63).
- CI cho PR: install → lint → test → build, `PR quality gate` (PR #45).
- Backup/restore/migration/rollback an toàn cho PostgreSQL (PR #65); production EC2 + Caddy + CD GitHub Actions (PR #68); sửa so khớp checksum migration LF/CRLF (PR #69).

## Kiểm thử (số liệu lấy từ minh chứng đã lưu, **không phải lượt chạy mới**)

| Hạng mục | Kết quả đã ghi | Nguồn |
| --- | --- | --- |
| Web lint / unit / component | PASS; 219/219 test (15/11/2026) | [5.3.1-5.4.1](../evidence/task-5.3.1-5.4.1-deploy.md) |
| API lint / unit | 0 lỗi; 240 test PASS, 44 integration **skip** (không bật DB) | [5.3.1-5.4.1](../evidence/task-5.3.1-5.4.1-deploy.md) |
| E2E trình duyệt (Playwright, API fixture) | 1/1 PASS (14/11/2026) | [5.2.2](../evidence/task-5.2.2-browser-e2e.md) |
| Compose + `check-compose.mjs` local | 7/7 PASS (14/11/2026) | [5.2.4](../evidence/task-5.2.4-docker-compose.md) |
| Smoke production qua HTTPS | 7/7 PASS, cổng 5432 đóng (15/11/2026) | [5.3.1-5.4.1](../evidence/task-5.3.1-5.4.1-deploy.md) |
| CI pass và CI bắt lỗi | PR #45 pass, PR #46 fail có chủ đích | [4.4](../evidence/task-4.4-ci.md) |

Test integration cần DB là **opt-in** (`BREWLITE_DB_TESTS=1`); suite bị skip không được tính là đạt. **[CẦN XÁC NHẬN]** chạy lại bộ lệnh trong README trên `main` tại SHA phát hành và ghi kết quả vào đây trước khi tag.

## Hạn chế đã biết

1. **Truy vết (TV.1):** `docs/traceability-matrix.md` trên `main` vẫn ghi "Chưa triển khai / Chưa có test" cho phần lớn FR/NFR. Đây là phụ thuộc của 5.4.2 và thuộc phần Hưng; cần cập nhật trước khi nghiệm thu.
2. **ZaloPay:** chỉ Sandbox. Đề ghi "Ví/Thẻ mô phỏng" — cần xác nhận với giảng viên rằng cách demo bằng Sandbox là đủ. Kiểm tra callback production hiện mới chứng minh endpoint nhận được request (trả `mac not equal` với dữ liệu thử), chưa phải một giao dịch Sandbox đầy đủ qua URL production **[CẦN XÁC NHẬN]**.
3. **CD end-to-end:** minh chứng 5.3.1 ghi lượt chạy GitHub Actions `CD` (push GHCR → deploy từ runner) chưa thể kích hoạt trước khi merge PR #66. **[CẦN XÁC NHẬN]** link run thành công sau khi PR #68 vào `main`.
4. **Rollback:** rollback image không hoàn tác migration; phục hồi DB là quy trình thủ công cần phê duyệt ([hướng dẫn](../database-backup-rollback.md)).
5. **Hạ tầng miễn phí:** URL phụ thuộc EC2 và DuckDNS; cần gắn Elastic IP hoặc cập nhật DuckDNS nếu instance dừng/khởi động lại, và kiểm tra chi phí/URL vào ngày chấm.
6. **Môi trường test:** 2 test của bộ `test:db-operations` fail trên Windows NTFS (không giữ quyền `0o600`), chạy đúng trên `ubuntu-latest`.
7. **Seed production:** chạy thủ công một lần có chủ đích; CD thường kỳ không seed.
8. **Người ngoài nhóm:** chưa có kết quả thực hiện theo README, xem [phiếu xác nhận](../handover/outsider-verification.md).

## Nâng cấp / rollback

- Triển khai: `deploy/scripts/deploy.sh` (backup → migrate → khởi động `api`/`web`/`caddy` → smoke HTTPS).
- Rollback ứng dụng: `deploy/scripts/rollback.sh` / `scripts/db/rollback-app.mjs --schema-compatible` với image SHA phát hành trước.
- Chi tiết và cảnh báo: [database-backup-rollback.md](../database-backup-rollback.md), [deployment.md](../deployment.md).
