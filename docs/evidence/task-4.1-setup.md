# Minh chứng Task 4.1 — Nền dự án

Ngày 12/11/2026. Nhánh `feat/4.1-setup-project`, [issue #7](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/7). Thay đổi nền đã merge qua [PR #42](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/42), merge commit `d8a55bd0ccfc0fad9aec32d4610da4205aedfdd4`. Các kết quả dưới đây là kiểm tra local, không phải CI.

## Nguồn và phạm vi

Nguồn là [BrewLite-SE tại e876f258](https://github.com/NguyenKhanhHungDev/BrewLite-SE/commit/e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe), đã kiểm tra `refs/heads/main` ngày trên. Không dùng lại bộ khởi tạo cũ `4d69473` làm nguồn bàn giao.

- Chuyển package/lockfile hiện hành của Web/API, cấu hình TypeScript/lint/build/test, API `main.ts`, Web `server.mjs` và cấu hình proxy Next.js. Giữ Web server xử lý header như nguồn.
- Thêm yêu cầu Node.js 24 vào manifest và metadata lockfile; sửa script API đọc `.env` local và dùng `dist/main.js`. Các phiên bản dependency vẫn theo lockfile nguồn.
- AppModule được giới hạn rỗng để chưa kéo các module nghiệp vụ của issue sau. Xóa controller/service Hello cũ. API khởi động được, route chưa đăng ký trả 404; chưa có health endpoint.
- Trang chào, layout và CSS Web là phần nền tối thiểu của repo mới, chưa chuyển trang menu hoặc AuthProvider của nguồn. Cấu hình Next.js giữ rewrites/cache từ nguồn, bỏ cờ thử nghiệm `agentFeedback` không cần cho nền.
- Cấu hình Vitest HTTP và script smoke là bổ sung cho Task 4.1. Chưa có unit test nghiệp vụ; không dùng lệnh `npm test` làm minh chứng ở bước này.

Mỗi issue tiếp theo sẽ chuyển đúng phần liên quan từ `main` mới nhất tại thời điểm bắt đầu; không coi dependency đã có là module đã triển khai. Chưa sinh Prisma Client, chạy migration hoặc kết nối database.

## Kiểm tra

Node.js `v24.21.0`, npm `11.19.0`, Linux. Chạy từ gốc repo.

| Lệnh | Kết quả |
|---|---|
| `npm ci --prefix apps/api --no-audit --no-fund` | Đạt, 458 package |
| `npm ci --prefix apps/web --no-audit --no-fund` | Đạt, 358 package |
| `npm --prefix apps/api run lint` | Đạt |
| `npm --prefix apps/api run test:e2e` | 1 test HTTP nền đạt |
| `npm --prefix apps/api run build` | Đạt |
| `npm --prefix apps/web run lint` | Đạt |
| `NEXT_TELEMETRY_DISABLED=1 npm --prefix apps/web run build` | Đạt |
| `node scripts/check-foundation.mjs` | API trả 404 như dự kiến; Web 200, tiếng Việt, tiêu đề BrewLite |
| `node scripts/check-foundation.mjs --dev` | Đạt theo kết quả terminal người dùng cung cấp: API bootstrap OK (404), Web 200, lang=vi, BrewLite |

Smoke dùng cổng trống và tự dừng tiến trình nó tạo. Lượt kiểm tra development ban đầu bị chặn bởi dev server đang có; người dùng đã chạy lại và cung cấp kết quả PASS cho cả API/Web. npm cảnh báo ESLint 9 deprecated và các install-script chưa được duyệt; chưa bật thêm install-script. Khả năng chạy Prisma/bcrypt chưa được kiểm chứng ở nền này.

Chưa kiểm chứng menu, auth, orders, payment, database, component test, CI/CD hoặc AWS. PR #42 đã merge; việc nghiệm thu nghiệp vụ thuộc các issue tiếp theo.
