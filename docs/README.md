# Tài liệu BrewLite

Đọc theo thứ tự yêu cầu → mô hình → kiến trúc. Đề Assignment 2 là căn cứ chính; tài liệu và code Assignment 1 dùng để tham khảo, kế thừa.

| Phần | Tài liệu chính | Lịch sử đưa vào repo |
| --- | --- | --- |
| Task 1 — Yêu cầu | [Bối cảnh và phạm vi](requirements/context-and-scope.md), [SRS](requirements/srs.md), [use-case checkout](requirements/use-case-checkout.md) | [PR #1](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/1) |
| Task 2 — Mô hình hóa | [Danh sách và cách kết xuất sơ đồ](diagrams/README.md); giữ cả nguồn `.puml` và ảnh `.png` | [PR #3](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/3) |
| Task 3.1 — Kiến trúc | [Kiến trúc](architecture/architecture.md), các ADR được liên kết trong tài liệu | [PR #4](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/4) |
| Task 3.2 — Triển khai | [Thiết kế triển khai](deployment.md), [nguồn sơ đồ](diagrams/deployment.puml), [ảnh sơ đồ](diagrams/deployment.png) | [PR #4](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/4) |

PR ghi lịch sử thay đổi, không thay thế bằng chứng nghiệm thu. Task 3.2 hiện là thiết kế; tài nguyên, URL và kiểm chứng AWS thực tế sẽ bổ sung khi triển khai.

## Tài liệu hỗ trợ

- [Đối chiếu code repo cũ](requirements/legacy-repo-review.md): phần kế thừa và khác biệt cần xử lý.
- [Backlog hai Sprint](planning/assignment-2-backlog.md), [hướng dẫn hoàn thành repo](planning/repository-guide.md), [quy trình làm việc](planning/workflow.md).
- [Ma trận truy vết](traceability-matrix.md): cập nhật code/test và kết quả thật theo tiến độ; chưa điền đủ không được coi là hoàn tất truy vết.
- [Cài đặt, chạy và kiểm tra local](../README.md), [minh chứng nền Task 4.1](evidence/task-4.1-setup.md).
- [Minh chứng Products API Task 4.3.1](evidence/task-4.3.1-products.md).
- [Minh chứng quản lý tài liệu Task 4.2](evidence/task-4.2-docs.md).

## Khi sửa tài liệu

Sửa trực tiếp file thuộc phần tương ứng, không tạo bản sao kiểu `final` hoặc `final-2`. Nếu đổi tên/di chuyển file, cập nhật các liên kết liên quan. Khi đổi sơ đồ, sửa nguồn `.puml`, kết xuất lại `.png` và kiểm tra ảnh.

Trong PR ghi: **sửa gì, vì sao, ảnh hưởng đến yêu cầu/code/test nào và đã kiểm tra gì**. Dùng Git và PR để xem lịch sử; không cần sao chép toàn bộ lịch sử vào một file riêng. Với code kế thừa, ghi repo nguồn và commit SHA theo [quy trình](planning/workflow.md).
