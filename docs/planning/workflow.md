# Quy trình làm việc của nhóm

## 1. Quy tắc chung

- `main` là nhánh chính, lưu phiên bản đã được nhóm kiểm tra.
- Mỗi công việc làm trên một nhánh riêng, kể cả sửa tài liệu.
- Không commit hoặc push trực tiếp lên `main`. Không force push (ghi đè lịch sử Git) hoặc xóa `main`.
- Muốn đưa thay đổi vào `main`, mở pull request (PR) để nhờ người khác kiểm tra.
- Chỉ Hưng (chủ repo) có quyền gộp PR vào `main`. Thành viên mở PR và tham gia review; không được gộp. Hưng có thể tự gộp PR của mình qua quyền bypass dành riêng cho PR, không cần approval của người khác. Tự gộp không đồng nghĩa tự approve trên GitHub.
- Sửa các vấn đề được góp ý và xử lý xung đột trước khi gộp. Nếu sửa thêm sau khi được duyệt, nhờ người review xem lại phần cần thiết.
- Khi có CI (kiểm tra tự động), các kiểm tra bắt buộc phải đạt mới được gộp.

## 2. Các bước làm một công việc

1. **Nhận việc:** đọc issue (đầu việc), yêu cầu và điều kiện hoàn thành.
2. **Tạo nhánh:** cập nhật `main`, rồi tạo nhánh riêng cho công việc.
3. **Thực hiện:** sửa đúng phần được giao và tự kiểm tra kết quả.
4. **Lưu thay đổi:** tạo commit với mô tả ngắn, rồi push nhánh lên GitHub.
5. **Mở PR vào `main`:** ghi đã làm gì, vì sao, đã kiểm tra thế nào và kết quả. Thêm mã issue nếu có; chưa kiểm tra thì ghi rõ lý do.
6. **Review:** Hưng kiểm tra PR của thành viên; khuyến khích một thành viên khác review PR của Hưng. Sửa theo góp ý rồi push tiếp lên cùng nhánh; PR tự cập nhật.
7. **Gộp PR:** chỉ Hưng gộp sau khi tự kiểm tra diff, xử lý xong góp ý/xung đột và các kiểm tra bắt buộc đều đạt; Hưng được tự gộp PR của mình.
8. **Cập nhật công việc:** ghi minh chứng, đóng issue khi đủ điều kiện hoàn thành và cập nhật `main` trên máy.

### Đặt tên nhánh và commit

| Công việc | Ví dụ tên nhánh |
| --- | --- |
| Viết tài liệu | `docs/requirements` |
| Thêm chức năng | `feat/product-list` |
| Sửa lỗi | `fix/cart` |
| Làm kiểm tra tự động | `ci/checks` |

Tên nhánh và tên file dùng tiếng Anh ngắn gọn, dễ hiểu. Ví dụ tên file: `workflow.md`, `architecture.md`, `products.service.ts`.

Ví dụ commit: `docs: add requirements`.

## 3. Thiết lập một lần trên GitHub

Người quản trị repo bật bảo vệ cho nhánh `main` trong Settings:

- Bắt buộc mở PR với mọi thay đổi, kể cả của Hưng. Chỉ Hưng giữ quyền Admin; thành viên không có quyền Admin hoặc sửa ruleset.
- Bắt buộc xử lý xong các trao đổi review nếu GitHub hỗ trợ.
- Ruleset quản lý merge áp dụng cho `main`: bật `Restrict updates`, `Require a pull request before merging`, chặn force push và xóa nhánh. Chỉ `Repository admin` được bypass ở chế độ **For pull requests only**; không cấp bypass cho Write/Maintain. Có thể giữ required approvals bằng 1 để nhắc review, nhưng Hưng được bỏ qua approval qua PR.
- Khi CI đã chạy ổn định, bắt buộc lint, unit test và build theo workflow thực tế. **Không dùng bypass để merge khi các check này thất bại hoặc chưa có kết quả.** Bypass của một ruleset có thể bỏ qua cả CI trong ruleset đó; để chặn bằng cấu hình, tách các check CI sang ruleset riêng không có bypass, còn quyền merge giữ ở ruleset hiện tại. Kiểm chứng PR có CI lỗi bị chặn trước khi nghiệm thu Task 4.4.

**Repo mới đang trống:** người được nhóm cho phép tạo commit khởi tạo và push để có `main` trước. Sau đó bật bảo vệ; mọi thay đổi tiếp theo đi qua PR.

File này chỉ ghi quy trình. Người quản trị vẫn phải bật và kiểm tra các cài đặt trên GitHub.
