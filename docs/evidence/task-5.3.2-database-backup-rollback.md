# Task 5.3.2 — Minh chứng backup, restore, migration và rollback

Ngày thực hiện: **15/11/2026**. Issue [#38](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/38) được giữ OPEN chờ review/nghiệm thu. Base `main` tại `48c3ac0`. Nhánh `feat/5.3.2-database-backup-rollback`, worktree riêng. Hưng thực hiện và mở PR bằng danh tính Git của mình; owner trong backlog vẫn là Khoa, tích hợp CD do Thắng phụ trách. Không merge hoặc thao tác production.

## A. Repository đã có gì

- PostgreSQL 17 trong `compose.yaml`, volume bền vững, DB không publish port host; API/Web có health.
- Prisma 7, schema và 16 migration; `db:migrate` dùng migrate deploy.
- Target Docker `migration` chứa Prisma/tsx và CMD migrate + seed tùy RUN_SEED. Runtime API không chứa CLI.
- Dependency 5.2.3 có minh chứng và test DB riêng; hạ tầng được chọn EC2/Compose/Caddy/Duck DNS/GHCR.
- Issue #38 chưa có backup/restore script hoặc minh chứng. Nhánh remote #37 đã có deploy/rollback chưa merge: backup SQL gzip và retention, rollback còn cần bảo vệ dependency/schema. Không sao chép/ghi đè code nhánh đó.

## B. Bổ sung

- Backup custom archive stream, xác minh TOC/toàn archive, SHA-256, quyền 0600 và xuất bản sau khi thành công; không dừng Web/API, không retention tự xóa.
- Restore chỉ DB *_test rỗng khác DB chính, từ chối cả large object và client đang kết nối; checksum + giải nén trước khi ghi, transaction rollback khi SQL/FK lỗi.
- Migration kiểm checksum/lịch sử và parity image/checkouts, backup trước deploy, status trước/sau, không seed; failed history hoặc lỗi đều dừng.
- Rollback riêng API/Web bằng SHA/digest sau xác nhận tương thích schema, --no-deps ngăn chạy migrate; kiểm tra API và Web deep health.
- CI riêng cho công cụ DB và runbook tiếng Việt, hướng dẫn giao việc cho #37.

## C. File tạo/sửa

Tạo:

1. `scripts/db/common.mjs`
2. `scripts/db/backup.mjs`
3. `scripts/db/restore.mjs`
4. `scripts/db/migrate.mjs`
5. `scripts/db/rollback-app.mjs`
6. `scripts/db/operations.test.mjs`
7. `.github/workflows/database-operations.yml`
8. `docs/database-backup-rollback.md`
9. `docs/evidence/task-5.3.2-database-backup-rollback.md`

Sửa:

10. `.gitignore` — bỏ qua `/backups/`.
11. `package.json` — script test:db-operations, không thêm dependency.
12. `README.md` — liên kết runbook.
13. `docs/deployment.md` — liên kết quy trình #38.

Không sửa Compose local, Dockerfile, schema, migration đã áp dụng, Customer/Admin/ZaloPay hoặc file PR template chưa commit ở checkout gốc.

## D–E. Môi trường, lệnh và kết quả thực tế

Linux, Node.js **v24.21.0**, Docker Compose **5.6.1**, image PostgreSQL **17**. Các project test được tạo mới với hậu tố UUID, volume riêng, không publish port, password test sinh ngẫu nhiên. Sau test chỉ stop container, không down -v, giữ nguyên backup và dữ liệu test.

Build image từ đúng worktree:

```bash
docker build --target migration --tag brewlite-db-ops-migrate:task38 apps/api
```

PASS, image ID `sha256:dec4568ba57e357b7f4718574b6c6f4ef2ff753c61a73430f9364d200f37f2cd`. Không đưa model/dataset/binary/secret vào Git.

Lệnh integration cuối:

```bash
BREWLITE_DB_OPERATIONS_TESTS=1 \
BREWLITE_MIGRATE_TEST_IMAGE=brewlite-db-ops-migrate:task38 \
  npm run test:db-operations
```

Bộ test giữ lại project `brewlite-dbops-6304eacc`, thư mục test/backup `/tmp/brewlite-dbops-vespKE`. Thư mục tạm có thể mất khi reboot; dùng lệnh trên để tái hiện bằng project mới, không chạy lại test trên DB cũ.

**Kết quả cuối: 10 PASS, 0 FAIL, 0 SKIP, exit 0; thời gian 117.06 giây.** Test container đã được stop, volume/backup/dữ liệu giữ nguyên.

Các hành vi được kiểm chứng:

| Ca | Bằng chứng thực thi |
|---|---|
| Backup/restore thành công | Dữ liệu Unicode, bảng cha/con, FK và giá trị sequence khớp; bản backup quyền 0600 và SHA-256 đúng; insert sau restore nhận ID tiếp theo |
| Chặn ghi nhầm đích | Từ chối POSTGRES_DB kể cả đuôi _test, tên không phải test, DB đã có bảng/dữ liệu; dữ liệu nguồn và đích cũ giữ nguyên |
| Chặn DB còn large object | DB không có bảng nhưng có một large object vẫn bị từ chối; object giữ nguyên, không thêm bảng |
| Archive lỗi | Thiếu checksum, checksum sai, archive bị cắt với checksum đã tính lại đều bị chặn; DB đích vẫn rỗng |
| Backup lỗi | Database không tồn tại làm lệnh fail; không có archive hoàn chỉnh/partial còn lại; output không chứa password test |
| Restore SQL lỗi | Archive đọc được nhưng chứa dữ liệu FK bất hợp lệ; pg_restore fail và rollback toàn bộ, không còn bảng tạo dở |
| Migration bình thường | Thiếu --schema-reviewed bị chặn; áp dụng đủ 16 migration, status đạt, có backup; chạy lại không seed và không nhân bản lịch sử |
| Parity/checksum | Migration image khác bộ được review bị chặn; migration mới thêm cột thử nghiệm thành công; sửa SQL đã áp dụng bị chặn |
| Migration lỗi | SQL sai trong fixture có transaction làm deploy fail; backup trước lỗi vẫn tồn tại, bảng tạo dở không còn; failed history chặn lượt tiếp theo |
| Rollback app | Từ image mới về image cũ, API/Web health đạt; không có container migrate, DB nguồn không đổi; thiếu xác nhận/pull image không tồn tại bị chặn |

Fixture rollback là hai image HTTP tối giản để kiểm cơ chế thay image và health, không phải hai phiên bản BrewLite thực tế. Test SQL lỗi và cột thử chỉ nằm trong thư mục Prisma fixture mount vào image test, không sửa migration trong repo.

Các kiểm tra khác:

| Lệnh | Kết quả |
|---|---|
| `node --check scripts/db/*.mjs` (vòng lặp từng file) | PASS |
| `docker compose config --quiet` tại worktree | PASS, không in config/secret |
| `node scripts/db/<backup,restore,migrate,rollback-app>.mjs --help` (từng file) | PASS |
| `git check-ignore backups/probe.dump` | PASS, backup được ignore |
| `npm run test:db-operations` khi không bật biến opt-in | SKIP toàn suite; không tính PASS |
| `npm --prefix apps/api test -- --maxWorkers=2` tại checkout gốc có dependency sẵn, cùng base và source API không đổi | 240 PASS, 44 SKIP do không bật các integration suite API cũ |
| `node scripts/check-compose.mjs` tại stack đang làm việc | 7 PASS, Web/API/DB healthy |
| `git diff --check` | PASS; thêm kiểm tra whitespace riêng cho file mới |

44 test API bị skip không được tính là đã chạy trong lượt #38; đây là các suite nghiệp vụ riêng. Bộ test DB operations mới chạy thật trên PostgreSQL, không mock các lệnh pg_dump/pg_restore/Prisma. Các log lỗi DB giả định trong unit health/expiration là tình huống test đã có, không phải lỗi stack đang phục vụ.

TDD: test backup, migrate, rollback đầu tiên đã FAIL khi script chưa tồn tại, sau triển khai đạt; test large object đã tái hiện FAIL trước khi bổ sung guard. Các FAIL này là bước phát triển/kiểm tra lỗi chủ ý, không phải PASS bị che đi. Review cuối được một agent độc lập đọc code; không tìm finding quan trọng cho BrewLite, lưu ý large object đã được gia cố bằng regression test.

Đối chiếu DB làm việc trước/sau: **4 User, 1 Order, 10 Recipe, 15 Ingredient**, giống số lượng đã kiểm tra trước lượt triển khai; health và menu tiếp tục đạt. So sánh đầy đủ dữ liệu fixture nguồn/đích được assertion trong test, không suy ra toàn bộ dữ liệu DB làm việc từ số lượng. Script test không trỏ vào database làm việc.

## F. Cách sử dụng

Xem [runbook](../database-backup-rollback.md) cho tham số, ví dụ và xử lý lỗi:

- Backup: `node scripts/db/backup.mjs --project-name TEN_STACK --compose-file FILE`.
- Restore: thêm `--archive FILE.dump --database TEN_MOI_test`, đích phải tồn tại/rỗng, khác DB chính.
- Migration: `migrate.mjs`, thêm `--schema-reviewed`; nếu DB không đuôi _test cần `--confirm-database TEN_DB`. Image phải cấu hình đúng URL DB và khớp checksum migration ở checkout.
- Rollback: `rollback-app.mjs --api-image IMAGE_SHA --web-image IMAGE_SHA --schema-compatible`, dùng Compose deployment có image variables. Không restore DB, không chạy migration/seed.

## G. Hạn chế/rủi ro

- Chưa chạy production/EC2/GHCR/SSH. Kết quả GitHub Actions cần kiểm tra trên đúng commit của PR; không suy ra remote CI đạt từ kết quả local.
- Chưa diễn tập rollback giữa hai bản BrewLite thực tế với migration đổi schema, hoặc phục hồi production. Test fixture chứng minh cơ chế local.
- Xác nhận schema, lựa chọn mốc phục hồi, đình chỉ writers, off-host backup, retention/dung lượng và serialization CD vẫn cần người vận hành. Không có khóa phân tán cho toàn quá trình.
- Checksum kiểm hỏng file, không xác thực nguồn; chỉ restore backup tin cậy. Prisma status/checksum không phát hiện hết DDL sửa tay.
- App rollback không nguyên tử giữa hai container; lỗi giữa chừng có thể để app ở hai phiên bản, cần kiểm tra và dừng CD.
- Dump một DB không bao gồm role/secret/file ngoài DB hoặc PITR; không thay thế kế hoạch backup hạ tầng.

## H. Thắng cần tích hợp vào #37

1. Đưa `scripts/db/` và `apps/api/prisma/migrations/` đã review vào gói SCP/release; cài Node 24 trên host EC2.
2. Thay đoạn SQL gzip và migrate/seed bằng migrate.mjs với backup ngoài cây release, biến image/tag đúng release, project/env-file đúng và bước review/approval schema.
3. Dừng CD trên exit khác 0; không up app hoặc restore DB tự động khi migration thất bại. Tắt seed demo production.
4. Rollback app với --no-deps, image pin SHA/digest, schema-compatible; chỉ cập nhật current/previous release sau health và smoke HTTPS thành công.
5. Giữ phiên bản/backup có thể phục hồi, cấu hình off-host backup/retention được duyệt; không xóa backup chỉ để qua lỗi dung lượng.
6. Thêm check DB operations vào quality gate khi tích hợp. Kiểm build context các Dockerfile của CD: Dockerfile hiện tại nhận context thư mục app tương ứng, còn nhánh CD khảo sát đang đặt context root; cần kiểm chứng/sửa trong #37 trước build/push thật.

Không thay đổi owner hoặc đóng issue thay Thắng/Khoa; PR ghi nhận phần triển khai và kiểm chứng thực tế của Hưng.

## I. Điều kiện PR/nghiệm thu

Có sản phẩm local và bằng chứng kiểm thử để mở PR vào main. Cần owner review, chạy workflow mới trên đúng commit và đối chiếu AC trước nghiệm thu; không tự đánh dấu Done hoặc đóng #38. Tích hợp/vận hành EC2 thật được xác nhận riêng, không dùng kết quả local thay cho nghiệm thu hạ tầng.
