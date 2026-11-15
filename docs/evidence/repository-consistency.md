# Kết quả rà soát và kiểm tra — 15/11/2026

Đối chiếu từ commit nền `ab5f05f8aa1e13791c9cb788909b58332712adac` và các thay đổi local trên nhánh `fix/5.4.2-repository-consistency`. Kết quả dưới đây đã chạy trước khi dọn tài liệu; việc dọn sau đó không thay đổi code ứng dụng. Chưa commit, push, tạo tag/release hoặc thay đổi production.

## 1. Nội dung đã sửa

- Đồng bộ README, kiến trúc, deployment và nguồn/ảnh sơ đồ theo cấu hình hiện có.
- Liên kết 31 FR và 10 NFR tới thiết kế, code và test trong [ma trận truy vết](../traceability-matrix.md); ghi rõ AC chưa đủ minh chứng.
- Cho CD gọi lại CI để Browser E2E phải đạt trước build/push/deploy; CI chạy thêm test script hiệu năng.
- Tắt tác vụ nền hết hạn đơn trong hai HTTP suite dùng repository giả; giữ controller/guard thật và thêm hai ca bảo vệ.
- Bổ sung script đo hiệu năng menu, hướng dẫn Postman và chỉnh thông tin bàn giao chưa chính xác. Chi tiết Postman dùng chung tại [minh chứng API](task-5.2.1-api-tests.md).

## 2. Kết quả local

Môi trường: Linux, Node.js `v24.21.0`, dependency của repo. Không chạy integration trên DB đang làm việc hoặc production.

| Lệnh | Kết quả |
|---|---|
| `npm --prefix apps/api run lint` | Đạt. |
| `npm --prefix apps/api test` | 240 đạt; 44 integration test bỏ qua vì chưa bật DB. |
| `npm --prefix apps/api run test:e2e` | 17 đạt, gồm 2 ca mới kiểm tra không khởi chạy tác vụ nền. |
| `npm --prefix apps/api run build` | Đạt. |
| `npm --prefix apps/web run lint` | Đạt. |
| `npm --prefix apps/web test` | 219 đạt. |
| `npm --prefix apps/web run build` | Đạt. |
| `npm --prefix apps/web run test:e2e` | 1/1 đạt trên Chromium, Web/BFF thật + API fixture; không kiểm DB/ZaloPay thật. |
| `npm run test:performance-script` | 5/5 đạt. |
| `npm run test:db-operations` | 8 kiểm tra checksum đạt; suite Docker/PostgreSQL opt-in không chạy. |
| `bash -n deploy/scripts/deploy.sh deploy/scripts/mark-release.sh deploy/scripts/rollback.sh` | Cú pháp đạt; không chạy deploy. |
| `docker compose config --quiet` | Đạt; không khởi động lại service. |

Workflow CI/CD đã qua actionlint 1.7.7 (không chạy ShellCheck). Deployment PUML qua kiểm tra cú pháp PlantUML 1.2025.0, đã kết xuất và xem lại PNG. `git diff --check` đạt. Các ca mô phỏng DB lỗi cố ý có log lỗi; không còn truy vấn expiration/reconciliation thật trong HTTP suite.

Hai ca HTTP mới đã thất bại trước sửa vì `expireBatch` bị gọi khi khởi tạo app; sau override provider nền, cả 17 ca đạt. Browser E2E còn cảnh báo màu terminal, ảnh LCP và `scroll-behavior` của Next.js; không có test thất bại.

## 3. Hiệu năng menu local

Lệnh: `node scripts/check-menu-performance.mjs --api-url=http://127.0.0.1:3001`. Chỉ gửi GET tới stack Compose của workspace, không sửa/reset/reseed DB.

| Mục | Giá trị |
|---|---|
| Thời điểm | 17:43:02 ngày 15/11/2026, UTC+07. |
| Máy | Intel i5-12450H, 12 CPU logic, RAM làm tròn 15 GiB; Linux 6.18.60-1-lts. |
| Dữ liệu | Menu hiện có 10 món, chọn món ID 1. |
| Cấu hình | Mỗi API: 10 warm-up + 100 lượt đo, tối đa 5 đồng thời, timeout 5 giây. |
| `GET /products` | 100 đạt, 0 lỗi; p95 **8,99 ms**. |
| `GET /products/1` | 100 đạt, 0 lỗi; p95 **6,22 ms**. |
| API image | `sha256:85845e3d16bc4335139743bc45c66152faf25d07d560283a92f064c1ac0933b8`. |
| Web image | `sha256:27e2ac114705d37c5317d8feebf918ac97232ca575ced715949ea0fc4a370a4d`. |

[Kết quả JSON](repository-consistency/menu-performance.json) lưu số liệu thật. p95 dùng nearest rank; lỗi/timeout, dữ liệu sai hoặc p95 trên 2.000 ms làm kết quả không đạt. Image local chưa có nhãn SHA nguồn và chưa xác minh lại lịch sử seed. Đây là kết quả stack local theo image ID, chưa phải phép đo của bản phát hành cuối hoặc hiệu năng production.

## 4. GitHub và phần còn chờ

- [CI commit nền](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43704717716): thành công.
- [CD commit nền](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43704717710): thành công.
- Các run trên không xác nhận workflow mới chưa push. #15, #40, #41 còn mở; chưa có tag/release tại thời điểm kiểm tra.
- Test DB thật trước đây được lưu ở [Task 5.2.3](task-5.2.3-database.md); test bị skip không được tính đạt.

Còn chờ: CI/CD của commit sau merge, đo lại image phát hành với nguồn seed rõ, thử cài PWA qua HTTPS, giao dịch Sandbox production đầy đủ và xác nhận cách đáp ứng Ví/Thẻ mô phỏng. Nhóm cần bổ sung biên bản Review/Retrospective, video/biên bản demo và phiếu người ngoài nhóm. Không tự điền hoặc nghiệm thu thay người thực hiện; xem [release notes](../release/release-notes-v1.0.0.md).

## 5. Sửa lỗi hủy đơn sau timeout thanh toán

**Đã sửa local ngày 15/11/2026.** Trước đây, giao dịch đã xác minh `FAILED/CANCELLED` vẫn bị cờ khởi tạo `UNKNOWN/CREATING` chặn hủy đơn. [OrderCancellationService](../../apps/api/src/orders/order-cancellation.service.ts) giờ xét trạng thái tài chính: vẫn chặn thành công/cần đối soát và giao dịch pending chưa bị từ chối tạo; cho hủy sau thất bại đã xác minh. Không đổi schema, API hoặc cách giữ/trả kho.

[Regression test](../../apps/api/src/orders/admin-operations.integration.spec.ts) chạy luồng xử lý kết quả thanh toán thật rồi hủy đơn, kiểm tra lý do/người/thời điểm hủy, không trả kho hai lần và từ chối hủy lại. Bốn trường hợp `UNKNOWN/CREATING × FAILED/CANCELLED` đều thất bại trước sửa (409), sau sửa đều đạt. Test chặn `SUCCESS/RECONCILIATION_REQUIRED` được mở rộng cho cả cờ `UNKNOWN/CREATING`.

**Môi trường:** container PostgreSQL 17 mới `brewlite-cancellation-fix-20261115-test`, chỉ bind `127.0.0.1:32768`; DB riêng `brewlite_huy_test_operations_test`. Đã xác minh DB rỗng trước khi áp dụng đủ 16 migration. Không dùng DB làm việc, gọi gateway hoặc production. Container được dừng sau kiểm tra, dữ liệu test được giữ.

Các lệnh dưới chạy với `DATABASE_URL=postgresql://brewlite@127.0.0.1:32768/brewlite_huy_test_operations_test` và `OPERATIONS_TEST_DATABASE_URL` cùng giá trị; cổng này là cổng của lượt chạy đã ghi, không mặc định cho máy khác.

| Lệnh | Kết quả mới |
|---|---|
| `npm --prefix apps/api run db:migrate` | 16 migration đạt trên DB mới. |
| `npm --prefix apps/api test -- src/orders/admin-operations.integration.spec.ts --maxWorkers=1` | Trước sửa: 4 lỗi/7 đạt; sau sửa: 11/11 đạt. |
| `npm --prefix apps/api test -- --maxWorkers=2` | 251 đạt, gồm 11 integration Admin trên PostgreSQL thật; 37 test DB khác bỏ qua. |
| `npm --prefix apps/api run test:e2e` | 17/17 đạt. |
| `npm --prefix apps/api run lint` | Đạt. |
| `npm --prefix apps/api run build` | Đạt. |

Lượt full API đầu trên DB đã dùng có 1 lỗi ở test bộ lọc: tìm bằng một phần ID khớp đơn cũ ngoài fixture. Đã sửa test dùng marker riêng của ba đơn cần kiểm tra, giữ assertion tổng bằng 0 cho bộ lọc NONE; không đổi chức năng tìm kiếm. Lượt full API sau đạt như bảng. Review độc lập không phát hiện lỗi quan trọng trong điều kiện hủy và các regression case. Chưa commit/push hoặc chạy CI/CD của thay đổi này.
