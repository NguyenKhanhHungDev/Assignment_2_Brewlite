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

Hướng triển khai AWS EC2 trong Task 3.2 hiện là thiết kế dự kiến. Nền ứng dụng Task 4.1 chạy được local; menu, nghiệp vụ, CI/CD và deploy sẽ được bổ sung ở các issue tiếp theo.

## Chạy nền ứng dụng — Task 4.1

Cần Node.js **24.x**, npm đi kèm và Git. Có thể dùng `nvm use` theo `.nvmrc` nếu máy đã có nvm. Web và API giữ package/lockfile riêng như repo nguồn; chạy lệnh từ gốc repository.

```bash
npm ci --prefix apps/api
npm ci --prefix apps/web
cp .env.example apps/api/.env
```

Mở hai terminal:

```bash
npm --prefix apps/api run start:dev
```

```bash
npm --prefix apps/web run dev
```

- Web: http://localhost:3000 — trang chào BrewLite.
- API: http://localhost:3001 — `GET /` trả HTTP 404 vì chưa tích hợp controller nghiệp vụ.
- API đọc `apps/api/.env`; root `.env.example` là mẫu để sao chép, không được ứng dụng tự đọc. Không ghi đè `.env` đã có.
- Đổi cổng API bằng `PORT` trong `apps/api/.env`; đổi cổng Web bằng `PORT=3002 npm --prefix apps/web run dev`.
- Task 4.1 chưa cần database. Products và dữ liệu menu được tích hợp ở #17; không dùng `GET /` để chứng minh menu hoặc health endpoint đã hoàn thành.

## Kiểm tra và build

```bash
npm --prefix apps/api run lint
npm --prefix apps/api run test:e2e
npm --prefix apps/api run build
npm --prefix apps/web run lint
npm --prefix apps/web run build
```

`test:e2e` ở nền API chỉ kiểm tra ứng dụng khởi động và route chưa đăng ký trả HTTP 404, không phải E2E đặt và thanh toán. Test component Web được bổ sung ở #19; CI ở #20.

Kiểm tra tự động việc khởi động Web/API (dùng cổng trống và tự dừng sau kiểm tra):

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
