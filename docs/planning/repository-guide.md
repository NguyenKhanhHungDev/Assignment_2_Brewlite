# Hướng dẫn thiết lập và hoàn thành repository BrewLite Assignment 2

## 1. Mục đích và nguyên tắc

Tài liệu này hướng dẫn nhóm đi từ repository mới đang trống đến khi hoàn thành và bàn giao Assignment 2. Căn cứ chính là đề `Assignment2-BrewLite-1.pdf`, SRS của nhóm và repo BrewLite-SE cũ. Danh sách dưới đây là kế hoạch thực hiện, không phải xác nhận các task đã hoàn thành.

**Quy tắc của đề:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5. Task sau chỉ được nghiệm thu khi tạo phẩm bắt buộc của task trước đã có trên repository và có lịch sử thay đổi rõ ràng. Có thể chuẩn bị repo sớm để lưu tài liệu. Các công việc độc lập trong cùng giai đoạn có thể làm song song theo phụ thuộc thực tế.

**Repo mới:** `https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite`  
**Repo cũ tham khảo:** `https://github.com/NguyenKhanhHungDev/BrewLite-SE`  
**Hướng production đã chọn:** AWS EC2 Ubuntu + Docker Compose + Caddy + Duck DNS + GitHub Actions + GHCR; chưa coi là triển khai thật cho đến khi có minh chứng.

## 2. Cấu trúc repository mục tiêu

```text
brewlite/
├── apps/
│   ├── web/                        # Next.js: giao diện và BFF
│   │   ├── Dockerfile
│   │   └── package.json
│   └── api/                        # NestJS: API và nghiệp vụ
│       ├── prisma/                 # Schema, migration, seed
│       ├── Dockerfile
│       └── package.json
├── docs/
│   ├── requirements/               # Task 1: context, SRS, use-case
│   ├── diagrams/                   # Task 2–3: PlantUML và ảnh PNG
│   ├── architecture/               # Task 3: mô tả kiến trúc và ADR
│   │   └── adr/
│   ├── planning/                   # Backlog, quy trình và kế hoạch nhóm
│   ├── deployment.md               # Task 3.2: thiết kế triển khai
│   └── traceability-matrix.md      # FR → UC/story → thiết kế → code → test
├── tests/                          # Integration/E2E nếu tổ chức ở cấp repo
├── .github/
│   └── workflows/                  # Workflow CI/CD
├── docker-compose.yml              # Web, API, DB local; tên file thực tế có thể là compose.yaml
├── .env.example                    # Tên biến và giá trị mẫu, không có secret thật
├── .gitignore
└── README.md
```

Cây trên là **mục tiêu**; một số file chưa có và sẽ được tạo theo từng task. Tài liệu triển khai đặt tại `docs/deployment.md` theo cấu trúc của đề; nguồn và ảnh deployment diagram đặt trong `docs/diagrams/`. Giữ đường dẫn rõ ràng trong README. Không tạo file rỗng rồi coi chức năng đã hoàn thành.

## 3. Giai đoạn 0 — Khởi tạo repo và quy tắc nhóm

### 3.1. Chuẩn bị tài khoản và repository

- [ ] Xác nhận URL repo mới, quyền truy cập của thành viên và giảng viên.
- [ ] Xác nhận Git đang ở đúng thư mục và `origin` trỏ đúng repo mới.
- [ ] Cấu hình tên và email Git của từng người; không đưa token vào URL hay file dự án.
- [ ] Chuẩn bị `README.md`, `.gitignore`, tài liệu làm việc và cấu trúc `docs`.
- [ ] Kiểm tra các file sẽ đưa lên: không chứa `.env` thật, khóa, mật khẩu, dữ liệu riêng tư hoặc thư mục dependency/build.

**Khởi tạo nhánh chính:** Repo GitHub trống chưa có `main`, nên chưa thể mở PR vào `main` hoặc áp dụng đầy đủ bảo vệ nhánh. Cần một commit khởi tạo tối thiểu để tạo `main` lần đầu. Sau đó bật bảo vệ nhánh; mọi thay đổi tiếp theo, gồm cả tài liệu, đi qua PR. Việc tạo commit/push do người được nhóm cho phép thực hiện.

### 3.2. Cấu hình quy trình PR

- [ ] Dùng quy định tại [quy trình làm việc](workflow.md): nhánh riêng, mọi người mở PR vào `main`; chỉ Hưng merge, được tự merge PR của mình. Thành viên tham gia review theo quy trình.
- [ ] Trên GitHub, người quản trị bật branch protection/ruleset cho `main`, chặn push trực tiếp, force push và xóa nhánh theo khả năng của repo/gói.
- [ ] Khi CI đã tồn tại và có check ổn định, đặt các check bắt buộc và kiểm tra PR lỗi không được merge, kể cả bằng quyền của Hưng. Nếu ruleset merge có bypass, tách CI sang ruleset không có bypass để thực thi điều kiện này.
- [ ] Commit ngắn gọn, có thể dùng tiếng Việt; nêu lý do thay đổi yêu cầu, sơ đồ hoặc kiến trúc trong commit/PR.
- [ ] Mô tả PR gồm nội dung, lý do, cách kiểm tra/kết quả và issue liên quan; không bắt buộc file mẫu PR. Không lưu secret trong PR, code hoặc log.

### 3.3. Kế thừa repo cũ có kiểm soát

- [ ] Đối chiếu `apps/web`, `apps/api`, schema/migration, Dockerfile và `compose.yaml` của BrewLite-SE với SRS mới.
- [ ] Chuyển từng phần cùng dependency, lockfile, cấu hình và test cần thiết; không chuyển `.env` thật, credential hoặc dữ liệu cá nhân.
- [ ] Repo cũ dùng lockfile npm riêng cho Web và API; khi tích hợp, kiểm tra scripts và phiên bản thực tế của từng app trước khi chọn lệnh chạy.
- [ ] Chạy và kiểm thử trên repo mới. File hoặc code đã sao chép không tự chứng minh chức năng hoạt động hay Sprint đã hoàn thành.

## 4. Task 1 — Khai thác và đặc tả yêu cầu

### Task 1.1 — Bối cảnh, stakeholder và phạm vi

- [ ] Mô tả vấn đề, stakeholder và kỳ vọng của từng bên.
- [ ] Nêu MVP, phạm vi mở rộng, ngoài phạm vi, giả định, ràng buộc và rủi ro.
- [ ] Lưu `docs/requirements/context-and-scope.md`.

### Task 1.2 — SRS

- [ ] Có FR/NFR với mã định danh, MoSCoW và tiêu chí chấp nhận kiểm tra được.
- [ ] Bao phủ menu, chi tiết món, giỏ, auth, đặt/thanh toán, lịch sử, quản lý trạng thái, hiệu năng, bảo mật, khả dụng và triển khai.
- [ ] Có sơ đồ use-case tổng quát, nguồn PlantUML và PNG.
- [ ] Đối chiếu SRS với chức năng Admin và các quyết định nhóm: tên người nhận, ZaloPay Sandbox, giao diện web đáp ứng điện thoại.

### Task 1.3 — Use-case trọng tâm

- [ ] Có một đặc tả trọng tâm **Đặt và thanh toán đơn hàng** và sơ đồ phạm vi.
- [ ] Nêu actor, trigger, tiền/hậu điều kiện, luồng chính, thay thế, ngoại lệ và mã yêu cầu liên quan.
- [ ] Phân biệt tạo đơn với xác nhận thanh toán; dùng SRS làm căn cứ viết test sau này.
- [ ] Review tài liệu, đưa lên repo qua PR và lưu lịch sử thay đổi.

## 5. Task 2 — Mô hình hóa

- [ ] **2.1 Activity:** luồng chính từ menu đến kết quả, bắt đầu/kết thúc, swimlane, decision/merge; có chưa đăng nhập, hết hàng, thanh toán thất bại.
- [ ] **2.2 Sequence:** Customer → Next.js UI → NestJS API → Database → Payment Service; thể hiện JWT, validation, transaction tạo đơn/tồn kho, nhánh thành công/thất bại, chống xử lý thanh toán trùng và kết quả trả cho khách.
- [ ] **2.3 Class domain:** tối thiểu User, Product, Order, OrderItem, Payment, Promotion, LoyaltyTransaction; có thuộc tính chính, quan hệ, multiplicity và enum trạng thái.
- [ ] Lưu nguồn `.puml` và ảnh PNG; review ba sơ đồ với SRS/use-case, phân biệt lớp domain dự kiến và bảng thực tế của repo cũ.
- [ ] Đưa sơ đồ lên repo qua PR; lưu nguồn và ảnh tương ứng.

## 6. Task 3 — Thiết kế kiến trúc

### Task 3.1 — Kiến trúc và ADR

- [ ] Mô tả Next.js/PWA, NestJS theo module, PostgreSQL/migration, thanh toán mô phỏng, logging, health check và cấu hình.
- [ ] Trình bày lý do, lợi ích, hạn chế và trade-off; ghi quyết định quan trọng trong `docs/architecture/adr/`.
- [ ] Kiểm tra kiến trúc và sơ đồ lớp/sequence nhất quán.

### Task 3.2 — Deployment

- [ ] Dùng [thiết kế deployment](../deployment.md) dự kiến: EC2 Ubuntu, Compose, Caddy, Duck DNS, Actions và GHCR.
- [ ] Thể hiện thiết bị, Web, API, PostgreSQL có lưu trữ bền vững, registry/nền tảng, HTTPS và mạng nội bộ, secret, health, log, ranh giới local/CI/production.
- [ ] Kiểm tra tài khoản AWS, Free Plan/credit, chi phí EC2, ổ đĩa, IP và thời gian còn lại trước khi tạo tài nguyên; không giả định miễn phí lâu dài.
- [ ] Khi có môi trường thực tế, cập nhật lại tên dịch vụ, kết nối, cổng và cấu hình trên sơ đồ. Đề yêu cầu sơ đồ phản ánh nền tảng thực tế; bản hiện tại là dự kiến, chưa là minh chứng production.

## 7. Task 4 — Sprint 1

### Task 4.1 — Thiết lập repository và backlog

- [ ] Có `apps/web`, `apps/api`, `docs`, README, `.gitignore`, `.env.example`.
- [ ] Có quy tắc branch/PR/commit và Definition of Done: đáp ứng AC, có kiểm thử phù hợp, Hưng đã kiểm tra PR (khuyến khích review chéo với PR của Hưng) và CI đạt khi áp dụng.
- [ ] Tạo issue board/Product Backlog cho **Sprint 1 và Sprint 2**; mỗi issue có mô tả, AC, owner và phụ thuộc khi cần. Đề không ấn định số lượng issue.
- [ ] Rà [backlog đề xuất hiện có](assignment-2-backlog.md) trước khi tạo issue; danh sách/owner trong đó cần nhóm xác nhận và điều chỉnh theo thiết kế AWS đã chọn, không coi là issue đã tạo.

### Task 4.2 — Quản lý tài liệu

- [ ] Có toàn bộ Task 1–3 trong `docs`, có lịch sử commit/PR và ghi lý do thay đổi.
- [ ] Cập nhật README và kiểm tra đường dẫn đến tài liệu, nguồn sơ đồ và ảnh.

### Task 4.3 — MVP menu

- [ ] Kế thừa Products/RecipeMenu và dependency; Hưng phối hợp Khoa chuẩn bị Prisma client, schema/migration và seed cần cho menu trên DB local/test ngay Sprint 1. Không chờ Task 5.2.3 mới chuẩn bị nền menu.
- [ ] Hiện thực `GET /products` và `GET /products/:id` với dữ liệu mẫu hoặc seed.
- [ ] Làm menu Next.js **mobile-first**; có trạng thái loading, empty và error.
- [ ] Thiết lập công cụ và script kiểm thử frontend; Web nguồn chưa có script `test`. Kế thừa test API phù hợp.
- [ ] Có test tối thiểu cho API và component/luồng menu. Chạy thử menu thật, không dùng mockup tĩnh làm minh chứng MVP.

### Task 4.4 — CI

- [ ] Khi mở PR, pipeline chạy `Install → Lint → Unit Test → Build` cho các phần liên quan.
- [ ] Cấu hình chặn merge nếu lint, test hoặc build thất bại.
- [ ] Lưu link PR, log hoặc ảnh của một lần CI thành công và một lần CI phát hiện lỗi.

**Minh chứng kết thúc Sprint 1:** PR/tài liệu, board và backlog, menu/API chạy thật, test và CI theo AC. Cần xác nhận nghiệm thu trước khi coi Sprint 1 hoàn thành.

## 8. Task 5 — Sprint 2, CI/CD và delivery

### Task 5.1 — Hoàn thiện MVP

- [ ] Kế thừa nền database menu của Sprint 1, chốt phần schema và hợp đồng API còn lại từ đầu Sprint 2; cập nhật khi có thay đổi được review.
- [ ] Với chức năng đã có ở repo cũ: chuyển code/dependency → điều chỉnh theo SRS → kiểm thử trên repo mới; chỉ viết mới phần còn thiếu.
- [ ] Xây chi tiết món, size/topping, giỏ hàng và tính tổng tiền.
- [ ] Xây đăng ký, đăng nhập, JWT, validation và xử lý lỗi ở Web/API.
- [ ] Tạo đơn, giữ kho, quản lý trạng thái, lịch sử và các chức năng Admin theo SRS.
- [ ] Tích hợp ZaloPay Sandbox, xác minh kết quả, chống xử lý trùng, xử lý thất bại/chưa rõ; hoàn thiện khuyến mãi và điểm theo SRS.
- [ ] Đề ghi **Ví/Thẻ mô phỏng**: kiểm chứng hình thức hỗ trợ của Sandbox và xác nhận cách demo đáp ứng với giảng viên.

### Task 5.2 — Tích hợp và kiểm thử

- [ ] Có unit test nghiệp vụ quan trọng, integration test API tạo đơn/thanh toán và ít nhất một E2E từ menu đến xác nhận đơn.
- [ ] Migration/seed tái tạo database local/test từ rỗng; kiểm tra trên môi trường thử an toàn.
- [ ] Docker Compose chạy Web, API và PostgreSQL ở local; có health endpoint, ví dụ `GET /health`.
- [ ] Lưu lệnh, kết quả và liên kết test/PR thật; không dùng database production để chạy test. Ghi rõ cấu hình bật integration suite và số bài chạy/skip; test bị skip không được tính là đạt.

### Task 5.3 — CD

- [ ] Pipeline: `Push/Tag → Lint và Test → Build → Docker Image → Push Registry → Deploy → Smoke Test`.
- [ ] Quality gate đạt trước deploy; image Web/API có tag commit SHA hoặc semantic version; push GHCR.
- [ ] Deploy EC2 bằng secret CI; chạy migration có kiểm soát, kiểm tra health/smoke sau deploy.
- [ ] Nếu lỗi, dừng phát hành; tài liệu hóa rollback image và cách xử lý database tương thích/khôi phục backup. Không coi rollback image là tự hoàn tác migration.

### Task 5.4 — Production và bàn giao

- [ ] Có URL frontend HTTPS, URL API và health check từ Internet; database không public trực tiếp.
- [ ] Secret không xuất hiện trong repo hoặc log CI; cấu hình callback/return URL ZaloPay Sandbox phù hợp.
- [ ] Có tag/release notes, README chạy local/test/build/deploy/rollback, video hoặc demo trực tiếp, Sprint Review và Retrospective.
- [ ] Nhờ một người ngoài nhóm clone, chạy theo README và truy cập production; ghi lại kết quả.
- [ ] Kiểm tra URL vẫn hoạt động vào thời điểm chấm. Đề quy định không có URL production hoạt động thì phần triển khai Task 5 không được tính hoàn thành.

## 9. Truy vết xuyên suốt

Tạo `docs/traceability-matrix.md` từ lúc có SRS; cập nhật dần khi tạo sơ đồ, code và test.

| Yêu cầu | Use-case / story | Thiết kế / sơ đồ | Code / API | Test / minh chứng |
| --- | --- | --- | --- | --- |
| FR tương ứng | Use-case liên quan | Link sơ đồ hoặc tài liệu | Link file/endpoint thực tế | Link test và kết quả thực tế |

Không điền tên test hoặc kết quả giả. Khi chưa có code/test, ghi rõ chưa thực hiện và bổ sung sau.

## 10. Checklist nộp bài

- [ ] Repo truy cập được; giảng viên có quyền xem.
- [ ] Task 1–3, SRS, use-case và ma trận truy vết đầy đủ; lịch sử thay đổi rõ ràng.
- [ ] Activity, sequence, class và deployment diagram; nguồn PlantUML và PNG.
- [ ] Source Web/API, migration, unit/integration/E2E test và Docker Compose.
- [ ] CI có minh chứng thành công và phát hiện lỗi; CD và smoke test có kết quả thật.
- [ ] URL production HTTPS, API và health check hoạt động; DB không public trực tiếp.
- [ ] Release notes, README, hướng dẫn rollback và backup phù hợp.
- [ ] Video/demo, Sprint Review và Retrospective.

## 11. Bước kế tiếp của nhóm

1. Đưa backlog và hướng dẫn này lên PR; xác nhận owner trước khi tạo/gán issue thật.
2. Tạo board cho hai Sprint, chọn Sprint Backlog và thống nhất hợp đồng sản phẩm.
3. Kế thừa nền menu/database cùng dependency, hoàn thiện menu/API, test và CI theo Task 4.
4. Khi triển khai thực tế, cập nhật Task 3.2 và ma trận truy vết; không coi merge tài liệu là nghiệm thu production.
