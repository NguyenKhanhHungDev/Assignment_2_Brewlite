# ADR 003 — Dùng PostgreSQL và Prisma

**Trạng thái:** kế thừa code cũ. **Ngày:** 08/11/2026.

## Bối cảnh

Đề yêu cầu PostgreSQL. Hệ thống cần tránh đặt vượt kho, tạo đơn trùng hoặc cộng điểm nhiều lần.

## Quyết định và lý do

Dùng PostgreSQL 17 để lưu dữ liệu, Prisma 7 để truy cập và quản lý cấu trúc bảng. Dùng transaction và khóa dữ liệu ở các bước quan trọng; transaction bảo đảm các thay đổi cùng thành công hoặc cùng hủy. Lưu schema và migration trong Git.

## Phương án khác và hệ quả

Viết toàn bộ SQL bằng tay cho phép kiểm soát chi tiết nhưng tốn công bảo trì. Nhóm kết hợp Prisma với SQL ở các chỗ cần khóa/truy vấn đặc thù. Migration phải được kiểm tra trước khi áp dụng; seed chỉ tạo dữ liệu mẫu, không dùng để xóa dữ liệu cửa hàng.
