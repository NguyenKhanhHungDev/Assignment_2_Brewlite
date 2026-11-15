# Database: backup, restore, migration và rollback — Task 5.3.2

Phạm vi Issue [#38](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/38): PostgreSQL **17**, Prisma **7**, Node.js **24**, Docker Compose v2. Owner theo backlog là Khoa; Thắng tích hợp CD ở [#37](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/37). Các script không thay schema, migration cũ hoặc chức năng nghiệp vụ.

## 1. Hiểu bốn khái niệm

| Khái niệm | Ý nghĩa | Khi dùng |
|---|---|---|
| Backup | Chụp bản sao cấu trúc và dữ liệu của một database tại thời điểm sao lưu | Trước migration/phát hành và theo lịch vận hành |
| Restore | Đưa bản sao vào một database khác | Diễn tập phục hồi, điều tra sự cố, phục hồi được duyệt |
| Migration | Chuỗi thay đổi schema có lịch sử trong Git và `_prisma_migrations` | Triển khai schema mới cho phiên bản ứng dụng |
| Rollback app | Chạy lại image API/Web của phiên bản trước | Bản ứng dụng mới lỗi, schema hiện tại vẫn tương thích với bản cũ |

**Rollback image không hoàn tác migration.** Restore bản sao cũ có thể làm mất những giao dịch phát sinh sau thời điểm backup. Vì vậy script không tự restore production hoặc tự xóa DB khi phát hành thất bại.

## 2. Chuẩn bị và xác định đúng stack

Script chạy từ bất kỳ thư mục nào, nhưng ví dụ dưới đây chạy tại gốc repo. Không cần cài PostgreSQL client trên máy: `pg_dump`, `pg_restore`, `psql` chạy trong service `db`. Node chỉ dùng thư viện tích hợp sẵn, không cần `npm install` để chạy các script này.

```bash
node --version
docker compose version
docker compose ls
docker compose -p assignment_2_brewlite -f compose.yaml ps
```

`--project-name` luôn bắt buộc để tránh thao tác nhầm stack khi có nhiều worktree. **Thay tên trong ví dụ bằng tên đã xác minh**, không đoán theo thư mục. `--compose-file` có thể lặp để dùng override. `--env-file` được chuyển cho Compose; script không thực thi nội dung `.env` như shell code, không in URL/mật khẩu.

Chỉ dùng Docker context đã xác minh; tên project và hậu tố `_test` là hàng rào chống nhầm lẫn, không tự chứng minh một máy là môi trường test. Không chạy lệnh destructive để thử nghiệm trên DB đang làm việc/production. Script không khởi động DB; hãy kiểm tra DB healthy trước.

Script cần service tên `db`, môi trường `POSTGRES_USER`/`POSTGRES_DB` và local socket authentication phù hợp cấu hình image PostgreSQL hiện có. Không truyền mật khẩu trên command line. Không hỗ trợ managed PostgreSQL/RDS hoặc DB khác service `db` trong bản này.

## 3. Backup online

```bash
node scripts/db/backup.mjs \
  --project-name assignment_2_brewlite \
  --compose-file compose.yaml
```

Mặc định đọc database từ `POSTGRES_DB` trong container, ghi vào `backups/` đã được `.gitignore` bỏ qua. Có thể chỉ định `--database ten_database` và `--output-dir /duong/dan/backup`.

Đối với EC2, ưu tiên thư mục riêng ngoài cây release, ví dụ `/srv/brewlite/backups`, owner là tài khoản vận hành, quyền thư mục `0700`; không đặt trong thư mục được CD dọn khi đổi release. File archive/checksum có quyền `0600`. Không dùng `git add -f` với backup; thư mục tùy chọn bên trong repo cũng phải được ignore trước khi dùng.

Thành công trả JSON với `archive`, `sha256`, `database`, `postgresMajor`. Ví dụ tên file:

```text
brewlite_local-20261115T010203004Z-a1b2c3d4.dump
brewlite_local-20261115T010203004Z-a1b2c3d4.dump.sha256
```

Quy trình: `pg_dump --format=custom` → file `.partial` → `pg_restore --list` → giải mã toàn archive bằng `pg_restore --file=/dev/null` → SHA-256 → sync và đổi tên archive. Lỗi thì exit khác 0, không xuất bản archive hoàn chỉnh; không coi file `.partial` là backup. Giữ archive và checksum cùng nhau; checksum là kiểm tra hỏng file, **không phải chữ ký xác thực nguồn**.

Backup dùng snapshot nhất quán của PostgreSQL và không dừng Web/API, không chạy `--clean`, không xóa dữ liệu. DDL đồng thời có thể làm backup chờ/không hoàn thành; tránh thay schema cùng lúc. Dump chỉ gồm một database, không gồm role toàn cluster, WAL/PITR, ảnh Docker, `.env`, khóa SSH hay file upload ngoài DB. Người vận hành phải sao lưu các phần đó riêng. Tài khoản backup cần đủ quyền đọc dữ liệu.

Không tự xóa backup theo retention. Người vận hành phải theo dõi dung lượng và đưa bản sao đã bảo vệ ra ngoài EC2; có backup trên cùng ổ đĩa chưa bảo vệ trước sự cố ổ đĩa/máy chủ.

## 4. Restore an toàn vào DB test rỗng

Chỉ dùng **backup do nhóm tạo và tin cậy**. Theo PostgreSQL, restore archive có thể thực thi SQL do người quản trị nguồn định nghĩa; checksum không biến một file từ người lạ thành file an toàn.

Trước tiên tạo một DB test mới, trên stack test đã được xác minh:

```bash
docker compose -p ten_project_test -f compose.test.yaml exec -T db \
  sh -c 'exec createdb -U "$POSTGRES_USER" brewlite_restore_test'

node scripts/db/restore.mjs \
  --project-name ten_project_test \
  --compose-file compose.test.yaml \
  --archive /duong/dan/backup.dump \
  --database brewlite_restore_test
```

`compose.test.yaml` ở trên là cấu hình test riêng của bạn; không có file này tại root repo. Bộ test tự sinh cấu hình cô lập trong thư mục tạm. Không dùng cấu hình giả định để chạy vào stack thật.

Các chốt bảo vệ:

- Đích bắt buộc tên hợp lệ kết thúc `_test`, đã tồn tại và khác `POSTGRES_DB` của stack, kể cả DB chính cũng có hậu tố `_test`.
- Đích không có table/view/sequence/function/type/schema nghiệp vụ hoặc large object, không có client khác đang kết nối. Không cho app đang chạy ghi vào DB restore; kiểm tra này không thay thế việc cô lập kết nối và dừng writers.
- Archive không rỗng, checksum khớp và đọc/giải nén toàn bộ được trước khi ghi.
- `pg_restore --single-transaction --exit-on-error --no-owner --no-privileges`; không có `--clean` hoặc `--create`. Nếu SQL/FK thất bại, transaction không để lại đối tượng/dữ liệu restore một phần.
- Không có `--force` hay cờ cho phép restore vào DB production.

Thành công trả JSON `restored: true` và số dòng từng bảng. Đối chiếu các bảng quan trọng (User/Order/Payment/Ingredient/Recipe), khóa ngoại, sequence, lịch sử migration và nghiệp vụ trước khi sử dụng bản phục hồi. Script báo kiểm tra SQL/count sau restore; không tự khẳng định mọi nghiệp vụ hoặc dữ liệu giống nguồn đang tiếp tục nhận giao dịch. Bộ test so sánh fixture nguồn/đích trong điều kiện không có writers.

Bản sao không giữ ownership/ACL; tài khoản đích sở hữu object khôi phục. Role, extension hoặc yêu cầu đặc biệt ngoài BrewLite cần kế hoạch riêng.

## 5. Migration an toàn

Repo đã có `prisma migrate deploy` trong job `migrate`; CMD gốc có thể chạy seed khi `RUN_SEED=true`. Script mới **override entrypoint**, chỉ gọi Prisma 7 `migrate status`/`migrate deploy`, không gọi seed dù cấu hình Compose local bật seed.

Chuẩn bị service `migrate` có image/build từ đúng checkout được review:

```bash
docker compose -p ten_project_test -f compose.test.yaml build migrate

node scripts/db/migrate.mjs \
  --project-name ten_project_test \
  --compose-file compose.test.yaml \
  --database brewlite_migrate_test \
  --schema-reviewed \
  --output-dir /duong/dan/backup
```

Service `migrate` phải cấu hình `DATABASE_URL` trỏ tới chính database được chọn, cùng user của `db`, host `db`, port `5432`, schema `public`; truyền `--database` không tự sửa URL để chuyển đích. Với DB không kết thúc `_test`, cần thêm `--confirm-database ten_database` đúng tên. Cờ `--schema-reviewed` là xác nhận của người vận hành đã review SQL và tính tương thích, không phải bộ phân tích tự động chứng minh migration an toàn.

Quy trình thực thi:

1. Kiểm PostgreSQL 17 và lịch sử `_prisma_migrations`: không có migration lỗi/chưa hoàn tất; checksum migration đã áp dụng khớp chuỗi Git.
2. Kiểm danh sách/checksum migration trong image giống file đã review ở checkout. `--migrations-dir` chỉ dùng khi nguồn review được đặt tại đường dẫn riêng.
3. Gọi `migrate status` trước. Exit 1 do còn migration pending được chấp nhận sau khi lịch sử/checksum đã kiểm tra; không bỏ qua failed history.
4. Tạo và kiểm chứng backup đầy đủ. Backup lỗi → không deploy.
5. `migrate deploy`; lỗi → exit khác 0, giữ backup, không cập nhật API/Web.
6. `migrate status` phải exit 0 và lịch sử phải có đủ migration với checksum đúng. Không seed.

Không sửa SQL migration đã áp dụng. Không dùng `migrate reset`/`db push` trên deployment, không tự `migrate resolve` để làm xanh pipeline. Prisma có thể để lại trạng thái/DDL đã áp dụng một phần khi migration không dùng transaction; backup không tự đảo những thay đổi đó. Dừng, đọc log tại máy chủ và lập phương án repair/restore được duyệt.

`migrate status` và checksum không phát hiện hết DDL sửa tay ngoài migration. Khi nghi drift, kiểm tra schema/diff riêng trước phát hành. Để hỗ trợ rollback app, ưu tiên expand/contract: thêm cột nullable/giá trị mặc định, phát hành code tương thích, backfill, chỉ xóa cột cũ ở release sau khi không cần rollback về code cũ.

## 6. Rollback ứng dụng

Dùng Compose deployment có `image: ${API_IMAGE}` và `image: ${WEB_IMAGE}`. Compose local root chỉ có `build`, nên script chủ động từ chối rollback bằng image với cấu hình đó. Nhánh Issue #37 có `compose.prod.yaml` phù hợp nhưng chưa merge tại thời điểm xây dựng Task 5.3.2.

Sau khi người phụ trách xác minh schema tương thích với code cũ:

```bash
node scripts/db/rollback-app.mjs \
  --project-name brewlite \
  --compose-file compose.prod.yaml \
  --env-file .env.prod \
  --api-image ghcr.io/your-owner/brewlite-api:FULL_40_CHARACTER_COMMIT_SHA \
  --web-image ghcr.io/your-owner/brewlite-web:FULL_40_CHARACTER_COMMIT_SHA \
  --schema-compatible
```

Thay giá trị mẫu bằng image thật. Script chỉ nhận tag SHA commit đủ 40 ký tự hoặc digest `@sha256:...`; ưu tiên digest và thiết lập registry không ghi đè tag SHA. Tag SHA vẫn có thể bị chủ registry thay đổi nếu không có chính sách bảo vệ.

Script kiểm tra Compose resolve ra đúng image yêu cầu, dùng image local nếu đã có, pull khi thiếu; chạy `up -d --no-deps --no-build --pull never --wait api web`. Sau đó kiểm tra API `/health` có database up và Web `/api/health?deep=1` có upstream up.

**`--no-deps` ngăn gọi lại job migrate/seed và không thay DB/Caddy.** Có thể có gián đoạn ngắn khi đổi app container. Nếu pull/health thất bại, script dừng; thao tác `up` không phải transaction nên có thể một app đã đổi, app kia chưa đổi. Kiểm tra từng container trước khi tiếp tục. Script không tự cập nhật `.current-release`/`.previous-release` của CD; Thắng cập nhật metadata sau khi health/smoke toàn hệ thống đạt.

## 7. Khi thật sự phải phục hồi database triển khai

Đây là **runbook thủ công cần phê duyệt**, không phải hành động tự động của script/CI:

1. Xác định sự cố có cần phục hồi DB hay chỉ rollback app. Xác minh backup nào, timestamp nào và lượng giao dịch có thể mất.
2. Duyệt maintenance, dừng toàn bộ writers/background jobs và lưu backup hiện trạng để điều tra. Giữ DB hiện tại nguyên vẹn.
3. DBA khôi phục vào một **DB mới, cô lập**, kiểm tra schema/dữ liệu/FK/sequence và thử ứng dụng tương ứng trên đó. Không thử restore phá hủy lên DB đang phục vụ.
4. Sau khi kết quả được chấp nhận, người vận hành đổi kết nối database trong maintenance window và chạy đúng image tương thích. Không tự chạy migration mới lên bản DB cũ vừa phục hồi.
5. Kiểm tra login/menu/order/payment/health, đối soát giao dịch gateway phát sinh sau mốc backup, rồi mới mở lại ghi dữ liệu. Giữ DB cũ và bằng chứng; không tự xóa volume.

Đặc biệt, restore snapshot cũ không hoàn tác giao dịch ZaloPay bên ngoài DB. Cần đối soát và xử lý thủ công, không tự cộng điểm/đánh dấu thanh toán/hoàn tiền.

## 8. Tích hợp Issue #37 trên EC2

Đọc cả nhánh triển khai trước khi ghép; không chạy lệnh production chỉ vì có ví dụ dưới đây. Ngày khảo sát, `origin/feat/5.3.1-ec2-cd-deploy` có deploy.sh dùng `.sql.gz`, chỉ kiểm file không rỗng, tự giữ 14 backup; rollback.sh gọi `up` chưa có `--no-deps`. Task #38 không sửa các file chưa merge đó.

Thắng cần:

- Chuyển các script `scripts/db/` **và thư mục migration đã review `apps/api/prisma/migrations/`** vào gói release/EC2; script cần checksum các file local để so với image. Workflow CD đang chỉ SCP Compose/Caddy/deploy.sh/rollback.sh, nên cần thêm hai nhóm file này. Có Node 24 trên host. Giữ Docker context/project/env-file/volume ổn định qua các release.
- Sau quality gate và pull image mới, start/check DB healthy, thay block SQL gzip + gọi migrate/seed bằng script `migrate.mjs`. Truyền đúng `API_MIGRATE_IMAGE`, đường dẫn backup ngoài release, `--confirm-database` và `--schema-reviewed` từ bước được duyệt. Không truyền RUN_SEED=true vào production.
- Chỉ `up` API/Web/Caddy và smoke HTTPS khi migration exit 0; dùng `--no-deps` khi thay app để không vô tình chạy job migration lần nữa.
- Khi backup/migrate/health lỗi: dừng CD, không tự restore DB. Không tuyên bố app cũ tiếp tục chạy an toàn nếu migration mới phá tương thích schema.
- Rollback app qua script trên hoặc áp dụng cùng các guard vào rollback.sh; pin image trước và xác nhận schema trước khi up. Cập nhật release metadata **sau** khi health/smoke thành công, không mất mốc release tốt khi lần deploy lỗi.
- Không tự xóa backup cũ trước khi backup mới đã restore drill thành công và retention được nhóm duyệt. Không prune image cần rollback trước khi có bản lưu ở registry.
- Serial hóa deploy/migration/rollback theo environment (GitHub Actions concurrency và khóa trên host nếu có nhiều nguồn deploy), không chạy song song cùng DB. Script này không cung cấp khóa phân tán cho toàn quy trình.
- Bổ sung SSH/registry secret qua kênh được duyệt, off-host backup, theo dõi dung lượng và diễn tập định kỳ. Không commit `.env.prod` hay backup.

Compose prod/CD/EC2 thật vẫn thuộc #37/#39 và owner Thắng; kết quả test local của #38 không chứng minh hạ tầng production đã được triển khai.

## 9. Chạy lại kiểm thử

```bash
docker build --target migration --tag brewlite-db-ops-migrate:test apps/api
BREWLITE_DB_OPERATIONS_TESTS=1 \
BREWLITE_MIGRATE_TEST_IMAGE=brewlite-db-ops-migrate:test \
  npm run test:db-operations
```

Nếu không bật `BREWLITE_DB_OPERATIONS_TESTS=1`, suite bị SKIP và không tính PASS. Test tự tạo project/volume/DB riêng, không publish port DB, dùng dữ liệu giả; kết thúc chỉ stop container, giữ volume/backup/test data. Đường dẫn thư mục tạm và project được in ở đầu kết quả. Không dùng `down -v`. Test đầy đủ cần Docker, Node 24 và image migrate chuẩn bị trước; hai fixture image app chỉ kiểm cơ chế thay image/health, không thay thế regression app thực tế.

CI riêng `.github/workflows/database-operations.yml` build image từ checkout và chạy cùng bộ test. Chưa có GitHub Actions run cho thay đổi chưa push; required-check ruleset chưa tự thay đổi.

## 10. Xử lý lỗi và tránh mất dữ liệu

| Hiện tượng | Cách xử lý |
|---|---|
| Không kết nối được DB/Docker | Kiểm Docker context, project, file Compose, trạng thái db và quyền local socket; không in `.env` |
| Backup thất bại/file partial | Không dùng partial; kiểm dung lượng/quyền/DDL đang chạy, chạy lại với tên backup mới |
| Checksum sai/archive hỏng | Dừng restore, lấy lại cặp archive/checksum từ nguồn tin cậy; không sửa checksum để bỏ qua lỗi |
| Đích restore có dữ liệu | Chọn DB test mới rỗng; không drop/truncate/clean để ép test chạy |
| Restore SQL/FK lỗi | Transaction rollback; điều tra nguồn/extension/constraint, kiểm lại đích vẫn rỗng |
| Image/checksum migration không khớp | Dùng đúng release đã review; không sửa lịch sử migration trên DB để ép khớp |
| Migration failed history | Dừng phát hành, xem log tại server, review phương án xử lý với owner; không tự resolve/reset |
| Rollback không qua health | Kiểm từng app và schema, dừng CD; không tự restore DB |

Không `docker compose down -v`, không xóa thư mục PostgreSQL, không xóa dataset/artifact đang dùng, không ghi credentials vào log/shell history. Cờ xác nhận không thay thế việc đọc SQL, xác minh môi trường và phê duyệt production.

## Tham khảo

- [PostgreSQL 17: pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
- [PostgreSQL 17: pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)
- [Prisma 7: CLI migrate deploy](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy) — áp dụng phiên bản Prisma 7 đang khóa trong repo, không chuyển sang CLI của major mới.
- [Minh chứng kiểm thử Task 5.3.2](evidence/task-5.3.2-database-backup-rollback.md)
