# Kết quả integration test với PostgreSQL - lần 1

- Ngày chạy: 14/11/2026. Vitest 4.1.12, PostgreSQL 17 trong Docker (`brewlite-test-db`, 127.0.0.1:5434). Không dùng DB production.
- Migrate: 16 migration áp dụng thành công trên cả hai DB mới. Seed chạy trên DB rỗng.
- Không có suite nào bị skip.

| Suite | DB test | Biến bật suite | Kết quả |
| --- | --- | --- | --- |
| Products (`test/products.integration-spec.ts`) | `brewlite_api_test` (đã dùng qua Postman) | `BREWLITE_DB_TESTS=1` | 8 PASS, **1 FAIL** |
| Products, chạy lại trên DB mới seed | `brewlite_products_test` | `BREWLITE_DB_TESTS=1` | **9 PASS / 9** |
| Orders (`orders.integration`, `orders-business.integration`) | `brewlite_api_test` | `RUN_DB_INTEGRATION=1` | 22 PASS / 22 |
| Admin operations | `brewlite_huy_test_operations` | `OPERATIONS_TEST_DATABASE_URL` | 7 PASS / 7 |
| Payments | `brewlite_payment_test_phat` | `PAYMENTS_TEST_DATABASE_URL` | 10 PASS / 10 |

Tổng (lần chạy đầu): 47 PASS, 1 FAIL, 0 SKIP. Sau khi chạy lại Products trên DB mới seed: ca FAIL đó PASS, nên 48 test đều đạt.

## Ca FAIL

`reads ten seeded recipes, with real available inventory and no private fields` (Products).
- Thực tế: món cà phê có tồn khả dụng S/M/L = 78/62/52. Test kỳ vọng 83/66/55 (số liệu của DB vừa seed).
- Nguyên nhân khả dĩ nhất: `brewlite_api_test` đã bị các lần chạy Postman tạo đơn và giữ kho trước đó, nên tồn khả dụng thấp hơn. README nêu suite này yêu cầu dữ liệu demo ban đầu. Đây là suy luận, chưa kiểm chứng.
- Đã kiểm chứng: chạy lại trên DB mới seed (`brewlite_products_test`) cho 9/9 PASS. Vậy FAIL do DB đã bị Postman giữ kho, **không phải bug API**. Suite Products chỉ đáng tin khi chạy trên DB vừa seed.

## Phạm vi đối chiếu #25 (Orders) và #29 (Loyalty)

#25 Orders (orders.integration, admin-operations): tạo đơn và tính size/topping, giữ kho không trừ tồn, thiếu một nguyên liệu thì không tạo đơn và không giữ kho, replay cùng Idempotency-Key và 409 khi khác nội dung, hai request song song cùng key chỉ tạo một đơn, hai request khác key chỉ một cái thắng khi kho chỉ đủ một, hai công thức dùng chung nguyên liệu, snapshot không đổi khi sửa công thức, giải phóng kho một lần khi thất bại hoặc hết hạn, SUCCESS đến muộn không lấy lại kho, rollback khi lỗi, phân quyền khách/Admin theo vai trò trong DB, lọc Admin theo trạng thái thanh toán, không có API ép đơn thành PAID, Admin huỷ đơn đồng thời chỉ một lần và lưu người thao tác.

#29 Loyalty: `orders-business` có 3 test (chuyển trạng thái hợp lệ và không hợp lệ, không cộng điểm khi PAYMENT_FAILED, cộng điểm đúng một lần khi gọi song song). `payments.integration` có test "consumes inventory and awards loyalty once under duplicate concurrent success".

Chưa có minh chứng cho: hiển thị điểm và hạng trên giao diện (99/100, 299/300), vì chưa chạy được test web.

## Cách chạy lại

Xem các lệnh trong hội thoại: mỗi nhóm dùng DB và biến riêng như bảng trên. Tên DB bị code kiểm tra (`*_test`, `brewlite_huy_test_operations`, `brewlite_payment_test_*`).
