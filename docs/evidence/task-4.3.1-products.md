# Minh chứng Task 4.3.1 — Products API

Ngày 12/11/2026, nhánh `feat/4.3.1-products-api`, [issue #17](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/17). Kết quả local; chưa commit/push hoặc đóng issue.

## Nguồn và điều chỉnh

Nguồn: [BrewLite-SE tại e876f258](https://github.com/NguyenKhanhHungDev/BrewLite-SE/commit/e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe). Đã kiểm tra `refs/heads/main` trước khi chuyển code; giữ SHA này trong phạm vi issue.

| Thành phần | Cách kế thừa |
| --- | --- |
| `src/products` | Giữ ProductsService, RecipeMenuService, ProductsModule và ba file unit test nguồn; bổ sung kiểm tra ID trên controller |
| `src/recipes` | Giữ adapter Prisma, contract và hai DTO phụ thuộc; RecipesModule chỉ cung cấp adapter, không mở controller Admin hoặc kéo AuthModule |
| `prisma` | Giữ nguyên schema, 16 migration, seed và test seed nguồn; không sửa migration đã có |
| `prisma7.config.ts` | Giữ cấu hình nguồn; bổ sung scripts gọi đúng tên config vì tên này không được CLI tự phát hiện |
| AppModule và HTTP test | Mount ProductsModule; thay test nền bằng kiểm tra HTTP Products; thêm suite PostgreSQL chạy riêng, có chốt DB local `_test` và cờ bật rõ ràng |

Schema được giữ nguyên cùng chuỗi migration để bảo toàn quan hệ/FK và lịch sử kế thừa. Các bảng User/Orders/Payment trong schema chưa có nghĩa các API nghiệp vụ đó đã triển khai. Không mount module Auth, Orders, Payment, Inventory hoặc Admin Recipes.

Điều chỉnh riêng: `ParseIntPipe` nguồn chưa giới hạn miền ID của PostgreSQL. Thêm `ProductIdPipe` yêu cầu 1–2147483647; HTTP test trước sửa có 4 ca thất bại, sau sửa 9/9 đạt. ID sai trả 400, món không có/ngừng bán trả 404.

## Kiểm tra đã chạy

Môi trường: Linux, Node.js 24.21.0, npm 11.19.0, PostgreSQL **18.6 native** chạy trong cluster tạm riêng trên loopback/cổng trống. Không dùng database có sẵn của người dùng. Hướng dẫn Docker local dùng PostgreSQL 17 theo kiến trúc; lượt kiểm tra này chưa xác minh riêng image 17 hoặc Docker Compose.

Các lệnh DB và integration được cấp `DATABASE_URL` trỏ tới DB tạm `brewlite_products_test`; integration có thêm `BREWLITE_DB_TESTS=1`.

| Lệnh | Kết quả |
| --- | --- |
| `npm --prefix apps/api run db:generate` | Sinh Prisma Client 7.10.1; thư mục sinh tự động được ignore |
| `npm --prefix apps/api run db:validate` | Schema hợp lệ |
| `npm --prefix apps/api run db:migrate` | 16 migration áp dụng thành công trên DB mới |
| `npm --prefix apps/api run db:seed` (hai lần) | Tạo 10 món; checksum dữ liệu Ingredient/Recipe và số liên kết RecipeIngredient không đổi ở lần hai |
| `npm --prefix apps/api test` | 27 unit test đạt, không skip |
| `npm --prefix apps/api run test:e2e` | 9 kiểm thử HTTP với repository giả đạt, không skip |
| `npm --prefix apps/api run test:integration` | 9 kiểm thử HTTP với Prisma/PostgreSQL thật đạt, không skip |
| `npm --prefix apps/api run lint` | Đạt |
| `npm --prefix apps/api run build` | Đạt |
| `node scripts/check-foundation.mjs` | Production local: API khởi động, menu 10 món và chi tiết khớp; Web 200 |
| `node scripts/check-foundation.mjs --dev` | Development local: API khởi động, menu 10 món và chi tiết khớp; Web 200 |
| `git diff --check` | Đạt |

Kiểm thử bao gồm menu công khai, lọc công thức ngừng bán, tồn kho theo size, dữ liệu kho sai, chi tiết, ID không hợp lệ/không tồn tại và seed không khởi tạo lại dữ liệu. Với DB seed thật, Cà phê sữa có giá 35.000đ, tồn khả dụng S/M/L lần lượt 83/66/55.

## Giới hạn và bước review

- Giao diện và ảnh menu chưa chuyển; `imageUrl` là đường dẫn dùng cho issue #18. Chưa có health endpoint, CI/CD, kiểm thử hiệu năng NFR-01 theo Docker Compose hoặc E2E đặt/thanh toán.
- Không thay đổi metadata tác giả Git; nguồn kế thừa được ghi bằng repo/SHA.
- README hướng dẫn tạo DB local, generate, migrate, seed và chạy các suite. Không chạy migration/seed với DB production.
- Đóng issue sau khi review/merge và bổ sung link PR thực tế; không lấy kết quả local này làm minh chứng CI.
