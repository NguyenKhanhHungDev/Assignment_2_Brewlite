# Task 1.1 Bối cảnh stakeholder và phạm vi

## 1. Bối cảnh và vấn đề nghiệp vụ

Khi nhận đơn thủ công, cửa hàng có thể ghi nhầm món hoặc tùy chọn, khó kiểm tra thanh toán và báo tiến độ cho khách. BrewLite giúp quản lý những thông tin này trên một website để giảm sai sót.
Khách xem menu, chọn món và tùy chọn, đặt đơn, thanh toán thử qua ZaloPay Sandbox rồi theo dõi tiến độ. Khi món sẵn sàng, khách đến quầy nhận bằng mã đơn. Admin xem yêu cầu của khách, cập nhật tiến độ và quản lý món, công thức, nguyên liệu.

Luồng sử dụng chính:

Xem menu → Chọn món và tùy chọn → Xem giỏ → Đăng ký/đăng nhập nếu chưa có phiên hợp lệ → Nhập tên người nhận, xem lại giỏ và xác nhận → Hệ thống kiểm tra giá, tùy chọn, khuyến mãi và nguyên liệu; tạo đơn chờ thanh toán → Khách chọn thanh toán qua ZaloPay Sandbox → Hệ thống xác minh kết quả → Theo dõi tiến độ và nhận món tại quầy.

Khách có thể xem menu và sử dụng giỏ khi chưa đăng nhập; cần đăng nhập trước khi xác nhận tạo đơn. Đơn tạo xong chờ thanh toán và chỉ được xác nhận sau khi backend kiểm tra kết quả ZaloPay. Luồng thay thế và lỗi được mô tả trong [use-case đặt và thanh toán](use-case-checkout.md).

Nhóm ưu tiên giao diện web trên máy tính trước, sau đó hoàn thiện cho điện thoại. Yêu cầu mobile của đề vẫn phải đạt tại mốc nghiệm thu tương ứng.

## 2. Các bên liên quan

| Stakeholder | Vai trò và nhu cầu | Mục tiêu/kỳ vọng |
| --- | --- | --- |
| Khách hàng | Xem và tìm món, chọn khẩu vị, đặt và theo dõi đơn của mình | Giá và lựa chọn rõ ràng; thao tác thuận tiện trên website; biết kết quả thanh toán và khi nào nhận món |
| Quản lý cửa hàng / Admin | Quản lý nguyên liệu, công thức/món; xem yêu cầu từng món, thông tin người nhận; cập nhật tiến độ đơn và theo dõi giao dịch | Xử lý đúng đơn và yêu cầu của khách; dữ liệu nhất quán; dễ phát hiện giao dịch cần kiểm tra |
| Nhân viên quầy | Pha chế và giao món theo thông tin đơn; là bên liên quan nghiệp vụ, chưa có tài khoản riêng trong hệ thống | Thông tin món, tùy chọn và mã nhận món rõ ràng; thao tác trên hệ thống hiện do Admin đảm nhiệm |
| Giảng viên/khách hàng nghiệm thu | Đánh giá yêu cầu, thiết kế, ứng dụng và quy trình phát triển | Đối chiếu được yêu cầu với thiết kế, code và kiểm thử; chạy thử theo hướng dẫn; truy cập website HTTPS và xem demo |
| Nhóm phát triển | Đặc tả, phân công, tích hợp, kiểm thử và bàn giao | Phạm vi và phân công rõ; API và dữ liệu thống nhất; tự động kiểm tra, triển khai và lưu lịch sử thay đổi |
| Đơn vị thanh toán — ZaloPay (môi trường Sandbox) | Cung cấp môi trường thử nghiệm tạo và kiểm tra giao dịch | Gửi yêu cầu đúng quy định tích hợp; bảo vệ khóa, kiểm tra thông báo và xử lý an toàn khi gửi lại yêu cầu hoặc chưa rõ kết quả |

## 3. Phạm vi thực hiện

BrewLite phục vụ một cửa hàng đồ uống, nhận món tại quầy. Phạm vi gồm MVP theo đề và các chức năng mở rộng kế thừa từ Assignment 1.

### 3.1. MVP và phạm vi mở rộng

MVP tối thiểu theo đề gồm xem menu → chi tiết món/size/topping → giỏ hàng → đăng ký/đăng nhập JWT → đặt đơn → thanh toán thử → xác nhận, trạng thái và lịch sử đơn. Quản lý trạng thái đơn, kiểm tra dữ liệu và các trạng thái tải/trống/lỗi thuộc phạm vi bắt buộc. Sprint 1 tập trung luồng xem menu; Sprint 2 hoàn thiện luồng end-to-end.

| Phạm vi | Chức năng | Phạm vi bàn giao |
| --- | --- | --- |
| MVP bắt buộc | Menu, chi tiết, size/topping, giỏ, xác thực, đặt/thanh toán đơn, lịch sử và quản lý trạng thái | Bắt buộc trong phiên bản bàn giao. |
| Mở rộng dự kiến kế thừa | Tìm kiếm/danh mục; khẩu vị/ghi chú; hồ sơ và người nhận; khuyến mãi/điểm; công thức, nguyên liệu và đối soát | Chuyển phần phù hợp SRS cùng dependency và test. Đối chiếu và xử lý các khác biệt trong [tài liệu kế thừa repo cũ](legacy-repo-review.md) trước khi nghiệm thu. |
| Mở rộng sau Ass2 | Giao hàng, nhiều chi nhánh, chương trình khuyến mãi tùy biến và đổi điểm | Không thuộc cam kết phiên bản này; xem mục 4. |

Thanh toán thử nghiệm:  ZaloPay Sandbox 

### 3.2. Chức năng của hệ thống

| Nhóm chức năng | Phạm vi |
| --- | --- |
| Menu và tùy chọn | Xem, tìm và lọc món; chọn size, topping, đường/đá và ghi chú |
| Tài khoản và giỏ hàng | Đăng ký, đăng nhập, quản lý hồ sơ và giỏ; chỉ sử dụng tên, không thu thập số điện thoại |
| Đặt đơn và thanh toán | Nhập tên người nhận, tạo đơn, thanh toán thử qua ZaloPay Sandbox và xem kết quả |
| Theo dõi đơn | Xem lịch sử, chi tiết và tiến độ đơn; nhận món tại quầy |
| Quản trị cửa hàng | Quản lý đơn, giao dịch, công thức và nguyên liệu; giữ các công cụ Admin đã chọn kế thừa |
| Khuyến mãi và điểm | Dùng mã BREW10; tích điểm và hiển thị hạng Đồng/Bạc/Vàng, không đổi điểm |

Quy tắc chi tiết và tiêu chí chấp nhận được đặc tả trong [SRS](srs.md).

### 3.3. Yêu cầu chất lượng và bàn giao

Repo mới dùng Next.js, NestJS và PostgreSQL; cần giao diện responsive/PWA, kiểm thử, Docker Compose, CI/CD và triển khai HTTPS theo đề. Nhóm ưu tiên làm giao diện máy tính trước; menu mobile-first vẫn cần đạt tại Task 4.3. PWA, health check, E2E, CI/CD và production chưa có minh chứng đầy đủ trong repo nguồn.

Chi tiết tiêu chí chất lượng xem [SRS](srs.md); các phần kế thừa và còn thiếu xem [đối chiếu repo cũ](legacy-repo-review.md).

## 4. Ngoài phạm vi

Các chức năng dưới đây không thuộc phiên bản Ass2:

- Giao hàng: chỉ nhận món tại quầy, không quản lý vận chuyển hoặc phí giao hàng.

- Thanh toán tiền thật và hoàn tiền tự động: chỉ sử dụng ZaloPay Sandbox.

- Quản lý nhiều chi nhánh: chỉ phục vụ một cửa hàng.

- Ứng dụng Android/iOS riêng: sử dụng website responsive trên trình duyệt máy tính và điện thoại.

- Đặt đơn và thanh toán offline: các thao tác này yêu cầu kết nối Internet.

- Quản lý chương trình khuyến mãi và đổi điểm: chưa có chức năng Admin tạo mã hoặc đổi điểm lấy ưu đãi; giữ mã BREW10, quy tắc tích điểm và hạng hiển thị đã xác định.

Giao hàng, quản lý nhiều chi nhánh và thanh toán tiền thật là các hướng có thể mở rộng sau Ass2, chưa cam kết triển khai trong phiên bản này.

## 5. Giả định

- Các chức năng từ Assignment 1 được kế thừa cho Assignment 2.

- Khách hàng và Admin sử dụng trình duyệt có kết nối Internet.

- ZaloPay Sandbox và thông tin tích hợp hoạt động trong thời gian kiểm thử, demo.

- Nhóm có tài khoản và tài nguyên hosting phù hợp để triển khai web, API và PostgreSQL.

## 6. Ràng buộc

- Sử dụng Next.js, NestJS và PostgreSQL. Đề yêu cầu giao diện mobile-first/PWA; nhóm ưu tiên thực hiện bản máy tính trước và cần hoàn thiện menu mobile-first theo Task 4.3 cùng khả năng dùng trên điện thoại trước các mốc nghiệm thu liên quan.

- Hoàn thành và nghiệm thu Task 1–5 theo thứ tự; tài liệu và thay đổi được lưu trong Git.

- Yêu cầu phải có mã, mức ưu tiên, tiêu chí chấp nhận và truy vết đến thiết kế, code, test.

- Giá, thanh toán, quyền truy cập và chuyển trạng thái đơn được kiểm tra ở backend; thanh toán dùng ZaloPay Sandbox.

- Bản triển khai phải có frontend HTTPS, URL API và health check hoạt động khi nghiệm thu; database không public trực tiếp, secret không xuất hiện trong repository hoặc log CI.

- Migration phải bảo toàn dữ liệu hiện có.

## 7. Rủi ro ban đầu

| Rủi ro | Ảnh hưởng | Hướng xử lý |
| --- | --- | --- |
| Thay đổi yêu cầu hoặc code không đồng bộ | Tài liệu, thiết kế và kiểm thử không nhất quán | Cập nhật SRS, sơ đồ và ca kiểm thử khi thay đổi; lưu lịch sử trong Git |
| ZaloPay Sandbox khác yêu cầu Ví/Thẻ mô phỏng của đề | Có thể chưa được chấp nhận phần thanh toán | Ghi rõ khác biệt; xác nhận với bên nghiệm thu và kiểm tra đủ phương thức cần thiết trước khi chốt phạm vi |
| ZaloPay Sandbox gián đoạn hoặc trả kết quả chậm | Khách chưa xác định được kết quả thanh toán | Kiểm tra lại/đối soát giao dịch, chống xử lý trùng và không tự kết luận thất bại khi chưa rõ kết quả |
| Hosting gián đoạn hoặc thiếu tài nguyên | Không truy cập được hệ thống khi demo/nghiệm thu | Chọn cấu hình phù hợp, theo dõi health check và kiểm tra trước buổi demo |
| Migration hoặc triển khai lỗi | Mất dữ liệu hoặc gián đoạn hệ thống | Kiểm tra migration trên môi trường test, sao lưu dữ liệu trước thay đổi và chuẩn bị phương án khôi phục |
| Lộ secret hoặc dữ liệu cá nhân | Truy cập trái phép, lộ thông tin khách hàng | Lưu khóa trong cấu hình bảo mật của môi trường; kiểm tra quyền và tránh ghi thông tin nhạy cảm vào log |


