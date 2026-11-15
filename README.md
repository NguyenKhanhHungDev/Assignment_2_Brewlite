# BrewLite — Assignment 2

BrewLite là website đặt đồ uống và nhận món tại quầy. Khách hàng chọn món, đặt đơn, thanh toán thử qua ZaloPay Sandbox và theo dõi tiến độ. Admin quản lý món, nguyên liệu, đơn hàng và giao dịch.

**Địa chỉ demo:** [Mở BrewLite](https://brewlite-a2.duckdns.org) · [Menu API](https://brewlite-a2.duckdns.org/products) · [Health API](https://brewlite-a2.duckdns.org/health)

## Chức năng chính

| Người dùng | Chức năng |
|---|---|
| Khách hàng | Xem/tìm/lọc món; chọn size, topping, đường/đá; quản lý giỏ và dùng mã BREW10. |
| Thành viên | Đăng ký/đăng nhập, sửa hồ sơ, đổi mật khẩu; đặt/thanh toán đơn, xem lịch sử, điểm và hạng. |
| Admin | Quản lý công thức/món, nguyên liệu và tồn kho; xử lý đơn, xem và kiểm tra lại giao dịch. |

Hệ thống có PWA và giữ giỏ khi mất mạng. Đặt đơn và thanh toán cần kết nối Internet; thanh toán chỉ dùng **Sandbox, không thu tiền thật**. Code, test và phần còn chờ nghiệm thu được ghi trong [ma trận FR/NFR](docs/traceability-matrix.md).

## Công nghệ và cấu trúc

- **Giao diện:** Next.js 16, React 19, TypeScript, Tailwind CSS.
- **API và dữ liệu:** NestJS 12, Prisma 7, PostgreSQL 17.
- **Kiểm thử:** Vitest, Playwright và Postman/Newman.
- **Triển khai:** Docker Compose, GitHub Actions, GHCR, AWS EC2 và Caddy.

```text
apps/web/       Giao diện khách hàng, Admin và BFF
apps/api/       REST API, nghiệp vụ, Prisma và migration
docs/           Yêu cầu, sơ đồ, kiến trúc và minh chứng
scripts/        Kiểm tra ứng dụng, hiệu năng và vận hành DB
deploy/         Caddy và script triển khai
.github/        Workflow CI/CD và mẫu pull request
```

## Chạy local bằng Docker Compose

**Cần có:** Git, Docker với Compose v2 và Node.js 24.x để chạy script kiểm tra. Các lệnh bên dưới chạy từ thư mục gốc repo.

```bash
git clone https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite.git
cd Assignment_2_Brewlite
cp -n .env.example .env
docker compose up -d --build --wait
node scripts/check-compose.mjs
```

Compose tự khởi động PostgreSQL, chạy migration/seed rồi mở API và Web. Khi thành công, script kiểm tra báo **7/7 bước đạt**.

| Thành phần | Địa chỉ local |
|---|---|
| Website | [localhost:3000](http://localhost:3000) |
| Menu API | [localhost:3001/products](http://localhost:3001/products) |
| Health API | [localhost:3001/health](http://localhost:3001/health) |
| Health Web | [localhost:3000/api/health](http://localhost:3000/api/health) |

API không có route `/`, nên truy cập gốc cổng 3001 nhận 404 là bình thường. DB chỉ mở trong mạng Compose. `.env.example` là cấu hình demo local, không dùng cho production; lệnh `cp -n` giữ nguyên file môi trường đã có.

Dừng ứng dụng và giữ dữ liệu:

```bash
docker compose down
```

Không thêm `-v` nếu muốn giữ dữ liệu. Nếu cổng 3000/3001 đang bận, đổi `WEB_PORT`/`API_PORT` trong `.env`, khởi động lại stack và truyền URL tương ứng cho script kiểm tra. Xem [hướng dẫn Compose](docs/evidence/task-5.2.4-docker-compose.md).

## Chạy thử trang Admin

1. Mở [trang đăng nhập local](http://localhost:3000/login), chọn **Đăng ký mới**. Tài khoản mới mặc định là `CUSTOMER`; seed không tạo Admin.
2. Mở DB của stack local:

   ```bash
   docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
   ```

3. Thay email dưới đây bằng email vừa đăng ký, rồi chạy SQL **chỉ trên DB local/test**:

   ```sql
   UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin.demo@example.com';
   ```

   Kết quả cần là `UPDATE 1`. Nếu là `UPDATE 0`, kiểm tra lại email và DB. Nhập `\q` để thoát.
4. Đăng nhập lại và mở [trang Admin](http://localhost:3000/admin). Tài khoản `CUSTOMER` không có quyền truy cập trang này.

## Kiểm thử và build

Để chạy test bằng Node.js trên máy, cài dependency và tạo Prisma Client trước. File `apps/api/.env` dưới đây là cấu hình **local**, không lấy từ production:

```bash
npm ci --prefix apps/api
npm ci --prefix apps/web
cp -n .env.example apps/api/.env
npm --prefix apps/api run db:generate
```

Chạy kiểm tra API và Web:

```bash
npm --prefix apps/api run lint
npm --prefix apps/api test
npm --prefix apps/api run test:e2e
npm --prefix apps/api run build
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run build
```

Chạy E2E trình duyệt; lần đầu cần cài Chromium:

```bash
npm --prefix apps/web exec -- playwright install chromium
npm --prefix apps/web run test:e2e
```

API `test:e2e` kiểm tra HTTP với repository giả. E2E trình duyệt mặc định dùng API fixture để kiểm tra luồng Web/BFF. Hai loại này không thay thế kiểm thử PostgreSQL hoặc một giao dịch ZaloPay thật trong môi trường Sandbox. Test DB bị bỏ qua không được tính là đạt.

| Cần kiểm tra | Hướng dẫn / kết quả |
|---|---|
| Integration và migration/seed với PostgreSQL | [Chuẩn bị DB test riêng và chạy từng suite](docs/evidence/task-5.2.3-database.md) |
| API bằng Postman/Newman | [Import Collection, cấu hình và chạy](docs/evidence/api-postman/README.md) |
| E2E từ menu tới xác nhận đơn | [Phạm vi và cách chạy](docs/evidence/task-5.2.2-browser-e2e.md) |
| Hiệu năng menu | [Cách chạy và kết quả local đã lưu](docs/evidence/repository-consistency.md#3-hiệu-năng-menu-local) |
| Kết quả kiểm tra đã lưu | [Báo cáo ngày 15/11/2026](docs/evidence/repository-consistency.md) |

## CI/CD, triển khai và rollback

CI kiểm tra lint, test, build và E2E trình duyệt. CD dùng lại bộ kiểm tra CI, chạy thêm kiểm tra vận hành DB, rồi build/push image theo SHA commit và deploy lên EC2. Sau deploy có kiểm tra HTTPS và health. Quy tắc chặn merge cần được cấu hình trên GitHub theo [quy trình nhóm](docs/planning/workflow.md).

- [Triển khai AWS, định tuyến, biến môi trường và CI/CD](docs/deployment.md).
- [Backup, restore, migration và rollback](docs/database-backup-rollback.md). Rollback image không tự hoàn tác migration.
- [Tạo tag và GitHub Release](docs/release/release-procedure.md).

## Tài liệu và minh chứng nộp bài

Các liên kết dưới đây giúp đối chiếu yêu cầu, thiết kế, code và kết quả theo Task 1–5 của đề Assignment2-BrewLite-1.pdf (ver 1.0), đặc biệt mục 7.4, 8.1 và 9.1.

| Nội dung | Tài liệu |
|---|---|
| Task 1 — Yêu cầu | [Bối cảnh/phạm vi](docs/requirements/context-and-scope.md), [SRS](docs/requirements/srs.md), [use-case đặt và thanh toán](docs/requirements/use-case-checkout.md) |
| Task 2 — Mô hình hóa | [Activity, sequence và class diagram](docs/diagrams/README.md) |
| Task 3 — Kiến trúc và triển khai | [Kiến trúc/ADR](docs/architecture/architecture.md), [deployment](docs/deployment.md) |
| Task 4–5 — Phát triển và kiểm chứng | [Backlog](docs/planning/assignment-2-backlog.md), [quy trình làm việc](docs/planning/workflow.md), [ma trận FR/NFR](docs/traceability-matrix.md) |
| Demo và bàn giao | [Kịch bản demo](docs/handover/demo-script.md), [phiếu người ngoài nhóm](docs/handover/outsider-verification.md) |
| Tổng kết Sprint | [Sprint Review](docs/sprint/sprint-review.md), [Retrospective](docs/sprint/retrospective.md) |
| Phiên bản và phần còn chờ | [Release notes](docs/release/release-notes-v1.0.0.md) |

Xem [mục lục tài liệu](docs/README.md) để tìm thêm minh chứng. Những mục chưa có xác nhận hoặc chưa đủ bằng chứng vẫn được ghi rõ trong release notes và ma trận truy vết.
