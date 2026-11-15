# Task 3.2 — Triển khai BrewLite

Cập nhật 15/11/2026 theo Compose, Caddyfile và script deploy/DB trong repo. Nền tảng: **AWS EC2 Ubuntu + Docker Compose + Caddy + DuckDNS + GitHub Actions + GHCR**.

URL đã được ghi trong [minh chứng triển khai](evidence/task-5.3.1-5.4.1-deploy.md): `https://brewlite-a2.duckdns.org`. CI và CD của commit nền `ab5f05f` đều thành công; link trong [báo cáo kiểm chứng](evidence/repository-consistency.md). Lần sửa này không kết nối hoặc thay đổi production, nên không khẳng định URL luôn hoạt động tại mọi thời điểm.

![Sơ đồ triển khai](diagrams/deployment.png)

[Nguồn PlantUML](diagrams/deployment.puml) · [Kiến trúc](architecture/architecture.md).

## 1. Các thành phần

| Thành phần | Cấu hình hiện có |
|---|---|
| Local | `compose.yaml`: PostgreSQL → migrate/seed → API → Web. API/Web bind loopback; DB không mở cổng ra host. |
| Production | `compose.prod.yaml`: db, migrate, api, web, caddy. Chỉ Caddy mở 80/443; có thêm 443/UDP cho HTTP/3. |
| Web | Next.js/BFF cổng 3000 nội bộ, gọi API qua `http://api:3001`. |
| API | NestJS cổng 3001 nội bộ, truy cập PostgreSQL và ZaloPay Sandbox. API chạy tác vụ hết hạn đơn/đối soát nên phải hoạt động liên tục. |
| DB | PostgreSQL 17, cổng 5432 trong mạng Compose, volume `brewlite_pg_data`. |
| Registry | GHCR lưu `brewlite-api`, `brewlite-api-migrate`, `brewlite-web`, tag bằng SHA commit. |
| CI/CD | Actions kiểm tra, build/push image, SSH tới EC2 và kiểm tra HTTPS. SSH mặc định 22, đổi bằng `EC2_PORT`. |

## 2. Đường đi của request

DuckDNS trỏ tên miền tới IP public EC2; DNS không chuyển tiếp HTTP. Caddy tự cấp TLS theo `APP_DOMAIN`.

| URL public | Đích theo Caddyfile và Web |
|---|---|
| `/health` | Caddy → API `/health`; 200 khi DB hoạt động, 503 khi lỗi. |
| `/payments/zalopay/callback` | Caddy → API trực tiếp; backend xác minh MAC và dữ liệu giao dịch. |
| `/` và trang Web | Caddy → Next.js. |
| `/products`, `/api/products/:id` | Caddy → Next.js rewrite → API `/products`, `/products/:id`. Trang `/products/:id` là giao diện chi tiết món. |
| `/api/session/...` | Caddy → BFF Web → API. JWT nằm trong cookie HttpOnly, BFF gắn Bearer token. |
| `/api/health`, `/api/health?deep=1` | Health Web; chế độ deep kiểm tra thêm API upstream. |
| `/payment/result` | Trang kết quả Web; đọc trạng thái backend, không coi redirect là thanh toán thành công. |

Caddy chỉ chuyển trực tiếp health và callback sang API; các route còn lại đi qua Web. Caddy gắn `X-BrewLite-Real-IP` và token proxy. `apps/web/server.mjs` chỉ tin header IP khi token khớp `CADDY_PROXY_SECRET`.

## 3. Cấu hình, log và dữ liệu

- File môi trường production mặc định `/opt/brewlite/.env.prod`; dùng [.env.prod.example](../.env.prod.example) làm mẫu. Không đưa secret vào repo/log.
- `BFF_PROXY_SECRET` khớp Web/API; `CADDY_PROXY_SECRET` khớp Caddy/Web; `APP_ORIGIN` là origin HTTPS. `API_INTERNAL_URL` phải đúng khi build rewrites và lúc BFF chạy.
- Callback mặc định `https://<APP_DOMAIN>/payments/zalopay/callback`; return URL `https://<APP_DOMAIN>/payment/result`. Chỉ dùng Sandbox.
- Caddy lưu TLS/cấu hình trong `caddy_data`/`caddy_config`. Các service dùng Docker `json-file`, tối đa `10m` mỗi file và 3 file.
- Backup mặc định `/srv/brewlite/backups`, ngoài cây release; lưu `.dump` và `.sha256`. Script không tự xóa backup/volume.

## 4. Trình tự phát hành

1. PR chạy CI: install → lint → unit/HTTP test → build và Browser E2E dùng API fixture. `PR quality gate` cần API, Web và Browser E2E đạt.
2. Khi push `main` hoặc chạy thủ công, CD gọi lại CI và chạy gate DB operations với Docker/PostgreSQL riêng. Cả hai phải đạt trước build/push image. Đây là thay đổi local trong lần sửa này, cần kiểm chứng trên GitHub sau khi được phép push.
3. Build/push ba image `linux/amd64` lên GHCR với SHA commit đang chạy.
4. Actions chuyển cấu hình, script và migration sang EC2 rồi gọi `deploy.sh --schema-reviewed <SHA>`. Script dùng `flock`, kiểm tra cấu hình/cổng, backup và chạy `scripts/db/migrate.mjs`. Deploy thường kỳ không seed.
5. Khởi động API/Web/Caddy bằng `--no-deps`; lỗi migration hoặc health thì dừng. Actions chạy smoke HTTPS và kiểm tra cổng 5432 không public.
6. Chỉ sau khi các kiểm tra đạt, `mark-release.sh` ghi `.current-release` và `.previous-release`.

Không dùng production làm đích integration/E2E tạo dữ liệu. Lần kiểm tra local này không chạy deploy hoặc rollback trên EC2.

## 5. Rollback và nghiệm thu

Rollback ứng dụng dùng `deploy/scripts/rollback.sh --schema-compatible [SHA]`, sau khi xác nhận schema tương thích. Rollback image không hoàn tác migration. Phục hồi DB theo [runbook](database-backup-rollback.md); không tự reset/xóa volume.

Trước nghiệm thu cần kiểm tra URL/health thực tế, chi phí/thời hạn hạ tầng, giao dịch Sandbox đầy đủ qua production, cài PWA trên thiết bị hỗ trợ và phiên bản được gắn tag. Smoke 7/7 không tự chứng minh các phần này.

## 6. Nguồn đối chiếu

- [Compose production](../compose.prod.yaml), [Compose local](../compose.yaml), [Caddyfile](../deploy/caddy/Caddyfile).
- [CI](../.github/workflows/ci.yml), [CD](../.github/workflows/cd.yml).
- [Deploy](../deploy/scripts/deploy.sh), [đánh dấu release](../deploy/scripts/mark-release.sh), [rollback](../deploy/scripts/rollback.sh).
- [Health API](../apps/api/src/health/health.service.ts), [Health Web](../apps/web/app/api/health/route.ts), [smoke](../scripts/check-compose.mjs).
