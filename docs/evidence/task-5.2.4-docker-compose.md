# Minh chứng Task 5.2.4 — Docker Compose và kiểm tra sức khỏe

Ngày kiểm tra: **14/11/2026**. Nhánh: `feat/5.2.4-docker-compose-health` (tạo từ `main` tại `124c523`).

## Phạm vi triển khai

- Kế thừa và hoàn thiện cấu trúc Docker từ `BrewLite-SE` tại `e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe`:
  - `apps/api/Dockerfile` (`build`, `migration`, `production-dependencies`, `runtime` chạy `node dist/main.js` với `USER node`), `apps/api/.dockerignore`.
  - `apps/web/Dockerfile` (`build` với `API_INTERNAL_URL=http://api:3001`, `production-dependencies`, `runtime` chạy `node server.mjs` với `USER node`), `apps/web/.dockerignore`.
  - `compose.yaml`:
    - `db` (`postgres:17`, volume bền vững `brewlite_pg_data`, healthcheck `pg_isready`, không publish cổng ra host).
    - `migrate` (chạy sau `db` healthy; thực thi `prisma migrate deploy --config ./prisma7.config.ts` và chạy `prisma db seed --config ./prisma7.config.ts` khi `RUN_SEED=true`).
    - `api` (chờ `db` healthy và `migrate` `service_completed_successfully`, publish `127.0.0.1:${API_PORT:-3001}:3001`, healthcheck `GET http://127.0.0.1:3001/health`).
    - `web` (chờ `api` healthy, publish `127.0.0.1:${WEB_PORT:-3000}:3000`, healthcheck `GET http://127.0.0.1:3000/api/health`).
    - Bổ sung log rotation (`json-file`, `max-size: 10m`, `max-file: 3`) cho toàn bộ service.
  - Cập nhật `.env.example` với `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `RUN_SEED`, `API_PORT`, `WEB_PORT`.
- Endpoint kiểm tra sức khỏe:
  - API: `GET /health` (`apps/api/src/health/`) kiểm tra kết nối PostgreSQL qua `SELECT 1` với timeout 3000ms; trả `200` `{ status: "ok", service: "api", database: "up", timestamp }` khi sẵn sàng và `503` `{ status: "error", service: "api", database: "down", timestamp }` khi DB lỗi (ẩn toàn bộ credential/URL trong response và log).
  - API `main.ts` bật `app.enableShutdownHooks()` để đóng kết nối Prisma và interval sạch sẽ khi container nhận `SIGTERM`.
  - Web: `GET /api/health` (`apps/web/app/api/health/route.ts`) trả `200` `{ status: "ok", service: "web", timestamp }` (`Cache-Control: no-store`), hỗ trợ `?deep=1` kiểm tra API upstream.
- Kiểm tra khởi động tự động:
  - `scripts/check-compose.mjs`: kiểm tra `GET /health`, `GET /products`, `GET /api/health`, `GET /api/health?deep=1`, HTML trang chủ `/`, rewrite `/products` và BFF `/api/session/login`.
  - `scripts/check-foundation.mjs`: bổ sung kiểm tra `GET /health` và `GET /api/health`.

## Kết quả kiểm tra thực tế

Môi trường: Docker `29.9.2`, Docker Compose `v5.6.1`, Node.js `v24.19.0`, Windows 11. Vì cổng `3000`/`3001` trên máy đang được stack `brewlite-se` sử dụng, lượt kiểm tra Compose chạy với `API_PORT=3101` và `WEB_PORT=3100`.

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| API lint | `npm --prefix apps/api run lint` | Đạt (`0 warnings`, `0 errors` trên 105 file) |
| API unit tests | `npm --prefix apps/api test -- --maxWorkers=1` | 24 file đạt (`240 passed`, gồm 2 test mới `src/health/health.spec.ts`); 5 file DB integration opt-in skip (`44 skipped`) |
| API HTTP e2e tests | `npm --prefix apps/api run test:e2e -- --maxWorkers=1` | 2 file đạt (`15 passed`, gồm `GET /health` 200 & 503) |
| API build | `npm --prefix apps/api run build` | Đạt |
| Web lint | `npm --prefix apps/web run lint` | Đạt |
| Web unit/component tests | `npm --prefix apps/web test -- --maxWorkers=1` | 16 file đạt (`200 passed`, gồm 3 test mới `test/health-route.test.ts`) |
| Compose config & build | `docker compose config --quiet && docker compose build` | Đạt (dựng đủ image `migrate`, `api`, `web` gồm `next build`) |
| Compose startup & migration/seed | `API_PORT=3101 WEB_PORT=3100 docker compose up -d --wait` | `db` healthy -> `migrate` áp dụng 16 migration + seed `brewlite-demo-v1` (`Exited 0`) -> `api` healthy -> `web` healthy |
| Kiểm tra end-to-end Compose | `node scripts/check-compose.mjs --api-url=http://127.0.0.1:3101 --web-url=http://127.0.0.1:3100` | Đạt 7/7 bước (`/health` 200 `database=up`, `/products` 10 món, `/api/health` 200, `?deep=1` `upstream=up`, `/` HTML, rewrite `/products`, BFF `/api/session/login` -> HTTP 401) |
| Kiểm tra `bcrypt` trong runtime image | `docker compose exec -T api node -e "import('bcrypt')..."` | `bcrypt ok: true` |
| Idempotent `migrate` & `RUN_SEED=false` | `docker compose run --rm migrate` và `RUN_SEED=false docker compose run --rm migrate` | Đạt: `No pending migrations to apply`, seed idempotent với `SeedRun`, và bỏ qua seed khi `RUN_SEED=false` |
| Kiểm tra `/health` khi DB dừng & phục hồi | `docker compose stop db` -> probe `/health` & `/api/health?deep=1` -> `docker compose start db` -> `up -d --wait` | Trả `503` (`database: "down"`, `upstream: "down"`) khi DB dừng; tự phục hồi về `200` (`healthy`) khi DB chạy lại |
