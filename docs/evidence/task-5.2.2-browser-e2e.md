# Minh chứng Task 5.2.2 — E2E trình duyệt

Issue: [#34 — 5.2.2 Kiểm thử toàn luồng trên trình duyệt](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/34)

## Phạm vi và tiêu chí

Bài Playwright `apps/web/e2e/menu-to-order.spec.ts` chạy trên Chromium thật và thao tác qua giao diện người dùng:

1. mở menu;
2. chọn **Cà phê sữa** để vào trang tùy chọn;
3. thêm món size M vào giỏ;
4. mở giỏ và đi tới checkout;
5. đăng ký/đăng nhập;
6. nhập tên người nhận và xác nhận tạo đơn;
7. kiểm tra mã đơn, trạng thái **Chờ thanh toán**, phương thức ZaloPay Sandbox và tóm tắt món.

Bài test không chỉ kiểm tra ảnh tĩnh. Mỗi bước dùng locator theo vai trò/nhãn truy cập và chỉ tạo ảnh sau khi toàn bộ assertion đạt.

Trong lúc dựng luồng đã phát hiện menu thiếu đường dẫn tới trang chi tiết món. `ProductCard` được bổ sung link `/products/{id}` và một unit test khóa hành vi này; đây là blocker tối thiểu để người dùng thật có thể bắt đầu luồng từ menu.

## Hai chế độ chạy

### 1. Chế độ cô lập, dùng mặc định trong CI

`npm run test:e2e` tự khởi động:

- Next.js bằng custom server thật `server.mjs`;
- Chromium thật do Playwright điều khiển;
- API fixture HTTP riêng để test ổn định, không sửa database và không gọi ZaloPay.

Fixture kiểm tra request đăng ký/đăng nhập, trusted BFF headers, cookie/session, idempotency key và hợp đồng tạo đơn. Do đó chế độ này kiểm tra luồng Web + BFF + hợp đồng HTTP, nhưng **không được dùng để tuyên bố NestJS/PostgreSQL/ZaloPay thật đã được kiểm tra**. API/database đã có suite riêng ở Task 5.2.1 và 5.2.3; ZaloPay Sandbox cần kiểm thử riêng với ứng dụng Sandbox.

### 2. Chế độ stack thật

Khi Web/API/PostgreSQL test đã chạy và seed xong, bỏ fixture bằng cách truyền URL Web:

```bash
BREWLITE_E2E_BASE_URL=http://127.0.0.1:3000 npm --prefix apps/web run test:e2e
```

Bài test dùng email duy nhất theo thời gian chạy và chấp nhận order ID động, nên có thể chạy trên database test. Không trỏ lệnh này vào production hoặc database chứa dữ liệu thật.

## Môi trường và kết quả đã chạy

Ngày kiểm tra: **2026-11-14**

| Thành phần | Phiên bản/kết quả |
| --- | --- |
| Hệ điều hành | Windows 11 x64 |
| Node.js | 24.16.0 |
| npm | 11.13.0 |
| Playwright | 1.65.1 |
| Chromium | 159.0.8154.6 |
| Browser E2E | **1/1 passed** |
| Web lint | passed |
| Web unit/component | **198/198 passed** |
| Web production build | passed |
| API lint/build | passed |
| API unit | **238 passed, 44 integration tests skipped** do không có PostgreSQL local trong lượt này |
| API HTTP E2E | **14/14 passed** |
| `git diff --check` | passed |

Lệnh browser đã chạy:

```bash
npm --prefix apps/web run test:e2e
```

Kết quả:

```text
Running 1 test using 1 worker
ok 1 [chromium] › menu-to-order.spec.ts › customer completes the browser flow from menu to order confirmation
1 passed
```

Ảnh sau khi mọi assertion đạt: [xác nhận đơn #52201](task-5.2.2-browser/order-confirmation.png).

## CI và artifacts

Workflow `.github/workflows/ci.yml` có job bắt buộc **Browser E2E**:

1. `npm ci`;
2. cài Chromium;
3. chạy `npm run test:e2e`;
4. tải `playwright-report` và `test-results` lên artifact `browser-e2e-evidence` trong 14 ngày.

`PR quality gate` chỉ đạt khi cả API, Web và Browser E2E đều thành công.

## Cách kiểm tra thủ công trước khi mở PR

Từ repository root:

```bash
npm ci --prefix apps/web
npx --prefix apps/web playwright install chromium
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run test:e2e
npm --prefix apps/web run build
git diff --check
```

Muốn nhìn trình duyệt thao tác trực tiếp:

```bash
npm --prefix apps/web run test:e2e:headed
```

Kết quả đạt khi Playwright báo `1 passed`, trang cuối hiển thị mã đơn, `Chờ thanh toán`, `ZaloPay Sandbox`, và không có file ngoài dự kiến trong `git status`.
