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

Ngày kiểm chứng: 13/11/2026 (UTC+07).

| Minh chứng GitHub | Kết quả |
| --- | --- |
| [PR CI #45](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/45), commit `e14ceb5` | [Run 43275365090](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43275365090): API, Web và PR quality gate đều success |
| [PR kiểm chứng #46](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/pull/46), commit `e3539b7` | [Run 43275640619](https://github.com/NguyenKhanhHungDev/Assignment_2_Brewlite/actions/runs/43275640619): API success; một test Web cố ý sai (`expected 1 to be 2`), Web và gate failure; build Web bị skip |
| Required check khi ruleset Active | `gh pr checks 46 --required` trả `PR quality gate fail`; trạng thái PR là `BLOCKED` |

Khi kiểm chứng, ruleset `require-ci` ID `27142425` Active, target `main`, không bypass, yêu cầu `PR quality gate` từ GitHub Actions (app ID 15368). Không thử merge PR lỗi. PR #46 đã đóng, không merge; test cố ý lỗi chỉ tồn tại trên nhánh kiểm chứng, không có trong nhánh CI hoặc main.

## Trạng thái bàn giao

Ruleset CI được đưa về **Disabled** sau kiểm chứng để không chặn hai PR tiền đề #18/#19 chưa có workflow. Ruleset `protect-main` giữ nguyên. Đây là cấu hình chờ kích hoạt, chưa phải trạng thái nghiệm thu cuối.

Thứ tự: merge menu → merge kiểm thử → bật `require-ci` Active → xác nhận PR #45 có check xanh → merge PR CI. Dùng Merge pull request để giữ các commit chung. Không đóng issue #20 trước khi CI đã merge và required rule được bật lâu dài.

CI Sprint 1 không chạy integration PostgreSQL, E2E trình duyệt hoặc deploy EC2. Test local với DB ở Task 4.3.3 không được tính là test CI. Các job hiện tại chạy unit/component và HTTP mock.
