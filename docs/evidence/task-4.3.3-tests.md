# Minh chứng Task 4.3.3 — Kiểm thử API và menu

Nhánh `test/4.3.3-menu-tests`, [issue #19](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/19). Phụ thuộc nhánh menu `feat/4.3.2-menu-ui` tại commit `759ace4`; chưa merge trước nhánh menu. Chưa push hoặc đóng issue.

## Phạm vi

- Giữ và chạy lại test Products/RecipeMenu/seed đã kế thừa ở Task 4.3.1. Repo nguồn `main` BrewLite-SE được kiểm tra vẫn ở `e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe`.
- Web nguồn chưa có runner/test script. Bổ sung Vitest 4, React Testing Library, user-event, jest-dom và jsdom theo hướng dẫn Next.js đang cài; test nằm trong `apps/web/test`, cấu hình `vitest.config.mts`, tối đa hai worker.
- Có `npm test` chạy một lần và `npm run test:watch` để phát triển. Dependency/lockfile được lưu cùng thay đổi.
- Không sửa component, giao diện, hợp đồng API hoặc nghiệp vụ.

## Kết quả

Môi trường: Linux, Node.js 24.21.0, npm 11.19.0. Test integration dùng DB PostgreSQL 18.6 local riêng `brewlite_products_test` đã migrate/seed ở Task 4.3.1; không ghi dữ liệu hoặc dùng DB production. Dịch vụ test đã được dừng sau kiểm tra.

| Lệnh | Kết quả |
| --- | --- |
| `npm ci --prefix apps/web --no-audit --no-fund` | Đạt, 442 package |
| `npm --prefix apps/web test` | 24 test đạt trong 3 file; không skip |
| `npm --prefix apps/web run lint` | Đạt |
| `NEXT_TELEMETRY_DISABLED=1 npm --prefix apps/web run build` | Đạt |
| `npm --prefix apps/api test` | 27 unit test kế thừa đạt; không skip |
| `npm --prefix apps/api run test:e2e` | 9 HTTP test với repository giả đạt; không skip |
| `npm --prefix apps/api run test:integration` | 9 HTTP test với PostgreSQL thật đạt; không skip |
| `git diff --check` | Đạt |

Tổng cộng 69 test đạt. Lệnh integration được cấp `DATABASE_URL` tới DB local `_test` và `BREWLITE_DB_TESTS=1`; cách tạo/migrate/seed DB test xem README. Unit/HTTP API cần sinh Prisma Client theo phần cài đặt trước, không cần DB đang chạy.

## Test Web kiểm tra gì

- MenuCatalog: chờ dữ liệu, menu công khai, tên/giá/ảnh, danh sách rỗng; lỗi HTTP/mạng/JSON/hợp đồng dữ liệu và thử lại bằng Enter; timeout 15 giây; abort khi unmount.
- Menu: tìm không dấu/hoa thường/khoảng trắng/đ-d, kết hợp tìm kiếm với danh mục, không có kết quả và reset; hồi quy lỗi lọc OTHER theo tên Cà phê muối.
- Product: dữ liệu sai, ID trùng, tồn theo size không hợp lệ và response legacy; hết kho mọi size so với chỉ hết size M; ảnh thay thế và đổi URL ảnh.

Test Web mock fetch và next/image để chạy độc lập; không chứng minh API thật, tải ảnh thật, responsive, Safari/Firefox hoặc E2E đặt/thanh toán. Kiểm tra trình duyệt/API thật trước đó được ghi ở Task 4.3.2; suite frontend này bổ sung kiểm tra có thể chạy lặp và đưa vào CI ở Task 4.4.

npm có cảnh báo ESLint 9 deprecated và install-script `unrs-resolver` chưa duyệt; không tự bật thêm install-script. Khi mở PR, ghi phụ thuộc issue #18, kết quả trên và `Closes #19`; bổ sung URL PR thực tế trước nghiệm thu.
