# Phiếu xác nhận của người ngoài nhóm

Mục đích: chứng minh một người **không thuộc nhóm** có thể làm theo [README](../../README.md) để chạy local và truy cập production (xem issue #40 và [hướng dẫn phát hành, bàn giao](../release/release-procedure.md)). Phiếu này chỉ là mẫu; **chưa có kết quả thật** cho đến khi người kiểm tra điền.

## Hướng dẫn cho người kiểm tra

Cần: Git, Docker + Docker Compose, Node.js 24.x (để chạy script kiểm tra). Không hỏi nhóm trong lúc làm; ghi mọi chỗ bị vướng.

```bash
git clone https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite.git
cd Assignment_2_Brewlite
cp -n .env.example .env
docker compose up -d --build --wait
node scripts/check-compose.mjs          # kỳ vọng 7/7 bước đạt
```

Sau đó mở `http://localhost:3000`, đặt thử một đơn theo [kịch bản demo](demo-script.md), rồi mở `https://brewlite-a2.duckdns.org` và `https://brewlite-a2.duckdns.org/health`.
Dừng stack: `docker compose down` (giữ dữ liệu) — không xóa volume.

## Kết quả (người kiểm tra điền)

Trạng thái ngày 15/11/2026: **chưa có phiếu đã thực hiện**. Không lấy kết quả của thành viên nhóm hoặc công cụ tự động để điền thay. Ghi thêm SHA clone được bằng `git rev-parse HEAD`, URL và thời điểm truy cập production.

| Mục | Kết quả (Đạt/Lỗi) | Ghi chú / ảnh chụp |
| --- | --- | --- |
| Tên, vai trò, ngày kiểm tra | Chưa thực hiện | Chờ người kiểm tra điền |
| Hệ điều hành, phiên bản Docker/Node | Chưa thực hiện | Chờ người kiểm tra điền |
| Clone repo và `cp -n .env.example .env` | Chưa thực hiện | Chờ người kiểm tra điền |
| `docker compose up -d --build --wait` | Chưa thực hiện | Chờ người kiểm tra điền |
| `node scripts/check-compose.mjs` (7/7) | Chưa thực hiện | Chờ người kiểm tra điền |
| Menu local hiển thị, đặt thử đơn | Chưa thực hiện | Chờ người kiểm tra điền |
| Truy cập production qua HTTPS | Chưa thực hiện | Chờ người kiểm tra điền |
| `/health` production `database=up` | Chưa thực hiện | Chờ người kiểm tra điền |
| Bước README gây khó hiểu (nếu có) | Chưa thực hiện | Chờ người kiểm tra điền |

## Xử lý sau khi nhận phiếu

Sửa README nếu có bước thiếu/sai, lưu phiếu đã điền vào `docs/handover/` (đặt tên có ngày), liên kết trong issue #40.
