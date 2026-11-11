# ADR 004 — Thanh toán thử bằng ZaloPay Sandbox

**Trạng thái:** đã chọn cho Ass2, kế thừa code cũ. **Ngày:** 08/11/2026. **Cập nhật:** 10/11/2026.

## Bối cảnh

BrewLite-SE đã tích hợp ZaloPay Sandbox. Nhóm tiếp tục dùng tích hợp này để thử luồng thanh toán, không thu tiền thật. Kết quả có thể đến chậm; mất mạng không chứng minh thanh toán thất bại.

## Quyết định và lý do

Dùng ZaloPay Sandbox cho thanh toán Ass2. API nguồn tạo giao dịch bằng `POST /payments/zalopay/create`, body chỉ nhận `orderId` và yêu cầu `Idempotency-Key`; `POST /payments` mô phỏng đã trả 410. Backend lấy số tiền từ đơn và tạo giao dịch; khách mở đường dẫn để thanh toán thử. Backend xác minh callback hoặc chủ động hỏi lại ZaloPay trước khi cập nhật kết quả.

Giữ cơ chế chống xử lý lặp để không trừ kho/cộng điểm hai lần. Thành công đến sau khi trả kho sẽ chuyển diện cần đối soát. Không coi việc khách quay lại Web là bằng chứng đã thanh toán.

## Phương án khác và hệ quả

Thanh toán mô phỏng hoàn toàn trong ứng dụng có thể dễ kiểm soát demo, nhưng code hiện đã chuyển sang ZaloPay Sandbox nên nhóm giữ tích hợp đang có. Không bổ sung gateway khác hoặc thanh toán tiền thật.

Hệ thống cần Internet và cấu hình Sandbox hợp lệ. Khóa thanh toán nằm ở backend; callback và địa chỉ khách quay về Web phải được cấu hình đúng. Đề yêu cầu thanh toán Ví/Thẻ mô phỏng. Cần kiểm chứng phương thức tương ứng và xác nhận mức đáp ứng của Sandbox với bên nghiệm thu; không tự coi lựa chọn gateway là bằng chứng đạt yêu cầu. Việc kiểm thử tích hợp và luồng thanh toán đầy đủ được thực hiện ở Task 5.
