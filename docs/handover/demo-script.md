# Kịch bản demo BrewLite (khoảng 8–10 phút)

Dùng cho video demo hoặc demo trực tiếp. Chạy trên **production** `https://brewlite-a2.duckdns.org` hoặc trên Compose local (`http://localhost:3000`). Không dùng DB có dữ liệu thật để thử thao tác phá hủy.

## Chuẩn bị (trước khi quay)

1. Mở `https://brewlite-a2.duckdns.org/health` — kỳ vọng `{"status":"ok","service":"api","database":"up"}`.
2. Chuẩn bị 2 tài khoản: một khách hàng mới đăng ký và một Admin. Seed **không** tạo Admin; cấp quyền bằng SQL trên DB.

   Local (Compose): `docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`

   Production (trên EC2):

   ```bash
   docker compose --project-name brewlite --env-file /opt/brewlite/.env.prod \
     -f /opt/brewlite/compose.prod.yaml exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
   ```

   ```sql
   UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = '<email-da-dang-ky>';  -- phải ra UPDATE 1
   ```

3. Có sẵn tài khoản/ứng dụng ZaloPay Sandbox để duyệt giao dịch thử.

## Trình tự

| # | Bước | Thao tác | Kết quả cần thấy | Yêu cầu liên quan |
| --- | --- | --- | --- | --- |
| 1 | Giới thiệu hạ tầng | Mở URL HTTPS, chỉ ổ khóa/chứng chỉ, mở `/health` | HTTPS hợp lệ, `database=up` | NFR-05, NFR-08 |
| 2 | Menu | Tìm/lọc món, thử tìm không dấu | Danh sách món, ảnh, trạng thái còn hàng | FR-01, FR-02 |
| 3 | Chi tiết món | Chọn size/topping/đường/đá, ghi chú | Giá cập nhật theo lựa chọn | FR-03, FR-04 |
| 4 | Giỏ hàng | Thêm vài ly, đổi số lượng | Tổng tiền đúng; giỏ giữ khi tải lại | FR-10, FR-11 |
| 5 | Đăng ký/đăng nhập | Đăng ký tài khoản mới | Vào được phiên đăng nhập | FR-05–FR-09 |
| 6 | Checkout | Nhập tên người nhận, áp mã `BREW10` | Giảm giá đúng; tạo đơn "Chờ thanh toán" | FR-12–FR-15 |
| 7 | Thanh toán | Chọn ZaloPay Sandbox, duyệt giao dịch thử | Về `/payment/result`, đơn chuyển trạng thái đã thanh toán | FR-16, FR-17, FR-19, FR-20 |
| 8 | Lịch sử & điểm | Mở `/history`, `/account` | Thấy đơn; điểm/hạng cộng một lần | FR-21, FR-22 |
| 9 | Admin | Đăng nhập Admin, mở `/admin` | Tổng quan, Nguyên liệu, Công thức & món, Đơn hàng, Đối soát | FR-24–FR-31 |
| 10 | Phân quyền | Dùng tài khoản khách mở `/admin` | Trang **403 — Không có quyền truy cập** | NFR-03 |
| 11 | Vận hành (tùy chọn) | Chỉ `docker compose ps` trên EC2 | Chỉ `caddy` mở 80/443; `db` không có cổng ra ngoài | NFR-08 |
| 12 | PWA (tùy chọn) | Cài PWA trên điện thoại, thử mất mạng | Giỏ được giữ, báo lỗi mất kết nối | NFR-10 |

Cột "Yêu cầu liên quan" là gợi ý ánh xạ theo SRS; đối chiếu lại với [SRS](../requirements/srs.md) trước khi trình bày.

## Lưu ý khi quay

- Che hoặc không hiển thị `.env.prod`, khóa SSH, key ZaloPay thật, mật khẩu.
- Nếu một bước lỗi, quay lại và ghi nhận lỗi vào phần Hạn chế của [release notes](../release/release-notes-v1.0.0.md); không cắt bỏ im lặng.
- Link video: **[CẦN BỔ SUNG]** (dán vào issue #40 và release notes).
