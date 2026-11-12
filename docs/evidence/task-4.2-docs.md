# Minh chứng Task 4.2 — Quản lý tài liệu

Ngày kiểm tra: 12/11/2026. Nhánh `docs/4.2-project-guide`. [Issue #16](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/16).

## Đối chiếu điều kiện hoàn thành

| Điều kiện | Minh chứng |
| --- | --- |
| Task 1–3 nằm trong `docs` | [Bảng chỉ dẫn](../README.md) liên kết tài liệu yêu cầu, mô hình, kiến trúc và deployment cùng PR #1, #3, #4 đã merge |
| Thay đổi có lịch sử và lý do | Lịch sử Git/PR hiện có; [quy trình](../planning/workflow.md) quy định nội dung, lý do, ảnh hưởng và kết quả kiểm tra cho mỗi PR sửa tài liệu |
| Có kết quả kiểm tra | Kiểm tra đích liên kết Markdown nội bộ và `git diff --check` trên nhánh hiện tại; kết quả bên dưới |

Task 4.1 đã merge vào `main` qua [PR #42](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/42). Task này bổ sung chỉ dẫn và quản lý lịch sử cho tài liệu đã có, không chuyển thêm code nghiệp vụ từ repo cũ.

Lý do thay đổi: giúp thành viên tìm đúng tài liệu, xem được PR nguồn và biết cách cập nhật; không tạo thêm bản sao hoặc file lịch sử trùng với Git.

## Kiểm tra và giới hạn

- Đã đối chiếu sự hiện diện của tài liệu Task 1–3 và trạng thái merge của PR nguồn bằng Git/GitHub CLI.
- Kiểm tra các đích file của liên kết Markdown nội bộ trong README và `docs`: không có liên kết thiếu file. Không kiểm tra anchor hoặc toàn bộ URL ngoài repo.
- `git diff --check`: đạt.
- Không sửa nguồn/ảnh sơ đồ hoặc code ứng dụng nên không chạy lại build/test nghiệp vụ. Đây không phải lần nghiệm thu lại nội dung Task 1–3, production hoặc toàn bộ ma trận truy vết.
- Chưa commit/push hoặc có PR cho Task 4.2. Khi mở PR, liên kết issue #16 và ghi `Closes #16`; chỉ đóng khi PR merge và đủ tiêu chí.
