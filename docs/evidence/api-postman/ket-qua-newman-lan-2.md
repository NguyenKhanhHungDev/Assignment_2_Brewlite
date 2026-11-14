# Kết quả chạy Newman lần 2 - BrewLite Assignment 2 (API)

- Ngày chạy: 14/11/2026, Newman, API `start:dev` cổng 3101, PostgreSQL 17 trong Docker (DB test riêng).
- Collection bản 80 ca. Newman: 81 request (L03 có 1 request phụ), 84 assertion, **0 FAIL**, 0 lỗi script. Không có ca SKIP.
- Các ca đã sửa sau lần 1 đều đạt: R01 (429), AD12 (huỷ đơn chưa thanh toán trả 201), AD12b (huỷ lại 409), AD12c (đơn có giao dịch chờ 409).

| ID | Test case | Mã HTTP thực tế | Kết quả |
| --- | --- | --- | --- |
| S01 | Đăng ký người dùng A | 201 | PASS |
| S02 | Đăng nhập A, lưu token | 200 | PASS |
| S03 | Đăng ký người dùng B | 201 | PASS |
| S04 | Đăng nhập B, lưu token | 200 | PASS |
| S05 | Đăng nhập Admin, lưu token | 200 | PASS |
| A01 | Đăng ký trùng email | 409 | PASS |
| A02 | Đăng ký email sai định dạng | 400 | PASS |
| A03 | Đăng ký mật khẩu < 8 ký tự | 400 | PASS |
| R01 | Giới hạn đăng ký: lần thứ 6 trong 60 giây bị chặn | 429 | PASS |
| A04 | Đăng nhập sai mật khẩu | 401 | PASS |
| A05 | Đăng nhập thiếu mật khẩu | 400 | PASS |
| A06 | GET /auth/me không token | 401 | PASS |
| A07 | GET /auth/me token hợp lệ | 200 | PASS |
| A08 | GET /auth/me token rác | 401 | PASS |
| A09 | PATCH /auth/me đổi tên | 200 | PASS |
| A10 | Đổi mật khẩu sai mật khẩu hiện tại | 400 | PASS |
| A11 | Đổi mật khẩu không token | 401 | PASS |
| P01 | Danh sách món | 200 | PASS |
| P02 | Chi tiết món hợp lệ | 200 | PASS |
| P03 | Chi tiết món id không phải số | 400 | PASS |
| P04 | Chi tiết món không tồn tại | 404 | PASS |
| P05 | Chi tiết món id = 0 | 400 | PASS |
| O01 | Tạo đơn không token | 401 | PASS |
| O02 | Tạo đơn hợp lệ (Idempotency-Key) | 201 | PASS |
| O03 | Gửi lặp cùng Idempotency-Key và cùng nội dung | 201 | PASS |
| O04 | Cùng Idempotency-Key nhưng khác nội dung | 409 | PASS |
| O05 | Idempotency-Key rỗng/quá dài (201 ký tự) | 400 | PASS |
| O06 | Thiếu recipientName | 400 | PASS |
| O07 | recipientName 1 ký tự | 400 | PASS |
| O08 | items rỗng | 400 | PASS |
| O09 | quantity = 0 | 400 | PASS |
| O10 | size không hợp lệ | 400 | PASS |
| O11 | topping không hợp lệ | 400 | PASS |
| O12 | Gửi kèm trường lạ (price) - phải bị từ chối | 400 | PASS |
| O13 | Món không tồn tại | 404 | PASS |
| O14 | Số lượng cực lớn (kiểm tra hết kho) | 400 | PASS |
| O15 | GET /orders/me (không token) | 401 | PASS |
| O16 | GET /orders/me | 200 | PASS |
| O17 | GET /orders/:id của chính mình | 200 | PASS |
| O18 | GET /orders/:id của người khác (B xem đơn A) | 404 | PASS |
| O19 | GET /orders/:id không token | 401 | PASS |
| O20 | GET /orders/:id không phải số | 400 | PASS |
| O21 | GET /orders/:id không tồn tại | 404 | PASS |
| O22 | Tạo đơn thứ hai (không thanh toán, dùng cho test huỷ) | 201 | PASS |
| PM01 | Tạo thanh toán không token | 401 | PASS |
| PM02 | Body thừa trường | 400 | PASS |
| PM03 | orderId không hợp lệ (âm) | 400 | PASS |
| PM04 | Tạo thanh toán đơn của người khác (B) | 403 | PASS |
| PM05 | Tạo thanh toán đơn hợp lệ (cần ZaloPay Sandbox) | 201 | PASS |
| PM06 | Gửi lặp tạo thanh toán cùng key | 200 | PASS |
| PM07 | Xem trạng thái thanh toán đơn của mình | 200 | PASS |
| PM08 | Xem trạng thái đơn của người khác | 403 | PASS |
| PM09 | Xem trạng thái không token | 401 | PASS |
| PM10 | Endpoint mock cũ POST /payments | 410 | PASS |
| PM11 | Callback thiếu data/mac | 200 | PASS |
| PM12 | Callback sai chữ ký (mac giả) | 200 | PASS |
| PM13 | Đơn sau callback giả vẫn chưa PAID | 200 | PASS |
| L01 | Điểm ban đầu của tài khoản mới = 0 | 200 | PASS |
| L02 | Điểm không đổi khi đơn chưa thanh toán | 200 | PASS |
| L03 | Không thể tự sửa loyaltyPoints qua PATCH /auth/me | 400 | PASS |
| AD01 | GET /admin/orders không token | 401 | PASS |
| AD02 | GET /admin/orders bằng user thường | 403 | PASS |
| AD03 | GET /admin/orders bằng Admin | 200 | PASS |
| AD04 | Lọc theo status | 200 | PASS |
| AD05 | Tìm kiếm search | 200 | PASS |
| AD06 | Tham số limit không hợp lệ | 400 | PASS |
| AD07 | Chi tiết đơn (Admin) | 200 | PASS |
| AD08 | Chi tiết đơn bằng user thường | 403 | PASS |
| AD09 | Đổi trạng thái giá trị không hợp lệ (PAID) | 400 | PASS |
| AD10 | Đổi trạng thái PREPARING khi đơn chưa PAID | 400 | PASS |
| AD11 | Đổi trạng thái bằng user thường | 403 | PASS |
| AD12 | Admin huỷ đơn chưa có giao dịch (đơn thứ hai) | 201 | PASS |
| AD12b | Huỷ lại đơn đã huỷ | 409 | PASS |
| AD12c | Huỷ đơn đang có giao dịch ZaloPay chờ xử lý (đơn đầu) | 409 | PASS |
| AD13 | Huỷ đơn bằng user thường | 403 | PASS |
| AD14 | Đối soát thanh toán (Admin) | 200 | PASS |
| AD15 | Đối soát bằng user thường | 403 | PASS |
| AD16 | Danh sách giao dịch (Admin) | 200 | PASS |
| AD17 | Danh sách giao dịch không token | 401 | PASS |
| I01 | Thiếu kho: đặt số lượng lớn bị từ chối, không tạo đơn | 400 | PASS |

## Chưa chứng minh được bằng Postman

- #29 Loyalty: chưa kiểm cộng điểm một lần khi thanh toán thành công (cần callback ZaloPay ký hợp lệ hoặc integration test).
- O14/I01 trả 400 kèm kiểm nội dung lỗi thiếu nguyên liệu (đã PASS); cạnh tranh giữ kho và trả kho cần integration test.
- Bộ lọc `status`/`search` của Admin chưa chứng minh vì DB ít đơn.
- Integration test với DB (`RUN_DB_INTEGRATION=1`): chưa chạy.

## Bug phát hiện

Chưa phát hiện bug API trong 80 ca.