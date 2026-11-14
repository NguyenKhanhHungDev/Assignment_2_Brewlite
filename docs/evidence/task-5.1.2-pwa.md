# PWA BrewLite — NFR-10, Refs #23

## Cách hoạt động

- Manifest App Router: `apps/web/app/manifest.ts`, được phục vụ tại `/manifest.webmanifest`, tên BrewLite, start URL/scope `/`, display `standalone`.
- Icon PNG 192/512 và maskable 512 trong `apps/web/public/icons/`, dùng đúng hình ly từ `BrewLiteMark.tsx` và màu espresso/cream hiện có. Tạo lại bằng `node scripts/generate-pwa-icons.mjs` sau `npm ci --prefix apps/web`; dùng Sharp đã có trong lockfile Next.js.
- `public/sw.js` tự đăng ký qua `lib/register-worker.ts` trong production trên HTTPS/localhost. Dev không tự đăng ký để tránh cache khi phát triển. Header SW dùng `no-cache, no-store`, scope `/` và `updateViaCache: none`.
- Cache `brewlite-static-v1` chỉ chứa trang tĩnh `/offline.html`, icon và asset `/_next/static/` có kiểu nội dung phù hợp. Khi đổi quy tắc cache hoặc trang offline, tăng version trong `sw.js`; worker xóa cache BrewLite phiên bản cũ, không xóa cache ứng dụng khác. Asset cache giới hạn 80 mục.
- Khi lấy static asset để cache, worker dùng `credentials: omit`, không lưu request kèm thông tin xác thực. API/BFF, RSC, response private/no-store, query và nội dung HTML động không được cache. Điều hướng dùng network, lỗi mạng trả trang offline chung không chứa dữ liệu cá nhân/giao dịch. Route chi tiết món `/products/:id` cũng có fallback.
- `ConnectionStatus` nhận offline/online ngay từ lúc ứng dụng khởi động. Trạng thái ban đầu là đang kiểm tra, không tin `navigator.onLine` như bằng chứng backend hoạt động. Sau khôi phục, GET `/products`, kiểm tra response, cập nhật giá/tồn kho qua `CartProvider.reconcile`; nếu có đơn thuộc phiên hiện tại thì GET đơn và trạng thái thanh toán trước khi mở lại thao tác.
- Checkout và lớp `requestJson` chặn mutation khi offline/đang kiểm tra/backend không truy cập được. Kết quả đơn/thanh toán được tải lại sau khôi phục; không lấy trạng thái đã lưu làm xác nhận mới. Không có background sync, hàng đợi offline hoặc tự replay POST/PATCH/DELETE.
- Giữ nguyên cấu trúc localStorage `brewlite-cart` và sessionStorage `brewlite-checkout`, gồm idempotency key của yêu cầu chưa rõ kết quả. Không thay backend, Auth, Prisma hoặc nghiệp vụ thanh toán.

## Kiểm tra local

```bash
npm ci --prefix apps/web
npm --prefix apps/web run lint
npm --prefix apps/web test
npm --prefix apps/web run build
PORT=4310 BIND_ADDRESS=127.0.0.1 npm --prefix apps/web start
git diff --check
```

Web cần API local theo README để tải menu/kiểm tra backend. Không dùng DevTools offline để giả lập kết quả thanh toán thành công.

1. Mở `http://localhost:4310`, DevTools → Application: kiểm tra manifest, icon, worker scope `/` và cache chỉ có asset công khai.
2. Thêm món vào giỏ, reload để kiểm tra giỏ đã lưu. Mở checkout, chuyển Network → Offline: banner xuất hiện, không có thao tác tạo đơn/thanh toán; reload phải hiện trang offline chung.
3. Khôi phục mạng, mở lại BrewLite hoặc bấm Thử kết nối lại. Giá/tồn kho lấy từ API; nếu đang có đơn thì kiểm tra trạng thái đơn/thanh toán. Backend chưa hoạt động phải tiếp tục chặn thao tác.
4. Nếu vừa gửi tạo đơn/thanh toán rồi mất kết quả, giữ bản nháp/key và kiểm tra lịch sử/trạng thái; khôi phục mạng không tự gửi lại mutation.
5. Debug: Application → Service Workers → Unregister đúng worker BrewLite; Cache Storage → xóa riêng `brewlite-static-*`, reload online. **Không Clear site data/localStorage** nếu cần giữ giỏ. Khi nâng version, kiểm tra cache cũ đã được dọn.

## Minh chứng local ngày 14/11/2026

Nền `origin/main`: `5057fed`. Node 24.21.0, Next.js 16.4.2, production build; branch `feat/5.1.2-pwa-completion`.

| Nhóm kiểm tra tự động | Kết quả |
| --- | --- |
| Web hiện có trước thay đổi | 173/173 test đạt |
| Manifest/icon, worker và cache isolation | 16/16 test đạt |
| Kết nối, giữ giỏ/reload, cập nhật giá, backend down và response probe cũ | 4/4 test đạt |
| Provider checkout thật với fetch giả, bootstrap offline, giao dịch chưa rõ, chờ GET đơn/payment; đăng ký worker | 4/4 test đạt |
| Full Web suite / lint / production build / diff check | 197/197 test đạt; lint, build và diff check đạt |

Các suite mới nằm tại `apps/web/test/pwa-worker.test.ts`, `pwa-connection.test.tsx`, `pwa-checkout.test.tsx`. Test worker thực thi file SW trong VM; không chỉ tìm chuỗi trong mã. Test provider giữ Cart/Auth/Checkout thật, giả lập riêng biên HTTP. Full Web suite, lint/build và diff check được chạy lại trước commit.

Playwright CLI với Chromium `/usr/bin/chromium`, production Web tại localhost:4310 và API fixture (không dùng DB/gateway thật):

- Manifest/icon được phục vụ, kích thước ảnh thực 192×192 và 512×512; worker được kích hoạt/điều khiển trang.
- Chromium profile thường: CDP `Page.getAppManifest` trả `errors: []`, `Page.getInstallabilityErrors` trả `installabilityErrors: []`. Đây là kiểm tra điều kiện cài đặt tại localhost, chưa phải thao tác cài/mở standalone thực tế.
- Tạo đơn bị cắt kết nối: bản nháp/key và giỏ còn nguyên; khi offline không còn nút tạo đơn; sau khôi phục không phát sinh POST/PATCH/DELETE mới.
- Reload checkout và điều hướng chi tiết món khi offline hiện fallback. Sau online, giá fixture đổi 35.000 → 40.000 được cập nhật trong giỏ. Giả lập backend vẫn không truy cập được: có thông báo và tiếp tục chặn giao dịch.
- Duyệt Cache Storage chỉ thấy offline HTML tĩnh/icon/Next static asset; không có API, account, order hay payment HTML. Không ghi nhận `pageerror` trong smoke test.
- Kiểm tra không tràn ngang, chụp và xem trang offline/giỏ tại 390px, 768px, 1280px. Ảnh local trong `output/playwright/pwa-*` (Git ignore).

## Kiểm tra sau deploy HTTPS và giới hạn

Trên trình duyệt/profile thường hỗ trợ PWA: mở URL HTTPS thật, kiểm tra manifest/icon/worker không bị reverse proxy sửa sai MIME/cache/scope; cài bằng menu trình duyệt hoặc Add to Home Screen. Mở từ icon, xác minh display-mode standalone, start URL đúng, thao tác offline/online như trên; kiểm tra logout/đổi tài khoản không lộ nội dung cache. Kiểm tra cập nhật worker với cache version mới mà không xóa giỏ.

Chưa kiểm thử HTTPS production, cài lên điện thoại/mở standalone thực tế hoặc ZaloPay Sandbox trong lượt này. Smoke test API fixture không thay thế nghiệm thu với backend/DB thật. Không hỗ trợ xem dữ liệu riêng tư, tạo đơn, thanh toán hoặc xác nhận kết quả giao dịch khi offline. Không push/tạo PR theo yêu cầu phiên làm việc; không sửa trạng thái issue #23.

## File trong phạm vi thay đổi

Tạo mới:

```text
apps/web/app/manifest.ts
apps/web/components/ConnectionStatus.tsx
apps/web/components/useConnection.ts
apps/web/lib/connection.ts
apps/web/lib/register-worker.ts
apps/web/public/icons/icon-192.png
apps/web/public/icons/icon-512.png
apps/web/public/icons/icon-maskable-512.png
apps/web/public/offline.html
apps/web/public/sw.js
apps/web/test/pwa-checkout.test.tsx
apps/web/test/pwa-connection.test.tsx
apps/web/test/pwa-worker.test.ts
docs/evidence/task-5.1.2-pwa.md
scripts/generate-pwa-icons.mjs
```

Chỉnh sửa:

```text
README.md
apps/web/app/cart/page.tsx
apps/web/app/checkout/page.tsx
apps/web/app/globals.css
apps/web/app/layout.tsx
apps/web/components/CheckoutProvider.tsx
apps/web/components/OrdersView.tsx
apps/web/components/PaymentResult.tsx
apps/web/lib/api.ts
apps/web/next.config.ts
```
