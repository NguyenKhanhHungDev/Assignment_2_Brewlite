# Minh chứng Task 5.2.1 — Kiểm thử API bằng Postman và integration test

Minh chứng lịch sử từ nhánh `test/5.2.1-api-postman`, kiểm thử Orders, Payments, Auth/Loyalty và kho gián tiếp. Các issue thật: [#30 — Orders](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/30), [#31 — Payments](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/31), [#32 — Inventory](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/32), [#33 — Auth/Loyalty](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/33). Ngày 15/11/2026, cả bốn issue đã đóng trên GitHub; trạng thái issue không thay cho kết quả từng ca test.

Hướng dẫn cho người chạy lại: [Bộ Postman](api-postman/README.md). File này là bản tổng hợp kết quả lịch sử, không phải lượt test mới. Bộ tài liệu được đối chiếu với ZIP do người dùng cung cấp ngày 15/11/2026; báo cáo nguồn ghi người thực hiện Phát, ngày 14/11/2026, nhưng không có SHA đầy đủ hoặc phiên bản Node của lượt chạy cũ.

## Phạm vi

- Thêm Postman Collection chạy lại được (80 ca) và Environment mẫu không chứa mật khẩu hoặc token, trong `docs/evidence/api-postman/`.
- Kiểm Auth, Products, Orders, Payments, Loyalty, Admin và Inventory (gián tiếp qua Orders): thành công, dữ liệu sai, chưa đăng nhập, sai quyền, gửi lặp (`Idempotency-Key`), giới hạn tần suất đăng ký, callback ZaloPay sai chữ ký.
- Chạy integration test hiện có với PostgreSQL local riêng. Không sửa code API, giao diện, schema hoặc test của người khác.
- Test Web cho Loyalty nằm ở nhánh `feat/5.1.8-loyalty`, không thuộc nhánh này.

## Kết quả

Môi trường: Linux, Node.js (phiên bản lượt chạy cũ chưa được ghi lại), API `start:dev` cổng 3101, PostgreSQL 17 (Docker) với DB test riêng, ZaloPay Sandbox công khai. Không dùng DB production hay DB đang làm việc.

| Lệnh | Kết quả |
| --- | --- |
| Newman, Collection 80 ca (3 lần chạy liên tiếp) | 84 assertion đạt, 0 lỗi; không skip |
| `test:integration` Products, DB mới seed `brewlite_products_test` | 9 đạt |
| Orders: `orders.integration` và `orders-business.integration` | 22 đạt; không skip |
| `admin-operations.integration` | 7 đạt; không skip |
| `payments.integration` | 10 đạt; không skip |

Theo báo cáo nguồn, bộ 80 ca đạt trong ba lượt liên tiếp; repo có hai báo cáo Newman chi tiết, chưa có raw log riêng cho từng lượt. Collection có 80 request khai báo nhưng lượt Newman ghi 81 request thực tế do một ca có request phụ. Một số ca gateway chấp nhận nhiều mã HTTP, nên assertion đạt không tự chứng minh thanh toán thành công.

Tổng cộng 48 integration test đạt sau khi chạy lại Products trên DB mới seed. Hai lần Newman đầu (bản 76 ca) có ca FAIL, đã xử lý như bảng dưới. Chi tiết: `api-postman/ket-qua-newman-lan-2.md`, `api-postman/ket-qua-integration-lan-1.md`, `api-postman/bang-test-case.md`.

| Hiện tượng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| A03 trả 429 thay vì 400 khi chạy liên tiếp | Giới hạn 5 lượt đăng ký/IP/60 giây | Môi trường; thêm ca R01, chờ 60 giây hoặc restart API giữa hai lần chạy |
| AD12 trả 409 khi huỷ đơn có giao dịch ZaloPay chờ | Đúng thiết kế, test đặt kỳ vọng sai | Sửa thành AD12 (đơn chưa thanh toán), AD12b, AD12c |
| Products integration FAIL trên DB đã dùng | Test phụ thuộc số tồn kho của DB vừa seed; DB trước đó đã được dùng cho Postman | Chạy lại trên DB mới seed đạt 9/9; chưa loại trừ mọi nguyên nhân khác chỉ từ lượt chạy lại |

Chưa phát hiện bug API trong các ca đã chạy.

## Chứng minh cho #25 và #29

- Orders: giá tính phía server, trường lạ như `price` bị từ chối, chống trùng theo `Idempotency-Key`, thiếu nguyên liệu thì không tạo đơn, quyền khách và Admin, Admin huỷ đơn.
- Loyalty: điểm lộ qua `GET /auth/me`, không sửa được qua `PATCH /auth/me`; integration test cho cộng điểm đúng một lần khi gọi song song và không cộng khi `PAYMENT_FAILED`.

## Chưa kiểm

- Giao diện điểm và hạng (99/100, 299/300): chưa có minh chứng trong nhánh này.
- Lượt Postman này chỉ kiểm kho gián tiếp. Hiện `main` đã có HTTP endpoint Inventory/Recipes; test chuyên biệt xem [database 5.2.3](task-5.2.3-database.md).
- Bộ lọc Admin qua Postman chưa chứng minh vì DB ít đơn.
- E2E trình duyệt, health, CD/EC2 và cộng điểm bằng callback ZaloPay thật.

Các số liệu trên là kết quả đã lưu của lượt kiểm tra cũ, không phải chạy lại ngày 15/11. Lệnh chạy hiện hành và phạm vi local xem [báo cáo kiểm chứng](repository-consistency.md); không suy ngược phiên bản môi trường cũ từ môi trường hiện tại.

## Chạy lại và bảo vệ dữ liệu

Các tên DB trong báo cáo chi tiết là dữ kiện lịch sử; không sao chép làm cấu hình hiện tại. Bộ kiểm tra hiện yêu cầu DB local có tên kết thúc `_test`; dùng hướng dẫn [Task 5.2.3](task-5.2.3-database.md). Không reset DB đang có dữ liệu để ép test đạt.

Kết quả Postman không thay thế test UI, toàn bộ Inventory/Recipes hoặc một giao dịch Sandbox thành công đầy đủ. Việc rà ZIP chỉ kiểm tra tĩnh, không chạy request và không đối chiếu lại toàn bộ code với repo nguồn.
