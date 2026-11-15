# Task 3.2 — Triển khai BrewLite

## 1. Nền tảng đã chọn

**AWS EC2 Ubuntu + Docker Compose + Caddy + Duck DNS + GitHub Actions + GHCR.** Đây là thiết kế đã chốt; chưa có tài nguyên và URL production được kiểm chứng. Sơ đồ phải cập nhật theo cấu hình thật trước nghiệm thu.

![Deployment diagram](diagrams/deployment.png)

[Nguồn PlantUML](diagrams/deployment.puml) · [Kiến trúc](architecture/architecture.md).

## 2. Thành phần và kết nối

| Thành phần | Vai trò và kết nối |
|---|---|
| Thiết bị khách | Trình duyệt/PWA kết nối HTTPS cổng 443 tới Caddy |
| Duck DNS | Bản ghi tên miền trỏ tới IP public EC2; không chuyển tiếp HTTP |
| Caddy | Nhận HTTP 80/HTTPS 443, chuyển request tới Web/API nội bộ |
| Next.js Web/BFF | Cổng 3000 nội bộ; rewrites/BFF gọi NestJS cổng 3001 |
| NestJS API | Xử lý nghiệp vụ, kết nối PostgreSQL và gọi ZaloPay bằng HTTPS |
| PostgreSQL | Cổng 5432 nội bộ, volume bền vững; không public ra Internet |
| Job migration | Kết nối DB, hoàn tất thành công trước khi cập nhật API |
| GitHub Actions | Kiểm tra, build/push image, triển khai qua SSH cổng 22 và smoke test HTTPS |
| GHCR | Lưu image Web/API có tag commit SHA hoặc phiên bản; EC2 pull image |

Local kế thừa `compose.yaml` với thứ tự **DB healthy → migrate/seed thành công → API healthy → Web**. Web/API nguồn chỉ publish trên `127.0.0.1:3000/3001`. Database test CI tách khỏi production.

## 3. Định tuyến và cấu hình

| Luồng | Thiết kế | Phần chờ cấu hình thực tế |
|---|---|---|
| Frontend | HTTPS → Caddy → Web | Tên miền và Caddyfile |
| Menu/API công khai | Next.js rewrites → API; tuyến API public không xung đột trang Web | Prefix hoặc hostname API |
| API có phiên | `/api/session/...` → BFF → API; JWT từ cookie HttpOnly | Kiểm chứng cookie, Origin/CSRF và IP sau proxy |
| Callback | HTTPS → Caddy → `POST /payments/zalopay/callback`; backend xác minh chữ ký | URL callback public |
| Return | Trở về Web `/payment/result`, lấy kết quả từ API | Origin production |
| Health/smoke | CI gọi Web và API health qua HTTPS, kiểm tra mã HTTP/nội dung | Endpoint health và URL thật |

- **Secret:** CI giữ khóa SSH/quyền registry; EC2 cấp secret runtime qua môi trường Compose cho đúng dịch vụ. Không lưu secret trong repo/log. Chỉ cấp quyền triển khai cần thiết và hạn chế truy cập quản trị.
- **Web/API:** `API_INTERNAL_URL` cần đúng ở build và runtime; `BFF_PROXY_SECRET` khớp hai app, `APP_ORIGIN` khớp origin HTTPS.
- **Log:** Caddy/Web/API xuất stdout/stderr; Docker thu log và cần giới hạn dung lượng/rotation.
- **Health:** nguồn cũ dùng `/`, `/products`, `pg_isready`; bổ sung health endpoint riêng. API phải chạy liên tục cho tác vụ hết hạn/đối soát.
- **Dữ liệu:** giữ volume PostgreSQL; xác định nơi lưu backup và kiểm tra phục hồi. Không reset DB hoặc xóa volume để cập nhật.

## 4. Phát hành và rollback

Quy trình và script Task 5.3.2: [backup, restore, migration và rollback](database-backup-rollback.md). Script được kiểm thử trên Compose/DB riêng; thao tác EC2/production và tích hợp CD vẫn cần minh chứng theo môi trường thật.

1. PR chạy **Install → Lint → Unit Test → Build**; lỗi thì không merge.
2. Build image Web/API có tag SHA/phiên bản và push GHCR.
3. Actions dùng secret SSH tới EC2; pull đúng tag, sao lưu và chạy migration đã kiểm tra tương thích. Migration lỗi thì dừng; không tự chạy seed demo production.
4. Cập nhật dịch vụ bằng Compose; gọi health/smoke qua HTTPS. Kiểm tra cả API công khai, BFF và callback theo môi trường.
5. Khi lỗi, dừng phát hành và quay về image trước nếu DB tương thích. Rollback image không hoàn tác migration; dùng phương án phục hồi DB đã kiểm chứng khi cần.

## 5. Truy vết thành phần

| Thành phần | Code/cấu hình tham chiếu |
|---|---|
| Web/BFF | `apps/web/Dockerfile`, `next.config.ts`, `server.mjs`, `lib/session-server.ts` (tính từ `apps/web/`) |
| API | `apps/api/Dockerfile`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts` |
| DB và migration | `compose.yaml`, `apps/api/prisma`, `apps/api/prisma7.config.ts` |
| ZaloPay | `apps/api/src/payments/zalopay.service.ts` |
| Caddy, DNS, registry, CI/CD, backup/log | Cấu hình cần bổ sung trên repo mới và môi trường triển khai |

Trước nghiệm thu: kiểm tra tài khoản/chi phí AWS, cập nhật tài nguyên và URL thật, cấu hình TLS/secret/backup/log, kiểm chứng health/smoke và ánh xạ tới code mới. PWA và yêu cầu Ví/Thẻ Sandbox được kiểm chứng khi hoàn thiện chức năng.


## Hiện thực triển khai & CD (Task 5.3.1 & Task 5.4.1)

Các tệp triển khai và tự động hóa phát hành trong repository gồm:

- [`compose.prod.yaml`](../compose.prod.yaml): Định nghĩa 5 service (`db`, `migrate`, `api`, `web`, `caddy`). Chỉ `caddy` mở port `80`/`443`; `db`, `api` và `web` chỉ giao tiếp nội bộ qua Docker network, `RUN_SEED` mặc định `false`, và toàn bộ secret (kể cả `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`) bắt buộc nạp từ `/opt/brewlite/.env.prod`.
- [`deploy/caddy/Caddyfile`](../deploy/caddy/Caddyfile): Reverse proxy HTTPS cho `{$APP_DOMAIN}`, định tuyến `/health` và `/payments/zalopay/callback` sang `api:3001`, toàn bộ route còn lại sang `web:3000`, đồng thời chuyển `X-BrewLite-Real-IP` kèm `X-BrewLite-Proxy-Token`.
- [`apps/web/server.mjs`](../apps/web/server.mjs): Chỉ tin cậy `x-brewlite-real-ip` khi `x-brewlite-proxy-token` khớp `CADDY_PROXY_SECRET` bằng so sánh `timingSafeEqual`; trong mọi trường hợp khác tiếp tục xóa/không tin cậy header giả mạo từ client.
- [`.env.prod.example`](../.env.prod.example): Mẫu biến môi trường đặt tại `/opt/brewlite/.env.prod` trên EC2 (chỉ chứa placeholder, không commit secret thật hay khóa ZaloPay lên Git).
- [`deploy/scripts/deploy.sh`](../deploy/scripts/deploy.sh), [`deploy/scripts/mark-release.sh`](../deploy/scripts/mark-release.sh) & [`deploy/scripts/rollback.sh`](../deploy/scripts/rollback.sh): Phối hợp trực tiếp với bộ script Issue `#38` (`scripts/db/migrate.mjs` và `scripts/db/rollback-app.mjs`), sử dụng khóa `flock`, backup `.dump` + `.sha256` tại `/srv/brewlite/backups` (ngoài cây release, không tự xóa), deploy `api`/`web`/`caddy` bằng `--no-deps`, và chỉ cập nhật `.current-release`/`.previous-release` sau khi health check HTTPS và kiểm tra đóng port `5432` thành công.
- [`.github/workflows/cd.yml`](../.github/workflows/cd.yml): Pipeline CD chạy trên `push` vào `main` và `workflow_dispatch`, gồm `quality-gate` & `db-operations-gate` -> `build-and-push` (`linux/amd64` dùng context `./apps/api` và `./apps/web`, tag `${{ github.sha }}`) -> `deploy` (SSH chuyển `compose.prod.yaml`, `Caddyfile`, `deploy/scripts/`, `scripts/db/`, `apps/api/prisma/migrations/`, chạy `deploy.sh --schema-reviewed`, kiểm tra `scripts/check-compose.mjs` qua HTTPS + đóng port `5432`, rồi chạy `mark-release.sh`).

### Chuẩn bị một lần trên AWS EC2 (Ubuntu 24.04 LTS x86_64)

1. Mở Security Group inbound các cổng `22` (SSH), `80` (HTTP), `443` (HTTPS); tuyệt đối không mở `5432`.
2. Cài Docker Engine + Docker Compose plugin, thêm user SSH (`ubuntu`) vào nhóm `docker`, cài Node.js **24** trên host (để chạy `scripts/db/*.mjs`), tạo swap 2 GiB nếu chạy instance RAM nhỏ.
3. Tạo `/opt/brewlite` và `/srv/brewlite/backups` (`chmod 700` thuộc quyền `ubuntu`); copy `.env.prod.example` thành `/opt/brewlite/.env.prod`, điền `APP_DOMAIN`, `IMAGE_REGISTRY_OWNER`, thông số ZaloPay và sinh secret ngẫu nhiên mạnh (`openssl rand -hex 32`) cho `DB_PASSWORD`, `JWT_SECRET`, `BFF_PROXY_SECRET`, `CADDY_PROXY_SECRET`.
4. Trỏ DuckDNS (`brewlite-a2.duckdns.org`) về Public IP của EC2 (khuyến nghị gắn Elastic IP hoặc cron cập nhật DuckDNS nếu EC2 có thể dừng/khởi động lại).
5. Cấu hình GitHub Environment `production` (không bật required reviewers) hoặc Repository Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `APP_DOMAIN` (tùy chọn `EC2_PORT`, `EC2_DEPLOY_PATH`). Nếu khởi tạo database trống hoàn toàn lần đầu, người vận hành chạy seed thủ công một lần có chủ đích trên EC2 (`docker compose --project-name brewlite --env-file /opt/brewlite/.env.prod -f /opt/brewlite/compose.prod.yaml run --rm --no-deps -e RUN_SEED=true migrate`); các lần CD thường kỳ không chạy seed.
