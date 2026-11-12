# Minh chứng Task 4.4 — CI cho pull request

Issue #20, nhánh `ci/4.4-pr-checks`. Phụ thuộc menu #18 và kiểm thử #19; thứ tự merge: menu → kiểm thử → CI.

Workflow `.github/workflows/ci.yml` chạy khi mở/cập nhật PR vào `main`, push `main` và chạy thủ công. Node 24 theo `.nvmrc`, cài từ lockfile, cache npm, timeout và hủy lượt chạy cũ.

- API: install → generate Prisma Client → lint → unit test → HTTP test → build. DATABASE_URL là placeholder để generate; không có DB thật trong job này.
- Web: install → lint → unit/component test → build.
- PR quality gate: chạy với `always()` và chỉ đạt khi cả API/Web đều `success`, kể cả trường hợp job khác bị skip/cancel thì gate không được tính đạt.

Không deploy hoặc cần secret AWS. Checkout/setup-node dùng major v7 đã đối chiếu release chính thức. Không thêm PR template vào thay đổi CI.

## Kiểm chứng

- `actionlint .github/workflows/ci.yml`: đạt (actionlint 1.7.12, binary tải từ release chính thức và đối chiếu checksum).
- `git diff --check`: đạt.
- CI trên GitHub, required check và minh chứng pass/fail: sẽ cập nhật bằng kết quả thật sau khi mở PR. Chưa nghiệm thu hoặc đóng issue.
