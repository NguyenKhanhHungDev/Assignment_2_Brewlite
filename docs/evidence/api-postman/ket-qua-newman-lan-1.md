# Kết quả chạy Newman lần 1 - BrewLite Assignment 2 (API)

- Ngày chạy: 14/11/2026, Newman, API `start:dev` cổng 3101, PostgreSQL 17 trong Docker (DB test riêng `brewlite_api_test`).
- Collection bản 76 ca (Newman đếm 77 request vì L03 gọi thêm 1 request phụ). Tổng 77 assertion: **75 PASS, 2 FAIL**, 0 lỗi script. Theo ca: 74 PASS, 2 FAIL. Không có ca SKIP.
- Nguồn: file `ketqua-newman_1.txt` (nằm trong lần chạy thứ hai trong cùng phút nên có ảnh hưởng của giới hạn tần suất).

## Ca FAIL

| ID | Mã HTTP thực tế | Kỳ vọng | Nguyên nhân | Loại |
| --- | --- | --- | --- | --- |
| A03 | 429 | 400 | `AuthThrottleGuard` giới hạn 5 lượt `/auth/register` mỗi IP trong 60 giây. Lần chạy này đã dùng hết hạn mức do lần chạy trước vừa xong (mỗi lần chạy dùng 5 lượt). | Môi trường/thứ tự chạy, **không phải bug API** |
| AD12 | 409 | 200/201/400 | Đơn 1 đã có giao dịch ZaloPay PENDING ở PM05, nên `OrderCancellationService` từ chối huỷ cho tới khi đối soát (đúng thiết kế). Kỳ vọng của test sai. | Lỗi thiết kế test, **không phải bug API** |

Cả hai đã sửa trong Collection bản 80 request: thêm R01 (kiểm tra 429 + Retry-After), O22 (đơn thứ hai không thanh toán), AD12 huỷ đơn thứ hai, AD12b huỷ lại, AD12c huỷ đơn có giao dịch chờ (kỳ vọng 409). Cần chạy lại bản mới để xác nhận.

## Kết quả từng ca

| ID | Test case | Mã HTTP thực tế | Kết quả |
| --- | --- | --- | --- |
| S01 | Đăng ký người dùng A | 201 | PASS |
| S02 | Đăng nhập A, lưu token | 200 | PASS |
| S03 | Đăng ký người dùng B | 201 | PASS |
| S04 | Đăng nhập B, lưu token | 200 | PASS |
| S05 | Đăng nhập Admin, lưu token | 200 | PASS |
| A01 | Đăng ký trùng email | 409 | PASS |
| A02 | Đăng ký email sai định dạng | 400 | PASS |
| A03 | Đăng ký mật khẩu < 8 ký tự | 429 | FAIL |
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
| AD12 | Admin huỷ đơn | 409 | FAIL |
| AD13 | Huỷ đơn bằng user thường | 403 | PASS |
| AD14 | Đối soát thanh toán (Admin) | 200 | PASS |
| AD15 | Đối soát bằng user thường | 403 | PASS |
| AD16 | Danh sách giao dịch (Admin) | 200 | PASS |
| AD17 | Danh sách giao dịch không token | 401 | PASS |
| I01 | Thiếu kho: đặt số lượng lớn bị từ chối, không tạo đơn | 400 | PASS |

## Chưa chứng minh được bằng lần chạy này

- #29 Loyalty: chỉ chứng minh điểm bắt đầu bằng 0, không đổi khi tạo đơn chưa thanh toán, và không sửa được qua `PATCH /auth/me`. Cộng điểm một lần khi thanh toán thành công **chưa được kiểm**, vì cần callback ZaloPay ký hợp lệ.
- Kho: O14/I01 trả 400 khi đặt số lượng 100000. Bản Collection mới kiểm thêm nội dung lỗi (thiếu nguyên liệu) để xác định đúng nguyên nhân; chưa chạy. Cạnh tranh giữ kho và trả kho cần integration test.
- PM05 trả 201 từ ZaloPay Sandbox thật (có mạng). PM06 gửi lặp trả 200, chưa kiểm xem có tạo giao dịch thứ hai hay không.
- Integration test với DB (`RUN_DB_INTEGRATION=1`): chưa chạy.
- Lọc `status` và `search` của Admin trả cùng kích thước 709B như danh sách không lọc. DB chỉ có 1 đơn nên chưa chứng minh bộ lọc hoạt động.

## Bug phát hiện

Chưa phát hiện bug API trong 77 ca đã chạy.