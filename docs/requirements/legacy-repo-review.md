# Kế thừa repo cũ và phần phải bổ sung


Các đường dẫn code dưới đây tính từ gốc BrewLite-SE. Trạng thái chỉ phản ánh nguồn đã đọc; chưa xác nhận tích hợp hoặc nghiệm thu trên repo mới.

| Nội dung | Bằng chứng ở repo cũ | Công việc cho repo mới |
| --- | --- | --- |
| Menu, tùy chọn và giỏ | `apps/api/src/products/recipe-menu.service.ts`, `apps/web/components/ProductDetail.tsx`, `apps/web/lib/cart.ts` | Chuyển API danh sách/chi tiết, size/topping, tìm kiếm/danh mục, giỏ và các trạng thái tải/trống/lỗi; kiểm thử lại trên nền mới |
| Giá, kho và thanh toán | `apps/api/src/orders/orders.prisma-adapter.ts`, `apps/api/src/payments/payments.prisma-adapter.ts` | Kế thừa kiểm tra giá phía máy chủ, giữ kho, idempotency và transaction đơn–kho–giao dịch–điểm; không dùng API mô phỏng `POST /payments` đã bị vô hiệu hóa |
| Hồ sơ và người nhận | `apps/api/src/auth/dto/update-profile.dto.ts`, `apps/api/src/orders/dto/create-order.dto.ts` | Chỉ dùng tên theo FR-09/FR-12/FR-15; kế thừa validation, snapshot và hash từ source, không bổ sung số điện thoại |
| Công cụ Admin được giữ lại | `apps/api/src/ingredients/ingredients.controller.ts`, `apps/api/src/orders/admin-orders.controller.ts`, `apps/api/src/payments/payment-operations.controller.ts` | Giữ kiểm kho, lịch sử, xóa nguyên liệu có điều kiện, hủy đơn, ghi chú/recheck giao dịch, công cụ món và CSV theo FR-28–FR-31; kiểm thử lại trên repo mới |
| Điểm và hạng hiển thị | `apps/api/src/loyalty/loyalty.service.ts`, `apps/web/components/LoyaltyBalance.tsx` | Kế thừa quy tắc tích điểm và UI Đồng/Bạc/Vàng ở mốc 100/300 điểm theo FR-21; kiểm thử lại trên repo mới. Không có chức năng đổi điểm hoặc ưu đãi theo hạng |
| Mô hình hóa | Chưa thấy activity, sequence hoặc class diagram trong repo nguồn đã đọc | Bộ [sơ đồ Task 2](../diagrams/README.md) của repo mới đã có PUML/PNG; phân biệt lớp domain Promotion/LoyaltyTransaction với schema nguồn chưa có hai bảng này. Cần review/nghiệm thu nhóm |
| Kiến trúc và production | Có Dockerfile, `compose.yaml`; bộ docs này có phương án kiến trúc | Cập nhật deployment diagram theo hosting/registry thực sự chọn. Production đang là dự thảo, chưa đủ điều kiện nghiệm thu Task 3.2 |
| PWA và health | Chưa thấy manifest/service worker hoặc health endpoint riêng; Compose probe API qua `/products` | Bổ sung PWA theo NFR-10 và health endpoint theo Task 5.2; không dùng việc có giao diện responsive để xác nhận PWA đã hoàn thành |
| Kiểm thử và CI/CD | Có unit/integration test và script regression; chưa thấy workflow CI/CD hoặc E2E menu → xác nhận đơn | Chuyển test phù hợp, sửa fixture cũ, bổ sung E2E và pipeline. Cung cấp log của đúng phiên bản mới; không tính bài bị skip là đạt |
| Truy vết và bàn giao | Bộ tạo phẩm Ass2 chưa có đầy đủ trong repo nguồn | Đưa Task 1–3 vào repo mới; lập `docs/traceability-matrix.md`, quy ước Git, DoD, backlog và minh chứng Sprint; bổ sung README test/build/deploy/rollback, release, URL và demo |

Repo mới thực hiện theo thứ tự Task 1 → Task 2 → Task 3 → Task 4 → Task 5 của đề. Code nguồn được chuyển theo module cùng dependency, migration và test phù hợp. Ảnh hoặc kết quả kiểm thử phiên bản cũ chỉ là tài liệu tham khảo; việc nghiệm thu cần bằng chứng của repo mới.

## Lưu ý khi kế thừa và kiểm thử theo SRS

Các nội dung sau bổ sung cho bảng tổng quan ở trên. Những trạng thái và đường dẫn chỉ phản ánh repo cũ; chưa chứng minh repo mới đã hoàn thành hay nghiệm thu.

| Yêu cầu | Hiện trạng nguồn và việc cần kiểm tra |
| --- | --- |
| FR-09, FR-12, FR-15 | DTO hồ sơ và tạo đơn chỉ nhận tên; `recipientPhone` là cột legacy bị Prisma bỏ qua. Hash và ngoại lệ nâng cấp đơn cũ dùng tên. Kế thừa, kiểm thử và không bổ sung SĐT theo quyết định đã chốt. |
| FR-07, FR-08 | Đăng xuất và đổi mật khẩu tăng `sessionVersion`, thu hồi JWT cũ trên mọi thiết bị. Web dùng BFF và cookie HttpOnly, không giữ JWT trong state client. Kiểm thử logout, hết phiên, nhiều thiết bị và dữ liệu giỏ; FR-07 mô tả dọn dữ liệu trên thiết bị thao tác. |
| FR-21 | UI tính hạng từ tổng điểm backend; kiểm thử mốc 99/100, 299/300, trạng thái lỗi và thử lại. Không bổ sung ưu đãi hay đổi điểm theo hạng. |
| FR-28 | API nhập/kiểm kho cho phép bỏ `Idempotency-Key`; chỉ chống trùng theo key khi có header. Repo mới cần bảo đảm gửi lại có key và không ghi biến động trùng; source chưa chứng minh chống trùng cho mọi client. |
| FR-23 | Trang chi tiết source dừng tự cập nhật ở COMPLETED, CANCELLED và PAYMENT_FAILED. Kiểm thử nút tải lại, gồm trường hợp Admin hủy sau PAYMENT_FAILED. |
| FR-16–FR-20 | Kế thừa route ZaloPay, callback/query và transaction đơn–kho–điểm. Không dùng `POST /payments` đã trả 410 hoặc body `method`/`simulateResult` của tài liệu cũ. Cần kiểm thử và cung cấp minh chứng Ví/Thẻ mô phỏng theo đề. |
| NFR-01, NFR-02 | Ảnh kiểm thử menu cũ chưa chứng minh hiệu năng hay toàn luồng repo mới. Đo workload/cấu hình/kết quả và kiểm thử menu, checkout, Admin ở các kích thước SRS. |
| NFR-06 | Source có migration, seed chạy một lần và Compose gồm `db`, `migrate`, `api`, `web`. Kiểm chứng trên database local/test mới, giữ dữ liệu khi chạy lại; seed demo không tự là quy trình nạp production. |
| NFR-07, NFR-08 | Chưa thấy workflow CI/CD, hosting/registry hay URL production bàn giao trong source. Cần pipeline, quality gate, migration an toàn, health/smoke, rollback và URL thật. |
| Task 2, Task 4.2 và truy vết | Đưa tạo phẩm Ass2 vào repo mới với lịch sử commit/PR thật; hoàn thành `docs/traceability-matrix.md` theo FR → thiết kế → code → test. Bảng này không thay thế ma trận. |

Bằng chứng code bổ sung tính từ gốc BrewLite-SE: `apps/api/src/auth/auth.service.ts`, `apps/api/src/orders/dto/create-order.dto.ts`, `apps/api/src/orders/orders.service.ts`, `apps/api/src/payments/payments.controller.ts`, `apps/api/src/payments/payments.prisma-adapter.ts`, `apps/api/prisma/schema.prisma`, `apps/web/lib/session-server.ts`, `apps/web/components/LoyaltyBalance.tsx` và `compose.yaml`.

Chưa chạy lại build, test database, trình duyệt hoặc gateway trong lần đối chiếu này. Test tồn tại, test chạy đạt và yêu cầu được nghiệm thu là ba trạng thái khác nhau.

## API checkout kế thừa và phần cần hoàn thiện


Đường dẫn dưới đây là route backend hiện có trong repo nguồn, chưa xác nhận được tích hợp vào repo mới.

| Bước | API nguồn | Hợp đồng hiện tại cần chú ý |
| --- | --- | --- |
| Tạo đơn | `POST /orders` | JWT; body gồm `recipientName`, `items`, `promoCode` tùy chọn. Header `Idempotency-Key` tùy chọn ở API, nhưng frontend tạo và lưu key trước khi gửi. Server tính giá và trả `{orderId,status,total}` |
| Xem lại đơn/lịch sử | `GET /orders/:id`, `GET /orders/me` | JWT; kiểm tra quyền chủ đơn. Admin có quyền đọc chi tiết theo guard hiện tại |
| Tạo thanh toán | `POST /payments/zalopay/create` | JWT; `Idempotency-Key` bắt buộc dài 1–200 ký tự; body chỉ chứa `orderId`, không nhận số tiền, `method` hoặc `simulateResult`. Tạo mới trả 201, replay có URL trả 200 |
| Nhận kết quả gateway | `POST /payments/zalopay/callback` | Gateway gửi `data` và `mac`; backend xác minh chữ ký, app id và số tiền. HTTP 200 chứa `return_code`/`return_message`; HTTP 200 riêng lẻ không chứng minh nghiệp vụ thành công |
| Kiểm tra kết quả | `GET /payments/:orderId/status` | JWT của chủ đơn; có thể chủ động query ZaloPay khi giao dịch đủ điều kiện |
| Xem các lần thử | `GET /payments/:orderId/details` | JWT của chủ đơn; trả trạng thái đơn, hạn đơn, giờ máy chủ và các giao dịch theo trường được cho phép |
| API mô phỏng cũ | `POST /payments` | Đã vô hiệu hóa, yêu cầu có JWT nhận 410 Gone. Không dùng làm luồng thanh toán mới |

Web nguồn gọi các API cần đăng nhập qua `/api/session/proxy/...`; BFF đọc cookie HttpOnly và gắn Bearer token khi gọi NestJS. Backend tiếp tục chịu trách nhiệm kiểm tra quyền.

**Người nhận đã chốt:** chỉ dùng `recipientName`, không thu thập số điện thoại. Kế thừa validation/hash và ngoại lệ nâng cấp đơn cũ thiếu tên theo A-06; đồng bộ bản nháp, UI và test khi chuyển repo.

**Hết hạn và kết quả đến chậm:** khi còn payment chưa rõ kết quả, source giữ reservation và tiếp tục query; một SUCCESS được xác minh vẫn có thể tiêu thụ reservation còn giữ sau thời điểm hết hạn ban đầu. Nếu reservation đã được trả thì chuyển diện cần đối soát. Thời điểm đồng hồ về 0 không chứng minh nguyên liệu đã được trả.

Bằng chứng: `apps/api/src/orders/orders.controller.ts`, `dto/create-order.dto.ts`, `orders.service.ts`; `apps/api/src/payments/payments.controller.ts`, `payments.service.ts`, `payments.prisma-adapter.ts`, `payment-details.controller.ts`; `apps/web/lib/session-server.ts`. Các tên rút gọn trong nhóm Orders tính từ `apps/api/src/orders/`.
