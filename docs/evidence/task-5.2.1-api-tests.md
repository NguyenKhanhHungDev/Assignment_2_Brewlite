# Minh chứng Task 5.2.1 — Kiểm thử API bằng Postman và integration test

Nhánh `test/5.2.1-api-postman`, issue 5.2.1.2 và 5.2.1.3 ([#__ISSUE1__](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/__ISSUE1__), [#__ISSUE2__](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/__ISSUE2__)). Kiểm chứng thêm Task 5.1.4 (Orders, #25) và 5.1.8 (Loyalty, #29) ở mức API. Chưa đóng issue; dùng `Refs`, không dùng `Closes`.

## Phạm vi

- Thêm Postman Collection chạy lại được (80 ca) và Environment mẫu không chứa mật khẩu hoặc token, trong `docs/evidence/api-postman/`.
- Kiểm Auth, Products, Orders, Payments, Loyalty, Admin và Inventory (gián tiếp qua Orders): thành công, dữ liệu sai, chưa đăng nhập, sai quyền, gửi lặp (`Idempotency-Key`), giới hạn tần suất đăng ký, callback ZaloPay sai chữ ký.
- Chạy integration test hiện có với PostgreSQL local riêng. Không sửa code API, giao diện, schema hoặc test của người khác.
- Test Web cho Loyalty nằm ở nhánh `feat/5.1.8-loyalty`, không thuộc nhánh này.

## Kết quả

Môi trường: Linux, Node.js __NODE__, API `start:dev` cổng 3101, PostgreSQL 17 (Docker) với DB test riêng, ZaloPay Sandbox công khai. Không dùng DB production hay DB đang làm việc.

| Lệnh | Kết quả |
| --- | --- |
| Newman, Collection 80 ca (3 lần chạy liên tiếp) | 84 assertion đạt, 0 lỗi; không skip |
| `test:integration` Products, DB mới seed `brewlite_products_test` | 9 đạt |
| Orders: `orders.integration` và `orders-business.integration` | 22 đạt; không skip |
| `admin-operations.integration` | 7 đạt; không skip |
| `payments.integration` | 10 đạt; không skip |

Tổng cộng 48 integration test đạt. Hai lần Newman đầu (bản 76 ca) có ca FAIL, đã xử lý như bảng dưới. Chi tiết: `api-postman/ket-qua-newman-lan-2.md`, `api-postman/ket-qua-integration-lan-1.md`, `api-postman/bang-test-case.md`.

| Hiện tượng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| A03 trả 429 thay vì 400 khi chạy liên tiếp | Giới hạn 5 lượt đăng ký/IP/60 giây | Môi trường; thêm ca R01, chờ 60 giây hoặc restart API giữa hai lần chạy |
| AD12 trả 409 khi huỷ đơn có giao dịch ZaloPay chờ | Đúng thiết kế, test đặt kỳ vọng sai | Sửa thành AD12 (đơn chưa thanh toán), AD12b, AD12c |
| Products integration FAIL trên DB đã dùng | Test dùng số tồn kho cố định của DB mới seed; Postman đã giữ kho | PASS 9/9 trên DB mới seed; không phải bug API. Đề xuất cho người phụ trách Products |

Chưa phát hiện bug API trong các ca đã chạy.

## Chứng minh cho #25 và #29

- Orders: giá tính phía server, trường lạ như `price` bị từ chối, chống trùng theo `Idempotency-Key`, thiếu nguyên liệu thì không tạo đơn, quyền khách và Admin, Admin huỷ đơn.
- Loyalty: điểm lộ qua `GET /auth/me`, không sửa được qua `PATCH /auth/me`; integration test cho cộng điểm đúng một lần khi gọi song song và không cộng khi `PAYMENT_FAILED`.

## Chưa kiểm

- Giao diện điểm và hạng (99/100, 299/300): chưa có minh chứng trong nhánh này.
- Inventory và Recipes chưa có HTTP endpoint trên `main`; kho chỉ kiểm gián tiếp.
- Bộ lọc Admin qua Postman chưa chứng minh vì DB ít đơn.
- E2E trình duyệt, health, CD/EC2 và cộng điểm bằng callback ZaloPay thật.

Khi mở PR, ghi `Refs` tới hai issue trên, kết quả trên và URL PR thực tế; chỉ Hưng merge và đóng issue.
