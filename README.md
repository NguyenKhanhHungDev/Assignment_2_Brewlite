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
- [PWA: chạy local, kiểm tra offline và hướng dẫn HTTPS](docs/evidence/task-5.1.2-pwa.md)
- [E2E trình duyệt: từ menu đến xác nhận đơn](docs/evidence/task-5.2.2-browser-e2e.md)
- [Quy trình nhánh và pull request](docs/planning/workflow.md)

Hướng triển khai AWS EC2 trong Task 3.2 hiện là thiết kế dự kiến. Nền ứng dụng và Products API đọc menu đã được kiểm tra local. Giao diện menu gọi API, có tìm kiếm/lọc và trạng thái tải/trống/lỗi. CI kiểm tra pull request; các module nghiệp vụ khác, CD và deploy sẽ được bổ sung theo từng issue.

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

- Web: http://localhost:3000 — menu BrewLite.
- API: http://localhost:3001 — `GET /` trả HTTP 404 vì không đăng ký route gốc; dùng `/products` để xem menu.
- API đọc `apps/api/.env`; root `.env.example` là mẫu để sao chép, không được ứng dụng tự đọc. Không ghi đè `.env` đã có.
- Đổi cổng API bằng `PORT` trong `apps/api/.env`; đổi cổng Web bằng `PORT=3002 npm --prefix apps/web run dev`.
- Menu công khai: `GET http://localhost:3001/products`; chi tiết: `GET http://localhost:3001/products/1` (dùng ID thật từ danh sách).
- Response gồm `id`, `name`, `price` (size M, VND), `imageUrl`, `category`, `stock`, `stockBySize`. Chỉ trả công thức đang bán; số lượng khả dụng tính từ tồn trừ lượng đã giữ.
- ID sai định dạng/không thuộc 1–2147483647 trả 400; món không tồn tại hoặc ngừng bán trả 404. Danh sách rỗng trả `[]`.
- Ảnh món kế thừa nằm trong `apps/web/public/images/products/`. Khi thay ảnh, giữ tên file khớp `imageUrl` trong API (ví dụ `ca-phe-sua.jpg`); thiếu ảnh hoặc ảnh lỗi sẽ hiển thị “Ảnh đang cập nhật”.
- Web gọi `/products` cùng origin, Next.js proxy tới API; không cần mở CORS cho luồng menu. Nếu đổi cổng API, sao chép `apps/web/.env.example` thành `apps/web/.env.local` (không ghi đè file đã có), chỉnh `API_INTERNAL_URL` rồi restart Web. Production cần build lại với đúng URL API.
- Menu giữ thiết kế từ repo cũ, lọc theo danh mục API và tìm không phân biệt dấu/hoa thường/đ với d. Chưa có trang tùy chọn, giỏ hàng hoặc health endpoint trong phần này.
- Xem [nguồn và kiểm tra giao diện menu](docs/evidence/task-4.3.2-menu.md).

## Kiểm tra và build

```bash
npm --prefix apps/api run lint
npm --prefix apps/api test
npm --prefix apps/api run test:e2e
npm --prefix apps/api run build
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run test:e2e
npm --prefix apps/web run build
```

`npm test` của API chạy unit test Products/RecipeMenu, seed và nghiệp vụ giá/lựa chọn Orders. `npm --prefix apps/api run test:e2e` kiểm tra HTTP với repository giả, không cần DB và không phải E2E trình duyệt. Web có test unit/component bằng Vitest/jsdom; dùng `npm --prefix apps/web run test:watch` khi phát triển.

`npm --prefix apps/web run test:e2e` chạy Playwright/Chromium thật qua menu → chi tiết món → giỏ → đăng ký/đăng nhập → checkout → xác nhận đơn. Mặc định lệnh tự mở API fixture cô lập để CI không ghi database; xem [phạm vi, kết quả và cách chạy với stack PostgreSQL thật](docs/evidence/task-5.2.2-browser-e2e.md). Muốn nhìn thao tác trực tiếp, dùng `npm --prefix apps/web run test:e2e:headed`.

CI ở #20. Xem thêm [minh chứng kiểm thử menu](docs/evidence/task-4.3.3-tests.md).

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

## Giá và lựa chọn món — Task 5.1.1a (#21)

Kế thừa nguyên bản từ [BrewLite-SE tại `e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe`](https://github.com/NguyenKhanhHungDev/BrewLite-SE/tree/e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe): `apps/api/src/orders/orders.pricing.ts`, `order-preferences.ts`, `orders.contract.ts`, `dto/create-order.dto.ts` và `apps/web/lib/pricing.ts`, `preferences.ts`. Backend tính giá size S/M/L, topping, số ly từ giá công thức chính thức; kiểm tra đường/đá, ghi chú, tồn khả dụng và giới hạn số tiền. Web helper chỉ tính giá hiển thị theo cùng công thức SRS mục 7.

Dependency đi kèm từ cùng SHA: `apps/api/src/orders/orders.service.ts`, `orders.ingredients.ts`, `order-state.ts`, `apps/api/src/promotions/promotions.service.ts` và test nguồn `orders.service.spec.ts`, `orders.ingredients.spec.ts`, `promotions.service.spec.ts`. Validation đầy đủ và tính thành tiền dòng/tổng đơn nằm trong `OrdersService.create`; không tách công thức hay thêm endpoint báo giá. Phát dùng service này khi tích hợp Orders; Huy dùng chung helper giá/khẩu vị và hàm `applyPromotion` khi tích hợp Promotions/Web. Việc chuyển dependency không đồng nghĩa nghiệm thu các issue của Orders/Promotions.

Test bổ sung: `apps/api/src/orders/orders.pricing.spec.ts` và `apps/web/test/pricing-preferences.test.ts`, kiểm tra bảng giá, lựa chọn sai/trùng, số lượng, ghi chú 200/201 ký tự, khẩu vị legacy, giá âm/tràn số và làm tròn BREW10. Chạy riêng bằng `npm --prefix apps/api test -- src/orders src/promotions` và `npm --prefix apps/web test -- test/pricing-preferences.test.ts`.

**Chưa nghiệm thu đầy đủ #21:** `AppModule` hiện chỉ đăng ký Products. Orders controller, provider `ORDERS_STORE`/Prisma adapter và Auth chưa được tích hợp; test service dùng store giả, chưa chứng minh `POST /orders` chạy với JWT/database thật hoặc giữ kho trong transaction. DTO/source không đặt trần 99 ly ở backend; trần 1–99 là yêu cầu giao diện FR-03 và cần kiểm chứng khi chuyển trang chi tiết món ở 5.1.1b. Giữ nguyên hành vi nguồn, chưa triển khai trang tùy chọn/giỏ hoặc kiểm thử toàn luồng đặt đơn.

## CI cho pull request

GitHub Actions chạy API/Web khi mở hoặc cập nhật PR vào `main`, push `main`; có thể chạy thủ công sau khi workflow có trên nhánh mặc định. Mỗi app chạy `npm ci` → lint → test → build; API sinh Prisma Client và chạy thêm HTTP test với mock, không cần DB thật.

`PR quality gate` chỉ đạt khi cả `API checks` và `Web checks` đều đạt. Không bỏ qua lỗi hoặc job bị skip. Ruleset `require-ci` yêu cầu đúng check này từ GitHub Actions, không có bypass; giữ riêng ruleset quyền merge hiện có.

Với ba nhánh đang phụ thuộc nhau, merge theo thứ tự menu #18 → kiểm thử #19 → CI #20 bằng **Merge pull request**. Ruleset CI được chuẩn bị và kiểm chứng nhưng để Disabled đến khi hai PR tiền đề đã merge, tránh chặn các nhánh chưa có workflow. Sau khi merge menu và kiểm thử, vào Settings → Rules → Rulesets → `require-ci`, chuyển **Active**, lưu; xác nhận PR CI có check xanh rồi mới merge. Chỉ nghiệm thu #20 khi CI đã merge và rule đang Active.

Xem [minh chứng CI và lượt pass/fail](docs/evidence/task-4.4-ci.md). CI không triển khai EC2; CD sẽ được bổ sung riêng.
