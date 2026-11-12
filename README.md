# BrewLite — Assignment 2

Dự án BrewLite dùng Next.js, NestJS và PostgreSQL, phát triển từ yêu cầu đến triển khai.

## Tài liệu

[Bảng chỉ dẫn Task 1–3 và lịch sử tài liệu](docs/README.md).

- [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md)
- [Đặc tả yêu cầu SRS](docs/requirements/srs.md)
- [Use-case đặt và thanh toán](docs/requirements/use-case-checkout.md)
- [Sơ đồ Task 2](docs/diagrams/README.md)
- [Kiến trúc Task 3.1](docs/architecture/architecture.md)
- [Triển khai Task 3.2](docs/deployment.md)
- [Backlog dự kiến](docs/planning/assignment-2-backlog.md)
- [Hướng dẫn hoàn thành repo](docs/planning/repository-guide.md)
- [Ma trận truy vết](docs/traceability-matrix.md)
- [Quy trình nhánh và pull request](docs/planning/workflow.md)

Hướng triển khai AWS EC2 trong Task 3.2 hiện là thiết kế dự kiến. Nền ứng dụng và Products API đọc menu đã được kiểm tra local. Giao diện hiện vẫn là trang chào; các module nghiệp vụ khác, CI/CD và deploy sẽ được bổ sung theo từng issue.

## Cài đặt và chuẩn bị database local

Cần Node.js **24.x**, npm đi kèm và Git. Có thể dùng `nvm use` theo `.nvmrc` nếu máy đã có nvm. Web và API giữ package/lockfile riêng như repo nguồn; chạy lệnh từ gốc repository.

```bash
npm ci --prefix apps/api
npm ci --prefix apps/web
cp -n .env.example apps/api/.env
```

API hiện cần PostgreSQL. Nếu đã có `apps/api/.env`, bổ sung `DATABASE_URL` theo mẫu, không ghi đè cấu hình đang dùng. Chỉ trỏ tới DB local riêng cho dự án.

Ví dụ tạo PostgreSQL 17 local bằng Docker **một lần** (cổng 5434, mật khẩu mẫu chỉ dùng local):

```bash
docker run -d --name brewlite-menu-db \
  -e POSTGRES_USER=brewlite \
  -e POSTGRES_PASSWORD=brewlite_local \
  -e POSTGRES_DB=brewlite_local \
  -p 127.0.0.1:5434:5432 \
  -v brewlite_menu_pgdata:/var/lib/postgresql/data \
  postgres:17

docker exec brewlite-menu-db pg_isready -U brewlite -d brewlite_local
```

Chờ database báo nhận kết nối rồi chạy:

```bash
npm --prefix apps/api run db:generate
npm --prefix apps/api run db:validate
npm --prefix apps/api run db:migrate
npm --prefix apps/api run db:seed
```

`db:migrate` áp dụng nguyên chuỗi migration của repo nguồn. Schema có cả bảng dành cho module sau; hiện chỉ Products API được mount. Seed chỉ khởi tạo menu trên DB rỗng, không phục hồi demo nếu DB đã có dữ liệu. Không reset DB để chạy lại seed.

Lần sau dùng `docker start brewlite-menu-db`; khi cần dừng dùng `docker stop brewlite-menu-db`. Dữ liệu nằm trong volume; không xóa volume để cập nhật ứng dụng.

## Chạy Web và API

Mở hai terminal:

```bash
npm --prefix apps/api run start:dev
```

```bash
npm --prefix apps/web run dev
```

- Web: http://localhost:3000 — trang chào BrewLite.
- API: http://localhost:3001 — `GET /` trả HTTP 404 vì không đăng ký route gốc; dùng `/products` để xem menu.
- API đọc `apps/api/.env`; root `.env.example` là mẫu để sao chép, không được ứng dụng tự đọc. Không ghi đè `.env` đã có.
- Đổi cổng API bằng `PORT` trong `apps/api/.env`; đổi cổng Web bằng `PORT=3002 npm --prefix apps/web run dev`.
- Menu công khai: `GET http://localhost:3001/products`; chi tiết: `GET http://localhost:3001/products/1` (dùng ID thật từ danh sách).
- Response gồm `id`, `name`, `price` (size M, VND), `imageUrl`, `category`, `stock`, `stockBySize`. Chỉ trả công thức đang bán; số lượng khả dụng tính từ tồn trừ lượng đã giữ.
- ID sai định dạng/không thuộc 1–2147483647 trả 400; món không tồn tại hoặc ngừng bán trả 404. Danh sách rỗng trả `[]`.
- Ảnh được tham chiếu qua `imageUrl`; file ảnh và giao diện menu được chuyển ở issue #18. Chưa có health endpoint.

## Kiểm tra và build

```bash
npm --prefix apps/api run lint
npm --prefix apps/api test
npm --prefix apps/api run test:e2e
npm --prefix apps/api run build
npm --prefix apps/web run lint
npm --prefix apps/web run build
```

`npm test` chạy unit test Products/RecipeMenu và seed kế thừa. `test:e2e` kiểm tra HTTP Products với repository giả, không cần DB và không phải E2E đặt/thanh toán. Test component Web ở #19; CI ở #20.

Kiểm thử với PostgreSQL thật cần DB **local riêng có tên kết thúc `_test`** và đã migrate/seed. Không dùng DB làm việc đang có dữ liệu. Ví dụ tạo DB test trong container trên một lần:

```bash
docker exec brewlite-menu-db createdb -U brewlite brewlite_menu_test
DATABASE_URL=postgresql://brewlite:brewlite_local@127.0.0.1:5434/brewlite_menu_test npm --prefix apps/api run db:migrate
DATABASE_URL=postgresql://brewlite:brewlite_local@127.0.0.1:5434/brewlite_menu_test npm --prefix apps/api run db:seed
DATABASE_URL=postgresql://brewlite:brewlite_local@127.0.0.1:5434/brewlite_menu_test BREWLITE_DB_TESTS=1 npm --prefix apps/api run test:integration
```

Suite integration yêu cầu dữ liệu demo ban đầu (10 món); không tự reset hoặc sửa DB. Xem [nguồn và minh chứng Products API](docs/evidence/task-4.3.1-products.md).

Kiểm tra tự động việc khởi động Web/API sau khi chuẩn bị DB (dùng cổng trống và tự dừng tiến trình kiểm tra; API đọc `.env`):

```bash
node scripts/check-foundation.mjs
node scripts/check-foundation.mjs --dev
```

Sau khi build, chạy bản production **local** trong hai terminal:

```bash
npm --prefix apps/api run start:prod
```

```bash
npm --prefix apps/web start
```

Dùng Ctrl+C để dừng. Bản production local không phải triển khai AWS. Xem [nguồn kế thừa và minh chứng Task 4.1](docs/evidence/task-4.1-setup.md).
