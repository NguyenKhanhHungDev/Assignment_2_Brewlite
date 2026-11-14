import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("customer completes the browser flow from menu to order confirmation", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Chọn thức uống bạn yêu thích" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Cà phê sữa" }).click();

  await expect(page).toHaveURL(/\/products\/[1-9]\d*$/);
  await expect(
    page.getByRole("heading", { name: "Cà phê sữa", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /M/ })).toBeChecked();
  await page.getByRole("button", { name: /Thêm vào giỏ/ }).click();
  await page.getByRole("link", { name: "Xem giỏ hàng" }).click();

  await expect(page.getByRole("heading", { name: "Giỏ hàng của bạn" })).toBeVisible();
  await expect(page.getByText("Cà phê sữa", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();

  await expect(page.getByRole("heading", { name: "Đăng nhập để đặt món" })).toBeVisible();
  await page.getByRole("link", { name: "Đăng nhập ngay" }).click();
  await page.getByRole("tab", { name: "Đăng ký mới" }).click();

  await page.getByLabel("Địa chỉ Email").fill(`browser.e2e+${Date.now()}@brewlite.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrewLite-E2E-2026");
  await page.getByLabel("Xác nhận mật khẩu").fill("BrewLite-E2E-2026");
  await page.getByRole("button", { name: "Đăng ký thành viên" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel("Họ và tên người nhận").fill("Khách E2E");
  await page.getByRole("button", { name: /Xác nhận tạo đơn/ }).click();

  await expect(
    page.getByRole("heading", { name: /Đơn hàng #[1-9]\d*/ }),
  ).toBeVisible();
  await expect(page.getByText("Chờ thanh toán", { exact: true })).toBeVisible();
  await expect(page.getByText("ZaloPay Sandbox", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tóm tắt đơn hàng" }).last(),
  ).toContainText("Cà phê sữa");

  await page.screenshot({
    path: testInfo.outputPath("menu-to-order-confirmation.png"),
    fullPage: true,
  });

  const evidencePath = process.env.BREWLITE_E2E_EVIDENCE_PATH;
  if (evidencePath) {
    const absolutePath = resolve(process.cwd(), evidencePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await page.screenshot({ path: absolutePath, fullPage: true });
  }
});
