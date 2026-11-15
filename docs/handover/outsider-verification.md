# Phiếu xác nhận của người ngoài nhóm

Mục đích: chứng minh một người **không thuộc nhóm** có thể làm theo [README](../../README.md) để chạy local và truy cập production (yêu cầu của issue #40 và mục 5.4 trong [hướng dẫn repo](../planning/repository-guide.md)). Phiếu này chỉ là mẫu; **chưa có kết quả thật** cho đến khi người kiểm tra điền.

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

| Mục | Kết quả (Đạt/Lỗi) | Ghi chú / ảnh chụp |
| --- | --- | --- |
| Tên, vai trò, ngày kiểm tra | | |
| Hệ điều hành, phiên bản Docker/Node | | |
| Clone repo và `cp -n .env.example .env` | | |
| `docker compose up -d --build --wait` | | |
| `node scripts/check-compose.mjs` (7/7) | | |
| Menu local hiển thị, đặt thử đơn | | |
| Truy cập production qua HTTPS | | |
| `/health` production `database=up` | | |
| Bước README gây khó hiểu (nếu có) | | |

## Xử lý sau khi nhận phiếu

Sửa README nếu có bước thiếu/sai, lưu phiếu đã điền vào `docs/handover/` (đặt tên có ngày), liên kết trong issue #40.
