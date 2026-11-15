# Bộ Postman kiểm thử BrewLite

Bộ này gồm Collection 80 request, Environment mẫu và kết quả kiểm thử lịch sử ngày 14/11/2026. Đã đối chiếu với `postman-brewlite.zip` do người dùng cung cấp ngày 15/11/2026. Không lưu ZIP trùng lặp trong Git.

## 1. File nào dùng để làm gì?

| File | Công dụng |
|---|---|
| [Collection](BrewLite-Assignment2.postman_collection.json) | Request và assertion để kiểm tra API. |
| [Environment mẫu](BrewLite-Local-Test.postman_environment.json) | `baseUrl` local và các biến đăng nhập để trống. |
| [Bảng test case](bang-test-case.md) | Danh sách ca dự kiến; cột “Chưa chạy” trong mẫu không phải kết quả mới. |
| [Minh chứng API tổng hợp](../task-5.2.1-api-tests.md) | Tóm tắt kết quả cũ và giới hạn kiểm chứng, dùng chung cho cả bộ Postman. |
| [Newman lần 1](ket-qua-newman-lan-1.md), [lần 2](ket-qua-newman-lan-2.md) | Kết quả chi tiết đã lưu, gồm lỗi và lần chạy lại. |
| [Integration PostgreSQL](ket-qua-integration-lan-1.md) | Kết quả integration lịch sử; tên DB/điều kiện chạy cũ không thay hướng dẫn hiện hành. |

## 2. Chuẩn bị trước khi chạy

Collection có đăng ký tài khoản, tạo thanh toán, tạo/hủy đơn và giữ kho. Chỉ chạy trên **API local + DB test riêng**, không dùng production hoặc DB demo đang có dữ liệu cần giữ.

1. Chuẩn bị database test, migrate/seed và API theo [hướng dẫn database hiện hành](../task-5.2.3-database.md). Không reset/xóa DB để chạy lại test. API chạy liên tục có tác vụ hết hạn/đối soát nền.
2. `baseUrl` mặc định là `http://localhost:3001`. Đổi sang cổng API local thật nếu khác; không nhập URL production. Không dùng cổng Web để thay cho API trong Collection này.
3. Chuẩn bị tài khoản Admin trên DB test theo [README gốc](../../../README.md#chạy-thử-trang-admin). Seed không tạo Admin. Không cấp quyền hoặc thử nghiệm trên production.
4. Nếu muốn kiểm tra request gọi gateway, cần cấu hình ZaloPay Sandbox cho API test. Không dùng khóa hoặc tài khoản thanh toán thật.

## 3. Chạy bằng Postman

1. Import hai file JSON: Collection và Environment mẫu.
2. Chọn Environment **BrewLite-Local-Test** (hoặc tên hiển thị của bản import).
3. Điền `userPassword`, `adminEmail`, `adminPassword` vào giá trị local của Postman. `userPassword` phải đáp ứng SRS: ít nhất 8 ký tự, tối đa 72 byte UTF-8. Không ghi các giá trị này vào JSON mẫu trong repo.
4. Chạy Collection Runner theo thứ tự từ nhóm **00 Setup** đến **07 Inventory**. Không bật chạy song song: các request sau dùng token, ID món/đơn và key được tạo trước đó.
5. Ghi số request/assertion đạt, lỗi và môi trường thực tế. Chạy liên tiếp có thể gặp giới hạn đăng ký 5 lượt/IP/60 giây; chờ cửa sổ giới hạn và đọc kết quả trước khi kết luận API lỗi.

Token và ID được script lưu vào biến Collection khi chạy. Sau khi chạy, không export Collection rồi ghi đè bản mẫu nếu chưa xóa các giá trị này. Chỉ xuất Environment có mật khẩu/token vào thư mục riêng bị Git bỏ qua.

## 4. Chạy bằng Newman (tùy chọn)

Nếu máy đã có Newman, tạo bản Environment riêng:

```bash
mkdir -p output/postman
cp -n docs/evidence/api-postman/BrewLite-Local-Test.postman_environment.json \
  output/postman/BrewLite-Local-Test.local.postman_environment.json
```

Điền thông tin test trong bản riêng, rồi chạy tại gốc repo:

```bash
newman run docs/evidence/api-postman/BrewLite-Assignment2.postman_collection.json \
  -e output/postman/BrewLite-Local-Test.local.postman_environment.json
```

Không truyền mật khẩu bằng tham số dòng lệnh để tránh lưu vào shell history. `output/postman/` và `*.local.postman_environment.json` đã được `.gitignore` loại trừ. Đây là cách giảm nguy cơ commit nhầm, không thay việc tự kiểm tra file trước khi chia sẻ.

## 5. Kiểm chứng và giới hạn

Lần tích hợp ngày 15/11 chỉ đọc/so sánh file, parse JSON và rà tĩnh biến, URL, token, key và script. Không chạy request, Newman, script Postman hoặc kết nối DB/gateway.

- 5 file trùng byte với repo: Collection, bảng test case và 3 báo cáo kết quả chi tiết.
- Environment trong ZIP chỉ khác metadata; tên/giá trị/type/enabled của 4 biến giống repo, nên giữ bản repo. Mật khẩu và email Admin để trống; 12 biến Collection cũng để trống.
- Không phát hiện JWT, private key, token GitHub hoặc secret điền sẵn trong phần JSON đã rà. Collection dùng `{{baseUrl}}`; có một request phụ trong script và không có lệnh `console` trong các script được lưu.
- Gộp nội dung cần thiết của báo cáo tổng hợp vào minh chứng API và thêm hướng dẫn này; không coi số liệu lịch sử là kết quả chạy mới hoặc bằng chứng cho commit hiện tại.
- Kết quả pass của Collection không tự chứng minh thành công thanh toán Sandbox, UI hoặc mọi AC; một số ca gateway chấp nhận nhiều mã HTTP, cần đọc assertion và kiểm tra nghiệp vụ riêng.
