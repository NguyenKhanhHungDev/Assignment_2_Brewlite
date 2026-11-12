# Minh chứng Task 4.3.2 — Giao diện menu

Ngày 12/11/2026, nhánh `feat/4.3.2-menu-ui`, [issue #18](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/18). Kết quả local, chưa push hoặc đóng issue.

## Nguồn và phạm vi

Kế thừa `main` mới nhất đã kiểm tra của [BrewLite-SE tại e876f258](https://github.com/NguyenKhanhHungDev/BrewLite-SE/commit/e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe): MenuCatalog, MenuList, MenuHero, ProductCard, ProductImage, icon, header/footer/brand, bộ phân tích Product, chuẩn hóa tìm kiếm và 10 ảnh món cùng ảnh thay thế và favicon.

- Giữ thiết kế, carousel và các nhóm gợi ý của menu nguồn; chuyển CSS nền/menu/footer và responsive liên quan. Không chuyển CSS chức năng checkout/Admin/Auth.
- Chỉ mở menu đọc dữ liệu; tách Cart/Auth/Checkout provider, thao tác thêm giỏ và liên kết tới trang chi tiết chưa triển khai. Không đưa các chức năng đó vào issue này.
- Lọc ba nhóm danh mục theo `category` API. Source từng đưa thêm Cà phê muối vào OTHER bằng tên món (3 thay vì 2); kiểm tra trình duyệt phát hiện sai khác, sau sửa COFFEE/TEA/OTHER đúng 4/4/2.
- Bộ lọc dùng button với `aria-pressed`; giữ focus bàn phím. Thêm khoảng cuộn tránh header che điểm đến thực đơn; bổ sung kiểu hiển thị trạng thái và dùng Image fill để giữ khung ảnh responsive.
- Menu gọi `/products` qua Next.js rewrites, giữ timeout 15 giây, abort khi unmount, kiểm tra response và nút thử lại từ nguồn. Không đổi hợp đồng API/backend hoặc dependency.

## Kiểm tra thực tế

Node.js 24.21.0, npm 11.19.0; Chromium hệ thống qua Playwright CLI. NestJS đọc DB test PostgreSQL 18.6 riêng của Task 4.3.1; kiểm tra UI không sửa dữ liệu DB.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm --prefix apps/web run lint` | Đạt |
| `API_INTERNAL_URL=http://127.0.0.1:39019 NEXT_TELEMETRY_DISABLED=1 npm --prefix apps/web run build` | Đạt; URL này là API local trong lượt kiểm tra |
| Trình duyệt gọi menu qua proxy tới API thật | 200, đủ 10 món, tên/giá/ảnh/tình trạng kho; kiểm tra cả development và production local |
| Tìm `  CA PHE  `, `ca phe den da`, `TRA DAO` | Lần lượt 3/1/1 món; không phân biệt hoa/thường, dấu và đ/d |
| Danh mục và tìm kiếm kết hợp | COFFEE/TEA/OTHER đúng dữ liệu API; tổ hợp không khớp hiển thị không tìm thấy; reset khôi phục đủ 10 món và xóa từ khóa |
| Mock API chậm/rỗng/503/response sai | Hiển thị loading/empty/error đúng; nhấn Enter vào Thử lại tải được API thật |
| Mock hết kho và ảnh lỗi | Hiển thị tạm hết và ảnh thay thế; không có thao tác thêm giỏ trong phạm vi này |
| Viewport 390/768/1280px | Lưới 1/2/3 cột; scrollWidth bằng viewport, không tràn ngang |
| Ảnh thật | Cả 10 ảnh món decode thành công trong trình duyệt; favicon trả 200; lượt production cuối không có console error/warning |
| `node scripts/check-foundation.mjs` và `--dev` | API/menu/Web khởi động được; smoke cập nhật từ trang chào sang heading menu |
| `git diff --check` | Đạt |

Các tình huống lỗi/rỗng/hết kho dùng mock request trong trình duyệt, tách khỏi lượt API thật. Đây là kiểm tra chấp nhận local, chưa phải component-test suite/CI; issue #19 sẽ thiết lập kiểm thử frontend có script riêng. Chưa kiểm tra Safari/Firefox, PWA hoặc luồng đặt/thanh toán.

Ảnh chụp và script thử trình duyệt lưu local dưới `output/playwright/` (được ignore). README ghi cách chạy, cấu hình API và vị trí thay ảnh. Chỉ đóng #18 sau review/merge và bổ sung link PR thực tế.
