# Bảng test case API - BrewLite Assignment 2

Trạng thái: **CHƯA CHẠY** (chưa có máy chủ API + DB test). Cập nhật cột Kết quả sau khi chạy Runner.

Quy ước kết quả: PASS / FAIL / SKIP (SKIP không tính là PASS).

| ID | Nhóm | Test case | Mã HTTP kỳ vọng | Kết quả | Ghi chú/minh chứng |
| --- | --- | --- | --- | --- | --- |
| S01 | 00 Setup | Đăng ký người dùng A | 201 | Chưa chạy | |
| S02 | 00 Setup | Đăng nhập A, lưu token | 200 | Chưa chạy | |
| S03 | 00 Setup | Đăng ký người dùng B | 201 | Chưa chạy | |
| S04 | 00 Setup | Đăng nhập B, lưu token | 200 | Chưa chạy | |
| S05 | 00 Setup | Đăng nhập Admin, lưu token | 200 | Chưa chạy | |
| A01 | 01 Auth | Đăng ký trùng email | 409/400 | Chưa chạy | |
| A02 | 01 Auth | Đăng ký email sai định dạng | 400 | Chưa chạy | |
| A03 | 01 Auth | Đăng ký mật khẩu < 8 ký tự | 400 | Chưa chạy | |
| R01 | 01 Auth | Giới hạn đăng ký: lần thứ 6 trong 60 giây bị chặn | 429 | Chưa chạy | |
| A04 | 01 Auth | Đăng nhập sai mật khẩu | 401 | Chưa chạy | |
| A05 | 01 Auth | Đăng nhập thiếu mật khẩu | 400 | Chưa chạy | |
| A06 | 01 Auth | GET /auth/me không token | 401 | Chưa chạy | |
| A07 | 01 Auth | GET /auth/me token hợp lệ | 200 | Chưa chạy | |
| A08 | 01 Auth | GET /auth/me token rác | 401 | Chưa chạy | |
| A09 | 01 Auth | PATCH /auth/me đổi tên | 200 | Chưa chạy | |
| A10 | 01 Auth | Đổi mật khẩu sai mật khẩu hiện tại | 400/401/403 | Chưa chạy | |
| A11 | 01 Auth | Đổi mật khẩu không token | 401 | Chưa chạy | |
| P01 | 02 Products và Recipes | Danh sách món | 200 | Chưa chạy | |
| P02 | 02 Products và Recipes | Chi tiết món hợp lệ | 200 | Chưa chạy | |
| P03 | 02 Products và Recipes | Chi tiết món id không phải số | 400 | Chưa chạy | |
| P04 | 02 Products và Recipes | Chi tiết món không tồn tại | 404/400 | Chưa chạy | |
| P05 | 02 Products và Recipes | Chi tiết món id = 0 | 400/404 | Chưa chạy | |
| O01 | 03 Orders (#25) | Tạo đơn không token | 401 | Chưa chạy | |
| O02 | 03 Orders (#25) | Tạo đơn hợp lệ (Idempotency-Key) | 201/200 | Chưa chạy | |
| O03 | 03 Orders (#25) | Gửi lặp cùng Idempotency-Key và cùng nội dung | 201/200 | Chưa chạy | |
| O04 | 03 Orders (#25) | Cùng Idempotency-Key nhưng khác nội dung | 409 | Chưa chạy | |
| O05 | 03 Orders (#25) | Idempotency-Key rỗng/quá dài (201 ký tự) | 400 | Chưa chạy | |
| O06 | 03 Orders (#25) | Thiếu recipientName | 400 | Chưa chạy | |
| O07 | 03 Orders (#25) | recipientName 1 ký tự | 400 | Chưa chạy | |
| O08 | 03 Orders (#25) | items rỗng | 400 | Chưa chạy | |
| O09 | 03 Orders (#25) | quantity = 0 | 400 | Chưa chạy | |
| O10 | 03 Orders (#25) | size không hợp lệ | 400 | Chưa chạy | |
| O11 | 03 Orders (#25) | topping không hợp lệ | 400 | Chưa chạy | |
| O12 | 03 Orders (#25) | Gửi kèm trường lạ (price) - phải bị từ chối | 400 | Chưa chạy | |
| O13 | 03 Orders (#25) | Món không tồn tại | 400/404/422 | Chưa chạy | |
| O14 | 03 Orders (#25) | Số lượng cực lớn (kiểm tra hết kho) | 409/400/422 | Chưa chạy | |
| O15 | 03 Orders (#25) | GET /orders/me (không token) | 401 | Chưa chạy | |
| O16 | 03 Orders (#25) | GET /orders/me | 200 | Chưa chạy | |
| O17 | 03 Orders (#25) | GET /orders/:id của chính mình | 200 | Chưa chạy | |
| O18 | 03 Orders (#25) | GET /orders/:id của người khác (B xem đơn A) | 403/404 | Chưa chạy | |
| O19 | 03 Orders (#25) | GET /orders/:id không token | 401 | Chưa chạy | |
| O20 | 03 Orders (#25) | GET /orders/:id không phải số | 400 | Chưa chạy | |
| O21 | 03 Orders (#25) | GET /orders/:id không tồn tại | 404 | Chưa chạy | |
| O22 | 03 Orders (#25) | Tạo đơn thứ hai (không thanh toán, dùng cho test huỷ) | 201 | Chưa chạy | |
| PM01 | 04 Payments | Tạo thanh toán không token | 401 | Chưa chạy | |
| PM02 | 04 Payments | Body thừa trường | 400 | Chưa chạy | |
| PM03 | 04 Payments | orderId không hợp lệ (âm) | 400 | Chưa chạy | |
| PM04 | 04 Payments | Tạo thanh toán đơn của người khác (B) | 403/404 | Chưa chạy | |
| PM05 | 04 Payments | Tạo thanh toán đơn hợp lệ (cần ZaloPay Sandbox) | 200/201/202/502/503 | Chưa chạy | |
| PM06 | 04 Payments | Gửi lặp tạo thanh toán cùng key | 200/201/202/409/502/503 | Chưa chạy | |
| PM07 | 04 Payments | Xem trạng thái thanh toán đơn của mình | 200 | Chưa chạy | |
| PM08 | 04 Payments | Xem trạng thái đơn của người khác | 403/404 | Chưa chạy | |
| PM09 | 04 Payments | Xem trạng thái không token | 401 | Chưa chạy | |
| PM10 | 04 Payments | Endpoint mock cũ POST /payments | 410 | Chưa chạy | |
| PM11 | 04 Payments | Callback thiếu data/mac | 200 | Chưa chạy | |
| PM12 | 04 Payments | Callback sai chữ ký (mac giả) | 200 | Chưa chạy | |
| PM13 | 04 Payments | Đơn sau callback giả vẫn chưa PAID | 200 | Chưa chạy | |
| L01 | 05 Loyalty (#29) | Điểm ban đầu của tài khoản mới = 0 | 200 | Chưa chạy | |
| L02 | 05 Loyalty (#29) | Điểm không đổi khi đơn chưa thanh toán | 200 | Chưa chạy | |
| L03 | 05 Loyalty (#29) | Không thể tự sửa loyaltyPoints qua PATCH /auth/me | 400/200 | Chưa chạy | |
| AD01 | 06 Admin | GET /admin/orders không token | 401 | Chưa chạy | |
| AD02 | 06 Admin | GET /admin/orders bằng user thường | 403 | Chưa chạy | |
| AD03 | 06 Admin | GET /admin/orders bằng Admin | 200 | Chưa chạy | |
| AD04 | 06 Admin | Lọc theo status | 200/400 | Chưa chạy | |
| AD05 | 06 Admin | Tìm kiếm search | 200 | Chưa chạy | |
| AD06 | 06 Admin | Tham số limit không hợp lệ | 200/400 | Chưa chạy | |
| AD07 | 06 Admin | Chi tiết đơn (Admin) | 200 | Chưa chạy | |
| AD08 | 06 Admin | Chi tiết đơn bằng user thường | 403 | Chưa chạy | |
| AD09 | 06 Admin | Đổi trạng thái giá trị không hợp lệ (PAID) | 400 | Chưa chạy | |
| AD10 | 06 Admin | Đổi trạng thái PREPARING khi đơn chưa PAID | 409/400 | Chưa chạy | |
| AD11 | 06 Admin | Đổi trạng thái bằng user thường | 403 | Chưa chạy | |
| AD12 | 06 Admin | Admin huỷ đơn chưa có giao dịch (đơn thứ hai) | 200/201 | Chưa chạy | |
| AD12b | 06 Admin | Huỷ lại đơn đã huỷ | 409 | Chưa chạy | |
| AD12c | 06 Admin | Huỷ đơn đang có giao dịch ZaloPay chờ xử lý (đơn đầu) | 409 | Chưa chạy | |
| AD13 | 06 Admin | Huỷ đơn bằng user thường | 403 | Chưa chạy | |
| AD14 | 06 Admin | Đối soát thanh toán (Admin) | 200 | Chưa chạy | |
| AD15 | 06 Admin | Đối soát bằng user thường | 403 | Chưa chạy | |
| AD16 | 06 Admin | Danh sách giao dịch (Admin) | 200 | Chưa chạy | |
| AD17 | 06 Admin | Danh sách giao dịch không token | 401 | Chưa chạy | |
| I01 | 07 Inventory | Thiếu kho: đặt số lượng lớn bị từ chối, không tạo đơn | 409/400/422 | Chưa chạy | |

## Phạm vi chưa phủ bằng Postman
- Cộng điểm Loyalty một lần khi thanh toán thành công: cần callback ZaloPay có chữ ký hợp lệ; kiểm bằng integration test hoặc Sandbox.
- Cạnh tranh giữ kho, hết hạn đơn, callback đến muộn: integration test với DB test.
- Inventory và Recipes không có HTTP endpoint riêng trên main tại thời điểm kiểm tra.