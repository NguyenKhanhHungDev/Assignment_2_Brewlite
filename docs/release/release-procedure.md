# Quy trình tạo tag và GitHub Release

Theo [workflow](../planning/workflow.md): không push trực tiếp lên `main`; chỉ Hưng (Admin) merge PR. Tag/release cũng do người có quyền ghi vào repo thực hiện.

## Điều kiện trước khi tag

- [ ] PR 5.4.2 (tài liệu này) đã merge; `main` xanh trên workflow `CI`.
- [ ] Workflow `CD` trên `main` chạy thành công; ghi link run vào [release notes](release-notes-v1.0.0.md).
- [ ] `https://brewlite-a2.duckdns.org/health` trả 200 `database=up`; `node scripts/check-compose.mjs --api-url=https://brewlite-a2.duckdns.org --web-url=https://brewlite-a2.duckdns.org` đạt 7/7.
- [ ] Ma trận truy vết đã được review; các AC còn chờ được xử lý hoặc được bên nghiệm thu chấp nhận rõ ràng. Chốt SHA/ngày phát hành và phần việc còn chờ trong release notes.
- [ ] Không có secret trong repo/log CI.

Trước khi tag cần có kết quả người ngoài nhóm, demo/Sprint và các kiểm tra PWA/Sandbox theo release notes. Tài liệu hiện tại không thay cho xác nhận của người thực hiện.

## Tạo tag

```bash
git checkout main && git pull --ff-only
git rev-parse HEAD                       # chọn đúng commit đã có CI/CD đạt
git tag -a v1.0.0 -m "BrewLite v1.0.0"   # tag annotated
git push origin v1.0.0
```

Ghi SHA/ngày phát hành thực tế trong mô tả GitHub Release; có thể dùng `git rev-parse v1.0.0^{commit}` để lấy commit của tag annotated. Không sửa release notes rồi tag một commit mới chưa chạy CI/CD chỉ để ghi SHA của chính file đó.

Image GHCR hiện được CD gắn tag theo SHA commit; tag `v1.0.0` trỏ về cùng commit đó, nên rollback vẫn dùng SHA 40 ký tự như hướng dẫn trong tài liệu rollback.

## Tạo GitHub Release

```bash
gh release create v1.0.0 --title "BrewLite v1.0.0" \
  --notes-file docs/release/release-notes-v1.0.0.md --verify-tag
```

Hoặc dùng giao diện: Releases → Draft a new release → chọn tag `v1.0.0` → dán nội dung release notes.

## Sau khi phát hành

Dán link Release, PR, run CD, video demo, Sprint Review, Retrospective và phiếu người ngoài nhóm vào issue #40 trước khi đóng.
