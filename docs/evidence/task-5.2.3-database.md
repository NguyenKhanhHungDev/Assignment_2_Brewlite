# Task 5.2.3 — Kiểm chứng database, migration và seed

Ngày kiểm tra: **14/11/2026**. Phạm vi: database kế thừa, khả năng tái tạo trên PostgreSQL thật và nền dữ liệu cho Task 5.2.1/5.2.4. Refs [#35](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/issues/35).

## Nguồn và kết luận

| Nội dung | Phiên bản đã đối chiếu |
| --- | --- |
| A1 BrewLite-SE, main | `e876f258a1e8cac578b1c8f53ad7a58bab0eb7fe` |
| A2 Assignment_2_Brewlite, origin/main | `5057fed71f7198278ef806034378131eea1366ef` |
| Nhánh kiểm chứng | `test/5.2.3-database-validation` |
| Môi trường | Node 24.21.0, Prisma Client 7.10.1, PostgreSQL 17.11, Docker image `postgres:17` |

So sánh byte **20/20 file giống nhau**: `schema.prisma`, `seed.ts`, `seed.spec.ts`, 16 file `migration.sql` và `migration_lock.toml`. Không chép lại file, không sửa schema/migration lịch sử/seed và không thêm migration mới. PostgreSQL thực tế có **11 bảng domain + `_prisma_migrations`**, áp dụng đủ 16 migration. Prisma migrate diff trả **No difference detected**, exit 0.

**Nền database đáp ứng các module đang tích hợp ở phiên bản A2 trên và sẵn sàng cho Phát kiểm thử API, Thắng tích hợp job migrate/seed.** Đây là kết quả local trên PostgreSQL thật; không đồng nghĩa đã nghiệm thu toàn bộ Task 5.2.1, Compose/health/CD, Sandbox hoặc production.

## Đối chiếu SRS và code đã tích hợp

| Thành phần / yêu cầu | Kết quả | Cơ sở kiểm tra |
| --- | --- | --- |
| User/Auth, FR-05–09 | PASS | User email unique, hash, role, name, sessionVersion và loyaltyPoints; đăng ký/đăng nhập/JWT/role DB được sử dụng trong suite Orders/Ingredients. Logic thu hồi phiên và CAS đổi mật khẩu tại `auth.service.ts`; chưa thay thế toàn bộ regression Auth của 5.2.1.4. |
| Products/Recipes, FR-01/03/27 | PASS | Product legacy; Recipe có giá, category enum, active, ảnh; 10 món seed đọc được qua HTTP với adapter DB thật. Khóa unique tên và FK định lượng tồn tại. |
| Ingredients/RecipeIngredient, FR-14/28 | PASS | PK ghép công thức/nguyên liệu; CHECK đơn vị, stock/reserved/minStock, quantity > 0. Test từ chối stock âm/reserved vượt stock, FK sai và tên trùng. |
| Orders/OrderItems, FR-12–15/22 | PASS | User FK, key unique theo user, hash, hạn đơn; snapshot tên/giá/size/topping/đường/đá/ghi chú/người nhận. Test snapshot sau sửa recipe, replay/cạnh tranh cùng key và rollback. Legacy khẩu vị/người nhận được nullable, không tự gán dữ liệu. |
| OrderIngredient, FR-14/20 và NFR-04 | PASS | PK order/ingredient, CHECK quantity/status; reserve/consume/release trong transaction và khóa Order/Ingredient. Suite thật kiểm chứng giữ kho, cạnh tranh, xử lý lặp, hết hạn và rollback. |
| Payments, FR-16–20/26/30 | PASS | FK Order; unique user/key và transactionRef; provider/status, creationStatus, URL, số tiền, mốc query và audit note. Test thật chống nhiều attempt, settlement lặp, không trả kho khi còn giao dịch chưa rõ, late success/reconciliation, sai số tiền rollback. Không gọi gateway thật. |
| InventoryMovement/Admin, FR-24/25/28–31 | PASS | FK ingredient/actor, unique actor/key, index ingredient/createdAt, CHECK delta/stock/kind, cancellation actor và note actor. Admin HTTP/JWT, race hủy/thanh toán, filter/phân trang/audit chạy với DB thật. |
| Loyalty, FR-21 | PASS | User.loyaltyPoints + Order.loyaltyAwarded; cộng điểm theo thanh toán hợp lệ trong transaction, test đồng thời/lặp không cộng lại. |
| Seed tracking và NFR-06 phần DB | PASS | SeedRun `brewlite-demo-v1`, advisory lock trong transaction; seed mới, chạy lại và bảo toàn dữ liệu chỉnh sửa đều đạt. |
| Promotion/LoyaltyTransaction là lớp domain | NOT_APPLICABLE | Không cần tạo bảng vật lý mới: BREW10 được tính tại service, mã/discount lưu trong Order; điểm và cờ chống cộng lặp đã lưu ở User/Order. |
| Phone legacy và dữ liệu lịch sử | NOT_APPLICABLE | Giữ cột cũ để bảo toàn dữ liệu; recipientPhone bị Prisma ignore, API hiện không thu thập SĐT theo SRS. Không cần drop cột trong task này. |
| Index cho workload admin/payment lớn | RISK | Các unique index và index lịch sử kho đã có; hiệu năng ở quy mô lớn chưa đo. Không tự thêm index khi chưa có query plan/workload chứng minh nhu cầu. |
| Ràng buộc nghiệp vụ ngoài SQL CHECK | RISK | Trạng thái Order/Payment là String, quy tắc chuyển trạng thái/số ly/tổng tiền còn được service kiểm soát. SQL viết tay ngoài service có thể vượt quy tắc; không tuyên bố DB tự kiểm soát toàn bộ nghiệp vụ. |
| MISSING chặn nền schema hiện tại | Không phát hiện | Migration/seed thực thi được, Prisma diff không drift, các suite thật dưới đây đạt. Nếu module/SRS đổi thì cần đánh giá lại. |

Nguồn: `docs/requirements/srs.md`, backlog, ADR 003, `apps/api/prisma/`, AppModule và các service/adapter Orders, Payments, Auth, Ingredients, Loyalty ở A2. Không cập nhật trạng thái issue/board hoặc nghiệm thu thay owner module.

## Môi trường test độc lập, không chứa secret

Container mới: `brewlite-task523-postgres-test`, PostgreSQL 17, bind **127.0.0.1:32768 → 5432**, user `brewlite`. Dùng trust auth chỉ cho container test này; không sao chép `.env`, không dùng mật khẩu thật. Không tác động các container/volume/database đang có. Không reset/drop/truncate database.

Các DB mới tạo trong container này:

- `brewlite_validation_test`: lượt kiểm tra đầu, được giữ nguyên.
- `brewlite_validation_retry_test`: lượt DB sạch đạt, seed và Products/Orders/Loyalty.
- `brewlite_payment_test_validation_test`: suite Payments riêng.
- `brewlite_huy_test_ingredients_test`: suite Ingredients riêng.
- `brewlite_huy_test_operations_test`: suite Admin riêng.

Cuối phiên container được dừng để giải phóng tài nguyên, giữ nguyên toàn bộ DB/volume test. Mở lại bằng `docker start brewlite-task523-postgres-test`; không cần chạy lại Docker run hoặc seed để xem dữ liệu đã kiểm chứng.

Trước migrate: kiểm tra host loopback, tên DB `_test`, đúng container mới và số bảng public bằng **0**. Helper mới `test/test-database.ts` kiểm tra protocol/host/tên DB và chặn query ghi đè host/dbname/schema/options; lỗi không in URL/password. Giữ nguyên các biến opt-in của suite. Tên operations cũ không kết thúc `_test` không còn được chấp nhận.

## Tái tạo cho Khoa, Phát và Thắng

Chạy từ gốc repo. Tạo container **một lần**; nếu tên đã tồn tại, kiểm tra và dùng `docker start`, không ghi đè hoặc xóa volume. Cổng host được Docker chọn để tránh đụng dịch vụ đang chạy:

```bash
docker run -d --name brewlite-task523-postgres-test \
  --label brewlite.task=5.2.3 \
  -e POSTGRES_USER=brewlite -e POSTGRES_DB=brewlite_validation_test \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 127.0.0.1::5432 postgres:17
docker exec brewlite-task523-postgres-test pg_isready -U brewlite -d brewlite_validation_test

task_db_address=$(docker port brewlite-task523-postgres-test 5432/tcp)
task_db_port=${task_db_address##*:}
export DATABASE_URL="postgresql://brewlite@127.0.0.1:${task_db_port}/brewlite_validation_test"
export JWT_SECRET=task523-local-test-only
npm ci --prefix apps/api
npm --prefix apps/api run db:validate
npm --prefix apps/api run db:generate
```

JWT_SECRET ở trên là chuỗi giả cho test local, không dùng cho môi trường có tài khoản thật. Trong lượt kiểm chứng, cổng được cấp là 32768; trên máy khác phải lấy cổng thực tế như trên.

**Suite tái tạo từ DB sạch** tự deploy migration, kiểm tra status, deploy lần hai rồi seed A/B/C. Chỉ chạy trên DB mới chưa có bảng, chưa chạy migrate/seed trước lệnh này:

```bash
BREWLITE_DB_TESTS=1 npm --prefix apps/api run test:database
```

Muốn chạy lại, tạo DB mới có tên kết thúc `_test` và đổi DATABASE_URL; suite từ chối DB đã có bảng, không tự dọn dữ liệu cũ. DB còn nguyên sau test. Có thể dùng DB đã seed đạt để chạy Products và API local:

```bash
BREWLITE_DB_TESTS=1 npm --prefix apps/api run test:integration
npm --prefix apps/api run start:dev
```

Đường thông thường cho job migrate/seed của Thắng (không chạy trước suite DB sạch):

```bash
npm --prefix apps/api run db:migrate
npm --prefix apps/api run db:seed
cd apps/api
node node_modules/prisma/build/index.js migrate status --config prisma7.config.ts
node node_modules/prisma/build/index.js migrate diff --config prisma7.config.ts \
  --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Các suite kế thừa được chạy **lần lượt**, không chạy chung DB song song. Với DB mới của mỗi suite, chạy `db:migrate` trước; không cần demo seed cho Payment/Ingredients/Admin. Thay DATABASE_URL tạm cho migrate bằng DB của suite đó. Các lệnh test sau giả định shell đang ở gốc repo, DATABASE_URL là DB core test đã migrate/seed và JWT_SECRET là chuỗi test:

```bash
RUN_DB_INTEGRATION=1 npm --prefix apps/api test -- --maxWorkers=2 --no-file-parallelism \
  src/orders/orders.integration.spec.ts src/orders/orders-business.integration.spec.ts

PAYMENTS_TEST_DATABASE_URL="postgresql://brewlite@127.0.0.1:${task_db_port}/brewlite_payment_test_validation_test" \
  npm --prefix apps/api test -- --maxWorkers=2 src/payments/payments.integration.spec.ts

INGREDIENTS_TEST_DATABASE_URL="postgresql://brewlite@127.0.0.1:${task_db_port}/brewlite_huy_test_ingredients_test" \
  npm --prefix apps/api test -- --maxWorkers=2 src/ingredients/ingredients.integration.spec.ts

OPERATIONS_TEST_DATABASE_URL="postgresql://brewlite@127.0.0.1:${task_db_port}/brewlite_huy_test_operations_test" \
  npm --prefix apps/api test -- --maxWorkers=2 src/orders/admin-operations.integration.spec.ts
```

Tạo DB riêng bằng `docker exec brewlite-task523-postgres-test createdb -U brewlite <tên_DB_test>` nếu chưa có; không tạo lại tên đang tồn tại. Ingredients suite khởi động API ở cổng 55845, cần giữ cổng này trống. Admin/Ingredients suite cũ có thể giữ fixture; không dùng DB đó làm DB demo hoặc DB sạch cho lượt tái tạo tiếp theo.

Phát có thể dùng DB core sau seed để kiểm thử Orders/API. Thắng có thể dùng cùng schema/migration trong job migrate trên Compose; khả năng dựng toàn Compose, health và cấu hình secret production vẫn thuộc Task 5.2.4/delivery, chưa được kiểm chứng ở đây.

## Kết quả thực tế

| Kiểm tra | PASS | FAIL | SKIP | Ghi chú |
| --- | ---: | ---: | ---: | --- |
| Prisma validate / generate | Đạt | 0 | 0 | Schema hợp lệ, Client sinh được |
| `npm run test:database` | 7 | 0 | 0 | DB sạch, checksum 16 migration, bảng/FK/index/CHECK, deploy hai lần, seed và rollback |
| `npm run test:integration` | 9 | 0 | 0 | HTTP Products với PostgreSQL thật, 10 món demo và tồn theo size |
| Orders + order state/Loyalty, opt-in | 22 | 0 | 0 | HTTP/service/transaction thật; có Auth/JWT/role |
| Payments, opt-in | 10 | 0 | 0 | Adapter/transaction thật, không gọi Sandbox |
| Admin operations, opt-in | 7 | 0 | 0 | HTTP/JWT/DB thật, gateway giả ở biên ngoài |
| Ingredients, opt-in | 5 | 0 | 0 | API process + PostgreSQL thật |
| `npm test -- --maxWorkers=2` | 238 | 0 | 44 | Unit/mock, gồm 16 guard test; 44 DB test opt-in skip trong lượt mặc định |
| `npm run test:e2e` | 14 | 0 | 0 | HTTP/mock, không tính là DB thật |
| API lint / build / git diff --check | Đạt | 0 | 0 | Không đổi code production |

**60 test PostgreSQL thật đạt** = 7 + 9 + 22 + 10 + 7 + 5. Không cộng 44 bài skip thành PASS: 44 bài đó đã được bật và chạy riêng ở các hàng Orders/Payments/Admin/Ingredients trên.

Migration status báo **16 migrations found**, **Database schema is up to date**. Deploy lần hai giữ nguyên toàn bộ hàng `_prisma_migrations`, gồm checksum và mốc thời gian. Seed lần đầu: **15 Ingredient / 10 Recipe / 42 RecipeIngredient / 1 SeedRun**. Seed lần hai giữ nguyên snapshot mọi hàng. Sau sửa tên/giá món và tên/tồn nguyên liệu, seed giữ nguyên snapshot đã sửa; test khôi phục đúng các giá trị của chính fixture sau kiểm tra.

## Phát hiện và xử lý

1. Test mới ban đầu đếm nhầm 41 liên kết; đối chiếu seed và PostgreSQL cho thấy Trà chanh có 5 nguyên liệu, tổng đúng là 42. Sửa expectation test, **không sửa seed**. Chạy lại toàn suite trên DB mới `brewlite_validation_retry_test`: 7/7 đạt; DB lượt đầu được giữ lại.
2. Guard test DB cũ không đồng nhất: Orders thiếu kiểm tra đích; Payment cho hostname `db`; Admin dùng tên DB không kết thúc `_test`. Bổ sung helper chung trước kết nối, giữ các guard riêng/opt-in và siết tên Admin thành `brewlite_huy_test_operations_test`.
3. Lượt unit có log lỗi `DB unavailable` từ mock trong `orders.expiration.service.spec.ts` kiểm tra nhánh phục hồi lỗi; test đạt. Đây không phải PostgreSQL thật bị lỗi.
4. CI hiện chỉ chạy unit/mock HTTP và build, chưa có PostgreSQL service. Không nhận kết quả local này là CI DB integration hoặc tự mở rộng workflow/CD trong task này.

## File thay đổi và bàn giao Git

- Thêm `apps/api/test/database.validation-spec.ts`, `test/test-database.ts`, `test/test-database.spec.ts`, `vitest.config.database.ts`; thêm script `test:database` trong `apps/api/package.json`.
- Tích hợp guard vào 6 file test Products/Orders/Orders-business/Payments/Ingredients/Admin-operations; không sửa assertion nghiệp vụ của chúng.
- Thêm tài liệu này và liên kết README. Không đổi schema, 16 migration, seed, lockfile hoặc cấu hình CI.
- Hưng xác nhận lưu phần hỗ trợ kiểm chứng bằng danh tính Git thật của mình (`NguyenKhanhHungDev`). Owner Task 5.2.3 vẫn là Khoa; không đổi identity sang Khoa, không merge/đóng issue. Thay đổi nằm trên nhánh `test/5.2.3-database-validation`, worktree `Assignment_2_Brewlite-db-validation`.

Không còn blocker kỹ thuật cho nền database ở phạm vi đã chạy. Nghiệm thu/PR và việc chạy đầy đủ Auth regression, gateway thật, Compose/health, production/backup/rollback vẫn cần bước riêng theo owner và môi trường tương ứng.
