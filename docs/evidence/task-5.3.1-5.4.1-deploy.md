# Minh chứng Task 5.3.1 & 5.4.1 — CD Pipeline & Triển khai AWS EC2 (Caddy + DuckDNS + Docker Compose)

## Mục tiêu

- **Issue #37 (`5.3.1`)**: Thiết lập GitHub Actions CD tự động kiểm tra chất lượng, build và đẩy Docker image lên GHCR theo SHA commit, triển khai qua SSH sang AWS EC2 có backup trước migration và kiểm tra health qua HTTPS.
- **Issue #39 (`5.4.1`)**: Cấu hình chạy production cho BrewLite trên AWS EC2 Ubuntu (`linux/amd64`) bằng Docker Compose + Caddy + DuckDNS với HTTPS, Web + API hoạt động, ZaloPay callback reachable qua HTTPS, và PostgreSQL không public port ra ngoài.

## Các tệp đã thêm/cập nhật

- `.github/workflows/cd.yml`
- `compose.prod.yaml`
- `deploy/caddy/Caddyfile`
- `deploy/scripts/deploy.sh`
- `deploy/scripts/rollback.sh`
- `.env.prod.example`
- `.gitattributes`
- `apps/web/server.mjs` & `apps/web/test/server-proxy-headers.test.ts`
- `README.md`, `docs/deployment.md`

## Kiểm tra đã thực hiện ở local

Xem chi tiết kết quả chạy lệnh trong báo cáo kiểm chứng trước khi tạo PR (bao gồm lint + unit test `apps/web`, kiểm tra cú pháp `compose.prod.yaml`, xác thực `deploy/caddy/Caddyfile` bằng `caddy validate`, kiểm tra định dạng LF cho shell script và `bash -n`).

## Lưu ý xác minh thực tế trên EC2 sau khi merge

Các bước sau phụ thuộc vào hạ tầng EC2 và GitHub Secrets của người vận hành nên cần xác nhận sau khi thiết lập server và chạy workflow `CD` lần đầu:

- Chạy `CD` qua `workflow_dispatch` (bật `run_seed=true` cho lần khởi tạo dữ liệu đầu tiên) hoặc merge vào `main`.
- Xác nhận bước `Verify production HTTPS health and closed database port` trong GitHub Actions đạt màu xanh (`check-compose.mjs` qua `https://brewlite-a2.duckdns.org` pass và `nc -z -w 3 <EC2_HOST> 5432` bị từ chối).
