# ADR 001 — Dùng chung một repo

**Trạng thái:** định hướng repo Ass2 mới, kế thừa cách tổ chức nguồn. **Ngày:** 08/11/2026. **Cập nhật:** 10/11/2026.

## Bối cảnh

Web, API và tài liệu thường phải thay đổi cùng nhau. Nhóm cần quản lý công việc bằng từng PR trong repo Ass2 mới.

## Quyết định và lý do

Tạo repo Ass2 mới với Web tại `apps/web`, API tại `apps/api`, tài liệu tại `docs`. Đề Assignment 2 quyết định tạo phẩm phải bàn giao; BrewLite-SE là nguồn chuyển code theo module cùng dependency và test. Cách này gọi là monorepo: nhiều phần của cùng dự án nằm trong một repo. Giữ package và lockfile riêng của từng app như code cũ.

## Phương án khác và hệ quả

Tách Web/API thành hai repo giúp phát hành riêng nhưng khó phối hợp thay đổi API. Dùng chung repo dễ review hơn; đổi lại CI phải kiểm tra các app liên quan. Code cũ được kế thừa từng phần cùng dependency cần thiết. Repo mới cần lưu lịch sử yêu cầu, thiết kế, PR và minh chứng Sprint thật; không coi việc chép source hoặc tài liệu là đã nghiệm thu task tương ứng.
