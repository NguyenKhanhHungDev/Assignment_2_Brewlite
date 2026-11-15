# Release notes — BrewLite v1.0.0 (dự kiến)

Đây là nội dung chuẩn bị phát hành, **chưa phải một GitHub Release đã công bố**. Cập nhật ngày 15/11/2026; không tự chốt ngày phát hành hoặc SHA khi chưa tạo tag.

| Mục | Trạng thái |
|---|---|
| Phiên bản dự kiến | `v1.0.0`; nhóm xác nhận trước khi tag. |
| Commit nền đã rà soát | `ab5f05f8aa1e13791c9cb788909b58332712adac` và thay đổi local trong lần đồng bộ này. |
| Commit/ngày phát hành chính thức | Chưa chốt; lấy từ commit và thời điểm tạo tag sau khi PR được duyệt/merge. |
| Tag / GitHub Release | Chưa có tại thời điểm kiểm tra 15/11/2026. |
| URL triển khai đã ghi nhận | `https://brewlite-a2.duckdns.org`; xem [minh chứng](../evidence/task-5.3.1-5.4.1-deploy.md). |
| Image | GHCR: `brewlite-api`, `brewlite-api-migrate`, `brewlite-web`; tag bằng SHA commit. |

## 1. Chức năng có trong repo

- Khách hàng: xem/tìm/lọc menu; chọn size, topping, khẩu vị, ghi chú; giỏ, checkout, lịch sử đơn; đăng ký/đăng nhập, hồ sơ và đổi mật khẩu.
- Đặt/thanh toán: backend tính giá, mã BREW10, giữ kho, chống tạo trùng, ZaloPay Sandbox, callback/query và đối soát; tích điểm/hạng thành viên.
- Admin: tổng quan, nguyên liệu, công thức/món, đơn hàng và giao dịch. Seed không tạo Admin; hướng dẫn tài khoản demo local trong [README](../../README.md).
- Vận hành: Docker Compose, health Web/API, CI/CD, backup/migration và rollback có kiểm tra tương thích schema.

Danh sách này mô tả code đã có, không khẳng định mọi tiêu chí đã nghiệm thu. Xem [ma trận FR/NFR](../traceability-matrix.md) để biết test liên quan và phần còn chờ.

## 2. Những điểm được sửa trong lần đồng bộ 15/11

- Cập nhật truy vết 31 FR/10 NFR, README, kiến trúc, deployment và ảnh sơ đồ theo code/cấu hình hiện tại.
- CD gọi lại workflow CI, bao gồm Browser E2E, trước khi build/push/deploy. Thay đổi workflow mới đang ở local; chưa có run GitHub của thay đổi này.
- HTTP suite tắt tác vụ nền hết hạn/đối soát để không thử truy vấn DB thật khi dùng repository giả; bổ sung hai ca kiểm tra tránh tái diễn.
- Thêm script đo hiệu năng menu NFR-01 và kết quả trên stack local hiện có; không gọi production.
- Thay placeholder sai/chưa có nguồn trong minh chứng API bằng trạng thái rõ ràng; phân biệt dữ kiện đã kiểm chứng và phần nhóm cần hoàn tất.

## 3. Kiểm chứng

- [CI commit nền](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43704717716): thành công.
- [CD commit nền](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43704717710): thành công. Điều này thay cho ghi chú cũ “chưa có CD end-to-end thành công”.
- Kết quả local của thay đổi mới, lệnh chạy và giới hạn: [báo cáo kiểm chứng](../evidence/repository-consistency.md).
- Kết quả DB thật đã lưu trước đây: [Task 5.2.3](../evidence/task-5.2.3-database.md). Test DB bị skip trong lượt unit không được tính là đạt.
- E2E tự động mặc định kiểm tra Web/BFF bằng API fixture. [Minh chứng 5.2.2](../evidence/task-5.2.2-browser-e2e.md) có mô tả demo Sandbox local bằng tay; video được ghi là lưu ngoài repo, chưa có link để đối chiếu trong hồ sơ bàn giao.

## 4. Việc còn cần trước nghiệm thu/phát hành

| Việc | Cần bổ sung |
|---|---|
| Kiểm tra trên đúng bản phát hành | CI/CD cho commit sau merge; xác nhận URL/health ở thời điểm nghiệm thu. |
| NFR-01 | Đã đo local và lưu image ID; image chưa gắn SHA nên cần đo lại image của commit phát hành và ghi nguồn seed nếu dùng làm nghiệm thu cuối. |
| PWA | Cài và mở standalone qua HTTPS trên trình duyệt/thiết bị hỗ trợ; lưu thiết bị, thời điểm, ảnh và kết quả. |
| Sandbox | Minh chứng giao dịch đầy đủ qua URL production; xác nhận với giảng viên việc Sandbox đáp ứng yêu cầu Ví/Thẻ mô phỏng. Callback trả `mac not equal` chỉ chứng minh nhận request sai MAC. |
| Demo và Sprint | Theo mục 7.4 của đề: video **hoặc demo trực tiếp** luồng end-to-end; không bắt buộc có video nếu demo trực tiếp. Review/Retrospective vẫn cần nội dung thực tế từ nhóm. |
| Người ngoài nhóm | Chứng minh người ngoài nhóm clone, chạy theo README và truy cập production được. [Phiếu kiểm tra](../handover/outsider-verification.md) là cách nhóm lưu minh chứng, không phải tên file bắt buộc của đề. |
| Tag/release | Chọn SHA đã kiểm chứng, tạo tag và GitHub Release theo [quy trình](release-procedure.md). |

**Đã sửa local:** Admin hủy được đơn `PAYMENT_FAILED` sau khi gateway xác nhận thất bại dù cờ khởi tạo cũ còn `UNKNOWN/CREATING`. Suite Admin đạt 11/11 trên PostgreSQL test riêng; bộ API đạt 251 test, 37 test DB khác bỏ qua. Vẫn chặn giao dịch pending, thành công hoặc cần đối soát. Xem [minh chứng sửa lỗi](../evidence/repository-consistency.md#5-sửa-lỗi-hủy-đơn-sau-timeout-thanh-toán); thay đổi chưa có CI/CD trên GitHub.

Một số AC giao diện và trường hợp biên còn thiếu minh chứng riêng, đã ghi theo từng FR trong ma trận. Không tự đóng #15, #40, #41 chỉ vì tài liệu đã được sửa local.

## 5. Lưu ý vận hành

- Chỉ thanh toán thử bằng Sandbox. Không có thanh toán tiền thật hoặc hoàn tiền tự động.
- Rollback image không hoàn tác migration; phục hồi DB dùng [runbook](../database-backup-rollback.md).
- Production không seed thường kỳ; không xóa volume/backup để cập nhật.
- URL phụ thuộc EC2/DuckDNS; người vận hành kiểm tra IP, thời hạn tài nguyên và chi phí trước ngày chấm.
- Test quyền file `0o600` của bộ DB operations từng khác giữa Windows NTFS và Linux; môi trường CI là Ubuntu. Không dùng kết quả fixture để khẳng định đã phục hồi production.
