# Backlog đề xuất — BrewLite Assignment 2

Tài liệu này điều chỉnh đề xuất ban đầu thành 35 issue theo SRS, Task 1–3 đang có và đề Assignment 2. Các issue, người phụ trách và tiêu chí dưới đây là **đề xuất để nhóm review**, chưa chứng minh đã tạo trên GitHub hoặc đã hoàn thành. Số lượng issue là lựa chọn của nhóm; đề yêu cầu issue board/Product Backlog cho Sprint 1 và Sprint 2, không quy định số lượng issue.

## Cách đọc

- **ID** là mã nội bộ của backlog này, chưa phải số issue GitHub. **Owner** là người chủ trì đề xuất; các module liên quan vẫn cần phối hợp review hợp đồng.
- **Điều kiện hoàn thành** tóm tắt kết quả cần có. Chi tiết nghiệp vụ, quyền, lỗi và các trường hợp biên theo FR/NFR tương ứng trong SRS và đề.
- **Phụ thuộc** là đầu việc hoặc kết quả cần có trước khi hoàn thành; các việc độc lập có thể làm song song. Mã ghi trong cột này tham chiếu ID trong bảng bên dưới.
- Đề yêu cầu ba tạo phẩm Task 1–3 và truy vết; có thể tổ chức repo sớm để lưu lịch sử nhưng không coi các task này đã nghiệm thu chỉ vì file đã tồn tại.
- Khi tạo issue thật, thêm liên kết tài liệu, PR, test, log hoặc minh chứng tương ứng. Chỉ chuyển Done khi tiêu chí được kiểm tra và có bằng chứng.

## Cách kế thừa code cũ

**Nguồn kế thừa:** trước khi bắt đầu mỗi issue, kiểm tra `main` mới nhất của BrewLite-SE và ghi commit SHA vào PR/minh chứng. Lấy đúng code hiện hành của phần việc đó, kèm dependency, cấu hình, schema/migration và test liên quan. Không quay về commit khởi tạo hoặc bản cũ chỉ để đơn giản hóa. Cố định SHA trong lúc thực hiện issue để tái lập kết quả; nếu nguồn thay đổi, review chênh lệch trước khi cập nhật. Chỉ viết mới phần còn thiếu theo Assignment 2.

Đã đối chiếu tĩnh BrewLite-SE tại commit `e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe`; nội dung cây Git giống commit `d15283a9d8b307c0af42642279ae6158c92e2864` đang được tài liệu dẫn chiếu. Đây không phải kết quả chạy build/test.

Các đầu việc chức năng ở Sprint 1–2 được thực hiện theo hướng **chuyển code và dependency cần thiết → điều chỉnh theo SRS → kiểm thử trên repo mới**. Chỉ viết mới phần còn thiếu hoặc chưa đáp ứng tiêu chí; không mặc định viết lại Auth, Orders, Inventory, Payment hoặc Loyalty. Xem [đối chiếu repo cũ](../requirements/legacy-repo-review.md).

## Task 1 — Yêu cầu

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 1.1 | Context và phạm vi | Hưng | Có stakeholder, MVP/mở rộng/ngoài phạm vi, giả định, ràng buộc và rủi ro theo đề | Đề bài |
| 1.2 | SRS và use-case tổng quát | Hưng | Có FR/NFR, MoSCoW, tiêu chí kiểm tra được và sơ đồ tổng quát; thống nhất với 1.1 | 1.1 |
| 1.3 | Đặc tả use-case Đặt và thanh toán đơn hàng | Phát (chủ trì), Thắng (phối hợp) | Có một đặc tả và sơ đồ cho toàn luồng; ghi actor, trigger, điều kiện trước/sau, luồng chính/thay thế/ngoại lệ và liên kết FR. Phân biệt tạo đơn với thanh toán; Phát review đặt đơn, Thắng review thanh toán | 1.2 |

## Task 2 — Mô hình hóa

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 2.1 | Activity checkout | Huy | Có bắt đầu/kết thúc, swimlane, nhánh chưa đăng nhập, hết hàng và thanh toán thất bại; lưu PUML và PNG | 1.3 |
| 2.2 | Sequence Đặt và thanh toán đơn hàng | Phát | Có một sơ đồ liên tục, đủ lifeline, JWT, validation, transaction, chống trùng và nhánh thanh toán; lưu PUML và PNG. Phát review tạo đơn, Thắng review thanh toán | 1.3, 2.1 |
| 2.3 | Class domain | Khoa | Có bảy lớp tối thiểu theo đề, quan hệ, multiplicity, enum; phân biệt lớp domain với bảng hiện có; lưu PUML và PNG | 1.2, 1.3 |

## Task 3 — Kiến trúc

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 3.1 | Kiến trúc và ADR | Hưng | Mô tả Next.js/PWA, NestJS, PostgreSQL, payment, config/log/health; nêu lý do, ưu và nhược điểm; lưu ADR | 1.2, 2.1, 2.2, 2.3 |
| 3.2 | Deployment diagram | Thắng | Chọn nền tảng thực tế; sơ đồ có Web/API/DB, HTTPS, persistent storage, registry nếu dùng, secret, log, health, local/CI/production; đối chiếu 3.1 | 3.1; nhóm chọn hosting |
## Sprint 1 — Nền tảng, menu và CI

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 4.1 | Repo và quy ước làm việc | Hưng | Repo mới có `apps/web`, `apps/api`, `docs`, README, `.gitignore`, `.env.example`, quy ước branch/PR/commit, DoD và backlog hai Sprint | Quyết định repo mới |
| 4.2 | Quản lý tài liệu | Hưng | Đưa Task 1–3 vào `docs`; thay đổi được ghi trong commit/PR có lý do | 4.1; Task 1–3 |
| 4.3.1 | Products API: danh sách và chi tiết | Hưng | Kế thừa Products/RecipeMenu và dependency liên quan; chuẩn bị Prisma client, schema/migration và seed cần cho menu trên DB local/test ngay Sprint 1, phối hợp Khoa; hai API `GET /products`, `GET /products/:id` chạy được, có validation/lỗi và unit test | 4.1; dữ liệu mẫu/schema menu |
| 4.3.2 | Giao diện menu | Huy | Menu gọi API, có loading/empty/error; đáp ứng **mobile-first** tại nghiệm thu Task 4.3; có thể làm giao diện desktop trước | 4.3.1 hoặc hợp đồng API ổn định |
| 4.3.3 | Kiểm thử API và menu | Khoa | Kế thừa test API phù hợp; thiết lập công cụ và script kiểm thử frontend vì Web nguồn chưa có script `test`; có test component/luồng menu chạy bằng lệnh được ghi lại, kèm kết quả trên repo mới | 4.3.1, 4.3.2 |
| 4.4 | CI cho pull request | Thắng | PR chạy install → lint → unit test → build; chặn merge khi check bắt buộc lỗi; có minh chứng một lần pass và một lần phát hiện lỗi | 4.1; lệnh kiểm tra của Web/API |

## Sprint 2 — Chức năng

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 5.1.1a | API lựa chọn và tính giá | Hưng | Kiểm tra size/topping/khẩu vị, số lượng; backend tính lại giá theo SRS; có unit test | 4.3.1; schema/hợp đồng liên quan trong 5.2.3 |
| 5.1.1b | Giao diện chi tiết món | Huy | Chọn size/topping/đường/đá, ghi chú, số lượng; giá và trạng thái còn hàng hiển thị theo SRS | 4.3.2, 5.1.1a |
| 5.1.2 | Giỏ, checkout và lịch sử | Huy | Giỏ lưu được, chỉ dùng tên người nhận; checkout, trạng thái và lịch sử hoạt động với API; validate/lỗi và PWA theo NFR-10 | 5.1.1b, 5.1.3, 5.1.4, 5.1.5 |
| 5.1.3 | Auth JWT và hồ sơ | Khoa | Đăng ký/đăng nhập/logout/đổi mật khẩu, kiểm tra phiên/quyền và hồ sơ theo SRS; có unit test | 5.2.3 phần schema và migration nền |
| 5.1.4 | Orders và trạng thái đơn | Phát | Tạo đơn, giữ kho, chống trùng và chuyển trạng thái; giữ quản lý/hủy đơn Admin theo FR-24/25/29; có unit test | 5.1.1a, 5.1.3, 5.1.6; hợp đồng Orders/Payment |
| 5.1.5 | ZaloPay và chống trùng | Thắng | Tạo thanh toán, callback/query, chống trùng và đối soát; quản lý giao dịch Admin theo FR-26/30; kiểm chứng yêu cầu Ví/Thẻ mô phỏng; có unit test | 5.1.4; hợp đồng Payment; cấu hình Sandbox |
| 5.1.6 | Inventory và công cụ nguyên liệu | Khoa | Giữ/trả/tiêu thụ kho; Admin quản lý nguyên liệu, nhập/kiểm kho/lịch sử/xóa có điều kiện theo FR-28; có unit test | 5.2.3 phần schema và migration nền |
| 5.1.7 | Promotions và quản lý món | Huy | Áp dụng BREW10 theo FR-13; giữ quản lý công thức/món và công cụ Admin theo FR-27/31, bao gồm nhân bản/ẩn/xuất CSV; có unit test | 5.2.3 phần schema nền; hợp đồng giá |
| 5.1.8 | Loyalty và hạng hiển thị | Phát | Cộng điểm một lần khi thanh toán thành công, hiển thị điểm và hạng theo FR-21; có unit test | 5.1.3, 5.1.5; schema nền |

## Sprint 2 — Tích hợp và kiểm thử

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 5.2.1.1 | Integration test Orders | Huy | Kiểm thử tạo đơn, quyền, chống trùng và cạnh tranh giữ kho; ghi kết quả | 5.1.4, 5.1.6 |
| 5.2.1.2 | Integration test Payment | Phát | Kiểm thử callback/query lặp, thành công/thất bại/chưa rõ và đối soát; ghi kết quả | 5.1.4, 5.1.5 |
| 5.2.1.3 | Integration test Inventory | Phát | Kiểm thử cạnh tranh, giữ/trả kho, kiểm kho và chống trùng; ghi kết quả | 5.1.4, 5.1.6 |
| 5.2.1.4 | Integration test Auth và Loyalty | Hưng | Kiểm thử phiên/quyền và cộng điểm một lần; người kiểm thử khác owner Auth và Loyalty theo phương án hiện tại | 5.1.3, 5.1.8 |
| 5.2.2 | E2E trình duyệt | Huy | Ít nhất một bài chạy từ menu đến xác nhận đơn; ghi môi trường, kết quả và bằng chứng | 5.1.2–5.1.8; môi trường test |
| 5.2.3 | Schema, migration và seed | Khoa | Kế thừa nền menu đã chuẩn bị ở 4.3.1; chốt phần schema/hợp đồng còn lại đầu Sprint 2; migration/seed tái tạo DB test rỗng, cập nhật theo thay đổi và kiểm chứng lại khi tích hợp xong | Task 2–3, 4.3.1; hợp đồng module |
| 5.2.4 | Docker Compose và health | Thắng | Compose chạy Web/API/PostgreSQL local; migration/seed phù hợp; có `GET /health` và kiểm tra khởi động | 4.1, 5.2.3; Web/API đã tích hợp |

## Delivery — CD và bàn giao

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 5.3.1 | CD và kiểm tra sau deploy | Thắng | Quality gate, image tag SHA/phiên bản, registry nếu cần, deploy bằng secret CI, health/smoke và dừng khi lỗi | 4.4, 5.2.4, 5.3.2; nền tảng thực tế |
| 5.3.2 | Migration, sao lưu và rollback | Khoa | Có quy trình migration an toàn, kiểm tra lỗi, phương án sao lưu/phục hồi và rollback phù hợp nền tảng | 5.2.3; lựa chọn hosting/database |
| 5.4.1 | Production HTTPS | Thắng | Web HTTPS, URL API/health hoạt động; database không public trực tiếp; xác minh callback và giới hạn gói miễn phí | 3.2, 5.2.4, 5.3.1 |
| 5.4.2 | Release, demo và bàn giao | Phát | Có tag/release notes, README local/test/build/deploy/rollback, demo, Sprint Review/Retrospective và link minh chứng; người ngoài nhóm có thể làm theo | 5.4.1, 5.2.2, TV.1 |

## Truy vết

| ID | Issue | Owner đề xuất | Điều kiện hoàn thành | Phụ thuộc |
| --- | --- | --- | --- | --- |
| TV.1 | Ma trận yêu cầu đến test | Hưng | Có `docs/traceability-matrix.md` nối FR → UC/story → sơ đồ → code/API → test; cập nhật bằng liên kết và kết quả thật xuyên suốt | Bắt đầu từ 1.2; hoàn thiện cùng 2.x, 5.1.x, 5.2.x |

## Thứ tự và phân công cần lưu ý

1. Review Task 1–2 đang có, sau đó chốt kiến trúc và nền tảng thật cho 3.2. Những quyết định này phải được phản ánh lại trong tài liệu.
2. Trong Sprint 1, làm repo/backlog → nền database và dependency menu (4.3.1, Hưng phối hợp Khoa) → menu API/UI → test và CI. Products nguồn dùng RecipesPrismaAdapter nên không chờ Sprint 2 mới chuẩn bị database. Các phần độc lập có thể chạy song song.
3. Đầu Sprint 2, Khoa và các owner liên quan kế thừa nền menu từ Sprint 1, chốt **phần còn lại** của schema, migration và hợp đồng giá/Orders/Payment. Issue 5.2.3 chỉ hoàn tất sau khi migration/seed được kiểm chứng lại với hệ thống tích hợp; không coi schema đã đóng băng.
4. Auth, giá, inventory và promotions có thể phát triển song song khi hợp đồng và schema nền đã thống nhất. Orders phụ thuộc giá/inventory/auth; Payment phụ thuộc Orders; Loyalty cần tích hợp với kết quả thanh toán. Test, Compose, CD và deployment cần thực hiện theo phụ thuộc trong bảng.
5. Đã chọn hướng production **AWS EC2 Ubuntu + Docker Compose + Caddy + Duck DNS + GitHub Actions + GHCR**, nhưng chưa cấp tài nguyên và kiểm chứng production. Ngân sách mong muốn là miễn phí; cần xác minh chi phí thực tế trước khi tạo tài nguyên. Kiểm tra khả năng giữ API hoạt động, callback ZaloPay, migration, DB không public và URL tại ngày chấm trước khi hoàn tất 3.2/5.4.1.
6. Loyalty 5.1.8 được giữ cho **Phát theo đề xuất ban đầu của bạn**; chưa xác minh được tài liệu phân công chính thức ở workspace. Nhóm cần xác nhận owner trước khi phân công thật. Các owner còn lại cũng là đề xuất, không suy ra đã được nhóm chấp thuận.
7. Khoa phụ trách Auth, Inventory và schema/migration nên đây là điểm cần theo dõi tải. Nếu nhóm thống nhất, có thể chia việc UI xác thực cho Huy mà vẫn ghi rõ trách nhiệm và người review.

## Liên kết Assignment 1 nếu nhóm cần

Đề xuất của bạn có mapping A1-01–A1-10 với issue A2 để tránh làm code hai lần. Việc giữ các issue A1, cách chấm và điều kiện đóng **chưa được xác minh từ PDF Assignment 2**, nên không đặt thành yêu cầu bắt buộc trong backlog. Khi nhóm xác nhận được quy tắc A1, thêm liên kết vào issue A2 tương ứng; không đánh dấu A1 hoàn thành trước khi có bằng chứng.

## Quy trình đề xuất cho mỗi issue

- Ghi mục tiêu, owner, FR/NFR liên quan, phụ thuộc, tiêu chí hoàn thành và minh chứng.
- Với integration test kế thừa, ghi rõ database test, biến bật suite và số bài chạy/skip; suite bị skip không được tính là đạt. Không dùng database production.
- Unit test là một phần công việc của module; các issue 5.2.1.x tập trung integration/concurrency do người khác owner kiểm tra theo phương án nhóm đề xuất. Đây không phải quy định thêm của PDF.
- Có thể dùng board `Todo → In progress → Review → Done`; khi triển khai, liên kết PR/test với issue. Không tự tạo issue, PR hay gán người dùng GitHub nếu chưa xác nhận tài khoản tương ứng.
